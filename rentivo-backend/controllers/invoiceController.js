import fs from "fs";
import mongoose from "mongoose";
import Invoice from "../models/invoiceModel.js";
import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import {
    buildUtilitySplitDetails,
    isUtilitySplitValidationError,
    roundCurrency,
} from "../utils/utilitySplit.js";
import { createNotification } from "./notificationController.js";

const populateInvoiceRelations = (query) =>
    query
        .populate({
            path: "tenantId",
            populate: {
                path: "userId",
                select: "name email",
            },
        })
        .populate("propertyId")
        .populate("landlordId", "name email");

const getPublicUploadPath = (filePath = "") => {
    const normalizedPath = String(filePath).replace(/\\/g, "/").replace(/^\.?\//, "");
    const uploadsIndex = normalizedPath.indexOf("uploads/");

    return uploadsIndex >= 0 ? normalizedPath.slice(uploadsIndex) : normalizedPath;
};

const serializeInvoice = (req, invoice) => {
    const invoiceObject = invoice.toObject ? invoice.toObject() : invoice;
    const attachment = invoiceObject.utilityBill?.attachment;

    if (!attachment?.filePath) {
        return invoiceObject;
    }

    const publicPath = getPublicUploadPath(attachment.filePath);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const { filePath, ...attachmentWithoutPath } = attachment;

    return {
        ...invoiceObject,
        utilityBill: {
            ...invoiceObject.utilityBill,
            attachment: {
                ...attachmentWithoutPath,
                downloadUrl: publicPath ? `${baseUrl}/${publicPath}` : null,
            },
        },
    };
};

const serializeInvoices = (req, invoices = []) =>
    invoices.map((invoice) => serializeInvoice(req, invoice));

const cleanupUploadedFile = (file) => {
    if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
    }
};

const parseJsonField = (value, fallback = {}) => {
    if (value == null || value === "") {
        return fallback;
    }

    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch (_error) {
            const parseError = new Error("Invalid request payload");
            parseError.statusCode = 400;
            throw parseError;
        }
    }

    return value;
};

const buildUtilityBillDescription = ({ propertyTitle, splitMethod, description }) => {
    if (description?.trim()) {
        return description.trim();
    }

    return `Utility bill split for ${propertyTitle} (${splitMethod})`;
};

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private (Landlord only)
export const createInvoice = async (req, res) => {
    try {
        const { tenantId, propertyId, amount, type, dueDate, description, breakdown } = req.body;

        // Verify property ownership
        const property = await Property.findOne({ _id: propertyId, landlordId: req.user._id });
        if (!property) {
            return res.status(404).json({ message: "Property not found or unauthorized" });
        }

        // Verify tenant belongs to the property
        const tenant = await Tenant.findOne({ _id: tenantId, propertyId: propertyId });
        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found in this property" });
        }

        // Validate breakdown if provided
        if (breakdown) {
            const { baseRent, utilities, totalUtilities } = breakdown;

            // Calculate total utilities from breakdown
            const calculatedUtilities = Object.values(utilities || {}).reduce(
                (sum, val) => sum + (parseFloat(val) || 0),
                0
            );

            // Validate totalUtilities matches calculated sum
            if (totalUtilities !== undefined && Math.abs(totalUtilities - calculatedUtilities) > 0.01) {
                return res.status(400).json({
                    message: "Total utilities doesn't match sum of individual utilities"
                });
            }

            // Auto-calculate totalUtilities if not provided
            breakdown.totalUtilities = calculatedUtilities;

            // Validate total amount matches baseRent + totalUtilities
            const expectedAmount = (baseRent || 0) + calculatedUtilities;
            if (Math.abs(amount - expectedAmount) > 0.01) {
                return res.status(400).json({
                    message: `Total amount (${amount}) must equal base rent (${baseRent || 0}) + utilities (${calculatedUtilities})`
                });
            }
        }

        const invoiceData = {
            tenantId,
            propertyId,
            landlordId: req.user._id,
            amount,
            type,
            dueDate,
            description,
        };

        if (type === "Rent" && dueDate) {
            const billingDate = new Date(dueDate);
            invoiceData.billingYear = billingDate.getFullYear();
            invoiceData.billingMonth = billingDate.getMonth() + 1;
        }

        // Add breakdown if provided
        if (breakdown) {
            invoiceData.breakdown = breakdown;
        }

        const invoice = await Invoice.create(invoiceData);
        const createdInvoice = await populateInvoiceRelations(Invoice.findById(invoice._id));

        // Notify the tenant about the new invoice
        if (tenant) {
            let notificationMessage = `New invoice of NPR ${amount} for ${property.title}`;

            // Enhanced message if breakdown is provided
            if (breakdown) {
                notificationMessage = `New invoice: Rent NPR ${breakdown.baseRent || 0} + Utilities NPR ${breakdown.totalUtilities || 0} for ${property.title}`;
            }

            await createNotification(
                tenant.userId,
                "invoice",
                notificationMessage
            );
        }

        res.status(201).json(serializeInvoice(req, createdInvoice));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all invoices (Landlord sees issued, Tenant sees received)
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res) => {
    try {
        let invoices;
        if (req.user.role === "landlord") {
            invoices = await populateInvoiceRelations(
                Invoice.find({ landlordId: req.user._id }).sort({ createdAt: -1 })
            );
        } else if (req.user.role === "tenant") {
            // Find the tenant record for this user to match invoice.tenantId
            // Ideally we should look up all tenant records for this user (user can be tenant in multiple places)
            // But for invoice lookup, we can look for invoices where tenantId matches any of the user's tenant records.
            // OR, simpler: The invoiceModel stores 'tenantId' which is the Tenant Document ID.
            // So we need to find Tenant Docs where userId == req.user._id
            const tenantRecords = await Tenant.find({ userId: req.user._id });
            const tenantIds = tenantRecords.map(t => t._id);

            invoices = await populateInvoiceRelations(
                Invoice.find({ tenantId: { $in: tenantIds } }).sort({ createdAt: -1 })
            );
        } else {
            return res.status(403).json({ message: "Invalid role" });
        }

        res.json(serializeInvoices(req, invoices));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
    try {
        const invoice = await populateInvoiceRelations(Invoice.findById(req.params.id));

        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        let isAuthorized = false;
        if (
            req.user.role === "landlord" &&
            invoice.landlordId?._id?.toString() === req.user._id.toString()
        ) {
            isAuthorized = true;
        } else if (req.user.role === "tenant") {
            const tenantUserId =
                invoice.tenantId?.userId?._id?.toString() ||
                invoice.tenantId?.userId?.toString();

            if (tenantUserId === req.user._id.toString()) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(401).json({ success: false, message: "Not authorized to view this invoice" });
        }

        res.json({ success: true, invoice: serializeInvoice(req, invoice) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update invoice status
// @route   PUT /api/invoices/:id/status
// @access  Private (Landlord only)
export const updateInvoiceStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (invoice.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        invoice.status = status;

        // Set paidDate when status is changed to "Paid"
        if (status === "Paid" && !invoice.paidDate) {
            invoice.paidDate = new Date();
        }

        // Clear paidDate if status is changed from "Paid" to something else
        if (status !== "Paid" && invoice.paidDate) {
            invoice.paidDate = null;
        }

        await invoice.save();
        const updatedInvoice = await populateInvoiceRelations(Invoice.findById(invoice._id));

        // Notify tenant when landlord manually marks invoice as Paid (cash payment)
        if (status === "Paid") {
            const tenant = await Tenant.findById(invoice.tenantId);
            if (tenant?.userId) {
                await createNotification(
                    tenant.userId,
                    "invoice",
                    `Your invoice of NPR ${invoice.amount} has been marked as Paid by your landlord.`
                );
            }
        }

        res.json(serializeInvoice(req, updatedInvoice));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Split a utility bill into tenant invoices
// @route   POST /api/invoices/split-utility-bill
// @access  Private (Landlord only)
export const splitUtilityBill = async (req, res) => {
    const billDocument = req.file;

    try {
        if (req.user?.role !== "landlord") {
            cleanupUploadedFile(billDocument);
            return res.status(403).json({ message: "Only landlords can split utility bills" });
        }

        const { propertyId, totalAmount, dueDate, description } = req.body;
        const selectedSplitMethod = req.body.splitMethod || "";

        if (!propertyId || !totalAmount || !dueDate) {
            cleanupUploadedFile(billDocument);
            return res.status(400).json({
                message: "Property, total amount, and due date are required",
            });
        }

        if (!billDocument) {
            return res.status(400).json({
                message: "Please upload the utility bill photo or document",
            });
        }

        const parsedTotalAmount = roundCurrency(parseFloat(totalAmount));
        if (!Number.isFinite(parsedTotalAmount) || parsedTotalAmount <= 0) {
            cleanupUploadedFile(billDocument);
            return res.status(400).json({ message: "Please provide a valid total utility amount" });
        }

        const parsedDueDate = new Date(dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
            cleanupUploadedFile(billDocument);
            return res.status(400).json({ message: "Please provide a valid due date" });
        }

        const property = await Property.findOne({
            _id: propertyId,
            landlordId: req.user._id,
        });

        if (!property) {
            cleanupUploadedFile(billDocument);
            return res.status(404).json({ message: "Property not found or unauthorized" });
        }

        const tenants = await Tenant.find({
            propertyId,
            status: "Active",
        }).populate("userId", "name email");

        if (tenants.length === 0) {
            cleanupUploadedFile(billDocument);
            return res.status(400).json({ message: "No active tenants found for this property" });
        }

        const splitMethod = selectedSplitMethod || property.splitMethod || "equal";
        const occupancyData = parseJsonField(req.body.occupancyData, {});
        const customSplits = parseJsonField(req.body.customSplits, {});

        const splitDetails = buildUtilitySplitDetails({
            splitMethod,
            tenants,
            utilities: { other: parsedTotalAmount },
            roomSizes: property.roomSizes,
            occupancyData,
            customSplits,
        });

        const createdShareTotal = roundCurrency(
            splitDetails.splits.reduce((sum, split) => sum + split.totalAmount, 0)
        );

        if (Math.abs(createdShareTotal - parsedTotalAmount) > 0.01) {
            cleanupUploadedFile(billDocument);
            return res.status(400).json({
                message: "Split amounts must add up to the total utility amount",
            });
        }

        const splitGroupId = new mongoose.Types.ObjectId().toString();
        const sharedDescription = buildUtilityBillDescription({
            propertyTitle: property.title,
            splitMethod,
            description,
        });

        const createdInvoices = await Invoice.insertMany(
            splitDetails.splits.map((split) => ({
                tenantId: split.tenantId,
                propertyId,
                landlordId: req.user._id,
                amount: split.totalAmount,
                type: "Utilities",
                dueDate: parsedDueDate,
                description: sharedDescription,
                breakdown: {
                    baseRent: 0,
                    utilities: {
                        electricity: roundCurrency(split.utilities?.electricity || 0),
                        water: roundCurrency(split.utilities?.water || 0),
                        internet: roundCurrency(split.utilities?.internet || 0),
                        gas: roundCurrency(split.utilities?.gas || 0),
                        waste: roundCurrency(split.utilities?.waste || 0),
                        other: roundCurrency(split.utilities?.other || 0),
                    },
                    totalUtilities: roundCurrency(split.totalAmount),
                },
                utilityBill: {
                    splitGroupId,
                    totalBillAmount: parsedTotalAmount,
                    splitMethod,
                    attachment: {
                        fileName: billDocument.filename,
                        originalName: billDocument.originalname,
                        filePath: billDocument.path,
                        mimeType: billDocument.mimetype,
                        size: billDocument.size,
                    },
                },
            }))
        );

        try {
            await Promise.all(
                splitDetails.splits.map((split) =>
                    createNotification(
                        split.userId,
                        "invoice",
                        `New utility invoice for ${property.title}: NPR ${split.totalAmount.toFixed(2)}`
                    )
                )
            );
        } catch (notificationError) {
            console.error(
                "Failed to send one or more utility invoice notifications:",
                notificationError.message
            );
        }

        const populatedInvoices = await populateInvoiceRelations(
            Invoice.find({ _id: { $in: createdInvoices.map((invoice) => invoice._id) } }).sort({
                createdAt: -1,
            })
        );

        res.status(201).json({
            success: true,
            message: `Created ${createdInvoices.length} utility invoices`,
            splitMethod,
            totalAmount: parsedTotalAmount,
            invoices: serializeInvoices(req, populatedInvoices),
        });
    } catch (error) {
        cleanupUploadedFile(billDocument);
        const statusCode =
            error.statusCode || (isUtilitySplitValidationError(error) ? 400 : 500);
        res.status(statusCode).json({ message: error.message });
    }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (Landlord only)
export const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (invoice.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await invoice.deleteOne();
        res.json({ message: "Invoice removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

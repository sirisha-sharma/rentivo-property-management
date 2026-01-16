import Invoice from "../models/invoiceModel.js";
import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private (Landlord only)
export const createInvoice = async (req, res) => {
    try {
        const { tenantId, propertyId, amount, type, dueDate, description } = req.body;

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

        const invoice = await Invoice.create({
            tenantId,
            propertyId,
            landlordId: req.user._id,
            amount,
            type,
            dueDate,
            description,
        });

        res.status(201).json(invoice);
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
        if (req.user.role === "Landlord") {
            invoices = await Invoice.find({ landlordId: req.user._id })
                .populate("tenantId")
                .populate("propertyId");
        } else if (req.user.role === "Tenant") {
            // Find the tenant record for this user to match invoice.tenantId
            // Ideally we should look up all tenant records for this user (user can be tenant in multiple places)
            // But for invoice lookup, we can look for invoices where tenantId matches any of the user's tenant records.
            // OR, simpler: The invoiceModel stores 'tenantId' which is the Tenant Document ID.
            // So we need to find Tenant Docs where userId == req.user._id
            const tenantRecords = await Tenant.find({ userId: req.user._id });
            const tenantIds = tenantRecords.map(t => t._id);

            invoices = await Invoice.find({ tenantId: { $in: tenantIds } })
                .populate("propertyId")
                .populate("landlordId", "name email");
        } else {
            return res.status(403).json({ message: "Invalid role" });
        }

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate("tenantId")
            .populate("propertyId")
            .populate("landlordId", "name email");

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Authorization check
        // Landlord can view if they created it
        // Tenant can view if it is for them (requires checking tenantId ownership)

        let isAuthorized = false;
        if (req.user.role === "Landlord" && invoice.landlordId._id.toString() === req.user._id.toString()) {
            isAuthorized = true;
        } else if (req.user.role === "Tenant") {
            const tenantRecord = await Tenant.findById(invoice.tenantId);
            if (tenantRecord && tenantRecord.userId.toString() === req.user._id.toString()) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(401).json({ message: "Not authorized to view this invoice" });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        const updatedInvoice = await invoice.save();

        res.json(updatedInvoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

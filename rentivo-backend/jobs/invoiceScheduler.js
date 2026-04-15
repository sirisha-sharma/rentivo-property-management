import cron from "node-cron";
import Invoice from "../models/invoiceModel.js";
import Tenant from "../models/tenantModel.js";
import "../models/propertyModel.js";
import { createNotification } from "../controllers/notificationController.js";

const RENT_INVOICE_TYPE = "Rent";

const buildBillingLabel = (referenceDate) =>
    referenceDate.toLocaleString("default", { month: "long", year: "numeric" });

const getStartOfDay = (referenceDate) => {
    const normalizedDate = new Date(referenceDate);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
};

const getNextMonthStart = (referenceDate) =>
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

const buildBaseRentBreakdown = (amount) => ({
    baseRent: amount,
    utilities: {
        electricity: 0,
        water: 0,
        internet: 0,
        gas: 0,
        waste: 0,
        other: 0,
    },
    totalUtilities: 0,
});

const getInvoiceDescription = (referenceDate) =>
    `Monthly rent for ${buildBillingLabel(referenceDate)}`;

const createDueDate = (referenceDate) => {
    const dueDate = new Date(referenceDate);
    dueDate.setDate(dueDate.getDate() + 15);
    return dueDate;
};

const logSummary = (label, summary) => {
    console.log(
        `${label} Created: ${summary.createdCount}, Would Create: ${summary.wouldCreateCount}, Duplicates: ${summary.duplicateCount}, Missing Rent: ${summary.missingRentCount}, Invalid Links: ${summary.invalidLinkCount}, Failures: ${summary.failedCount}`
    );
};

/**
 * Generate monthly rent invoices for tenants whose leases are active on the run date.
 * Uses property.rent as the invoice amount and prevents duplicate rent invoices
 * for the same billing month.
 */
export const generateMonthlyInvoices = async ({
    referenceDate = new Date(),
    dryRun = false,
} = {}) => {
    const runDate = new Date(referenceDate);
    if (Number.isNaN(runDate.getTime())) {
        throw new Error("Invalid referenceDate provided for invoice generation");
    }

    const billingDate = getStartOfDay(runDate);
    const monthStart = new Date(runDate.getFullYear(), runDate.getMonth(), 1);
    const nextMonthStart = getNextMonthStart(runDate);
    const invoiceDescription = getInvoiceDescription(runDate);
    const dueDate = createDueDate(runDate);
    const billingYear = runDate.getFullYear();
    const billingMonth = runDate.getMonth() + 1;

    console.log(
        `[${new Date().toISOString()}] Starting monthly invoice generation${dryRun ? " (dry run)" : ""}...`
    );

    const summary = {
        dryRun,
        runDate: runDate.toISOString(),
        billingYear,
        billingMonth,
        createdCount: 0,
        wouldCreateCount: 0,
        duplicateCount: 0,
        missingRentCount: 0,
        invalidLinkCount: 0,
        failedCount: 0,
        createdInvoices: [],
        skippedInvoices: [],
        failedInvoices: [],
    };

    const activeTenants = await Tenant.find({
        status: "Active",
        leaseStart: { $lte: billingDate },
        leaseEnd: { $gte: billingDate },
    })
        .populate("userId", "name email")
        .populate("propertyId", "title rent landlordId");

    if (activeTenants.length === 0) {
        console.log("No active tenants found for the selected run date.");
        return summary;
    }

    for (const tenant of activeTenants) {
        try {
            const property = tenant.propertyId;
            const tenantUser = tenant.userId;

            if (!property?._id || !property?.landlordId || !tenantUser?._id) {
                summary.invalidLinkCount++;
                summary.skippedInvoices.push({
                    tenantId: tenant._id.toString(),
                    propertyId: property?._id?.toString() || null,
                    reason: "Missing tenant user, property, or landlord link",
                });
                continue;
            }

            const rentAmount = Number(property.rent || 0);
            if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
                summary.missingRentCount++;
                summary.skippedInvoices.push({
                    tenantId: tenant._id.toString(),
                    propertyId: property._id.toString(),
                    propertyTitle: property.title,
                    reason: "Property rent is missing or zero",
                });
                continue;
            }

            const existingInvoice = await Invoice.findOne({
                tenantId: tenant._id,
                propertyId: property._id,
                type: RENT_INVOICE_TYPE,
                $or: [
                    { billingYear, billingMonth },
                    { description: invoiceDescription },
                    {
                        dueDate: {
                            $gte: monthStart,
                            $lt: nextMonthStart,
                        },
                    },
                ],
            }).select("_id");

            if (existingInvoice) {
                summary.duplicateCount++;
                summary.skippedInvoices.push({
                    tenantId: tenant._id.toString(),
                    propertyId: property._id.toString(),
                    propertyTitle: property.title,
                    reason: "Rent invoice already exists for this billing month",
                    existingInvoiceId: existingInvoice._id.toString(),
                });
                continue;
            }

            const invoicePayload = {
                tenantId: tenant._id,
                propertyId: property._id,
                landlordId: property.landlordId,
                amount: rentAmount,
                type: RENT_INVOICE_TYPE,
                dueDate,
                description: invoiceDescription,
                status: "Pending",
                billingYear,
                billingMonth,
                autoGenerated: true,
                breakdown: buildBaseRentBreakdown(rentAmount),
            };

            const invoicePreview = {
                tenantId: tenant._id.toString(),
                tenantName: tenantUser.name || "Tenant",
                propertyId: property._id.toString(),
                propertyTitle: property.title,
                landlordId: property.landlordId.toString(),
                amount: rentAmount,
                dueDate: dueDate.toISOString(),
                description: invoiceDescription,
            };

            if (dryRun) {
                summary.wouldCreateCount++;
                summary.createdInvoices.push(invoicePreview);
                continue;
            }

            const invoice = await Invoice.create(invoicePayload);

            await createNotification(
                tenantUser._id,
                "invoice",
                `Monthly rent invoice of NPR ${rentAmount} generated for ${property.title}. Due on ${dueDate.toLocaleDateString()}.`
            );

            await createNotification(
                property.landlordId,
                "invoice",
                `Monthly rent invoice of NPR ${rentAmount} created for ${tenantUser.name} at ${property.title}.`
            );

            summary.createdCount++;
            summary.createdInvoices.push({
                ...invoicePreview,
                invoiceId: invoice._id.toString(),
            });
            console.log(
                `✓ Invoice created for tenant: ${tenantUser.name} - Property: ${property.title} - Amount: NPR ${rentAmount}`
            );
        } catch (error) {
            summary.failedCount++;
            summary.failedInvoices.push({
                tenantId: tenant._id.toString(),
                error: error.message,
            });
            console.error(
                `✗ Failed to create invoice for tenant ${tenant.userId?.name || tenant._id}:`,
                error.message
            );
        }
    }

    console.log(`[${new Date().toISOString()}] Monthly invoice generation completed.`);
    logSummary("Invoice generation summary.", summary);
    return summary;
};

/**
 * Mark pending invoices as overdue once their due date is in the past.
 */
export const updateOverdueInvoices = async ({
    referenceDate = new Date(),
    dryRun = false,
} = {}) => {
    const runDate = getStartOfDay(referenceDate);

    console.log(
        `[${new Date().toISOString()}] Checking for overdue invoices${dryRun ? " (dry run)" : ""}...`
    );

    const overdueInvoices = await Invoice.find({
        status: "Pending",
        dueDate: { $lt: runDate },
    })
        .populate("tenantId")
        .populate("propertyId", "title");

    const summary = {
        dryRun,
        runDate: runDate.toISOString(),
        updatedCount: 0,
        wouldUpdateCount: 0,
        failedCount: 0,
        invoices: [],
    };

    if (overdueInvoices.length === 0) {
        console.log("No overdue invoices found.");
        return summary;
    }

    for (const invoice of overdueInvoices) {
        try {
            const tenantRecord = await Tenant.findById(invoice.tenantId);
            const invoiceSummary = {
                invoiceId: invoice._id.toString(),
                tenantId: tenantRecord?._id?.toString() || null,
                propertyTitle: invoice.propertyId?.title || "Property",
                amount: invoice.amount,
            };

            if (dryRun) {
                summary.wouldUpdateCount++;
                summary.invoices.push(invoiceSummary);
                continue;
            }

            invoice.status = "Overdue";
            await invoice.save();

            if (tenantRecord?.userId) {
                await createNotification(
                    tenantRecord.userId,
                    "invoice",
                    `Invoice for ${invoice.propertyId?.title || "your property"} is now overdue. Amount: NPR ${invoice.amount}.`
                );
            }

            summary.updatedCount++;
            summary.invoices.push(invoiceSummary);
            console.log(`✓ Invoice ${invoice._id} marked as Overdue`);
        } catch (error) {
            summary.failedCount++;
            console.error(`✗ Failed to update invoice ${invoice._id}:`, error.message);
        }
    }

    console.log(`[${new Date().toISOString()}] Overdue invoice update completed.`);
    console.log(
        `Overdue summary. Updated: ${summary.updatedCount}, Would Update: ${summary.wouldUpdateCount}, Failures: ${summary.failedCount}`
    );
    return summary;
};

/**
 * Automated Monthly Invoice Generation
 * Runs on the 1st of every month at 00:00 (midnight)
 */
const scheduleMonthlyInvoiceGeneration = () => {
    const cronExpression = "0 0 1 * *";

    cron.schedule(cronExpression, async () => {
        try {
            await generateMonthlyInvoices();
        } catch (error) {
            console.error("Error in monthly invoice generation job:", error);
        }
    });

    console.log("✓ Monthly invoice generation scheduled (runs on 1st of every month at 00:00)");
};

/**
 * Automated Overdue Invoice Status Update
 * Runs daily at 00:00 (midnight)
 */
const scheduleOverdueInvoiceUpdate = () => {
    const cronExpression = "0 0 * * *";

    cron.schedule(cronExpression, async () => {
        try {
            await updateOverdueInvoices();
        } catch (error) {
            console.error("Error in overdue invoice update job:", error);
        }
    });

    console.log("✓ Overdue invoice checker scheduled (runs daily at 00:00)");
};

/**
 * Start all scheduled jobs
 */
export const startScheduler = () => {
    console.log("\n=== Starting Invoice Scheduler ===");
    scheduleMonthlyInvoiceGeneration();
    scheduleOverdueInvoiceUpdate();
    console.log("=== Invoice Scheduler Started ===\n");
};

/**
 * Manual trigger helper retained for compatibility with older local scripts.
 */
export const testMonthlyInvoiceGeneration = async (options = {}) => {
    console.log("Testing monthly invoice generation...");
    return generateMonthlyInvoices(options);
};

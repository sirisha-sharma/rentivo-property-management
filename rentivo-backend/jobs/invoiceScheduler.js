import cron from "node-cron";
import Invoice from "../models/invoiceModel.js";
import Tenant from "../models/tenantModel.js";
import Property from "../models/propertyModel.js";
import { createNotification } from "../controllers/notificationController.js";

/**
 * Automated Monthly Invoice Generation
 * Runs on the 1st of every month at 00:00 (midnight)
 * Cron expression: '0 0 1 * *'
 * - 0: minute (0)
 * - 0: hour (00:00 / midnight)
 * - 1: day of month (1st)
 * - *: every month
 * - *: every day of week
 */
const scheduleMonthlyInvoiceGeneration = () => {
    // For testing: runs every minute - '* * * * *'
    // For production: runs 1st of every month - '0 0 1 * *'
    const cronExpression = '0 0 1 * *';

    cron.schedule(cronExpression, async () => {
        try {
            console.log(`[${new Date().toISOString()}] Starting monthly invoice generation...`);

            // Find all active tenants
            const activeTenants = await Tenant.find({ status: "Active" })
                .populate('userId', 'name email')
                .populate('propertyId');

            if (activeTenants.length === 0) {
                console.log("No active tenants found. Skipping invoice generation.");
                return;
            }

            let successCount = 0;
            let failureCount = 0;

            // Generate invoice for each active tenant
            for (const tenant of activeTenants) {
                try {
                    const property = tenant.propertyId;

                    // Calculate due date (15 days from now)
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 15);

                    // Create monthly rent invoice
                    // Note: This creates base rent invoice without utility breakdown
                    // Landlord can manually add utilities or use utility calculator
                    const invoice = await Invoice.create({
                        tenantId: tenant._id,
                        propertyId: property._id,
                        landlordId: property.landlordId,
                        amount: 0, // Landlord will need to set the amount
                        type: "Rent",
                        dueDate: dueDate,
                        description: `Monthly rent for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                        status: "Pending"
                    });

                    // Notify tenant about new invoice
                    await createNotification(
                        tenant.userId._id,
                        "invoice",
                        `Monthly rent invoice generated for ${property.title}. Due on ${dueDate.toLocaleDateString()}`
                    );

                    // Notify landlord about generated invoice
                    await createNotification(
                        property.landlordId,
                        "invoice",
                        `Monthly rent invoice created for ${tenant.userId.name} at ${property.title}`
                    );

                    successCount++;
                    console.log(`✓ Invoice created for tenant: ${tenant.userId.name} - Property: ${property.title}`);

                } catch (error) {
                    failureCount++;
                    console.error(`✗ Failed to create invoice for tenant ${tenant.userId?.name}:`, error.message);
                }
            }

            console.log(`[${new Date().toISOString()}] Monthly invoice generation completed.`);
            console.log(`Success: ${successCount}, Failures: ${failureCount}`);

        } catch (error) {
            console.error("Error in monthly invoice generation job:", error);
        }
    });

    console.log(`✓ Monthly invoice generation scheduled (runs on 1st of every month at 00:00)`);
};

/**
 * Automated Overdue Invoice Status Update
 * Runs daily at 00:00 (midnight)
 * Cron expression: '0 0 * * *'
 * - 0: minute (0)
 * - 0: hour (00:00 / midnight)
 * - *: every day of month
 * - *: every month
 * - *: every day of week
 */
const scheduleOverdueInvoiceUpdate = () => {
    // For testing: runs every minute - '* * * * *'
    // For production: runs daily at midnight - '0 0 * * *'
    const cronExpression = '0 0 * * *';

    cron.schedule(cronExpression, async () => {
        try {
            console.log(`[${new Date().toISOString()}] Checking for overdue invoices...`);

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day

            // Find all pending invoices with due date before today
            const overdueInvoices = await Invoice.find({
                status: "Pending",
                dueDate: { $lt: today }
            }).populate('tenantId')
              .populate('propertyId');

            if (overdueInvoices.length === 0) {
                console.log("No overdue invoices found.");
                return;
            }

            let updatedCount = 0;

            // Update status to Overdue and notify tenants
            for (const invoice of overdueInvoices) {
                try {
                    invoice.status = "Overdue";
                    await invoice.save();

                    // Get tenant user ID
                    const tenant = await Tenant.findById(invoice.tenantId);

                    if (tenant) {
                        // Notify tenant about overdue invoice
                        await createNotification(
                            tenant.userId,
                            "invoice",
                            `Invoice for ${invoice.propertyId.title} is now overdue. Amount: NPR ${invoice.amount}`
                        );
                    }

                    updatedCount++;
                    console.log(`✓ Invoice ${invoice._id} marked as Overdue`);

                } catch (error) {
                    console.error(`✗ Failed to update invoice ${invoice._id}:`, error.message);
                }
            }

            console.log(`[${new Date().toISOString()}] Overdue invoice update completed.`);
            console.log(`Updated ${updatedCount} invoices to Overdue status.`);

        } catch (error) {
            console.error("Error in overdue invoice update job:", error);
        }
    });

    console.log(`✓ Overdue invoice checker scheduled (runs daily at 00:00)`);
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
 * For testing purposes - manually trigger monthly invoice generation
 */
export const testMonthlyInvoiceGeneration = async () => {
    console.log("Testing monthly invoice generation...");
    // Execute the same logic as the scheduled job
    // Implementation goes here if needed for testing
};

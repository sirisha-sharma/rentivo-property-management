import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import Invoice from "../models/invoiceModel.js";

// This function gets the dashboard statistics for the landlord
// Returns counts for properties, tenants, pending tenants, and invoices
export const getStats = async (req, res) => {
    try {
        // Get properties count for landlord
        const propertiesCount = await Property.countDocuments({ landlordId: req.user._id });

        // Get property IDs for this landlord
        const properties = await Property.find({ landlordId: req.user._id });
        const propertyIds = properties.map(p => p._id);

        // Get tenant counts
        const tenantsCount = await Tenant.countDocuments({
            propertyId: { $in: propertyIds },
            status: "Active"
        });

        const pendingTenantsCount = await Tenant.countDocuments({
            propertyId: { $in: propertyIds },
            status: "Pending"
        });

        // Get invoice counts for landlord
        const totalInvoices = await Invoice.countDocuments({ landlordId: req.user._id });
        const pendingInvoices = await Invoice.countDocuments({ landlordId: req.user._id, status: "Pending" });
        const paidInvoices = await Invoice.countDocuments({ landlordId: req.user._id, status: "Paid" });
        const overdueInvoices = await Invoice.countDocuments({ landlordId: req.user._id, status: "Overdue" });

        res.status(200).json({
            propertiesCount,
            tenantsCount,
            pendingTenantsCount,
            totalInvoices,
            pendingInvoices,
            paidInvoices,
            overdueInvoices
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// This function gets the dashboard statistics for the tenant
// Returns counts for active rentals, pending invitations, and invoices
export const getTenantStats = async (req, res) => {
    try {
        // Get active tenancies for this tenant
        const activeProperties = await Tenant.countDocuments({
            userId: req.user._id,
            status: "Active"
        });

        const pendingInvitations = await Tenant.countDocuments({
            userId: req.user._id,
            status: "Pending"
        });

        // Get tenant records to find invoices
        const tenantRecords = await Tenant.find({ userId: req.user._id });
        const tenantIds = tenantRecords.map(t => t._id);

        // Get invoice counts for tenant
        const totalInvoices = await Invoice.countDocuments({ tenantId: { $in: tenantIds } });
        const pendingInvoices = await Invoice.countDocuments({ tenantId: { $in: tenantIds }, status: "Pending" });
        const paidInvoices = await Invoice.countDocuments({ tenantId: { $in: tenantIds }, status: "Paid" });

        res.status(200).json({
            activeProperties,
            pendingInvitations,
            totalInvoices,
            pendingInvoices,
            paidInvoices
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

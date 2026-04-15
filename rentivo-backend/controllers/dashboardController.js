import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import Invoice from "../models/invoiceModel.js";
import Maintenance from "../models/maintenanceModel.js";

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

// This function returns chart-friendly dashboard data for landlords.
// It includes monthly rent collection, payment breakdown, occupancy, and maintenance stats.
export const getLandlordChartData = async (req, res) => {
    try {
        if (req.user.role !== "landlord") {
            return res.status(403).json({ message: "Only landlords can access chart data" });
        }

        const landlordId = req.user._id;
        const properties = await Property.find({ landlordId }).select("_id");
        const propertyIds = properties.map((property) => property._id);
        const totalProperties = properties.length;

        const now = new Date();
        const chartMonths = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
            return {
                label: date.toLocaleDateString("en-US", { month: "short" }),
                month: date.getMonth() + 1,
                year: date.getFullYear(),
            };
        });

        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const monthlyPaidInvoices = await Invoice.aggregate([
            {
                $match: {
                    landlordId,
                    status: "Paid",
                    paidDate: { $gte: sixMonthsAgo },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$paidDate" },
                        month: { $month: "$paidDate" },
                    },
                    totalAmount: { $sum: "$amount" },
                },
            },
        ]);

        const monthlyRentCollection = chartMonths.map(({ label, month, year }) => {
            const matchedMonth = monthlyPaidInvoices.find(
                (item) => item._id.month === month && item._id.year === year
            );

            return {
                label,
                value: matchedMonth?.totalAmount || 0,
            };
        });

        const paymentStatusBreakdown = await Invoice.aggregate([
            { $match: { landlordId } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const paymentStatusMap = paymentStatusBreakdown.reduce(
            (accumulator, item) => ({
                ...accumulator,
                [item._id]: item.count,
            }),
            { Paid: 0, Pending: 0, Overdue: 0 }
        );

        const occupiedPropertyIds = await Tenant.distinct("propertyId", {
            propertyId: { $in: propertyIds },
            status: "Active",
        });
        const occupiedProperties = occupiedPropertyIds.length;
        const occupancyRate =
            totalProperties > 0 ? Number(((occupiedProperties / totalProperties) * 100).toFixed(1)) : 0;

        const maintenanceBreakdown = await Maintenance.aggregate([
            {
                $match: {
                    propertyId: { $in: propertyIds },
                },
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const maintenanceStats = maintenanceBreakdown.reduce(
            (accumulator, item) => {
                if (item._id === "Resolved") {
                    accumulator.resolved = item.count;
                } else {
                    accumulator.pending += item.count;
                }

                return accumulator;
            },
            { pending: 0, resolved: 0 }
        );

        res.status(200).json({
            monthlyRentCollection,
            paymentStatusBreakdown: paymentStatusMap,
            occupancy: {
                occupiedProperties,
                totalProperties,
                occupancyRate,
            },
            maintenanceStats,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

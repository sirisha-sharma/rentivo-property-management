import Invoice from "../models/invoiceModel.js";
import Maintenance from "../models/maintenanceModel.js";
import Property from "../models/propertyModel.js";
import Subscription from "../models/subscriptionModel.js";
import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import PropertyRating from "../models/propertyRatingModel.js";
import PropertyAssociation from "../models/propertyAssociationModel.js";

const escapeRegex = (value = "") =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchRegex = (value) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed ? new RegExp(escapeRegex(trimmed), "i") : null;
};

const matchesSearch = (regex, values = []) => {
    if (!regex) return true;

    return values.some((value) => {
        if (value === null || value === undefined) return false;
        return regex.test(String(value));
    });
};

const buildRecentMonthSeries = (items, field) => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return {
            key: `${date.getFullYear()}-${date.getMonth() + 1}`,
            label: date.toLocaleDateString("en-US", { month: "short" }),
            year: date.getFullYear(),
            month: date.getMonth() + 1,
        };
    });

    const counts = new Map();

    items.forEach((item) => {
        const dateValue = new Date(item[field]);
        if (Number.isNaN(dateValue.getTime())) return;
        counts.set(
            `${dateValue.getFullYear()}-${dateValue.getMonth() + 1}`,
            (counts.get(`${dateValue.getFullYear()}-${dateValue.getMonth() + 1}`) || 0) + 1
        );
    });

    return months.map(({ key, label }) => ({
        label,
        value: counts.get(key) || 0,
    }));
};

const serializeUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive !== false,
    isEmailVerified: Boolean(user.isEmailVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const serializeProperty = (property, tenantCountsMap = new Map()) => {
    const counts = tenantCountsMap.get(String(property._id)) || {
        active: 0,
        pending: 0,
        total: 0,
    };

    return {
        _id: property._id,
        title: property.title,
        address: property.address,
        district: property.district || null,
        type: property.type,
        units: property.units,
        rent: property.rent,
        status: property.status,
        createdAt: property.createdAt,
        landlord: property.landlordId
            ? {
                  _id: property.landlordId._id,
                  name: property.landlordId.name,
                  email: property.landlordId.email,
                  phone: property.landlordId.phone,
                  isActive: property.landlordId.isActive !== false,
              }
            : null,
        activeTenantCount: counts.active,
        pendingTenantCount: counts.pending,
        totalTenantCount: counts.total,
    };
};

const buildTenantCountsMap = async (propertyIds) => {
    if (!propertyIds.length) {
        return new Map();
    }

    const grouped = await Tenant.aggregate([
        {
            $match: {
                propertyId: { $in: propertyIds },
            },
        },
        {
            $group: {
                _id: {
                    propertyId: "$propertyId",
                    status: "$status",
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const countsMap = new Map();

    grouped.forEach((item) => {
        const propertyId = String(item._id.propertyId);
        const next = countsMap.get(propertyId) || {
            active: 0,
            pending: 0,
            total: 0,
        };

        next.total += item.count;
        if (item._id.status === "Active") next.active = item.count;
        if (item._id.status === "Pending") next.pending = item.count;

        countsMap.set(propertyId, next);
    });

    return countsMap;
};

export const getAdminOverview = async (_req, res) => {
    try {
        const [
            totalUsers,
            landlordCount,
            tenantCount,
            adminCount,
            activeUsers,
            inactiveUsers,
            verifiedUsers,
            totalProperties,
            vacantProperties,
            occupiedProperties,
            maintenanceProperties,
            activeTenancies,
            pendingTenancies,
            pastTenancies,
            totalInvoices,
            pendingInvoices,
            paidInvoices,
            overdueInvoices,
            openMaintenance,
            inProgressMaintenance,
            resolvedMaintenance,
            totalSubscriptions,
            activeSubscriptions,
            trialSubscriptions,
            expiredSubscriptions,
            pendingSubscriptions,
            recentUsersRaw,
            recentPropertiesRaw,
            recentMaintenanceRaw,
            sixMonthUsers,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "landlord" }),
            User.countDocuments({ role: "tenant" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ isActive: { $ne: false } }),
            User.countDocuments({ isActive: false }),
            User.countDocuments({ isEmailVerified: true }),
            Property.countDocuments(),
            Property.countDocuments({ status: "vacant" }),
            Property.countDocuments({ status: "occupied" }),
            Property.countDocuments({ status: "maintenance" }),
            Tenant.countDocuments({ status: "Active" }),
            Tenant.countDocuments({ status: "Pending" }),
            Tenant.countDocuments({ status: "Past" }),
            Invoice.countDocuments(),
            Invoice.countDocuments({ status: "Pending" }),
            Invoice.countDocuments({ status: "Paid" }),
            Invoice.countDocuments({ status: "Overdue" }),
            Maintenance.countDocuments({ status: { $in: ["Open", "Pending"] } }),
            Maintenance.countDocuments({ status: "In Progress" }),
            Maintenance.countDocuments({ status: "Resolved" }),
            Subscription.countDocuments(),
            Subscription.countDocuments({ status: "active" }),
            Subscription.countDocuments({ status: "trialing" }),
            Subscription.countDocuments({ status: "expired" }),
            Subscription.countDocuments({ status: "pending_payment" }),
            User.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .select("name email phone role isActive isEmailVerified createdAt updatedAt"),
            Property.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("landlordId", "name email phone isActive")
                .select("title address district type units rent status landlordId createdAt"),
            Maintenance.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate({
                    path: "tenantId",
                    populate: { path: "userId", select: "name email" },
                })
                .populate({
                    path: "propertyId",
                    select: "title landlordId",
                    populate: { path: "landlordId", select: "name email" },
                })
                .select("title status priority createdAt tenantId propertyId"),
            User.find({
                createdAt: {
                    $gte: new Date(
                        new Date().getFullYear(),
                        new Date().getMonth() - 5,
                        1
                    ),
                },
            }).select("createdAt"),
        ]);

        const recentProperties = recentPropertiesRaw.map((property) =>
            serializeProperty(property)
        );

        const recentMaintenance = recentMaintenanceRaw.map((item) => ({
            _id: item._id,
            title: item.title,
            status: item.status,
            priority: item.priority,
            createdAt: item.createdAt,
            tenantName: item.tenantId?.userId?.name || "Unknown tenant",
            propertyTitle: item.propertyId?.title || "Unknown property",
            landlordName: item.propertyId?.landlordId?.name || "Unknown landlord",
        }));

        res.json({
            summary: {
                totalUsers,
                landlordCount,
                tenantCount,
                adminCount,
                activeUsers,
                inactiveUsers,
                verifiedUsers,
                totalProperties,
                vacantProperties,
                occupiedProperties,
                maintenanceProperties,
                activeTenancies,
                pendingTenancies,
                pastTenancies,
                totalInvoices,
                pendingInvoices,
                paidInvoices,
                overdueInvoices,
                openMaintenance,
                inProgressMaintenance,
                resolvedMaintenance,
                totalSubscriptions,
                activeSubscriptions,
                trialSubscriptions,
                expiredSubscriptions,
                pendingSubscriptions,
            },
            charts: {
                userSignups: buildRecentMonthSeries(sixMonthUsers, "createdAt"),
                propertyStatusBreakdown: {
                    occupied: occupiedProperties,
                    vacant: vacantProperties,
                    maintenance: maintenanceProperties,
                },
                invoiceStatusBreakdown: {
                    Paid: paidInvoices,
                    Pending: pendingInvoices,
                    Overdue: overdueInvoices,
                },
            },
            recents: {
                users: recentUsersRaw.map(serializeUser),
                properties: recentProperties,
                maintenance: recentMaintenance,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch admin overview" });
    }
};

export const getAdminUsers = async (req, res) => {
    try {
        const { search = "", role = "all", status = "all", verification = "all" } = req.query;
        const searchRegex = buildSearchRegex(search);
        const query = {};

        if (["landlord", "tenant", "admin"].includes(role)) {
            query.role = role;
        }

        if (status === "active") {
            query.isActive = true;
        } else if (status === "inactive") {
            query.isActive = false;
        }

        if (verification === "verified") {
            query.isEmailVerified = true;
        } else if (verification === "unverified") {
            query.isEmailVerified = false;
        }

        if (searchRegex) {
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
            ];
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .select(
                "name email phone role isActive isEmailVerified createdAt updatedAt"
            );

        res.json({
            users: users.map(serializeUser),
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
};

export const updateAdminUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                message: "A boolean isActive value is required.",
            });
        }

        if (String(req.user._id) === String(req.params.id) && !isActive) {
            return res.status(400).json({
                message: "You cannot deactivate your own admin account.",
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.isActive = isActive;
        await user.save();

        res.json({
            message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
            user: serializeUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to update user status" });
    }
};

export const getAdminProperties = async (req, res) => {
    try {
        const { search = "", status = "all", district = "all" } = req.query;
        const searchRegex = buildSearchRegex(search);
        const query = {};

        if (["vacant", "occupied", "maintenance"].includes(status)) {
            query.status = status;
        }

        if (district && district !== "all") {
            query.district = district;
        }

        if (searchRegex) {
            query.$or = [{ title: searchRegex }, { address: searchRegex }];
        }

        const properties = await Property.find(query)
            .sort({ createdAt: -1 })
            .populate("landlordId", "name email phone isActive");

        const tenantCountsMap = await buildTenantCountsMap(
            properties.map((property) => property._id)
        );

        res.json({
            properties: properties.map((property) =>
                serializeProperty(property, tenantCountsMap)
            ),
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch properties" });
    }
};

export const getAdminTenancies = async (req, res) => {
    try {
        const { search = "", status = "all" } = req.query;
        const query = {};
        const searchRegex = buildSearchRegex(search);

        if (["Active", "Pending", "Past"].includes(status)) {
            query.status = status;
        }

        const tenanciesRaw = await Tenant.find(query)
            .sort({ createdAt: -1 })
            .populate("userId", "name email phone isActive")
            .populate({
                path: "propertyId",
                select: "title address district status landlordId",
                populate: {
                    path: "landlordId",
                    select: "name email phone isActive",
                },
            });

        const tenancies = tenanciesRaw
            .filter((item) =>
                matchesSearch(searchRegex, [
                    item.userId?.name,
                    item.userId?.email,
                    item.propertyId?.title,
                    item.propertyId?.address,
                    item.propertyId?.district,
                    item.propertyId?.landlordId?.name,
                ])
            )
            .map((item) => ({
                _id: item._id,
                status: item.status,
                leaseStart: item.leaseStart,
                leaseEnd: item.leaseEnd,
                securityDeposit: item.securityDeposit,
                createdAt: item.createdAt,
                tenant: item.userId
                    ? {
                          _id: item.userId._id,
                          name: item.userId.name,
                          email: item.userId.email,
                          phone: item.userId.phone,
                          isActive: item.userId.isActive !== false,
                      }
                    : null,
                property: item.propertyId
                    ? {
                          _id: item.propertyId._id,
                          title: item.propertyId.title,
                          address: item.propertyId.address,
                          district: item.propertyId.district,
                          status: item.propertyId.status,
                      }
                    : null,
                landlord: item.propertyId?.landlordId
                    ? {
                          _id: item.propertyId.landlordId._id,
                          name: item.propertyId.landlordId.name,
                          email: item.propertyId.landlordId.email,
                      }
                    : null,
            }));

        res.json({ tenancies });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch tenancies" });
    }
};

export const getAdminInvoices = async (req, res) => {
    try {
        const { search = "", status = "all", type = "all" } = req.query;
        const query = {};
        const searchRegex = buildSearchRegex(search);

        if (["Pending", "Paid", "Overdue"].includes(status)) {
            query.status = status;
        }

        if (["Rent", "Maintenance", "Utilities", "Other"].includes(type)) {
            query.type = type;
        }

        const invoicesRaw = await Invoice.find(query)
            .sort({ createdAt: -1 })
            .populate({
                path: "tenantId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate("propertyId", "title address district")
            .populate("landlordId", "name email");

        const invoices = invoicesRaw
            .filter((item) =>
                matchesSearch(searchRegex, [
                    item.propertyId?.title,
                    item.propertyId?.address,
                    item.tenantId?.userId?.name,
                    item.tenantId?.userId?.email,
                    item.landlordId?.name,
                    item.description,
                    item.type,
                ])
            )
            .map((item) => ({
                _id: item._id,
                amount: item.amount,
                type: item.type,
                status: item.status,
                dueDate: item.dueDate,
                paidDate: item.paidDate,
                description: item.description || "",
                createdAt: item.createdAt,
                propertyTitle: item.propertyId?.title || "Unknown property",
                tenantName: item.tenantId?.userId?.name || "Unknown tenant",
                tenantEmail: item.tenantId?.userId?.email || "",
                landlordName: item.landlordId?.name || "Unknown landlord",
            }));

        res.json({ invoices });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch invoices" });
    }
};

export const getAdminMaintenance = async (req, res) => {
    try {
        const { search = "", status = "all", priority = "all" } = req.query;
        const query = {};
        const searchRegex = buildSearchRegex(search);

        if (["Open", "Pending", "In Progress", "Resolved"].includes(status)) {
            query.status = status;
        }

        if (["Low", "Medium", "High"].includes(priority)) {
            query.priority = priority;
        }

        const maintenanceRaw = await Maintenance.find(query)
            .sort({ createdAt: -1 })
            .populate({
                path: "tenantId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "propertyId",
                select: "title address district landlordId",
                populate: { path: "landlordId", select: "name email" },
            });

        const maintenance = maintenanceRaw
            .filter((item) =>
                matchesSearch(searchRegex, [
                    item.title,
                    item.description,
                    item.propertyId?.title,
                    item.propertyId?.address,
                    item.tenantId?.userId?.name,
                    item.propertyId?.landlordId?.name,
                ])
            )
            .map((item) => ({
                _id: item._id,
                title: item.title,
                description: item.description || "",
                priority: item.priority,
                status: item.status,
                createdAt: item.createdAt,
                propertyTitle: item.propertyId?.title || "Unknown property",
                tenantName: item.tenantId?.userId?.name || "Unknown tenant",
                landlordName: item.propertyId?.landlordId?.name || "Unknown landlord",
            }));

        res.json({ maintenance });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch maintenance" });
    }
};

export const getAdminSubscriptions = async (req, res) => {
    try {
        const { search = "", status = "all", plan = "all" } = req.query;
        const query = {};
        const searchRegex = buildSearchRegex(search);

        if (["trialing", "active", "expired", "cancelled", "pending_payment"].includes(status)) {
            query.status = status;
        }

        if (["trial", "monthly", "yearly"].includes(plan)) {
            query.plan = plan;
        }

        const subscriptionsRaw = await Subscription.find(query)
            .sort({ createdAt: -1 })
            .populate("landlordId", "name email phone isActive");

        const subscriptions = subscriptionsRaw
            .filter((item) =>
                matchesSearch(searchRegex, [
                    item.landlordId?.name,
                    item.landlordId?.email,
                    item.plan,
                    item.status,
                    item.gateway,
                ])
            )
            .map((item) => ({
                _id: item._id,
                plan: item.plan,
                status: item.status,
                billingCycle: item.billingCycle,
                paymentStatus: item.paymentStatus,
                gateway: item.gateway || null,
                startDate: item.startDate,
                endDate: item.endDate,
                createdAt: item.createdAt,
                landlord: item.landlordId
                    ? {
                          _id: item.landlordId._id,
                          name: item.landlordId.name,
                          email: item.landlordId.email,
                          phone: item.landlordId.phone,
                          isActive: item.landlordId.isActive !== false,
                      }
                    : null,
            }));

        res.json({ subscriptions });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch subscriptions" });
    }
};

export const deleteAdminProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        const activeTenantCount = await Tenant.countDocuments({
            propertyId: property._id,
            status: "Active",
        });

        if (activeTenantCount > 0) {
            return res.status(400).json({
                message: "Cannot delete a property that still has active tenants",
            });
        }

        await Promise.all([
            PropertyRating.deleteMany({ propertyId: property._id }),
            PropertyAssociation.deleteMany({ propertyId: property._id }),
            property.deleteOne(),
        ]);

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to delete property" });
    }
};

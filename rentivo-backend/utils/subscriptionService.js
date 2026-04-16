import Property from "../models/propertyModel.js";
import Subscription from "../models/subscriptionModel.js";
import Tenant from "../models/tenantModel.js";

export const SUBSCRIPTION_ACTIONS = Object.freeze({
    ADD_PROPERTY: "add_property",
    INVITE_TENANT: "invite_tenant",
});

export const TRIAL_DURATION_DAYS = 14;

export const TRIAL_LIMITS = Object.freeze({
    properties: 1,
    tenantSeats: 1,
    tenantStatuses: ["Active", "Pending"],
});

const SUBSCRIPTION_BLOCKED_STATUSES = new Set([
    "expired",
    "cancelled",
    "pending_payment",
]);

const EXPIRABLE_STATUSES = new Set(["trialing", "active", "pending_payment"]);

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const calculateDaysRemaining = (endDate, now = new Date()) => {
    if (!endDate) return null;

    const remainingMs = new Date(endDate).getTime() - now.getTime();
    if (remainingMs <= 0) return 0;

    return Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
};

const getPropertyIdsForLandlord = async (landlordId) => {
    const properties = await Property.find({ landlordId }).select("_id").lean();
    return properties.map((property) => property._id);
};

export const ensureTrialSubscription = async (landlordId, now = new Date()) => {
    const startDate = new Date(now);
    const endDate = addDays(startDate, TRIAL_DURATION_DAYS);

    try {
        return await Subscription.create({
            landlordId,
            plan: "trial",
            status: "trialing",
            billingCycle: "trial",
            startDate,
            endDate,
            paymentStatus: "not_required",
        });
    } catch (error) {
        if (error?.code === 11000) {
            return Subscription.findOne({ landlordId });
        }

        throw error;
    }
};

export const syncSubscriptionStatus = async (subscription, now = new Date()) => {
    if (!subscription) return null;

    if (
        subscription.endDate &&
        EXPIRABLE_STATUSES.has(subscription.status) &&
        new Date(subscription.endDate).getTime() <= now.getTime()
    ) {
        subscription.status = "expired";
        await subscription.save();
    }

    return subscription;
};

export const getOrCreateLandlordSubscription = async (user, now = new Date()) => {
    if (!user || user.role !== "landlord") {
        return null;
    }

    let subscription = await Subscription.findOne({ landlordId: user._id });

    if (!subscription) {
        subscription = await ensureTrialSubscription(user._id, now);
    }

    return syncSubscriptionStatus(subscription, now);
};

export const getLandlordUsage = async (landlordId) => {
    const propertyIds = await getPropertyIdsForLandlord(landlordId);

    if (propertyIds.length === 0) {
        return {
            propertyCount: 0,
            activeTenantCount: 0,
            managedTenantCount: 0,
        };
    }

    const [activeTenantCount, managedTenantCount] = await Promise.all([
        Tenant.countDocuments({
            propertyId: { $in: propertyIds },
            status: "Active",
        }),
        Tenant.countDocuments({
            propertyId: { $in: propertyIds },
            status: { $in: TRIAL_LIMITS.tenantStatuses },
        }),
    ]);

    return {
        propertyCount: propertyIds.length,
        activeTenantCount,
        managedTenantCount,
    };
};

const buildTrialAccess = (usage) => ({
    canAddProperty: usage.propertyCount < TRIAL_LIMITS.properties,
    canInviteTenant: usage.managedTenantCount < TRIAL_LIMITS.tenantSeats,
});

export const buildSubscriptionSnapshot = (
    subscription,
    usage = null,
    now = new Date()
) => {
    if (!subscription) {
        return null;
    }

    const isExpired =
        subscription.status === "expired" ||
        (subscription.endDate
            ? new Date(subscription.endDate).getTime() <= now.getTime()
            : false);

    const baseAccess =
        subscription.plan === "trial" && usage
            ? buildTrialAccess(usage)
            : {
                canAddProperty: true,
                canInviteTenant: true,
            };

    const access =
        isExpired || SUBSCRIPTION_BLOCKED_STATUSES.has(subscription.status)
            ? {
                canAddProperty: false,
                canInviteTenant: false,
            }
            : baseAccess;

    return {
        requiresSubscription: true,
        plan: subscription.plan,
        status: isExpired ? "expired" : subscription.status,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        paymentStatus: subscription.paymentStatus,
        paymentReference: subscription.paymentReference || null,
        gateway: subscription.gateway || null,
        isExpired,
        daysRemaining: calculateDaysRemaining(subscription.endDate, now),
        limits:
            subscription.plan === "trial"
                ? {
                    properties: TRIAL_LIMITS.properties,
                    tenantSeats: TRIAL_LIMITS.tenantSeats,
                    tenantSeatStatuses: TRIAL_LIMITS.tenantStatuses,
                }
                : null,
        usage,
        access,
    };
};

const buildDeniedResult = ({
    code,
    message,
    subscription,
    usage,
    upgradeRequired = true,
    now = new Date(),
}) => ({
    allowed: false,
    code,
    message,
    upgradeRequired,
    subscription: buildSubscriptionSnapshot(subscription, usage, now),
});

export const evaluateLandlordSubscriptionAction = ({
    subscription,
    usage,
    action,
    now = new Date(),
}) => {
    if (!subscription) {
        return buildDeniedResult({
            code: "SUBSCRIPTION_REQUIRED",
            message: "A landlord subscription is required to continue.",
            subscription,
            usage,
            now,
        });
    }

    if (
        subscription.endDate &&
        new Date(subscription.endDate).getTime() <= now.getTime() &&
        subscription.status !== "expired"
    ) {
        subscription.status = "expired";
    }

    if (subscription.status === "expired") {
        return buildDeniedResult({
            code: "SUBSCRIPTION_EXPIRED",
            message:
                "Your landlord subscription has expired. Upgrade to Monthly or Yearly to continue this action.",
            subscription,
            usage,
            now,
        });
    }

    if (subscription.status === "cancelled") {
        return buildDeniedResult({
            code: "SUBSCRIPTION_CANCELLED",
            message:
                "Your landlord subscription is cancelled. Upgrade to Monthly or Yearly to continue this action.",
            subscription,
            usage,
            now,
        });
    }

    if (subscription.status === "pending_payment") {
        return buildDeniedResult({
            code: "SUBSCRIPTION_PENDING_PAYMENT",
            message:
                "Your subscription payment is still pending. Complete payment or choose a plan to continue.",
            subscription,
            usage,
            now,
        });
    }

    if (subscription.plan === "trial") {
        if (
            action === SUBSCRIPTION_ACTIONS.ADD_PROPERTY &&
            usage.propertyCount >= TRIAL_LIMITS.properties
        ) {
            return buildDeniedResult({
                code: "TRIAL_PROPERTY_LIMIT_REACHED",
                message:
                    "Your Trial plan includes up to 1 property. Upgrade to Monthly or Yearly to add more properties.",
                subscription,
                usage,
                now,
            });
        }

        if (
            action === SUBSCRIPTION_ACTIONS.INVITE_TENANT &&
            usage.managedTenantCount >= TRIAL_LIMITS.tenantSeats
        ) {
            return buildDeniedResult({
                code: "TRIAL_TENANT_LIMIT_REACHED",
                message:
                    "Your Trial plan includes up to 1 tenant seat, including pending invitations. Upgrade to Monthly or Yearly to invite more tenants.",
                subscription,
                usage,
                now,
            });
        }
    }

    return {
        allowed: true,
        code: null,
        message: null,
        upgradeRequired: false,
        subscription: buildSubscriptionSnapshot(subscription, usage, now),
    };
};

export const getTenantSubscriptionSnapshot = () => ({
    plan: "free",
    status: "active",
    billingCycle: "free",
    startDate: null,
    endDate: null,
    paymentStatus: "not_required",
    paymentReference: null,
    gateway: null,
    isExpired: false,
    daysRemaining: null,
    limits: null,
    usage: null,
    access: {
        canAddProperty: false,
        canInviteTenant: false,
    },
    requiresSubscription: false,
    message: "Tenants use Rentivo for free.",
});

import Property from "../models/propertyModel.js";
import Subscription from "../models/subscriptionModel.js";
import Tenant from "../models/tenantModel.js";

export const SUBSCRIPTION_ACTIONS = Object.freeze({
    ADD_PROPERTY: "add_property",
    INVITE_TENANT: "invite_tenant",
});

export const SUBSCRIPTION_GATEWAYS = Object.freeze(["esewa", "khalti"]);

export const TRIAL_DURATION_DAYS = 14;
export const SUBSCRIPTION_EXPIRY_REMINDER_DAYS = 3;

export const TRIAL_LIMITS = Object.freeze({
    properties: 1,
    tenantSeats: 1,
    tenantStatuses: ["Active", "Pending"],
});

const PAID_PLAN_DEFAULTS = Object.freeze({
    monthly: {
        plan: "monthly",
        label: "Monthly",
        billingCycle: "monthly",
        durationDays: 30,
        amount: 999,
        fullAccess: true,
    },
    yearly: {
        plan: "yearly",
        label: "Yearly",
        billingCycle: "yearly",
        durationDays: 365,
        amount: 9999,
        fullAccess: true,
    },
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

const parsePlanAmount = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getSubscriptionPlanCatalog = () => {
    const monthlyAmount = parsePlanAmount(
        process.env.SUBSCRIPTION_MONTHLY_PRICE,
        PAID_PLAN_DEFAULTS.monthly.amount
    );
    const yearlyAmount = parsePlanAmount(
        process.env.SUBSCRIPTION_YEARLY_PRICE,
        PAID_PLAN_DEFAULTS.yearly.amount
    );

    return {
        trial: {
            plan: "trial",
            label: "Trial",
            billingCycle: "trial",
            durationDays: TRIAL_DURATION_DAYS,
            amount: 0,
            fullAccess: false,
            limits: {
                properties: TRIAL_LIMITS.properties,
                tenantSeats: TRIAL_LIMITS.tenantSeats,
            },
        },
        monthly: {
            ...PAID_PLAN_DEFAULTS.monthly,
            amount: monthlyAmount,
        },
        yearly: {
            ...PAID_PLAN_DEFAULTS.yearly,
            amount: yearlyAmount,
        },
    };
};

export const getSubscriptionPlansForClient = () =>
    Object.values(getSubscriptionPlanCatalog()).map((plan) => ({
        plan: plan.plan,
        label: plan.label,
        billingCycle: plan.billingCycle,
        amount: plan.amount,
        durationDays: plan.durationDays,
        fullAccess: plan.fullAccess,
        limits: plan.limits || null,
    }));

export const getPaidSubscriptionPlan = (planKey) => {
    const catalog = getSubscriptionPlanCatalog();
    const plan = catalog[planKey];

    if (!plan || plan.plan === "trial") {
        return null;
    }

    return plan;
};

export const calculateDaysRemaining = (endDate, now = new Date()) => {
    if (!endDate) return null;

    const remainingMs = new Date(endDate).getTime() - now.getTime();
    if (remainingMs <= 0) return 0;

    return Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
};

export const shouldExpireSubscription = (subscription, now = new Date()) =>
    Boolean(
        subscription?.endDate &&
            EXPIRABLE_STATUSES.has(subscription.status) &&
            new Date(subscription.endDate).getTime() <= now.getTime()
    );

export const isSubscriptionExpiringSoon = (
    subscription,
    now = new Date(),
    reminderWindowDays = SUBSCRIPTION_EXPIRY_REMINDER_DAYS
) => {
    if (!subscription?.endDate || !["trialing", "active"].includes(subscription.status)) {
        return false;
    }

    const daysRemaining = calculateDaysRemaining(subscription.endDate, now);
    return (
        daysRemaining !== null &&
        daysRemaining > 0 &&
        daysRemaining <= reminderWindowDays
    );
};

const getSnapshotPlanAmount = (plan) =>
    getSubscriptionPlanCatalog()[plan]?.amount ?? 0;

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

    if (shouldExpireSubscription(subscription, now)) {
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

export const applyPaidSubscriptionPlan = async ({
    subscription,
    planKey,
    gateway,
    paymentReference,
    now = new Date(),
}) => {
    const plan = getPaidSubscriptionPlan(planKey);

    if (!plan) {
        throw new Error("Invalid subscription plan selected");
    }

    const normalizedNow = new Date(now);
    const hasActivePaidAccess =
        subscription.plan !== "trial" &&
        subscription.status === "active" &&
        subscription.endDate &&
        new Date(subscription.endDate).getTime() > normalizedNow.getTime();

    const periodStart = hasActivePaidAccess
        ? new Date(subscription.endDate)
        : normalizedNow;
    const periodEnd = addDays(periodStart, plan.durationDays);

    subscription.plan = plan.plan;
    subscription.billingCycle = plan.billingCycle;
    subscription.status = "active";
    subscription.startDate = normalizedNow;
    subscription.endDate = periodEnd;
    subscription.paymentStatus = "paid";
    subscription.paymentReference = paymentReference || subscription.paymentReference;
    subscription.gateway = gateway || subscription.gateway;
    subscription.cancelledAt = undefined;
    subscription.expiryReminderSentAt = undefined;
    subscription.expiryReminderForDate = undefined;
    subscription.expiredNotificationSentAt = undefined;
    subscription.expiredNotificationForDate = undefined;

    await subscription.save();

    return {
        subscription,
        plan,
        periodStart,
        periodEnd,
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

    const daysRemaining = calculateDaysRemaining(subscription.endDate, now);
    const isExpired =
        subscription.status === "expired" ||
        (subscription.endDate
            ? new Date(subscription.endDate).getTime() <= now.getTime()
            : false);
    const isExpiringSoon =
        !isExpired && isSubscriptionExpiringSoon(subscription, now);

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
        amount: getSnapshotPlanAmount(subscription.plan),
        paymentStatus: subscription.paymentStatus,
        paymentReference: subscription.paymentReference || null,
        gateway: subscription.gateway || null,
        isExpired,
        isExpiringSoon,
        expiryReminderDays: SUBSCRIPTION_EXPIRY_REMINDER_DAYS,
        daysRemaining,
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
    amount: 0,
    isExpired: false,
    isExpiringSoon: false,
    expiryReminderDays: null,
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

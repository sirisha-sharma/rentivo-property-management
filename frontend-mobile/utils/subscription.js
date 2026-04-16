export const SUBSCRIPTION_ACTIONS = Object.freeze({
    ADD_PROPERTY: "add_property",
    INVITE_TENANT: "invite_tenant",
});

const ACTION_ACCESS_KEY = Object.freeze({
    [SUBSCRIPTION_ACTIONS.ADD_PROPERTY]: "canAddProperty",
    [SUBSCRIPTION_ACTIONS.INVITE_TENANT]: "canInviteTenant",
});

const SUBSCRIPTION_ERROR_CODES = new Set([
    "SUBSCRIPTION_REQUIRED",
    "SUBSCRIPTION_EXPIRED",
    "SUBSCRIPTION_CANCELLED",
    "SUBSCRIPTION_PENDING_PAYMENT",
    "TRIAL_PROPERTY_LIMIT_REACHED",
    "TRIAL_TENANT_LIMIT_REACHED",
]);

export const getSubscriptionPlanLabel = (plan) => {
    switch (plan) {
        case "trial":
            return "Trial";
        case "monthly":
            return "Monthly";
        case "yearly":
            return "Yearly";
        case "free":
            return "Free";
        default:
            return plan || "Plan";
    }
};

export const getSubscriptionStatusLabel = (status) => {
    switch (status) {
        case "trialing":
            return "Trialing";
        case "active":
            return "Active";
        case "expired":
            return "Expired";
        case "cancelled":
            return "Cancelled";
        case "pending_payment":
            return "Pending Payment";
        default:
            return status || "Unknown";
    }
};

export const getSubscriptionStatusTone = (status) => {
    switch (status) {
        case "active":
            return "success";
        case "trialing":
            return "info";
        case "expired":
        case "cancelled":
            return "danger";
        case "pending_payment":
            return "warning";
        default:
            return "muted";
    }
};

export const formatCurrencyNpr = (amount) =>
    `NPR ${Number(amount || 0).toLocaleString()}`;

export const formatSubscriptionDate = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export const formatDaysRemaining = (daysRemaining) => {
    const normalizedDays = Number(daysRemaining);

    if (!Number.isFinite(normalizedDays) || normalizedDays <= 0) {
        return "0 days";
    }

    return normalizedDays === 1 ? "1 day" : `${normalizedDays} days`;
};

export const isTrialSubscription = (subscription) =>
    subscription?.plan === "trial";

export const isPaidSubscription = (subscription) =>
    subscription?.plan === "monthly" || subscription?.plan === "yearly";

export const isSubscriptionExpiringSoon = (subscription) => {
    if (typeof subscription?.isExpiringSoon === "boolean") {
        return subscription.isExpiringSoon;
    }

    const daysRemaining = Number(subscription?.daysRemaining);
    const reminderWindow = Number(subscription?.expiryReminderDays || 3);

    return (
        Number.isFinite(daysRemaining) &&
        daysRemaining > 0 &&
        daysRemaining <= reminderWindow &&
        !["expired", "cancelled", "pending_payment"].includes(subscription?.status)
    );
};

export const getSubscriptionExpiryNotice = (subscription) => {
    if (!subscription) {
        return null;
    }

    if (subscription.status === "expired") {
        return {
            tone: "danger",
            title: "Subscription expired",
            message:
                subscription.plan === "trial"
                    ? "Your trial has ended. Upgrade to Monthly or Yearly to keep adding properties and tenants."
                    : "Your paid landlord plan has ended. Renew now to restore full landlord access.",
        };
    }

    if (!isSubscriptionExpiringSoon(subscription)) {
        return null;
    }

    const remainingLabel = formatDaysRemaining(subscription.daysRemaining);

    return {
        tone: "warning",
        title:
            subscription.plan === "trial"
                ? "Trial ending soon"
                : "Plan ending soon",
        message:
            subscription.plan === "trial"
                ? `Your trial ends in ${remainingLabel}. Upgrade now to avoid losing access to extra properties and tenant invites.`
                : `Your paid plan ends in ${remainingLabel}. Renew now to keep full landlord access without interruption.`,
    };
};

export const getSubscriptionActionAccess = (subscription, action) => {
    const accessKey = ACTION_ACCESS_KEY[action];
    if (!accessKey) return true;
    return subscription?.access?.[accessKey] !== false;
};

export const getSubscriptionErrorPayload = (error) =>
    error?.response?.data || error || null;

export const isSubscriptionErrorPayload = (payload) =>
    Boolean(payload?.code && SUBSCRIPTION_ERROR_CODES.has(payload.code));

export const getSubscriptionActionNoun = (action) => {
    switch (action) {
        case SUBSCRIPTION_ACTIONS.ADD_PROPERTY:
            return "property";
        case SUBSCRIPTION_ACTIONS.INVITE_TENANT:
            return "tenant invite";
        default:
            return "action";
    }
};

export const getSubscriptionActionPrompt = ({ subscription, action }) => {
    const noun = getSubscriptionActionNoun(action);

    if (!subscription) {
        return {
            title: "Subscription Required",
            message: `A landlord subscription is required before you can continue this ${noun} action.`,
            cta: "View Plans",
        };
    }

    if (subscription.status === "expired") {
        return {
            title: "Subscription Expired",
            message:
                "Your landlord subscription has expired. Upgrade to Monthly or Yearly to restore full access.",
            cta: "Renew Plan",
        };
    }

    if (subscription.status === "cancelled") {
        return {
            title: "Subscription Cancelled",
            message:
                "Your landlord subscription is cancelled. Upgrade again to continue managing more properties and tenants.",
            cta: "Upgrade Plan",
        };
    }

    if (subscription.status === "pending_payment") {
        return {
            title: "Payment Pending",
            message:
                "Your last subscription payment is still pending. Complete payment or choose another plan to continue.",
            cta: "Open Subscription",
        };
    }

    if (subscription.plan === "trial") {
        return {
            title: "Trial Access",
            message:
                action === SUBSCRIPTION_ACTIONS.ADD_PROPERTY
                    ? `Your Trial plan includes up to ${subscription?.limits?.properties || 1} property. Upgrade to Monthly or Yearly to add more.`
                    : `Your Trial plan includes up to ${subscription?.limits?.tenantSeats || 1} tenant seat, including pending invites. Upgrade to Monthly or Yearly to invite more tenants.`,
            cta: "Upgrade Plan",
        };
    }

    return {
        title: "Manage Subscription",
        message:
            "Review your current plan, payment history, and upgrade options.",
        cta: "Open Subscription",
    };
};

export const getSubscriptionOverviewMessage = (subscription) => {
    if (!subscription) {
        return "Set up a landlord plan to unlock platform access.";
    }

    const expiryNotice = getSubscriptionExpiryNotice(subscription);
    if (expiryNotice) {
        return expiryNotice.message;
    }

    if (subscription.plan === "trial") {
        return `Trial access includes up to ${subscription?.limits?.properties || 1} property and ${subscription?.limits?.tenantSeats || 1} tenant seat.`;
    }

    if (subscription.status === "active") {
        return "Your paid plan is active with full landlord access.";
    }

    if (subscription.status === "expired") {
        return "Your subscription has expired. Upgrade to restore full landlord access.";
    }

    if (subscription.status === "pending_payment") {
        return "Your payment is pending. Complete checkout to unlock full landlord access.";
    }

    return "Manage your landlord subscription and upgrade options.";
};

import {
    buildSubscriptionSnapshot,
    getLandlordUsage,
    getOrCreateLandlordSubscription,
    getSubscriptionPlansForClient,
    getTenantSubscriptionSnapshot,
    SUBSCRIPTION_GATEWAYS,
} from "../utils/subscriptionService.js";

export const getCurrentSubscription = async (req, res) => {
    try {
        if (req.user.role !== "landlord") {
            return res.status(200).json({
                success: true,
                requiresSubscription: false,
                subscription: getTenantSubscriptionSnapshot(),
                availableGateways: SUBSCRIPTION_GATEWAYS,
                plans: getSubscriptionPlansForClient(),
            });
        }

        const now = new Date();
        const [subscription, usage] = await Promise.all([
            getOrCreateLandlordSubscription(req.user, now),
            getLandlordUsage(req.user._id),
        ]);

        return res.status(200).json({
            success: true,
            requiresSubscription: true,
            subscription: buildSubscriptionSnapshot(subscription, usage, now),
            availableGateways: SUBSCRIPTION_GATEWAYS,
            plans: getSubscriptionPlansForClient(),
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to fetch subscription status",
        });
    }
};

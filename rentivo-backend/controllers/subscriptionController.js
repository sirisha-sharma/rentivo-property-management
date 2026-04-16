import {
    buildSubscriptionSnapshot,
    getLandlordUsage,
    getOrCreateLandlordSubscription,
    getTenantSubscriptionSnapshot,
} from "../utils/subscriptionService.js";

export const getCurrentSubscription = async (req, res) => {
    try {
        if (req.user.role !== "landlord") {
            return res.status(200).json({
                success: true,
                requiresSubscription: false,
                subscription: getTenantSubscriptionSnapshot(),
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
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to fetch subscription status",
        });
    }
};

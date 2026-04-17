import {

// Core module for subscriptionmiddleware features.

    buildSubscriptionSnapshot,
    evaluateLandlordSubscriptionAction,
    getLandlordUsage,
    getOrCreateLandlordSubscription,
} from "../utils/subscriptionService.js";

export const requireLandlordSubscription = (action) => async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not authorized",
            });
        }

        if (req.user.role !== "landlord") {
            return res.status(403).json({
                success: false,
                code: "LANDLORD_ONLY_ACTION",
                message: "Only landlords can perform this action.",
            });
        }

        const now = new Date();
        const [subscription, usage] = await Promise.all([
            getOrCreateLandlordSubscription(req.user, now),
            getLandlordUsage(req.user._id),
        ]);

        const evaluation = evaluateLandlordSubscriptionAction({
            subscription,
            usage,
            action,
            now,
        });

        req.subscription = evaluation.subscription;

        if (!evaluation.allowed) {
            return res.status(403).json({
                success: false,
                code: evaluation.code,
                message: evaluation.message,
                action,
                upgradeRequired: evaluation.upgradeRequired,
                subscription: evaluation.subscription,
            });
        }

        return next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to validate landlord subscription",
        });
    }
};

export const attachSubscriptionContext = async (req, _res, next) => {
    try {
        if (!req.user || req.user.role !== "landlord") {
            return next();
        }

        const now = new Date();
        const [subscription, usage] = await Promise.all([
            getOrCreateLandlordSubscription(req.user, now),
            getLandlordUsage(req.user._id),
        ]);

        req.subscription = buildSubscriptionSnapshot(subscription, usage, now);
        return next();
    } catch (error) {
        return next(error);
    }
};

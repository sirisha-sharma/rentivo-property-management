import cron from "node-cron";
import Subscription from "../models/subscriptionModel.js";
import { createNotification } from "../controllers/notificationController.js";
import {
    SUBSCRIPTION_EXPIRY_REMINDER_DAYS,
    calculateDaysRemaining,
    isSubscriptionExpiringSoon,
    shouldExpireSubscription,
} from "../utils/subscriptionService.js";

const TRACKED_STATUSES = ["trialing", "active", "pending_payment", "expired"];

const formatSubscriptionDate = (value) =>
    new Date(value).toLocaleDateString("en-NP", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

const formatDaysRemaining = (daysRemaining) =>
    daysRemaining === 1 ? "1 day" : `${daysRemaining} days`;

const getPlanLabel = (plan) => {
    switch (plan) {
        case "monthly":
            return "Monthly";
        case "yearly":
            return "Yearly";
        default:
            return "Trial";
    }
};

const isSameTrackedDate = (storedDate, targetDate) =>
    Boolean(
        storedDate &&
            targetDate &&
            new Date(storedDate).getTime() === new Date(targetDate).getTime()
    );

const buildExpiryReminderMessage = (subscription, daysRemaining) => {
    const planLabel = getPlanLabel(subscription.plan);
    const expiryLabel = formatSubscriptionDate(subscription.endDate);
    const remainingLabel = formatDaysRemaining(daysRemaining);

    if (subscription.plan === "trial") {
        return `Your Trial plan ends in ${remainingLabel} on ${expiryLabel}. Upgrade to Monthly or Yearly to keep adding properties and tenant invites.`;
    }

    return `Your ${planLabel} subscription expires in ${remainingLabel} on ${expiryLabel}. Renew now to keep full landlord access without interruption.`;
};

const buildExpiredMessage = (subscription) => {
    const expiryLabel = formatSubscriptionDate(subscription.endDate);

    if (subscription.plan === "trial") {
        return `Your Trial plan expired on ${expiryLabel}. Upgrade to Monthly or Yearly to continue adding properties and tenant invites.`;
    }

    return `Your ${getPlanLabel(subscription.plan)} subscription expired on ${expiryLabel}. Upgrade or renew to restore full landlord access.`;
};

export const processSubscriptionLifecycle = async ({
    referenceDate = new Date(),
    dryRun = false,
} = {}) => {
    const now = new Date(referenceDate);
    if (Number.isNaN(now.getTime())) {
        throw new Error("Invalid referenceDate provided for subscription lifecycle check");
    }

    console.log(
        `[${new Date().toISOString()}] Checking subscriptions for reminders and expiry${dryRun ? " (dry run)" : ""}...`
    );

    const subscriptions = await Subscription.find({
        endDate: { $ne: null },
        status: { $in: TRACKED_STATUSES },
    }).select(
        [
            "landlordId",
            "plan",
            "status",
            "endDate",
            "expiryReminderSentAt",
            "expiryReminderForDate",
            "expiredNotificationSentAt",
            "expiredNotificationForDate",
        ].join(" ")
    );

    const summary = {
        dryRun,
        runDate: now.toISOString(),
        checkedCount: subscriptions.length,
        statusUpdatedCount: 0,
        wouldUpdateToExpiredCount: 0,
        reminderNotificationsSent: 0,
        wouldSendReminderNotifications: 0,
        expiredNotificationsSent: 0,
        wouldSendExpiredNotifications: 0,
        failedCount: 0,
    };

    if (subscriptions.length === 0) {
        console.log("No subscriptions found for lifecycle checks.");
        return summary;
    }

    for (const subscription of subscriptions) {
        try {
            let shouldSave = false;
            const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

            if (!endDate || Number.isNaN(endDate.getTime())) {
                continue;
            }

            const expirationAlreadyTracked = isSameTrackedDate(
                subscription.expiredNotificationForDate,
                endDate
            );
            const reminderAlreadyTracked = isSameTrackedDate(
                subscription.expiryReminderForDate,
                endDate
            );

            if (shouldExpireSubscription(subscription, now)) {
                if (dryRun) {
                    summary.wouldUpdateToExpiredCount++;
                } else {
                    subscription.status = "expired";
                    summary.statusUpdatedCount++;
                    shouldSave = true;
                }
            }

            if (subscription.status === "expired" || shouldExpireSubscription(subscription, now)) {
                if (!expirationAlreadyTracked) {
                    if (dryRun) {
                        summary.wouldSendExpiredNotifications++;
                    } else {
                        await createNotification(
                            subscription.landlordId,
                            "subscription",
                            buildExpiredMessage(subscription)
                        );
                        subscription.expiredNotificationSentAt = now;
                        subscription.expiredNotificationForDate = endDate;
                        summary.expiredNotificationsSent++;
                        shouldSave = true;
                    }
                }

                if (shouldSave && !dryRun) {
                    await subscription.save();
                }

                continue;
            }

            if (isSubscriptionExpiringSoon(subscription, now) && !reminderAlreadyTracked) {
                const daysRemaining = calculateDaysRemaining(subscription.endDate, now);

                if (dryRun) {
                    summary.wouldSendReminderNotifications++;
                } else {
                    await createNotification(
                        subscription.landlordId,
                        "subscription",
                        buildExpiryReminderMessage(subscription, daysRemaining)
                    );
                    subscription.expiryReminderSentAt = now;
                    subscription.expiryReminderForDate = endDate;
                    summary.reminderNotificationsSent++;
                    shouldSave = true;
                }
            }

            if (shouldSave && !dryRun) {
                await subscription.save();
            }
        } catch (error) {
            summary.failedCount++;
            console.error(
                `Failed to process subscription lifecycle for ${subscription._id}:`,
                error.message
            );
        }
    }

    console.log(
        `Subscription lifecycle summary. Checked: ${summary.checkedCount}, Expired: ${summary.statusUpdatedCount}, Expiry Notices: ${summary.expiredNotificationsSent}, Reminders: ${summary.reminderNotificationsSent}, Failures: ${summary.failedCount}`
    );
    return summary;
};

const scheduleSubscriptionLifecycleCheck = () => {
    const cronExpression = "5 0 * * *";

    cron.schedule(cronExpression, async () => {
        try {
            await processSubscriptionLifecycle();
        } catch (error) {
            console.error("Error in subscription lifecycle job:", error);
        }
    });

    console.log(
        `✓ Subscription lifecycle checker scheduled (runs daily at 00:05, reminder window ${SUBSCRIPTION_EXPIRY_REMINDER_DAYS} days)`
    );
};

export const startSubscriptionScheduler = () => {
    console.log("\n=== Starting Subscription Scheduler ===");
    scheduleSubscriptionLifecycleCheck();
    console.log("=== Subscription Scheduler Started ===\n");
};

export const testSubscriptionLifecycleCheck = async (options = {}) => {
    console.log("Testing subscription lifecycle check...");
    return processSubscriptionLifecycle(options);
};

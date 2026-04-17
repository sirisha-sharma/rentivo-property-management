import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    getCurrentSubscription,
    getSubscriptionConfig,
    getSubscriptionPayments,
    initiateSubscriptionCheckout,
} from "../api/subscription";
import { AuthContext } from "./AuthContext";

export const SubscriptionContext = createContext();

// Holds subscription state and checkout actions for gated landlord features.
export const SubscriptionProvider = ({ children }) => {
    const { user } = useContext(AuthContext);

    const [subscription, setSubscription] = useState(null);
    const [plans, setPlans] = useState([]);
    const [availableGateways, setAvailableGateways] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [error, setError] = useState(null);

    // Wipe everything when the user logs out or switches to a non-landlord role
    const resetState = useCallback(() => {
        setSubscription(null);
        setPlans([]);
        setAvailableGateways([]);
        setPayments([]);
        setError(null);
        setLoading(false);
        setPaymentsLoading(false);
        setCheckoutLoading(false);
    }, []);

    const fetchSubscription = useCallback(async () => {
        if (!user?.token || user?.role !== "landlord") {
            return null;
        }

        setLoading(true);
        try {
            const response = await getCurrentSubscription();
            setSubscription(response.subscription || null);
            setPlans(response.plans || []);
            setAvailableGateways(response.availableGateways || []);
            setError(null);
            return response;
        } catch (err) {
            setError(err.message || "Failed to fetch subscription");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user?.role, user?.token]);

    // Fetches plan/gateway config separately - keeps plan list fresh without re-fetching the active subscription
    const fetchSubscriptionConfig = useCallback(async () => {
        if (!user?.token || user?.role !== "landlord") {
            return null;
        }

        try {
            const response = await getSubscriptionConfig();
            setPlans((prev) => response.plans || prev);
            setAvailableGateways((prev) => response.availableGateways || prev);
            return response;
        } catch (err) {
            setError((current) => current || err.message || "Failed to fetch subscription config");
            throw err;
        }
    }, [user?.role, user?.token]);

    const fetchPaymentHistory = useCallback(async () => {
        if (!user?.token || user?.role !== "landlord") {
            return [];
        }

        setPaymentsLoading(true);
        try {
            const response = await getSubscriptionPayments();
            setPayments(response.payments || []);
            return response.payments || [];
        } catch (err) {
            setError((current) => current || err.message || "Failed to fetch payment history");
            throw err;
        } finally {
            setPaymentsLoading(false);
        }
    }, [user?.role, user?.token]);

    const refreshSubscriptionData = useCallback(async () => {
        if (!user?.token || user?.role !== "landlord") {
            return;
        }

        await Promise.allSettled([fetchSubscription(), fetchPaymentHistory()]);
    }, [fetchPaymentHistory, fetchSubscription, user?.role, user?.token]);

    // Refresh payment history right after checkout so the UI reflects the new payment immediately
    const startCheckout = useCallback(async (plan, gateway, clientRedirectUri = null) => {
        setCheckoutLoading(true);
        try {
            const response = await initiateSubscriptionCheckout(
                plan,
                gateway,
                clientRedirectUri
            );
            await fetchPaymentHistory();
            setError(null);
            return response;
        } catch (err) {
            setError(err.message || "Failed to start subscription checkout");
            throw err;
        } finally {
            setCheckoutLoading(false);
        }
    }, [fetchPaymentHistory]);

    // Tenant accounts don't have subscriptions, so clear state rather than fetching
    useEffect(() => {
        if (!user?.token) {
            resetState();
            return;
        }

        if (user.role !== "landlord") {
            setSubscription(null);
            setPlans([]);
            setAvailableGateways([]);
            setPayments([]);
            setError(null);
            return;
        }

        void Promise.allSettled([fetchSubscription(), fetchSubscriptionConfig()]);
    }, [fetchSubscription, fetchSubscriptionConfig, resetState, user?.role, user?.token]);

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                plans,
                availableGateways,
                payments,
                loading,
                paymentsLoading,
                checkoutLoading,
                error,
                fetchSubscription,
                fetchSubscriptionConfig,
                fetchPaymentHistory,
                refreshSubscriptionData,
                startCheckout,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};

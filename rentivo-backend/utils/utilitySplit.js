const UTILITY_KEYS = ["electricity", "water", "internet", "gas", "waste", "other"];
const VALIDATION_MESSAGES = new Set([
    "Split weights must add up to more than zero",
    "No active tenants found for this property",
    "Invalid split method",
    "Room sizes are not fully configured for this property",
    "Each active tenant must have a positive room size configured",
    "Occupancy data is required for occupancy-based splitting",
    "Each active tenant must have a positive occupant count",
    "Custom split data is required for custom splitting method",
    "Custom split amounts must add up to the total utility amount",
]);

// use epsilon to avoid floating point drift when rounding to 2 decimal places
export const roundCurrency = (value) =>
    Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const calculateTotalUtilities = (utilities = {}) =>
    roundCurrency(
        UTILITY_KEYS.reduce((sum, key) => sum + (parseFloat(utilities[key]) || 0), 0)
    );

// last tenant absorbs rounding remainder so totals always add up exactly
const distributeAmountByWeights = (amount, weights) => {
    const normalizedAmount = roundCurrency(amount);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight <= 0) {
        throw new Error("Split weights must add up to more than zero");
    }

    let allocated = 0;

    return weights.map((weight, index) => {
        if (index === weights.length - 1) {
            return roundCurrency(normalizedAmount - allocated);
        }

        const share = roundCurrency((normalizedAmount * weight) / totalWeight);
        allocated = roundCurrency(allocated + share);
        return share;
    });
};

const buildUtilityBreakdown = (utilities, weights) => {
    const perUtilityShares = {};

    UTILITY_KEYS.forEach((key) => {
        perUtilityShares[key] = distributeAmountByWeights(utilities[key] || 0, weights);
    });

    return perUtilityShares;
};

const buildProportionalSplits = ({ tenants, utilities, weights, metadataBuilder }) => {
    const distributedUtilities = buildUtilityBreakdown(utilities, weights);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    return tenants.map((tenant, index) => {
        const tenantUtilities = UTILITY_KEYS.reduce((accumulator, key) => {
            accumulator[key] = distributedUtilities[key][index];
            return accumulator;
        }, {});

        return {
            tenantId: tenant._id,
            userId: tenant.userId._id,
            tenantName: tenant.userId.name,
            tenantEmail: tenant.userId.email,
            splitPercentage: ((weights[index] / totalWeight) * 100).toFixed(2),
            utilities: tenantUtilities,
            totalAmount: roundCurrency(
                Object.values(tenantUtilities).reduce((sum, value) => sum + value, 0)
            ),
            ...(metadataBuilder ? metadataBuilder(tenant, index, weights[index]) : {}),
        };
    });
};

// equal split: every tenant gets weight 1, so proportional logic handles the rest
const calculateEqualSplit = (tenants, utilities) =>
    buildProportionalSplits({
        tenants,
        utilities,
        weights: tenants.map(() => 1),
    });

const calculateRoomSizeSplit = (tenants, utilities, roomSizes) => {
    if (!roomSizes || roomSizes.length < tenants.length) {
        throw new Error("Room sizes are not fully configured for this property");
    }

    const weights = tenants.map((tenant, index) => {
        const roomSize = parseFloat(roomSizes[index]?.size) || 0;

        if (roomSize <= 0) {
            throw new Error("Each active tenant must have a positive room size configured");
        }

        return roomSize;
    });

    return buildProportionalSplits({
        tenants,
        utilities,
        weights,
        metadataBuilder: (_tenant, index) => ({
            roomName: roomSizes[index]?.name || `Unit ${index + 1}`,
            roomSize: roundCurrency(roomSizes[index]?.size || 0),
        }),
    });
};

const calculateOccupancySplit = (tenants, utilities, occupancyData) => {
    if (!occupancyData || Object.keys(occupancyData).length === 0) {
        throw new Error("Occupancy data is required for occupancy-based splitting");
    }

    const weights = tenants.map((tenant) => {
        const occupantCount = parseInt(occupancyData[tenant._id.toString()], 10);

        if (!Number.isFinite(occupantCount) || occupantCount <= 0) {
            throw new Error("Each active tenant must have a positive occupant count");
        }

        return occupantCount;
    });

    return buildProportionalSplits({
        tenants,
        utilities,
        weights,
        metadataBuilder: (tenant) => ({
            occupantCount: parseInt(occupancyData[tenant._id.toString()], 10),
        }),
    });
};

// custom split input can be a flat number (assigned to "other") or a full utility breakdown object
const normalizeCustomTenantSplit = (tenantSplit) => {
    if (tenantSplit == null) {
        return null;
    }

    if (typeof tenantSplit === "number" || typeof tenantSplit === "string") {
        return {
            other: roundCurrency(tenantSplit),
        };
    }

    return UTILITY_KEYS.reduce((accumulator, key) => {
        accumulator[key] = roundCurrency(tenantSplit[key] || 0);
        return accumulator;
    }, {});
};

const calculateCustomSplit = (tenants, utilities, customSplits) => {
    if (!customSplits || Object.keys(customSplits).length === 0) {
        throw new Error("Custom split data is required for custom splitting method");
    }

    const splits = tenants.map((tenant) => {
        const tenantCustomSplit = normalizeCustomTenantSplit(
            customSplits[tenant._id.toString()]
        );

        if (!tenantCustomSplit) {
            throw new Error(`Custom split not defined for tenant ${tenant.userId.name}`);
        }

        return {
            tenantId: tenant._id,
            userId: tenant.userId._id,
            tenantName: tenant.userId.name,
            tenantEmail: tenant.userId.email,
            utilities: tenantCustomSplit,
            totalAmount: roundCurrency(
                Object.values(tenantCustomSplit).reduce((sum, value) => sum + value, 0)
            ),
        };
    });

    const declaredTotal = calculateTotalUtilities(utilities);
    const splitTotal = roundCurrency(
        splits.reduce((sum, split) => sum + split.totalAmount, 0)
    );

    // allow 1 paisa tolerance for floating point differences
    if (Math.abs(declaredTotal - splitTotal) > 0.01) {
        throw new Error("Custom split amounts must add up to the total utility amount");
    }

    return splits.map((split) => ({
        ...split,
        splitPercentage:
            declaredTotal > 0
                ? ((split.totalAmount / declaredTotal) * 100).toFixed(2)
                : "0.00",
    }));
};

export const buildUtilitySplitDetails = ({
    splitMethod,
    tenants,
    utilities = {},
    roomSizes = [],
    occupancyData = {},
    customSplits = {},
}) => {
    const totalUtilities = calculateTotalUtilities(utilities);

    if (!tenants || tenants.length === 0) {
        throw new Error("No active tenants found for this property");
    }

    let splits = [];

    switch (splitMethod) {
        case "equal":
            splits = calculateEqualSplit(tenants, utilities);
            break;
        case "room-size":
            splits = calculateRoomSizeSplit(tenants, utilities, roomSizes);
            break;
        case "occupancy":
            splits = calculateOccupancySplit(tenants, utilities, occupancyData);
            break;
        case "custom":
            splits = calculateCustomSplit(tenants, utilities, customSplits);
            break;
        default:
            throw new Error("Invalid split method");
    }

    return {
        splitMethod,
        totalUtilities,
        tenantCount: tenants.length,
        splits,
    };
};

// used by controllers to distinguish user input errors from unexpected bugs
export const isUtilitySplitValidationError = (error) => {
    const message = error?.message || "";

    return (
        VALIDATION_MESSAGES.has(message) ||
        message.startsWith("Custom split not defined for tenant ")
    );
};

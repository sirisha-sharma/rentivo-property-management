import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import Unit from "../models/unitModel.js";

// sort by creation order so unit numbering stays stable across syncs
const UNIT_SORT = { createdAt: 1, _id: 1 };

const toPositiveInteger = (value, fallback = 0) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isFinite(parsedValue) && parsedValue > 0) {
        return parsedValue;
    }

    return fallback;
};

// "room" type properties use "Room N" naming instead of "Unit N"
const getUnitPrefix = (propertyType = "") =>
    String(propertyType || "").trim().toLowerCase() === "room" ? "Room" : "Unit";

export const buildDefaultUnitName = ({ propertyType, index }) =>
    `${getUnitPrefix(propertyType)} ${index + 1}`;

// accepts either a populated property object or a plain ID
const resolvePropertyShape = async (propertyInput) => {
    if (!propertyInput) {
        return null;
    }

    if (propertyInput._id) {
        return propertyInput;
    }

    return Property.findById(propertyInput).select("units type rent landlordId");
};

const getAssignedUnitIds = async (propertyId, statuses = ["Active"]) => {
    const assignedTenants = await Tenant.find({
        propertyId,
        status: { $in: statuses },
        unitId: { $exists: true, $ne: null },
    }).select("unitId");

    return new Set(
        assignedTenants
            .map((tenant) => String(tenant.unitId || ""))
            .filter(Boolean)
    );
};

// guards against reducing unit count when occupied units would be deleted
export const assertUnitCountCanBeApplied = async (propertyId, requestedCount) => {
    const targetCount = toPositiveInteger(requestedCount, 0);
    const existingUnits = await Unit.find({ propertyId }).sort(UNIT_SORT);

    if (existingUnits.length <= targetCount) {
        return;
    }

    const activeUnitIds = await getAssignedUnitIds(propertyId, ["Active", "Pending"]);
    const blockedUnits = existingUnits
        .slice(targetCount)
        .filter((unit) => activeUnitIds.has(String(unit._id)));

    if (!blockedUnits.length) {
        return;
    }

    const blockedLabels = blockedUnits
        .map((unit) => unit.unitName)
        .filter(Boolean)
        .slice(0, 2);

    const blockedUnitLabel =
        blockedLabels.length > 0
            ? `${blockedLabels.join(", ")} ${blockedUnits.length === 1 ? "is" : "are"}`
            : "occupied units are";

    const error = new Error(
        `Cannot reduce the unit count right now because ${blockedUnitLabel} still assigned to active tenants.`
    );
    error.statusCode = 400;
    throw error;
};

// keeps the Unit collection in sync with property.units count and tenant assignments.
// creates missing units, removes unoccupied extras, and patches status/name drift.
export const syncPropertyUnits = async (propertyInput) => {
    const property = await resolvePropertyShape(propertyInput);

    if (!property?._id) {
        return [];
    }

    const targetCount = toPositiveInteger(property.units, 0);
    const activeUnitIds = await getAssignedUnitIds(property._id, ["Active"]);
    // Pending tenants reserve units so they aren't deleted mid-invite flow
    const reservedUnitIds = await getAssignedUnitIds(property._id, ["Active", "Pending"]);
    let existingUnits = await Unit.find({ propertyId: property._id }).sort(UNIT_SORT);

    if (existingUnits.length < targetCount) {
        const unitsToCreate = Array.from({ length: targetCount - existingUnits.length }, (_, index) => ({
            propertyId: property._id,
            unitName: buildDefaultUnitName({
                propertyType: property.type,
                index: existingUnits.length + index,
            }),
            baseRent: Number(property.rent) > 0 ? Number(property.rent) : undefined,
            status: "vacant",
        }));

        if (unitsToCreate.length > 0) {
            await Unit.insertMany(unitsToCreate);
            existingUnits = await Unit.find({ propertyId: property._id }).sort(UNIT_SORT);
        }
    }

    if (existingUnits.length > targetCount) {
        const removableUnits = existingUnits.slice(targetCount).filter(
            (unit) => !reservedUnitIds.has(String(unit._id))
        );

        if (removableUnits.length > 0) {
            await Unit.deleteMany({ _id: { $in: removableUnits.map((unit) => unit._id) } });
            existingUnits = await Unit.find({ propertyId: property._id }).sort(UNIT_SORT);
        }
    }

    // only update fields that actually changed to avoid unnecessary writes
    const updateOperations = existingUnits.map((unit, index) => {
        const nextStatus = activeUnitIds.has(String(unit._id)) ? "occupied" : "vacant";
        const nextValues = {};

        if (!unit.unitName) {
            nextValues.unitName = buildDefaultUnitName({
                propertyType: property.type,
                index,
            });
        }

        if (unit.status !== nextStatus) {
            nextValues.status = nextStatus;
        }

        if (Object.keys(nextValues).length === 0) {
            return null;
        }

        return Unit.findByIdAndUpdate(unit._id, nextValues, { new: true });
    });

    await Promise.all(updateOperations.filter(Boolean));

    return Unit.find({ propertyId: property._id }).sort(UNIT_SORT);
};

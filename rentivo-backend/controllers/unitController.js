import Property from "../models/propertyModel.js";
import Unit from "../models/unitModel.js";
import Tenant from "../models/tenantModel.js";
import { syncPropertyUnits } from "../utils/propertyUnits.js";

// recalculate whether the property is full or not
const refreshPropertyStatus = async (propertyId) => {
    const [activeTenants, property] = await Promise.all([
        Tenant.countDocuments({ propertyId, status: "Active" }),
        Property.findById(propertyId).select("units status"),
    ]);
    if (!property) return;
    property.status = activeTenants >= property.units ? "occupied" : "vacant";
    await property.save();
};

// checks ownership and returns the property, or sends the error response and returns null
const resolveAuthorizedProperty = async (req, res, propertyId) => {
    const property = await Property.findById(propertyId).select("landlordId units type rent");

    if (!property) {
        res.status(404).json({ message: "Property not found" });
        return null;
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = String(property.landlordId) === String(req.user?._id);

    if (!isAdmin && !isOwner) {
        res.status(401).json({ message: "Not authorized to manage units for this property" });
        return null;
    }

    return property;
};

export const getUnits = async (req, res) => {
    try {
        const { propertyId } = req.query;

        if (!propertyId) {
            return res.status(400).json({ message: "propertyId query param is required" });
        }

        const property = await resolveAuthorizedProperty(req, res, propertyId);
        if (!property) return;

        const units = await syncPropertyUnits(property);
        res.status(200).json(units);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// legacy route, use /api/units?propertyId instead
export const getUnitsByProperty = async (req, res) => {
    try {
        const property = await resolveAuthorizedProperty(req, res, req.params.propertyId);
        if (!property) return;

        const units = await syncPropertyUnits(property);
        res.status(200).json(units);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUnit = async (req, res) => {
    try {
        const { propertyId, unitName, floorNumber, baseRent, description } = req.body;

        if (!propertyId) {
            return res.status(400).json({ message: "propertyId is required" });
        }
        if (!unitName?.trim()) {
            return res.status(400).json({ message: "unitName is required" });
        }

        const property = await resolveAuthorizedProperty(req, res, propertyId);
        if (!property) return;

        const unit = await Unit.create({
            propertyId,
            unitName: unitName.trim(),
            floorNumber: floorNumber !== undefined ? Number(floorNumber) : undefined,
            baseRent: baseRent !== undefined ? Number(baseRent) : undefined,
            description: description?.trim() ?? "",
            status: "vacant",
        });

        // keep property.units in sync so syncPropertyUnits doesn't prune this new unit
        await Property.findByIdAndUpdate(propertyId, { $inc: { units: 1 } });
        await refreshPropertyStatus(propertyId);

        res.status(201).json(unit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUnit = async (req, res) => {
    try {
        const unit = await Unit.findById(req.params.id);

        if (!unit) {
            return res.status(404).json({ message: "Unit not found" });
        }

        const property = await resolveAuthorizedProperty(req, res, unit.propertyId);
        if (!property) return;

        const { unitName, floorNumber, baseRent, description } = req.body;

        if (unitName !== undefined) unit.unitName = unitName.trim();
        if (floorNumber !== undefined) unit.floorNumber = Number(floorNumber);
        if (baseRent !== undefined) unit.baseRent = Number(baseRent);
        if (description !== undefined) unit.description = description.trim();

        const updated = await unit.save();
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUnit = async (req, res) => {
    try {
        const unit = await Unit.findById(req.params.id);

        if (!unit) {
            return res.status(404).json({ message: "Unit not found" });
        }

        const property = await resolveAuthorizedProperty(req, res, unit.propertyId);
        if (!property) return;

        if (unit.status === "occupied") {
            return res.status(400).json({ message: "Cannot delete an occupied unit. Remove the tenant first." });
        }

        await Unit.findByIdAndDelete(req.params.id);

        await Property.findByIdAndUpdate(unit.propertyId, { $inc: { units: -1 } });
        await refreshPropertyStatus(unit.propertyId);

        res.status(200).json({ message: "Unit deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

import Property from "../models/propertyModel.js";
import { syncPropertyUnits } from "../utils/propertyUnits.js";

// Get all units for a property
export const getUnitsByProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.propertyId).select("landlordId units type rent");

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        if (
            req.user?.role === "landlord" &&
            String(property.landlordId) !== String(req.user._id)
        ) {
            return res.status(401).json({ message: "Not authorized to view units for this property" });
        }

        const units = await syncPropertyUnits(property);
        res.status(200).json(units);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

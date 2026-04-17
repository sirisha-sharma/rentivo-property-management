import Unit from "../models/unitModel.js";

// Get all units for a property
export const getUnitsByProperty = async (req, res) => {
    try {
        const units = await Unit.find({ propertyId: req.params.propertyId });
        res.status(200).json(units);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

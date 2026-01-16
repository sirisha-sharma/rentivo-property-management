import Property from "../models/propertyModel.js";

// Get all properties for the logged-in landlord
export const getProperties = async (req, res) => {
    try {
        const properties = await Property.find({ landlordId: req.user._id });
        res.status(200).json(properties);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single property by its ID
export const getPropertyById = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Make sure the logged in user matches the property landlord
        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "User not authorized" });
        }

        res.status(200).json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Create a new property
export const createProperty = async (req, res) => {
    const { title, address, type, units, splitMethod, roomSizes, amenities, images } = req.body;

    if (!title || !address || !type || !units) {
        return res.status(400).json({ message: "Please fill in all required fields" });
    }

    try {
        const property = await Property.create({
            title,
            address,
            type,
            units,
            splitMethod,
            roomSizes,
            amenities,
            images,
            landlordId: req.user._id,
        });
        res.status(201).json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update an existing property
export const updateProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Check for user
        if (!req.user) {
            return res.status(401).json({ message: "User not found" });
        }

        // Make sure the logged in user matches the property landlord
        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "User not authorized" });
        }

        const updatedProperty = await Property.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json(updatedProperty);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a property
export const deleteProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Check for user
        if (!req.user) {
            return res.status(401).json({ message: "User not found" });
        }

        // Make sure the logged in user matches the property landlord
        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "User not authorized" });
        }

        await property.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

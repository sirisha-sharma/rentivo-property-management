import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";

// Get properties (landlord sees owned, tenant sees rented)
export const getProperties = async (req, res) => {
    try {
        let properties;
        if (req.user.role === "landlord") {
            properties = await Property.find({ landlordId: req.user._id });
        } else {
            // Get properties the tenant is actively renting
            const tenantRecords = await Tenant.find({ userId: req.user._id, status: "Active" });
            const propertyIds = tenantRecords.map(t => t.propertyId);
            properties = await Property.find({ _id: { $in: propertyIds } });
        }
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
    const { title, address, type, units, splitMethod, roomSizes, amenities } = req.body;

    if (!title || !address || !type || !units) {
        return res.status(400).json({ message: "Please fill in all required fields" });
    }

    try {
        // Handle uploaded images
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map(file => `/uploads/properties/${file.filename}`);
        }

        // Parse roomSizes if it comes as a JSON string
        let parsedRoomSizes = roomSizes;
        if (typeof roomSizes === 'string') {
            try {
                parsedRoomSizes = JSON.parse(roomSizes);
            } catch (e) {
                parsedRoomSizes = [];
            }
        }

        // Parse amenities if it comes as a JSON string
        let parsedAmenities = amenities;
        if (typeof amenities === 'string') {
            try {
                parsedAmenities = JSON.parse(amenities);
            } catch (e) {
                parsedAmenities = [];
            }
        }

        const property = await Property.create({
            title,
            address,
            type,
            units,
            splitMethod,
            roomSizes: parsedRoomSizes,
            amenities: parsedAmenities,
            images: imagePaths,
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

        // Handle uploaded images
        let updatedImages = [...property.images]; // Keep existing images
        if (req.files && req.files.length > 0) {
            const newImagePaths = req.files.map(file => `/uploads/properties/${file.filename}`);
            updatedImages = [...updatedImages, ...newImagePaths]; // Add new images
        }

        // Parse roomSizes if it comes as a JSON string
        let parsedRoomSizes = req.body.roomSizes;
        if (typeof req.body.roomSizes === 'string') {
            try {
                parsedRoomSizes = JSON.parse(req.body.roomSizes);
            } catch (e) {
                parsedRoomSizes = property.roomSizes; // Keep existing if parse fails
            }
        }

        // Parse amenities if it comes as a JSON string
        let parsedAmenities = req.body.amenities;
        if (typeof req.body.amenities === 'string') {
            try {
                parsedAmenities = JSON.parse(req.body.amenities);
            } catch (e) {
                parsedAmenities = property.amenities; // Keep existing if parse fails
            }
        }

        const updatedProperty = await Property.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                images: updatedImages,
                roomSizes: parsedRoomSizes,
                amenities: parsedAmenities,
            },
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

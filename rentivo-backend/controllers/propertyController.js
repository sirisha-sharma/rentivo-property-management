import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import PropertyRating from "../models/propertyRatingModel.js";
import PropertyAssociation from "../models/propertyAssociationModel.js";
import {
    inferNepalDistrictFromText,
    resolveNepalDistrict,
} from "../utils/nepalDistricts.js";
import { getUploadedFileUrl, removeStoredFiles } from "../utils/storage.js";
import {
    assertUnitCountCanBeApplied,
    syncPropertyUnits,
} from "../utils/propertyUnits.js";

const parseJsonArrayField = (value, fallback = []) => {
    if (value == null) {
        return fallback;
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value !== "string") {
        return fallback;
    }

    try {
        const parsedValue = JSON.parse(value);
        return Array.isArray(parsedValue) ? parsedValue : fallback;
    } catch (_error) {
        return fallback;
    }
};

const dedupeStringList = (values = []) =>
    [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const buildRatingSummaryMap = async (propertyIds) => {
    if (!propertyIds.length) {
        return new Map();
    }

    const summaries = await PropertyRating.aggregate([
        {
            $match: {
                propertyId: { $in: propertyIds },
            },
        },
        {
            $group: {
                _id: "$propertyId",
                average: { $avg: "$rating" },
                count: { $sum: 1 },
            },
        },
    ]);

    return new Map(
        summaries.map((summary) => [
            String(summary._id),
            {
                average: Number(summary.average.toFixed(1)),
                count: summary.count,
            },
        ])
    );
};

const serializeRecentRatings = (ratings) =>
    ratings.map((rating) => ({
        _id: rating._id,
        rating: rating.rating,
        review: rating.review || "",
        updatedAt: rating.updatedAt,
        reviewerName: rating.userId?.name || "Tenant",
    }));

const decoratePropertyPayloads = async (properties) => {
    const propertyIds = properties.map((property) => property._id);
    const ratingSummaryMap = await buildRatingSummaryMap(propertyIds);

    return properties.map((property) => {
        const plainProperty = property.toObject ? property.toObject() : property;
        const district = plainProperty.district || inferNepalDistrictFromText(plainProperty.address);

        return {
            ...plainProperty,
            district: district || null,
            ratingSummary:
                ratingSummaryMap.get(String(plainProperty._id)) || {
                    average: 0,
                    count: 0,
                },
        };
    });
};

const canTenantRateProperty = async (userId, propertyId) => {
    const activeOrPastTenant = await Tenant.findOne({
        userId,
        propertyId,
        status: { $in: ["Active", "Past"] },
    }).select("_id");

    if (activeOrPastTenant) {
        return true;
    }

    const association = await PropertyAssociation.findOne({
        userId,
        propertyId,
    }).select("_id");

    return Boolean(association);
};

// Get all vacant properties for marketplace (accessible to all authenticated users)
export const getMarketplaceProperties = async (req, res) => {
    try {
        const properties = await Property.find({ status: "vacant" })
            .populate("landlordId", "name email phone")
            .sort({ createdAt: -1 });

        const decoratedProperties = await decoratePropertyPayloads(properties);
        const requestedDistrict = resolveNepalDistrict({
            district: req.query?.district,
        });
        const filteredProperties = requestedDistrict
            ? decoratedProperties.filter((property) => property.district === requestedDistrict)
            : decoratedProperties;

        res.status(200).json({
            success: true,
            properties: filteredProperties,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getMarketplacePropertyById = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate(
            "landlordId",
            "name email phone"
        );

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        const isVacant = property.status === "vacant";
        const isLandlordOwner =
            req.user.role === "landlord" &&
            String(property.landlordId?._id || property.landlordId) === String(req.user._id);
        const isAssociatedTenant =
            req.user.role === "tenant"
                ? await canTenantRateProperty(req.user._id, property._id)
                : false;

        if (!isVacant && !isLandlordOwner && !isAssociatedTenant) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this property",
            });
        }

        const [decoratedProperty] = await decoratePropertyPayloads([property]);
        const recentRatings = await PropertyRating.find({ propertyId: property._id })
            .populate("userId", "name")
            .sort({ updatedAt: -1 })
            .limit(6);

        let currentUserRating = null;
        let canRate = false;

        if (req.user.role === "tenant") {
            currentUserRating = await PropertyRating.findOne({
                propertyId: property._id,
                userId: req.user._id,
            }).select("rating review updatedAt");
            canRate = await canTenantRateProperty(req.user._id, property._id);
        }

        res.status(200).json({
            success: true,
            property: {
                ...decoratedProperty,
                canRate,
                currentUserRating,
                recentRatings: serializeRecentRatings(recentRatings),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

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

        const [decoratedProperty] = await decoratePropertyPayloads([property]);
        const recentRatings = await PropertyRating.find({ propertyId: property._id })
            .populate("userId", "name")
            .sort({ updatedAt: -1 })
            .limit(6);

        res.status(200).json({
            ...decoratedProperty,
            recentRatings: serializeRecentRatings(recentRatings),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Create a new property
export const createProperty = async (req, res) => {
    const uploadedFiles = req.files || [];
    const {
        title,
        address,
        district,
        type,
        units,
        splitMethod,
        roomSizes,
        amenities,
        rent,
        description,
    } = req.body;

    if (!title || !address || !type || !units) {
        await removeStoredFiles(uploadedFiles, { resourceType: "image" });
        return res.status(400).json({ message: "Please fill in all required fields" });
    }

    try {
        if (req.user?.role !== "landlord") {
            await removeStoredFiles(uploadedFiles, { resourceType: "image" });
            return res.status(403).json({ message: "Only landlords can create properties" });
        }

        const normalizedDistrict = resolveNepalDistrict({ district, address });
        if (!normalizedDistrict) {
            await removeStoredFiles(uploadedFiles, { resourceType: "image" });
            return res.status(400).json({ message: "Please select a valid district in Nepal" });
        }

        // Handle uploaded images
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map((file) => getUploadedFileUrl(file)).filter(Boolean);
        }

        // Parse and merge URL images
        if (req.body.imageUrls) {
            try {
                const urlImages = JSON.parse(req.body.imageUrls);
                imagePaths = [...imagePaths, ...urlImages];
            } catch (e) {
                // Invalid JSON, ignore
            }
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
            district: normalizedDistrict,
            type,
            units,
            splitMethod,
            roomSizes: parsedRoomSizes,
            amenities: parsedAmenities,
            images: imagePaths,
            rent: rent ? parseFloat(rent) : 0,
            description: description || "",
            landlordId: req.user._id,
        });

        await syncPropertyUnits(property);
        res.status(201).json(property);
    } catch (error) {
        await removeStoredFiles(uploadedFiles, { resourceType: "image" });
        res.status(500).json({ message: error.message });
    }
};

// Update an existing property
export const updateProperty = async (req, res) => {
    const uploadedFiles = req.files || [];

    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            await removeStoredFiles(uploadedFiles, { resourceType: "image" });
            return res.status(404).json({ message: "Property not found" });
        }

        // Check for user
        if (!req.user) {
            await removeStoredFiles(uploadedFiles, { resourceType: "image" });
            return res.status(401).json({ message: "User not found" });
        }

        // Make sure the logged in user matches the property landlord
        if (property.landlordId.toString() !== req.user._id.toString()) {
            await removeStoredFiles(uploadedFiles, { resourceType: "image" });
            return res.status(401).json({ message: "User not authorized" });
        }

        const nextDistrict = resolveNepalDistrict({
            district: req.body.district || property.district,
            address: req.body.address || property.address,
        });

        if (!nextDistrict) {
            await removeStoredFiles(uploadedFiles, { resourceType: "image" });
            return res.status(400).json({ message: "Please select a valid district in Nepal" });
        }

        const nextUnitCount =
            req.body.units != null ? Number.parseInt(req.body.units, 10) : property.units;
        const nextRent =
            req.body.rent != null && req.body.rent !== ""
                ? Number.parseFloat(req.body.rent)
                : 0;
        const nextType = req.body.type || property.type;

        if (Number.isFinite(nextUnitCount) && nextUnitCount > 0) {
            await assertUnitCountCanBeApplied(property._id, nextUnitCount);
        }

        const uploadedImagePaths = uploadedFiles
            .map((file) => getUploadedFileUrl(file))
            .filter(Boolean);
        const retainedImageUrls = parseJsonArrayField(req.body.imageUrls, property.images);
        const updatedImages = dedupeStringList([
            ...retainedImageUrls,
            ...uploadedImagePaths,
        ]);

        const parsedRoomSizes = parseJsonArrayField(req.body.roomSizes, property.roomSizes);
        const parsedAmenities = parseJsonArrayField(req.body.amenities, property.amenities);

        const updatePayload = {
            title: req.body.title ?? property.title,
            address: req.body.address ?? property.address,
            district: nextDistrict,
            type: nextType,
            units: Number.isFinite(nextUnitCount) && nextUnitCount > 0 ? nextUnitCount : property.units,
            splitMethod: req.body.splitMethod ?? property.splitMethod,
            status: req.body.status ?? property.status,
            rent: Number.isFinite(nextRent) ? nextRent : property.rent,
            description: req.body.description ?? property.description,
            roomSizes: parsedRoomSizes,
            amenities: parsedAmenities,
            images: updatedImages,
        };

        const updatedProperty = await Property.findByIdAndUpdate(
            req.params.id,
            updatePayload,
            { new: true, runValidators: true }
        );

        await syncPropertyUnits(updatedProperty);

        res.status(200).json(updatedProperty);
    } catch (error) {
        await removeStoredFiles(uploadedFiles, { resourceType: "image" });

        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }

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

        const activeTenantCount = await Tenant.countDocuments({
            propertyId: property._id,
            status: "Active",
        });

        if (activeTenantCount > 0) {
            return res.status(400).json({
                message: "Cannot delete a property that still has active tenants",
            });
        }

        await Promise.all([
            PropertyRating.deleteMany({ propertyId: property._id }),
            PropertyAssociation.deleteMany({ propertyId: property._id }),
            property.deleteOne(),
        ]);

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createOrUpdatePropertyRating = async (req, res) => {
    try {
        if (req.user?.role !== "tenant") {
            return res.status(403).json({
                success: false,
                message: "Only tenants can rate properties",
            });
        }

        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        const canRate = await canTenantRateProperty(req.user._id, property._id);
        if (!canRate) {
            return res.status(403).json({
                success: false,
                message: "Only current or previous tenants of this property can rate it",
            });
        }

        const numericRating = Number(req.body?.rating);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be a whole number between 1 and 5",
            });
        }

        const review = typeof req.body?.review === "string" ? req.body.review.trim() : "";

        const rating = await PropertyRating.findOneAndUpdate(
            { propertyId: property._id, userId: req.user._id },
            {
                $set: {
                    rating: numericRating,
                    review,
                },
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        const [ratingSummaryMap, recentRatings] = await Promise.all([
            buildRatingSummaryMap([property._id]),
            PropertyRating.find({ propertyId: property._id })
                .populate("userId", "name")
                .sort({ updatedAt: -1 })
                .limit(6),
        ]);

        res.status(200).json({
            success: true,
            message: "Rating saved successfully",
            rating,
            ratingSummary:
                ratingSummaryMap.get(String(property._id)) || {
                    average: 0,
                    count: 0,
                },
            recentRatings: serializeRecentRatings(recentRatings),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

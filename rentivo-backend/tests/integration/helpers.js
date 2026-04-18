import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../app.js";
import User from "../../models/userModel.js";
import Property from "../../models/propertyModel.js";
import Unit from "../../models/unitModel.js";
import Tenant from "../../models/tenantModel.js";
import Invoice from "../../models/invoiceModel.js";

// db lifecycle tests

let mongod;

export async function connectTestDB() {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}

export async function disconnectTestDB() {
    await mongoose.disconnect();
    await mongod.stop();
}

export async function clearCollections() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

// user helpers tests

/**
 * Register a user via the API, then mark them as email-verified directly in the DB.
 * Returns { user (plain object), token }.
 */
export async function createVerifiedUser({
    name = "Test User",
    email = "user@test.com",
    password = "Password123!",
    role = "tenant",
    phone = "9800000000",
} = {}) {
    await request(app).post("/api/auth/register").send({ name, email, password, role, phone });

    // Bypass email verification — set directly in DB
    await User.findOneAndUpdate(
        { email },
        { isEmailVerified: true, emailVerificationToken: undefined, emailVerificationExpires: undefined }
    );

    const loginRes = await request(app).post("/api/auth/login").send({ email, password, selectedRole: role });

    // Login response is flat: { _id, name, email, role, token, ... }
    const { token, _id, ...rest } = loginRes.body;
    const user = { _id, ...rest, email };

    return { user, token };
}

/**
 * Create a landlord user and return { user, token }.
 */
export async function createLandlord(overrides = {}) {
    return createVerifiedUser({
        name: overrides.name || "Test Landlord",
        email: overrides.email || "landlord@test.com",
        password: overrides.password || "Password123!",
        role: "landlord",
    });
}

/**
 * Create a tenant user and return { user, token }.
 */
export async function createTenantUser(overrides = {}) {
    return createVerifiedUser({
        name: overrides.name || "Test Tenant",
        email: overrides.email || "tenant@test.com",
        password: overrides.password || "Password123!",
        role: "tenant",
    });
}

// property helpers tests

/**
 * Create a property directly in the DB (bypasses subscription middleware).
 */
export async function createTestProperty(landlordId, overrides = {}) {
    return Property.create({
        landlordId,
        title: overrides.title || "Test Property",
        address: overrides.address || "123 Test St, Kathmandu",
        district: overrides.district || "Kathmandu",
        type: overrides.type || "Apartment",
        units: overrides.units || 2,
        rent: overrides.rent || 15000,
        status: overrides.status || "vacant",
        splitMethod: overrides.splitMethod || "equal",
        ...(overrides.landlordId ? {} : {}),
    });
}

/**
 * Create a unit directly in the DB for a property.
 */
export async function createTestUnit(propertyId, overrides = {}) {
    return Unit.create({
        propertyId,
        unitName: overrides.unitName || "Unit 1",
        baseRent: overrides.baseRent || 15000,
        status: overrides.status || "vacant",
    });
}

// tenant helpers tests

/**
 * Create an Active tenant record directly in the DB (bypasses invitation flow).
 * Automatically creates a Unit if unitId is not provided.
 */
export async function createActiveTenant(userId, propertyId, overrides = {}) {
    let unitId = overrides.unitId;
    if (!unitId) {
        const unit = await createTestUnit(propertyId);
        unitId = unit._id;
    }

    return Tenant.create({
        userId,
        propertyId,
        unitId,
        status: "Active",
        leaseStart: new Date("2025-01-01"),
        leaseEnd: new Date("2026-01-01"),
        monthlyRent: 15000,
        securityDeposit: 0,
        ...overrides,
    });
}

// invoice helpers tests

export async function createTestInvoice(landlordId, tenantId, propertyId, overrides = {}) {
    return Invoice.create({
        landlordId,
        tenantId,
        propertyId,
        amount: overrides.amount || 15000,
        type: overrides.type || "Rent",
        dueDate: overrides.dueDate || new Date("2026-05-01"),
        status: overrides.status || "Pending",
        breakdown: overrides.breakdown || {
            baseRent: 15000,
            utilities: { electricity: 0, water: 0, internet: 0, gas: 0, waste: 0, other: 0 },
            totalUtilities: 0,
        },
    });
}

export { app };

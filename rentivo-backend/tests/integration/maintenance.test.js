import request from "supertest";
import mongoose from "mongoose";
import Maintenance from "../../models/maintenanceModel.js";
import {
    app,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    createLandlord,
    createTenantUser,
    createTestProperty,
    createActiveTenant,
} from "./helpers.js";

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

async function setupForMaintenance() {
    const { user: landlord, token: landlordToken } = await createLandlord();
    const { user: tenantUser, token: tenantToken } = await createTenantUser();
    const property = await createTestProperty(landlord._id);
    const tenantRecord = await createActiveTenant(tenantUser._id, property._id);
    return { landlord, landlordToken, tenantUser, tenantToken, property, tenantRecord };
}

async function createTestMaintenanceRequest(propertyId, tenantId, overrides = {}) {
    return Maintenance.create({
        propertyId,
        tenantId,
        title: overrides.title || "Leaking Pipe",
        description: overrides.description || "Water leaking under sink",
        priority: overrides.priority || "Medium",
        photos: [],
        photoPublicIds: [],
        statusHistory: [{ status: "Open" }],
        status: overrides.status || "Open",
    });
}

// post /api/maintenance tests

describe("POST /api/maintenance", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).post("/api/maintenance").send({});
        expect(res.status).toBe(401);
    });

    test("201 — active tenant creates a maintenance request", async () => {
        const { tenantToken, property } = await setupForMaintenance();

        const res = await request(app)
            .post("/api/maintenance")
            .set("Authorization", `Bearer ${tenantToken}`)
            .send({
                propertyId: property._id.toString(),
                title: "Broken Window",
                description: "Window latch broken",
                priority: "High",
            });
        expect(res.status).toBe(201);
        expect(res.body.title).toBe("Broken Window");
    });

    test("404 — non-tenant cannot create maintenance request", async () => {
        const { property } = await setupForMaintenance();
        const { token: otherTenantToken } = await createTenantUser({ email: "other@test.com" });

        const res = await request(app)
            .post("/api/maintenance")
            .set("Authorization", `Bearer ${otherTenantToken}`)
            .send({
                propertyId: property._id.toString(),
                title: "Test",
                description: "Test",
            });
        expect(res.status).toBe(404);
    });

    test("404 — landlord cannot create maintenance request directly", async () => {
        const { landlordToken, property } = await setupForMaintenance();

        const res = await request(app)
            .post("/api/maintenance")
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({
                propertyId: property._id.toString(),
                title: "Roof Leak",
                description: "Roof leaking",
            });
        expect(res.status).toBe(404);
    });
});

// get /api/maintenance tests

describe("GET /api/maintenance", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).get("/api/maintenance");
        expect(res.status).toBe(401);
    });

    test("200 — landlord sees maintenance requests for their properties", async () => {
        const { landlordToken, property, tenantRecord } = await setupForMaintenance();
        await createTestMaintenanceRequest(property._id, tenantRecord._id);

        const res = await request(app)
            .get("/api/maintenance")
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });

    test("200 — tenant sees their own maintenance requests", async () => {
        const { tenantToken, property, tenantRecord } = await setupForMaintenance();
        await createTestMaintenanceRequest(property._id, tenantRecord._id);

        const res = await request(app)
            .get("/api/maintenance")
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
    });

    test("200 — returns empty list when no requests", async () => {
        const { landlordToken } = await setupForMaintenance();
        const res = await request(app)
            .get("/api/maintenance")
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// get /api/maintenance/:id tests

describe("GET /api/maintenance/:id", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).get(
            `/api/maintenance/${new mongoose.Types.ObjectId()}`
        );
        expect(res.status).toBe(401);
    });

    test("200 — landlord gets a request by id", async () => {
        const { landlordToken, property, tenantRecord } = await setupForMaintenance();
        const req = await createTestMaintenanceRequest(property._id, tenantRecord._id, {
            title: "Pipe Leak",
        });

        const res = await request(app)
            .get(`/api/maintenance/${req._id}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(200);
        expect(res.body.title).toBe("Pipe Leak");
    });

    test("404 — request not found", async () => {
        const { landlordToken } = await setupForMaintenance();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .get(`/api/maintenance/${fakeId}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(404);
    });
});

// put /api/maintenance/:id/status tests

describe("PUT /api/maintenance/:id/status", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).put(
            `/api/maintenance/${new mongoose.Types.ObjectId()}/status`
        );
        expect(res.status).toBe(401);
    });

    test("200 — landlord updates status to In Progress", async () => {
        const { landlordToken, property, tenantRecord } = await setupForMaintenance();
        const req = await createTestMaintenanceRequest(property._id, tenantRecord._id);

        const res = await request(app)
            .put(`/api/maintenance/${req._id}/status`)
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({ status: "In Progress" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("In Progress");
    });

    test("200 — landlord marks request as Resolved", async () => {
        const { landlordToken, property, tenantRecord } = await setupForMaintenance();
        const req = await createTestMaintenanceRequest(property._id, tenantRecord._id);

        const res = await request(app)
            .put(`/api/maintenance/${req._id}/status`)
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({ status: "Resolved" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("Resolved");
    });

    test("404 — request not found", async () => {
        const { landlordToken } = await setupForMaintenance();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .put(`/api/maintenance/${fakeId}/status`)
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({ status: "Resolved" });
        expect(res.status).toBe(404);
    });
});

// delete /api/maintenance/:id tests

describe("DELETE /api/maintenance/:id", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).delete(
            `/api/maintenance/${new mongoose.Types.ObjectId()}`
        );
        expect(res.status).toBe(401);
    });

    test("200 — landlord deletes a maintenance request", async () => {
        const { landlordToken, property, tenantRecord } = await setupForMaintenance();
        const req = await createTestMaintenanceRequest(property._id, tenantRecord._id);

        const res = await request(app)
            .delete(`/api/maintenance/${req._id}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(200);

        const deleted = await Maintenance.findById(req._id);
        expect(deleted).toBeNull();
    });

    test("401 — tenant cannot delete a maintenance request (landlord only)", async () => {
        const { tenantToken, property, tenantRecord } = await setupForMaintenance();
        const req = await createTestMaintenanceRequest(property._id, tenantRecord._id);

        const res = await request(app)
            .delete(`/api/maintenance/${req._id}`)
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(401);
    });

    test("404 — request not found", async () => {
        const { landlordToken } = await setupForMaintenance();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .delete(`/api/maintenance/${fakeId}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(404);
    });
});

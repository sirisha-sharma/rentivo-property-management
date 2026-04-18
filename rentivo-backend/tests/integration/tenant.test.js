import request from "supertest";
import mongoose from "mongoose";
import Tenant from "../../models/tenantModel.js";
import {
    app,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    createLandlord,
    createTenantUser,
    createTestProperty,
    createTestUnit,
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

// get /api/tenants (landlord list) tests

describe("GET /api/tenants", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).get("/api/tenants");
        expect(res.status).toBe(401);
    });

    test("200 — landlord gets their tenants", async () => {
        const { user: landlord, token } = await createLandlord();
        const { user: tenantUser } = await createTenantUser();
        const property = await createTestProperty(landlord._id);
        await createActiveTenant(tenantUser._id, property._id);

        const res = await request(app)
            .get("/api/tenants")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });

    test("200 — landlord only sees their own tenants", async () => {
        const { user: l1, token: t1 } = await createLandlord({ email: "l1@test.com" });
        const { user: l2 } = await createLandlord({ email: "l2@test.com" });
        const { user: tenantUser } = await createTenantUser();

        const p1 = await createTestProperty(l1._id);
        const p2 = await createTestProperty(l2._id, { title: "L2 Prop" });

        await createActiveTenant(tenantUser._id, p1._id);
        const { user: t2user } = await createTenantUser({ email: "t2@test.com" });
        await createActiveTenant(t2user._id, p2._id);

        const res = await request(app)
            .get("/api/tenants")
            .set("Authorization", `Bearer ${t1}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
    });

    test("200 — empty list when no tenants", async () => {
        const { token } = await createLandlord();
        const res = await request(app)
            .get("/api/tenants")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// post /api/tenants (invite) tests

describe("POST /api/tenants", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).post("/api/tenants").send({});
        expect(res.status).toBe(401);
    });

    test("400 — missing required fields", async () => {
        const { token } = await createLandlord();
        const res = await request(app)
            .post("/api/tenants")
            .set("Authorization", `Bearer ${token}`)
            .send({ email: "tenant@test.com" });
        expect(res.status).toBe(400);
    });

    test("404 — tenant user not registered", async () => {
        const { user: landlord, token } = await createLandlord();
        const property = await createTestProperty(landlord._id);

        const res = await request(app)
            .post("/api/tenants")
            .set("Authorization", `Bearer ${token}`)
            .send({
                email: "nonexistent@test.com",
                propertyId: property._id.toString(),
                leaseStart: "2026-01-01",
                leaseEnd: "2027-01-01",
            });
        expect(res.status).toBe(404);
    });

    test("201 — landlord invites a registered tenant", async () => {
        const { user: landlord, token } = await createLandlord();
        const { user: tenantUser } = await createTenantUser();
        const property = await createTestProperty(landlord._id);
        const unit = await createTestUnit(property._id);

        const res = await request(app)
            .post("/api/tenants")
            .set("Authorization", `Bearer ${token}`)
            .send({
                email: tenantUser.email,
                propertyId: property._id.toString(),
                unitId: unit._id.toString(),
                leaseStart: "2026-01-01",
                leaseEnd: "2027-01-01",
                monthlyRent: 15000,
                securityDeposit: 30000,
            });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe("Pending");
    });

    test("404 — property not found", async () => {
        const { token } = await createLandlord();
        const { user: tenantUser } = await createTenantUser();

        const res = await request(app)
            .post("/api/tenants")
            .set("Authorization", `Bearer ${token}`)
            .send({
                email: tenantUser.email,
                propertyId: new mongoose.Types.ObjectId().toString(),
                leaseStart: "2026-01-01",
                leaseEnd: "2027-01-01",
            });
        expect(res.status).toBe(404);
    });
});

// get /api/tenants/my-invitations tests

describe("GET /api/tenants/my-invitations", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).get("/api/tenants/my-invitations");
        expect(res.status).toBe(401);
    });

    test("200 — tenant sees pending invitations", async () => {
        const { user: landlord } = await createLandlord();
        const { user: tenantUser, token: tenantToken } = await createTenantUser();
        const property = await createTestProperty(landlord._id);
        const unit = await createTestUnit(property._id);

        // Create a Pending tenant record
        await Tenant.create({
            userId: tenantUser._id,
            propertyId: property._id,
            unitId: unit._id,
            status: "Pending",
            leaseStart: new Date("2026-01-01"),
            leaseEnd: new Date("2027-01-01"),
            monthlyRent: 15000,
            securityDeposit: 0,
        });

        const res = await request(app)
            .get("/api/tenants/my-invitations")
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });

    test("200 — empty when no invitations", async () => {
        const { token } = await createTenantUser();
        const res = await request(app)
            .get("/api/tenants/my-invitations")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// put /api/tenants/:id/accept tests

describe("PUT /api/tenants/:id/accept", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).put(
            `/api/tenants/${new mongoose.Types.ObjectId()}/accept`
        );
        expect(res.status).toBe(401);
    });

    test("200 — tenant accepts invitation and status becomes Active", async () => {
        const { user: landlord } = await createLandlord();
        const { user: tenantUser, token: tenantToken } = await createTenantUser();
        const property = await createTestProperty(landlord._id);
        const unit = await createTestUnit(property._id);

        const invitation = await Tenant.create({
            userId: tenantUser._id,
            propertyId: property._id,
            unitId: unit._id,
            status: "Pending",
            leaseStart: new Date("2026-01-01"),
            leaseEnd: new Date("2027-01-01"),
            monthlyRent: 15000,
            securityDeposit: 0,
        });

        const res = await request(app)
            .put(`/api/tenants/${invitation._id}/accept`)
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(200);

        const updated = await Tenant.findById(invitation._id);
        expect(updated.status).toBe("Active");
    });

    test("404 — invitation not found", async () => {
        const { token } = await createTenantUser();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .put(`/api/tenants/${fakeId}/accept`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});

// put /api/tenants/:id/reject tests

describe("PUT /api/tenants/:id/reject", () => {
    test("200 — tenant rejects invitation and status becomes Rejected", async () => {
        const { user: landlord } = await createLandlord();
        const { user: tenantUser, token: tenantToken } = await createTenantUser();
        const property = await createTestProperty(landlord._id);
        const unit = await createTestUnit(property._id);

        const invitation = await Tenant.create({
            userId: tenantUser._id,
            propertyId: property._id,
            unitId: unit._id,
            status: "Pending",
            leaseStart: new Date("2026-01-01"),
            leaseEnd: new Date("2027-01-01"),
            monthlyRent: 15000,
            securityDeposit: 0,
        });

        const res = await request(app)
            .put(`/api/tenants/${invitation._id}/reject`)
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(200);

        // reject deletes the tenant record
        const deleted = await Tenant.findById(invitation._id);
        expect(deleted).toBeNull();
    });
});

// delete /api/tenants/:id tests

describe("DELETE /api/tenants/:id", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).delete(
            `/api/tenants/${new mongoose.Types.ObjectId()}`
        );
        expect(res.status).toBe(401);
    });

    test("200 — landlord removes a tenant from their property", async () => {
        const { user: landlord, token } = await createLandlord();
        const { user: tenantUser } = await createTenantUser();
        const property = await createTestProperty(landlord._id);
        const tenantRecord = await createActiveTenant(tenantUser._id, property._id);

        const res = await request(app)
            .delete(`/api/tenants/${tenantRecord._id}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    test("401/403/404 — cannot delete another landlord's tenant", async () => {
        const { user: l1 } = await createLandlord({ email: "l1@test.com" });
        const { token: t2 } = await createLandlord({ email: "l2@test.com" });
        const { user: tenantUser } = await createTenantUser();
        const property = await createTestProperty(l1._id);
        const tenantRecord = await createActiveTenant(tenantUser._id, property._id);

        const res = await request(app)
            .delete(`/api/tenants/${tenantRecord._id}`)
            .set("Authorization", `Bearer ${t2}`);
        expect([401, 403, 404]).toContain(res.status);
    });

    test("404 — tenant not found", async () => {
        const { token } = await createLandlord();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .delete(`/api/tenants/${fakeId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});

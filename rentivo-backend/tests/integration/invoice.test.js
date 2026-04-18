import request from "supertest";
import mongoose from "mongoose";
import {
    app,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    createLandlord,
    createTenantUser,
    createTestProperty,
    createActiveTenant,
    createTestInvoice,
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

// shared setup helper
async function setupLandlordWithTenant() {
    const { user: landlord, token: landlordToken } = await createLandlord();
    const { user: tenant, token: tenantToken } = await createTenantUser();
    const property = await createTestProperty(landlord._id);
    const tenantRecord = await createActiveTenant(tenant._id, property._id);
    return { landlord, landlordToken, tenant, tenantToken, property, tenantRecord };
}

// post /api/invoices tests

describe("POST /api/invoices", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).post("/api/invoices").send({});
        expect(res.status).toBe(401);
    });

    test("201 — landlord creates a Rent invoice for a tenant", async () => {
        const { landlordToken, tenantRecord, property } = await setupLandlordWithTenant();

        const res = await request(app)
            .post("/api/invoices")
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({
                tenantId: tenantRecord._id.toString(),
                propertyId: property._id.toString(),
                amount: 15000,
                type: "Rent",
                dueDate: "2026-06-01",
                breakdown: {
                    baseRent: 15000,
                    totalUtilities: 0,
                    utilities: { electricity: 0, water: 0, internet: 0, gas: 0, waste: 0, other: 0 },
                },
            });
        expect(res.status).toBe(201);
        expect(res.body.amount).toBe(15000);
        expect(res.body.type).toBe("Rent");
        expect(res.body.status).toBe("Pending");
    });

    test("201 — creates a Utilities invoice", async () => {
        const { landlordToken, tenantRecord, property } = await setupLandlordWithTenant();

        const res = await request(app)
            .post("/api/invoices")
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({
                tenantId: tenantRecord._id.toString(),
                propertyId: property._id.toString(),
                amount: 3000,
                type: "Utilities",
                dueDate: "2026-06-01",
                breakdown: {
                    baseRent: 0,
                    totalUtilities: 3000,
                    utilities: { electricity: 1000, water: 500, internet: 1500, gas: 0, waste: 0, other: 0 },
                },
            });
        expect(res.status).toBe(201);
        expect(res.body.type).toBe("Utilities");
    });

    test("400 — amount mismatch with breakdown", async () => {
        const { landlordToken, tenantRecord, property } = await setupLandlordWithTenant();

        const res = await request(app)
            .post("/api/invoices")
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({
                tenantId: tenantRecord._id.toString(),
                propertyId: property._id.toString(),
                amount: 9999,
                type: "Rent",
                dueDate: "2026-06-01",
                breakdown: {
                    baseRent: 15000,
                    totalUtilities: 0,
                    utilities: {},
                },
            });
        expect(res.status).toBe(400);
    });

    test("403/404 — cannot create invoice for tenant not in this property", async () => {
        const { landlordToken, property } = await setupLandlordWithTenant();
        const { user: otherTenant } = await createTenantUser({ email: "other@test.com" });

        const res = await request(app)
            .post("/api/invoices")
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({
                tenantId: new mongoose.Types.ObjectId().toString(),
                propertyId: property._id.toString(),
                amount: 15000,
                type: "Rent",
                dueDate: "2026-06-01",
                breakdown: { baseRent: 15000, totalUtilities: 0, utilities: {} },
            });
        expect([403, 404]).toContain(res.status);
    });
});

// get /api/invoices tests

describe("GET /api/invoices", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).get("/api/invoices");
        expect(res.status).toBe(401);
    });

    test("200 — landlord sees their invoices", async () => {
        const { landlord, landlordToken, tenantRecord, property } = await setupLandlordWithTenant();
        await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .get("/api/invoices")
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });

    test("200 — tenant sees their invoices", async () => {
        const { landlord, tenant, tenantToken, tenantRecord, property } = await setupLandlordWithTenant();
        await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .get("/api/invoices")
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });

    test("200 — landlord does not see another landlord's invoices", async () => {
        const { landlord: l1, tenantRecord: tr1, property: p1 } = await setupLandlordWithTenant();
        const { token: t2 } = await createLandlord({ email: "l2@test.com" });
        await createTestInvoice(l1._id, tr1._id, p1._id);

        const res = await request(app)
            .get("/api/invoices")
            .set("Authorization", `Bearer ${t2}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(0);
    });
});

// get /api/invoices/:id tests

describe("GET /api/invoices/:id", () => {
    test("200 — landlord can get invoice by id", async () => {
        const { landlord, landlordToken, tenantRecord, property } = await setupLandlordWithTenant();
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .get(`/api/invoices/${invoice._id}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(200);
        expect(res.body.invoice._id.toString()).toBe(invoice._id.toString());
    });

    test("200 — tenant can get their own invoice by id", async () => {
        const { landlord, tenantToken, tenantRecord, property } = await setupLandlordWithTenant();
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .get(`/api/invoices/${invoice._id}`)
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(200);
    });

    test("404 — invoice not found", async () => {
        const { landlordToken } = await setupLandlordWithTenant();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .get(`/api/invoices/${fakeId}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(404);
    });

    test("401 — another landlord cannot access this invoice", async () => {
        const { landlord, tenantRecord, property } = await setupLandlordWithTenant();
        const { token: t2 } = await createLandlord({ email: "l2@test.com" });
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .get(`/api/invoices/${invoice._id}`)
            .set("Authorization", `Bearer ${t2}`);
        expect(res.status).toBe(401);
    });
});

// put /api/invoices/:id/status tests

describe("PUT /api/invoices/:id/status", () => {
    test("200 — landlord marks invoice as Paid, paidDate is set", async () => {
        const { landlord, landlordToken, tenantRecord, property } = await setupLandlordWithTenant();
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .put(`/api/invoices/${invoice._id}/status`)
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({ status: "Paid" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("Paid");
        expect(res.body.paidDate).toBeDefined();
    });

    test("200 — landlord marks Paid invoice back to Pending, paidDate is cleared", async () => {
        const { landlord, landlordToken, tenantRecord, property } = await setupLandlordWithTenant();
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id, {
            status: "Paid",
        });

        const res = await request(app)
            .put(`/api/invoices/${invoice._id}/status`)
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({ status: "Pending" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("Pending");
        expect(res.body.paidDate).toBeFalsy();
    });

    test("401 — tenant cannot update invoice status (landlord only)", async () => {
        const { landlord, tenantToken, tenantRecord, property } = await setupLandlordWithTenant();
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .put(`/api/invoices/${invoice._id}/status`)
            .set("Authorization", `Bearer ${tenantToken}`)
            .send({ status: "Paid" });
        expect(res.status).toBe(401);
    });

    test("401 — another user cannot update this invoice", async () => {
        const { landlord, tenantRecord, property } = await setupLandlordWithTenant();
        const { token: t2 } = await createLandlord({ email: "l2@test.com" });
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .put(`/api/invoices/${invoice._id}/status`)
            .set("Authorization", `Bearer ${t2}`)
            .send({ status: "Paid" });
        expect(res.status).toBe(401);
    });

    test("404 — invoice not found", async () => {
        const { landlordToken } = await setupLandlordWithTenant();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .put(`/api/invoices/${fakeId}/status`)
            .set("Authorization", `Bearer ${landlordToken}`)
            .send({ status: "Paid" });
        expect(res.status).toBe(404);
    });
});

// delete /api/invoices/:id tests

describe("DELETE /api/invoices/:id", () => {
    test("200 — landlord deletes their invoice", async () => {
        const { landlord, landlordToken, tenantRecord, property } = await setupLandlordWithTenant();
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .delete(`/api/invoices/${invoice._id}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(200);
    });

    test("401 — tenant cannot delete an invoice (landlord only)", async () => {
        const { landlord, tenantToken, tenantRecord, property } = await setupLandlordWithTenant();
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .delete(`/api/invoices/${invoice._id}`)
            .set("Authorization", `Bearer ${tenantToken}`);
        expect(res.status).toBe(401);
    });

    test("404 — deleting non-existent invoice", async () => {
        const { landlordToken } = await setupLandlordWithTenant();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .delete(`/api/invoices/${fakeId}`)
            .set("Authorization", `Bearer ${landlordToken}`);
        expect(res.status).toBe(404);
    });

    test("401 — another landlord cannot delete this invoice", async () => {
        const { landlord, tenantRecord, property } = await setupLandlordWithTenant();
        const { token: t2 } = await createLandlord({ email: "l2@test.com" });
        const invoice = await createTestInvoice(landlord._id, tenantRecord._id, property._id);

        const res = await request(app)
            .delete(`/api/invoices/${invoice._id}`)
            .set("Authorization", `Bearer ${t2}`);
        expect(res.status).toBe(401);
    });
});

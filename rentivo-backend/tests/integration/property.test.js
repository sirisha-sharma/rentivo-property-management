import request from "supertest";
import {
    app,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    createLandlord,
    createTenantUser,
    createTestProperty,
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

// get /api/properties tests

describe("GET /api/properties", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).get("/api/properties");
        expect(res.status).toBe(401);
    });

    test("200 — landlord gets their own property list", async () => {
        const { user, token } = await createLandlord();
        await createTestProperty(user._id);

        const res = await request(app)
            .get("/api/properties")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });

    test("200 — landlord only sees their own properties (not other landlords)", async () => {
        const { user: l1, token: t1 } = await createLandlord({ email: "landlord1@test.com" });
        const { user: l2 } = await createLandlord({ email: "landlord2@test.com" });

        await createTestProperty(l1._id, { title: "L1 Property" });
        await createTestProperty(l2._id, { title: "L2 Property" });

        const res = await request(app)
            .get("/api/properties")
            .set("Authorization", `Bearer ${t1}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].title).toBe("L1 Property");
    });

    test("200 — returns empty array when landlord has no properties", async () => {
        const { token } = await createLandlord();
        const res = await request(app)
            .get("/api/properties")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// post /api/properties tests

describe("POST /api/properties", () => {
    test("400 — missing required fields", async () => {
        const { token } = await createLandlord();
        const res = await request(app)
            .post("/api/properties")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Missing Address" });
        expect(res.status).toBe(400);
    });

    test("403 — tenant cannot create a property", async () => {
        const { token } = await createTenantUser();
        const res = await request(app)
            .post("/api/properties")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Test",
                address: "Kathmandu",
                type: "Apartment",
                units: 1,
            });
        expect(res.status).toBe(403);
    });

    test("201 — landlord creates a property with valid fields", async () => {
        const { token } = await createLandlord();
        const res = await request(app)
            .post("/api/properties")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Green Apartment",
                address: "Lalitpur, Kathmandu",
                district: "Lalitpur",
                type: "Apartment",
                units: 2,
                rent: 12000,
            });
        expect(res.status).toBe(201);
        expect(res.body.title).toBe("Green Apartment");
    });

    test("400 — invalid district", async () => {
        const { token } = await createLandlord();
        const res = await request(app)
            .post("/api/properties")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Overseas Place",
                address: "Paris, France",
                district: "Paris",
                type: "Apartment",
                units: 1,
            });
        expect(res.status).toBe(400);
    });
});

// get /api/properties/:id tests

describe("GET /api/properties/:id", () => {
    test("200 — landlord can get their property by id", async () => {
        const { user, token } = await createLandlord();
        const property = await createTestProperty(user._id, { title: "My Place" });

        const res = await request(app)
            .get(`/api/properties/${property._id}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.title).toBe("My Place");
    });

    test("404 — property not found", async () => {
        const { token } = await createLandlord();
        const fakeId = "64a1b2c3d4e5f6a7b8c9d0e1";
        const res = await request(app)
            .get(`/api/properties/${fakeId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
    });

    test("401 — unauthenticated request rejected", async () => {
        const { user } = await createLandlord();
        const property = await createTestProperty(user._id);
        const res = await request(app).get(`/api/properties/${property._id}`);
        expect(res.status).toBe(401);
    });
});

// delete /api/properties/:id tests

describe("DELETE /api/properties/:id", () => {
    test("200 — landlord deletes own property", async () => {
        const { user, token } = await createLandlord();
        const property = await createTestProperty(user._id);

        const res = await request(app)
            .delete(`/api/properties/${property._id}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    test("401/403/404 — cannot delete another landlord's property", async () => {
        const { user: l1 } = await createLandlord({ email: "l1@test.com" });
        const { token: t2 } = await createLandlord({ email: "l2@test.com" });
        const property = await createTestProperty(l1._id);

        const res = await request(app)
            .delete(`/api/properties/${property._id}`)
            .set("Authorization", `Bearer ${t2}`);
        expect([401, 403, 404]).toContain(res.status);
    });

    test("401 — unauthenticated delete rejected", async () => {
        const { user } = await createLandlord();
        const property = await createTestProperty(user._id);
        const res = await request(app).delete(`/api/properties/${property._id}`);
        expect(res.status).toBe(401);
    });
});

// get /api/properties/marketplace tests

describe("GET /api/properties/marketplace", () => {
    test("200 — returns marketplace properties", async () => {
        const { user } = await createLandlord();
        await createTestProperty(user._id, { isListed: true });

        const { token } = await createTenantUser();
        const res = await request(app)
            .get("/api/properties/marketplace")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.properties)).toBe(true);
    });
});

import request from "supertest";
import mongoose from "mongoose";
import Notification from "../../models/notificationModel.js";
import {
    app,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    createLandlord,
    createTenantUser,
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

async function createNotificationForUser(userId, overrides = {}) {
    return Notification.create({
        userId,
        type: overrides.type || "invoice",
        message: overrides.message || "Test notification",
        read: overrides.read || false,
    });
}

// get /api/notifications tests

describe("GET /api/notifications", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).get("/api/notifications");
        expect(res.status).toBe(401);
    });

    test("200 — returns empty list when no notifications", async () => {
        const { token } = await createTenantUser();
        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });

    test("200 — returns user's own notifications", async () => {
        const { user, token } = await createTenantUser();
        await createNotificationForUser(user._id, { message: "Invoice due" });
        await createNotificationForUser(user._id, { message: "Payment received" });

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
    });

    test("200 — user only sees their own notifications (not others')", async () => {
        const { user: u1, token: t1 } = await createTenantUser({ email: "t1@test.com" });
        const { user: u2 } = await createLandlord({ email: "l1@test.com" });

        await createNotificationForUser(u1._id, { message: "For tenant" });
        await createNotificationForUser(u2._id, { message: "For landlord" });

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${t1}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].message).toBe("For tenant");
    });
});

// put /api/notifications/:id/read tests

describe("PUT /api/notifications/:id/read", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).put(
            `/api/notifications/${new mongoose.Types.ObjectId()}/read`
        );
        expect(res.status).toBe(401);
    });

    test("200 — marks a notification as read", async () => {
        const { user, token } = await createTenantUser();
        const notif = await createNotificationForUser(user._id, { isRead: false });

        const res = await request(app)
            .put(`/api/notifications/${notif._id}/read`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);

        const updated = await Notification.findById(notif._id);
        expect(updated.read).toBe(true);
    });

    test("404 — notification not found", async () => {
        const { token } = await createTenantUser();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .put(`/api/notifications/${fakeId}/read`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});

// put /api/notifications/read-all tests

describe("PUT /api/notifications/read-all", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).put("/api/notifications/read-all");
        expect(res.status).toBe(401);
    });

    test("200 — marks all unread notifications as read", async () => {
        const { user, token } = await createTenantUser();
        await createNotificationForUser(user._id, { read: false });
        await createNotificationForUser(user._id, { read: false });

        const res = await request(app)
            .put("/api/notifications/read-all")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);

        const unread = await Notification.countDocuments({ userId: user._id, read: false });
        expect(unread).toBe(0);
    });

    test("200 — does not affect other users' notifications", async () => {
        const { user: u1, token: t1 } = await createTenantUser({ email: "t1@test.com" });
        const { user: u2 } = await createLandlord({ email: "l1@test.com" });

        await createNotificationForUser(u1._id, { read: false });
        await createNotificationForUser(u2._id, { read: false });

        await request(app)
            .put("/api/notifications/read-all")
            .set("Authorization", `Bearer ${t1}`);

        const u2Unread = await Notification.countDocuments({ userId: u2._id, read: false });
        expect(u2Unread).toBe(1);
    });
});

// delete /api/notifications/:id tests

describe("DELETE /api/notifications/:id", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).delete(
            `/api/notifications/${new mongoose.Types.ObjectId()}`
        );
        expect(res.status).toBe(401);
    });

    test("200 — user deletes their own notification", async () => {
        const { user, token } = await createTenantUser();
        const notif = await createNotificationForUser(user._id);

        const res = await request(app)
            .delete(`/api/notifications/${notif._id}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);

        const deleted = await Notification.findById(notif._id);
        expect(deleted).toBeNull();
    });

    test("404 — notification not found", async () => {
        const { token } = await createTenantUser();
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .delete(`/api/notifications/${fakeId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});

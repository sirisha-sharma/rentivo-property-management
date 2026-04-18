import request from "supertest";
import User from "../../models/userModel.js";
import crypto from "crypto";
import {
    app,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    createVerifiedUser,
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

const REGISTER_BASE = {
    name: "Alice",
    email: "alice@test.com",
    password: "Password123!",
    phone: "9800000001",
    role: "tenant",
};

// register tests

describe("POST /api/auth/register", () => {
    test("201 — creates a new landlord account", async () => {
        const res = await request(app).post("/api/auth/register").send({
            ...REGISTER_BASE,
            role: "landlord",
        });
        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/registr|successful/i);
    });

    test("201 — creates a new tenant account", async () => {
        const res = await request(app).post("/api/auth/register").send({
            ...REGISTER_BASE,
            email: "bob@test.com",
            role: "tenant",
        });
        expect(res.status).toBe(201);
    });

    test("400 — missing name", async () => {
        const { name, ...rest } = REGISTER_BASE;
        const res = await request(app).post("/api/auth/register").send(rest);
        expect(res.status).toBe(400);
    });

    test("400 — missing phone", async () => {
        const { phone, ...rest } = REGISTER_BASE;
        const res = await request(app).post("/api/auth/register").send(rest);
        expect(res.status).toBe(400);
    });

    test("400 — missing password", async () => {
        const { password, ...rest } = REGISTER_BASE;
        const res = await request(app).post("/api/auth/register").send(rest);
        expect(res.status).toBe(400);
    });

    test("400 — invalid role", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ ...REGISTER_BASE, role: "admin" });
        expect(res.status).toBe(400);
    });

    test("400 — duplicate email", async () => {
        await request(app).post("/api/auth/register").send(REGISTER_BASE);
        const res = await request(app)
            .post("/api/auth/register")
            .send({ ...REGISTER_BASE, name: "Alice2" });
        expect(res.status).toBe(400);
    });

    test("normalises email to lowercase", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({ ...REGISTER_BASE, email: "ALICE@TEST.COM" });
        const user = await User.findOne({ email: "alice@test.com" });
        expect(user).not.toBeNull();
    });
});

// login tests

describe("POST /api/auth/login", () => {
    test("200 — returns JWT token after email verified", async () => {
        const { token } = await createVerifiedUser({
            email: "login@test.com",
            password: "Password123!",
            role: "tenant",
        });
        expect(token).toBeDefined();
        expect(typeof token).toBe("string");
    });

    test("400 — missing email", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ password: "Password123!", selectedRole: "tenant" });
        expect(res.status).toBe(400);
    });

    test("400 — missing password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "x@test.com", selectedRole: "tenant" });
        expect(res.status).toBe(400);
    });

    test("401 — user not found", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: "nobody@test.com",
            password: "Password123!",
            selectedRole: "tenant",
        });
        expect(res.status).toBe(401);
    });

    test("401 — wrong password", async () => {
        await createVerifiedUser({ email: "alice@test.com", password: "Password123!", role: "tenant" });
        const res = await request(app).post("/api/auth/login").send({
            email: "alice@test.com",
            password: "WrongPassword!",
            selectedRole: "tenant",
        });
        expect(res.status).toBe(401);
    });

    test("403 — unverified email cannot login", async () => {
        await request(app).post("/api/auth/register").send({ ...REGISTER_BASE, email: "unverified@test.com" });
        const res = await request(app).post("/api/auth/login").send({
            email: "unverified@test.com",
            password: "Password123!",
            selectedRole: "tenant",
        });
        expect(res.status).toBe(403);
    });

    test("403 — deactivated account cannot login", async () => {
        await createVerifiedUser({ email: "deactivated@test.com", role: "tenant" });
        await User.findOneAndUpdate({ email: "deactivated@test.com" }, { isActive: false });
        const res = await request(app).post("/api/auth/login").send({
            email: "deactivated@test.com",
            password: "Password123!",
            selectedRole: "tenant",
        });
        expect(res.status).toBe(403);
    });

    test("403 — role mismatch (tenant account logging in as landlord)", async () => {
        await createVerifiedUser({ email: "tenant@test.com", role: "tenant" });
        const res = await request(app).post("/api/auth/login").send({
            email: "tenant@test.com",
            password: "Password123!",
            selectedRole: "landlord",
        });
        expect(res.status).toBe(403);
    });

    test("200 — login response contains role and token, no password", async () => {
        await createVerifiedUser({ email: "alice@test.com", role: "landlord" });
        const res = await request(app).post("/api/auth/login").send({
            email: "alice@test.com",
            password: "Password123!",
            selectedRole: "landlord",
        });
        expect(res.status).toBe(200);
        expect(res.body.role).toBe("landlord");
        expect(res.body.token).toBeDefined();
        expect(res.body.password).toBeUndefined();
    });
});

// email verification tests

describe("GET /api/auth/verify-email/:token", () => {
    test("200 HTML — valid token verifies account", async () => {
        await request(app).post("/api/auth/register").send({ ...REGISTER_BASE });

        const rawToken = "known-test-token-12345";
        const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
        await User.findOneAndUpdate(
            { email: REGISTER_BASE.email },
            { emailVerificationToken: hashed, emailVerificationExpires: new Date(Date.now() + 3600000) }
        );

        const res = await request(app).get(`/api/auth/verify-email/${rawToken}`);
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/verified|success/i);
    });

    test("200 HTML — invalid token returns failure HTML page (controller always returns 200)", async () => {
        const res = await request(app).get("/api/auth/verify-email/invalid-token-xyz");
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/failed|invalid|expired/i);
    });
});

// forgot / reset password tests

describe("POST /api/auth/forgot-password", () => {
    test("400 — missing email", async () => {
        const res = await request(app).post("/api/auth/forgot-password").send({});
        expect(res.status).toBe(400);
    });

    test("200 — responds even for unknown email (enumeration prevention)", async () => {
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "nobody@test.com" });
        expect(res.status).toBe(200);
    });

    test("200 — sets reset token in DB for known user", async () => {
        await createVerifiedUser({ email: "alice@test.com", role: "tenant" });
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "alice@test.com" });
        expect(res.status).toBe(200);
        const dbUser = await User.findOne({ email: "alice@test.com" });
        expect(dbUser.passwordResetToken).toBeDefined();
        expect(dbUser.passwordResetExpires).toBeDefined();
    });
});

describe("POST /api/auth/reset-password/:token", () => {
    test("200 — valid token resets password and clears token", async () => {
        await createVerifiedUser({ email: "alice@test.com", role: "tenant" });

        const rawToken = "reset-token-abc123";
        const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
        await User.findOneAndUpdate(
            { email: "alice@test.com" },
            { passwordResetToken: hashed, passwordResetExpires: new Date(Date.now() + 3600000) }
        );

        const res = await request(app)
            .post(`/api/auth/reset-password/${rawToken}`)
            .send({ newPassword: "NewPassword123!" });
        expect(res.status).toBe(200);

        const dbUser = await User.findOne({ email: "alice@test.com" });
        expect(dbUser.passwordResetToken).toBeUndefined();
    });

    test("400 — invalid/expired token", async () => {
        const res = await request(app)
            .post("/api/auth/reset-password/badtoken")
            .send({ newPassword: "NewPassword123!" });
        expect(res.status).toBe(400);
    });

    test("400 — password too short", async () => {
        await createVerifiedUser({ email: "alice@test.com", role: "tenant" });
        const rawToken = "reset-token-xyz";
        const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
        await User.findOneAndUpdate(
            { email: "alice@test.com" },
            { passwordResetToken: hashed, passwordResetExpires: new Date(Date.now() + 3600000) }
        );
        const res = await request(app)
            .post(`/api/auth/reset-password/${rawToken}`)
            .send({ newPassword: "1234567" });
        expect(res.status).toBe(400);
    });
});

// resend verification tests

describe("POST /api/auth/resend-verification", () => {
    test("400 — missing email", async () => {
        const res = await request(app).post("/api/auth/resend-verification").send({});
        expect(res.status).toBe(400);
    });

    test("200 — unknown email returns silent success (enumeration prevention)", async () => {
        const res = await request(app)
            .post("/api/auth/resend-verification")
            .send({ email: "nobody@test.com" });
        expect(res.status).toBe(200);
    });

    test("400 — already verified email", async () => {
        await createVerifiedUser({ email: "alice@test.com", role: "tenant" });
        const res = await request(app)
            .post("/api/auth/resend-verification")
            .send({ email: "alice@test.com" });
        expect(res.status).toBe(400);
    });
});

// protected route guard tests

describe("Protected route guard (via GET /api/notifications)", () => {
    test("401 — no Authorization header", async () => {
        const res = await request(app).get("/api/notifications");
        expect(res.status).toBe(401);
    });

    test("401 — malformed token", async () => {
        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", "Bearer not-a-real-token");
        expect(res.status).toBe(401);
    });

    test("200 — valid token grants access", async () => {
        const { token } = await createVerifiedUser({ email: "alice@test.com", role: "tenant" });
        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});

// toggle 2fa (protected) tests

describe("POST /api/auth/toggle-2fa", () => {
    test("401 — requires authentication", async () => {
        const res = await request(app).post("/api/auth/toggle-2fa");
        expect(res.status).toBe(401);
    });

    test("200 — enables 2FA for authenticated user", async () => {
        const { token } = await createVerifiedUser({ email: "alice@test.com", role: "tenant" });
        const res = await request(app)
            .post("/api/auth/toggle-2fa")
            .set("Authorization", `Bearer ${token}`)
            .send({ enable: true });
        expect(res.status).toBe(200);
        const dbUser = await User.findOne({ email: "alice@test.com" });
        expect(dbUser.is2faEnabled).toBe(true);
    });

    test("200 — disables 2FA for authenticated user", async () => {
        const { token } = await createVerifiedUser({ email: "alice@test.com", role: "tenant" });
        await User.findOneAndUpdate({ email: "alice@test.com" }, { is2faEnabled: true });
        const res = await request(app)
            .post("/api/auth/toggle-2fa")
            .set("Authorization", `Bearer ${token}`)
            .send({ enable: false });
        expect(res.status).toBe(200);
        const dbUser = await User.findOne({ email: "alice@test.com" });
        expect(dbUser.is2faEnabled).toBe(false);
    });
});

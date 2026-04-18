// tests for auth controller
// mocking db, bcrypt, jwt, email stuff
// not mocking crypto since we need actual hashes to match

import { jest } from "@jest/globals";
import crypto from "crypto";

// mock functions

const mockUserFindOne = jest.fn();
const mockUserFindById = jest.fn();
const mockUserCreate = jest.fn();

const mockBcryptGenSalt = jest.fn();
const mockBcryptHash = jest.fn();
const mockBcryptCompare = jest.fn();

const mockJwtSign = jest.fn();

const mockSendVerificationEmail = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockSend2FAEmail = jest.fn();

// setting up module mocks

jest.unstable_mockModule("../../models/userModel.js", () => ({
  default: {
    findOne: mockUserFindOne,
    findById: mockUserFindById,
    create: mockUserCreate,
  },
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    genSalt: mockBcryptGenSalt,
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { sign: mockJwtSign },
}));

jest.unstable_mockModule("../../utils/emailService.js", () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  send2FAEmail: mockSend2FAEmail,
  verifyEmailConnection: jest.fn(),
}));

// need to import after mocks are set up or it wont work

let registerUser, loginUser, verifyEmail, resendVerificationEmail,
  forgotPassword, resetPassword, verify2FA, toggle2FA;

beforeAll(async () => {
  const mod = await import("../../controllers/authController.js");
  registerUser = mod.registerUser;
  loginUser = mod.loginUser;
  verifyEmail = mod.verifyEmail;
  resendVerificationEmail = mod.resendVerificationEmail;
  forgotPassword = mod.forgotPassword;
  resetPassword = mod.resetPassword;
  verify2FA = mod.verify2FA;
  toggle2FA = mod.toggle2FA;
});

beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = "test-secret";
  process.env.BACKEND_URL = "http://localhost:3000";
  mockJwtSign.mockReturnValue("mock-jwt-token-xyz");
  mockSendVerificationEmail.mockResolvedValue(undefined);
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
  mockSend2FAEmail.mockResolvedValue(undefined);
});

// helper functions for building req/res objects

const makeReq = (body = {}, params = {}, overrides = {}) => ({
  body,
  params,
  user: { _id: "user-id-1" },
  ...overrides,
});

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  send: jest.fn(),
});

const makeUser = (overrides = {}) => ({
  _id: "user-id-1",
  name: "Alice Sharma",
  email: "alice@test.com",
  password: "hashed-password",
  phone: "9800012345",
  role: "tenant",
  isActive: true,
  isEmailVerified: true,
  is2faEnabled: false,
  twoFactorCode: undefined,
  twoFactorExpires: undefined,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// sha256 helper - same as what the controller uses
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

// registerUser tests

describe("registerUser", () => {
  const validBody = {
    name: "Alice Sharma",
    email: "alice@test.com",
    password: "secret123",
    phone: "9800012345",
    role: "tenant",
  };

  test("400 when name is missing", async () => {
    const req = makeReq({ ...validBody, name: undefined });
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Please provide all fields" });
  });

  test("400 when email is missing", async () => {
    const req = makeReq({ ...validBody, email: undefined });
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Please provide all fields" });
  });

  test("400 when password is missing", async () => {
    const req = makeReq({ ...validBody, password: undefined });
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Please provide all fields" });
  });

  test("400 when phone is missing", async () => {
    const req = makeReq({ ...validBody, phone: undefined });
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Please provide all fields" });
  });

  test("400 when role is admin (only landlord and tenant allowed)", async () => {
    const req = makeReq({ ...validBody, role: "admin" });
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("landlord and tenant") })
    );
  });

  test("400 when email already exists", async () => {
    mockUserFindOne.mockResolvedValue(makeUser());
    mockBcryptGenSalt.mockResolvedValue("salt");
    mockBcryptHash.mockResolvedValue("hashed");
    const req = makeReq(validBody);
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
  });

  test("201 on success - sends verification email and returns message", async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockBcryptGenSalt.mockResolvedValue("salt");
    mockBcryptHash.mockResolvedValue("hashed-pw");
    mockUserCreate.mockResolvedValue({ _id: "new-user-id" });
    const req = makeReq(validBody);
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("verify your account") })
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  test("normalises email to lowercase before saving", async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockBcryptGenSalt.mockResolvedValue("salt");
    mockBcryptHash.mockResolvedValue("hashed-pw");
    mockUserCreate.mockResolvedValue({});
    const req = makeReq({ ...validBody, email: "ALICE@TEST.COM" });
    const res = makeRes();
    await registerUser(req, res);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@test.com" })
    );
  });

  test("defaults role to tenant when role is not provided", async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockBcryptGenSalt.mockResolvedValue("salt");
    mockBcryptHash.mockResolvedValue("hashed-pw");
    mockUserCreate.mockResolvedValue({});
    const req = makeReq({ ...validBody, role: undefined });
    const res = makeRes();
    await registerUser(req, res);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ role: "tenant" })
    );
  });

  test("500 when database throws during user creation", async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockBcryptGenSalt.mockResolvedValue("salt");
    mockBcryptHash.mockResolvedValue("hashed-pw");
    mockUserCreate.mockRejectedValue(new Error("DB error"));
    const req = makeReq(validBody);
    const res = makeRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// loginUser tests

describe("loginUser", () => {
  const validBody = {
    email: "alice@test.com",
    password: "secret123",
    selectedRole: "tenant",
  };

  test("400 when email is missing", async () => {
    const req = makeReq({ password: "secret123" });
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Please provide email and password" });
  });

  test("400 when password is missing", async () => {
    const req = makeReq({ email: "alice@test.com" });
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Please provide email and password" });
  });

  test("400 when selectedRole is an invalid value (not landlord or tenant)", async () => {
    const req = makeReq({ ...validBody, selectedRole: "admin" });
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("landlord or tenant") })
    );
  });

  test("401 when user is not found", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = makeReq(validBody);
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
  });

  test("401 when password does not match", async () => {
    mockUserFindOne.mockResolvedValue(makeUser());
    mockBcryptCompare.mockResolvedValue(false);
    const req = makeReq(validBody);
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
  });

  test("403 with ACCOUNT_DEACTIVATED when user.isActive is false", async () => {
    mockUserFindOne.mockResolvedValue(makeUser({ isActive: false }));
    mockBcryptCompare.mockResolvedValue(true);
    const req = makeReq(validBody);
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ACCOUNT_DEACTIVATED" })
    );
  });

  test("403 with needsVerification when email is not verified", async () => {
    mockUserFindOne.mockResolvedValue(makeUser({ isEmailVerified: false }));
    mockBcryptCompare.mockResolvedValue(true);
    const req = makeReq(validBody);
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ needsVerification: true, email: "alice@test.com" })
    );
  });

  test("403 with ROLE_MISMATCH when tenant tries to log in as landlord", async () => {
    mockUserFindOne.mockResolvedValue(makeUser({ role: "tenant" }));
    mockBcryptCompare.mockResolvedValue(true);
    const req = makeReq({ ...validBody, selectedRole: "landlord" });
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ROLE_MISMATCH", actualRole: "tenant" })
    );
  });

  test("pauses login with needs2FA response and sends OTP when 2FA is enabled", async () => {
    const user = makeUser({ is2faEnabled: true });
    mockUserFindOne.mockResolvedValue(user);
    mockBcryptCompare.mockResolvedValue(true);
    const req = makeReq(validBody);
    const res = makeRes();
    await loginUser(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ needs2FA: true, userId: "user-id-1" })
    );
    expect(user.save).toHaveBeenCalled();
    expect(user.twoFactorCode).toBeDefined();
    expect(user.twoFactorExpires).toBeInstanceOf(Date);
    expect(mockSend2FAEmail).toHaveBeenCalledTimes(1);
  });

  test("returns user data and JWT token on successful login", async () => {
    mockUserFindOne.mockResolvedValue(makeUser());
    mockBcryptCompare.mockResolvedValue(true);
    const req = makeReq(validBody);
    const res = makeRes();
    await loginUser(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "user-id-1",
        name: "Alice Sharma",
        email: "alice@test.com",
        role: "tenant",
        token: "mock-jwt-token-xyz",
      })
    );
    expect(mockJwtSign).toHaveBeenCalledTimes(1);
  });

  test("admin can log in without a selectedRole restriction", async () => {
    mockUserFindOne.mockResolvedValue(makeUser({ role: "admin" }));
    mockBcryptCompare.mockResolvedValue(true);
    // admin should be able to login regardless of selectedRole
    const req = makeReq({ ...validBody, selectedRole: "landlord" });
    const res = makeRes();
    await loginUser(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  test("500 when database throws", async () => {
    mockUserFindOne.mockRejectedValue(new Error("DB error"));
    const req = makeReq(validBody);
    const res = makeRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// verifyEmail tests

describe("verifyEmail", () => {
  test("returns HTML with failure message when token is invalid or expired", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = makeReq({}, { token: "invalid-raw-token" });
    const res = makeRes();
    await verifyEmail(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    const html = res.send.mock.calls[0][0];
    expect(html).toContain("Verification Failed");
  });

  test("returns HTML with success message and clears verification fields when token is valid", async () => {
    const user = makeUser({ isEmailVerified: false });
    mockUserFindOne.mockResolvedValue(user);
    const req = makeReq({}, { token: "valid-raw-token" });
    const res = makeRes();
    await verifyEmail(req, res);
    expect(res.send).toHaveBeenCalledTimes(1);
    const html = res.send.mock.calls[0][0];
    expect(html).toContain("Email Verified");
    expect(user.isEmailVerified).toBe(true);
    expect(user.emailVerificationToken).toBeUndefined();
    expect(user.emailVerificationExpires).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });

  test("looks up token by its SHA-256 hash (not the raw token)", async () => {
    const rawToken = "my-raw-verification-token";
    const expectedHash = sha256(rawToken);
    mockUserFindOne.mockResolvedValue(makeUser());
    const req = makeReq({}, { token: rawToken });
    const res = makeRes();
    await verifyEmail(req, res);
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerificationToken: expectedHash })
    );
  });
});

// resendVerificationEmail tests

describe("resendVerificationEmail", () => {
  test("400 when email is not provided", async () => {
    const req = makeReq({});
    const res = makeRes();
    await resendVerificationEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email is required" });
  });

  test("returns generic success message when email is not registered (prevents account enumeration)", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = makeReq({ email: "unknown@test.com" });
    const res = makeRes();
    await resendVerificationEmail(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("If that email") })
    );
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  test("400 when email is already verified", async () => {
    mockUserFindOne.mockResolvedValue(makeUser({ isEmailVerified: true }));
    const req = makeReq({ email: "alice@test.com" });
    const res = makeRes();
    await resendVerificationEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "This email is already verified." });
  });

  test("sends verification email and returns generic message for unverified user", async () => {
    const user = makeUser({ isEmailVerified: false });
    mockUserFindOne.mockResolvedValue(user);
    const req = makeReq({ email: "alice@test.com" });
    const res = makeRes();
    await resendVerificationEmail(req, res);
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("If that email") })
    );
  });
});

// forgotPassword tests

describe("forgotPassword", () => {
  test("400 when email is not provided", async () => {
    const req = makeReq({});
    const res = makeRes();
    await forgotPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email is required" });
  });

  test("returns generic message when email is not registered (prevents account enumeration)", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = makeReq({ email: "unknown@test.com" });
    const res = makeRes();
    await forgotPassword(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("If that email") })
    );
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test("saves hashed reset token and sends password reset email for registered user", async () => {
    const user = makeUser();
    mockUserFindOne.mockResolvedValue(user);
    const req = makeReq({ email: "alice@test.com" });
    const res = makeRes();
    await forgotPassword(req, res);
    expect(user.passwordResetToken).toBeDefined();
    expect(user.passwordResetExpires).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("If that email") })
    );
  });

  test("reset token expires in approximately 1 hour", async () => {
    const user = makeUser();
    mockUserFindOne.mockResolvedValue(user);
    const before = Date.now();
    const req = makeReq({ email: "alice@test.com" });
    const res = makeRes();
    await forgotPassword(req, res);
    const expiry = user.passwordResetExpires.getTime();
    expect(expiry - before).toBeGreaterThanOrEqual(59 * 60 * 1000); // at least 59 min
    expect(expiry - before).toBeLessThanOrEqual(61 * 60 * 1000);    // at most 61 min
  });
});

// resetPassword tests

describe("resetPassword", () => {
  const makeResetReq = (token, body) => makeReq(body, { token });

  test("400 when newPassword is missing", async () => {
    const req = makeResetReq("some-token", {});
    const res = makeRes();
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Reset code and new password are required" })
    );
  });

  test("400 when password is shorter than 8 characters", async () => {
    const req = makeResetReq("some-token", { newPassword: "short" });
    const res = makeRes();
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Password must be at least 8 characters" });
  });

  test("400 when reset token is invalid or expired", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = makeResetReq("expired-token", { newPassword: "newpassword123" });
    const res = makeRes();
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("invalid or has expired") })
    );
  });

  test("hashes new password and clears reset token on success", async () => {
    const user = makeUser({ passwordResetToken: "hashed", passwordResetExpires: new Date(Date.now() + 60000) });
    mockUserFindOne.mockResolvedValue(user);
    mockBcryptGenSalt.mockResolvedValue("salt");
    mockBcryptHash.mockResolvedValue("new-hashed-password");
    const req = makeResetReq("valid-token", { newPassword: "mynewpassword" });
    const res = makeRes();
    await resetPassword(req, res);
    expect(user.password).toBe("new-hashed-password");
    expect(user.passwordResetToken).toBeUndefined();
    expect(user.passwordResetExpires).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Password reset successful") })
    );
  });

  test("looks up reset token by its SHA-256 hash", async () => {
    const rawToken = "my-raw-reset-token";
    const expectedHash = sha256(rawToken);
    mockUserFindOne.mockResolvedValue(makeUser());
    mockBcryptGenSalt.mockResolvedValue("salt");
    mockBcryptHash.mockResolvedValue("hashed");
    const req = makeResetReq(rawToken, { newPassword: "mynewpassword" });
    const res = makeRes();
    await resetPassword(req, res);
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ passwordResetToken: expectedHash })
    );
  });
});

// verify2FA tests

describe("verify2FA", () => {
  test("400 when userId is missing", async () => {
    const req = makeReq({ code: "123456" });
    const res = makeRes();
    await verify2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User ID and verification code are required" })
    );
  });

  test("400 when code is missing", async () => {
    const req = makeReq({ userId: "user-id-1" });
    const res = makeRes();
    await verify2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User ID and verification code are required" })
    );
  });

  test("400 when user is not found", async () => {
    mockUserFindById.mockResolvedValue(null);
    const req = makeReq({ userId: "missing-id", code: "123456" });
    const res = makeRes();
    await verify2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid verification attempt" });
  });

  test("400 when no OTP was requested (twoFactorCode is undefined)", async () => {
    mockUserFindById.mockResolvedValue(makeUser({ twoFactorCode: undefined }));
    const req = makeReq({ userId: "user-id-1", code: "123456" });
    const res = makeRes();
    await verify2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "No verification code was requested" });
  });

  test("400 when OTP has expired", async () => {
    const expiredTime = new Date(Date.now() - 1000); // already expired
    mockUserFindById.mockResolvedValue(
      makeUser({ twoFactorCode: "some-hash", twoFactorExpires: expiredTime })
    );
    const req = makeReq({ userId: "user-id-1", code: "123456" });
    const res = makeRes();
    await verify2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("expired") })
    );
  });

  test("400 when OTP code does not match", async () => {
    const correctCode = "654321";
    const correctHash = sha256(correctCode.trim());
    mockUserFindById.mockResolvedValue(
      makeUser({
        twoFactorCode: correctHash,
        twoFactorExpires: new Date(Date.now() + 600000),
      })
    );
    const req = makeReq({ userId: "user-id-1", code: "000000" }); // sending wrong code on purpose
    const res = makeRes();
    await verify2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid verification code" });
  });

  test("returns JWT token and clears OTP fields on valid code", async () => {
    const correctCode = "123456";
    const correctHash = sha256(correctCode.trim());
    const user = makeUser({
      twoFactorCode: correctHash,
      twoFactorExpires: new Date(Date.now() + 600000),
      is2faEnabled: true,
    });
    mockUserFindById.mockResolvedValue(user);
    const req = makeReq({ userId: "user-id-1", code: correctCode });
    const res = makeRes();
    await verify2FA(req, res);
    expect(user.twoFactorCode).toBeUndefined();
    expect(user.twoFactorExpires).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "user-id-1",
        token: "mock-jwt-token-xyz",
        is2faEnabled: true,
      })
    );
  });

  test("should still work if user adds spaces around the code", async () => {
    const correctCode = "  123456  "; // spaces around it
    const correctHash = sha256(correctCode.trim()); // trimmed version hash
    const user = makeUser({
      twoFactorCode: correctHash,
      twoFactorExpires: new Date(Date.now() + 600000),
    });
    mockUserFindById.mockResolvedValue(user);
    const req = makeReq({ userId: "user-id-1", code: correctCode });
    const res = makeRes();
    await verify2FA(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "mock-jwt-token-xyz" }));
  });
});

// toggle2FA tests

describe("toggle2FA", () => {
  test("404 when user is not found", async () => {
    mockUserFindById.mockResolvedValue(null);
    const req = makeReq({}, {}, { user: { _id: "missing-user" } });
    const res = makeRes();
    await toggle2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("enables 2FA when it was disabled", async () => {
    const user = makeUser({ is2faEnabled: false });
    mockUserFindById.mockResolvedValue(user);
    const req = makeReq({}, {}, { user: { _id: "user-id-1" } });
    const res = makeRes();
    await toggle2FA(req, res);
    expect(user.is2faEnabled).toBe(true);
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        is2faEnabled: true,
        message: expect.stringContaining("enabled"),
      })
    );
  });

  test("disables 2FA when it was enabled", async () => {
    const user = makeUser({ is2faEnabled: true });
    mockUserFindById.mockResolvedValue(user);
    const req = makeReq({}, {}, { user: { _id: "user-id-1" } });
    const res = makeRes();
    await toggle2FA(req, res);
    expect(user.is2faEnabled).toBe(false);
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        is2faEnabled: false,
        message: expect.stringContaining("disabled"),
      })
    );
  });

  test("500 when database throws", async () => {
    mockUserFindById.mockRejectedValue(new Error("DB error"));
    const req = makeReq({}, {}, { user: { _id: "user-id-1" } });
    const res = makeRes();
    await toggle2FA(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

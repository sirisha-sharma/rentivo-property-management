// testing the protect middleware
// mocking jwt and user model

import { jest } from "@jest/globals";

const mockJwtVerify = jest.fn();
const mockUserFindById = jest.fn();

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { verify: mockJwtVerify },
}));

jest.unstable_mockModule("../../models/userModel.js", () => ({
  default: { findById: mockUserFindById },
}));

let protect;

beforeAll(async () => {
  ({ protect } = await import("../../middleware/authMiddleware.js"));
});

beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = "test-jwt-secret";
});

// helper to make fake req, res, next
const makeContext = (authHeader) => {
  const req = { headers: authHeader ? { authorization: authHeader } : {} };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
};

// tests for when there's no token or bad token

describe("protect - missing or malformed token", () => {
  test("401 when Authorization header is absent", async () => {
    const { req, res, next } = makeContext(null);
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized, no token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("401 when Authorization header is not Bearer scheme", async () => {
    const { req, res, next } = makeContext("Basic dXNlcjpwYXNz");
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized, no token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("401 when Bearer token is empty string", async () => {
    const { req, res, next } = makeContext("Bearer ");
    // empty bearer token should still fail
    mockJwtVerify.mockImplementation(() => {
      throw new Error("jwt malformed");
    });
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// tests for invalid or expired tokens

describe("protect - invalid or expired JWT", () => {
  test("401 when jwt.verify throws JsonWebTokenError", async () => {
    mockJwtVerify.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const { req, res, next } = makeContext("Bearer bad.token.here");
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("401 when jwt.verify throws TokenExpiredError", async () => {
    mockJwtVerify.mockImplementation(() => {
      const err = new Error("jwt expired");
      err.name = "TokenExpiredError";
      throw err;
    });
    const { req, res, next } = makeContext("Bearer expired.token");
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// token is fine but user lookup has issues

describe("protect - user lookup", () => {
  test("401 when user is not found in the database", async () => {
    mockJwtVerify.mockReturnValue({ id: "user-id-1" });
    mockUserFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const { req, res, next } = makeContext("Bearer valid.token.here");
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("403 with ACCOUNT_DEACTIVATED when user.isActive is false", async () => {
    mockJwtVerify.mockReturnValue({ id: "user-id-1" });
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "user-id-1", isActive: false }),
    });
    const { req, res, next } = makeContext("Bearer valid.token.here");
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ACCOUNT_DEACTIVATED" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("403 with ACCOUNT_DEACTIVATED when user.isActive is explicitly false (not just falsy)", async () => {
    mockJwtVerify.mockReturnValue({ id: "user-id-1" });
    // undefined is not the same as false, so this should pass through
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "user-id-1", isActive: undefined }),
    });
    const { req, res, next } = makeContext("Bearer valid.token.here");
    await protect(req, res, next);
    // should call next since isActive is undefined not false
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});

// happy path - everything works fine

describe("protect - successful authentication", () => {
  test("calls next() and attaches user to req when token and user are valid", async () => {
    const mockUser = { _id: "user-id-1", name: "Alice", role: "landlord", isActive: true };
    mockJwtVerify.mockReturnValue({ id: "user-id-1" });
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
    const { req, res, next } = makeContext("Bearer valid.token.here");
    await protect(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBe(mockUser);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("uses JWT_SECRET from process.env when verifying", async () => {
    process.env.JWT_SECRET = "my-special-secret";
    const mockUser = { _id: "u1", isActive: true };
    mockJwtVerify.mockReturnValue({ id: "u1" });
    mockUserFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    const { req, res, next } = makeContext("Bearer some.token");
    await protect(req, res, next);
    expect(mockJwtVerify).toHaveBeenCalledWith("some.token", "my-special-secret");
    expect(next).toHaveBeenCalled();
  });

  test("looks up user by decoded.id from the token payload", async () => {
    const mockUser = { _id: "decoded-user-id", isActive: true };
    mockJwtVerify.mockReturnValue({ id: "decoded-user-id" });
    mockUserFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    const { req, res, next } = makeContext("Bearer any.token.here");
    await protect(req, res, next);
    expect(mockUserFindById).toHaveBeenCalledWith("decoded-user-id");
    expect(next).toHaveBeenCalled();
  });

  test("selects user without password field", async () => {
    const mockSelect = jest.fn().mockResolvedValue({ _id: "u1", isActive: true });
    mockJwtVerify.mockReturnValue({ id: "u1" });
    mockUserFindById.mockReturnValue({ select: mockSelect });
    const { req, res, next } = makeContext("Bearer tok");
    await protect(req, res, next);
    expect(mockSelect).toHaveBeenCalledWith("-password");
  });
});

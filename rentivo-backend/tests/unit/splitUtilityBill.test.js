import { jest } from "@jest/globals";

// mocks - have to declare these before importing

const mockInvoiceInsertMany = jest.fn();
const mockInvoiceFind = jest.fn();
const mockPropertyFindOne = jest.fn();
const mockTenantFind = jest.fn();
const mockCreateNotification = jest.fn();
const mockRemoveStoredFile = jest.fn();
const mockGetUploadedFileUrl = jest.fn();
const mockGetUploadedStorageId = jest.fn();
const mockBuildUtilitySplitDetails = jest.fn();
const mockIsUtilitySplitValidationError = jest.fn();
const mockRoundCurrency = jest.fn((v) => Math.round(v * 100) / 100);

jest.unstable_mockModule("../../models/invoiceModel.js", () => ({
    default: {
        insertMany: mockInvoiceInsertMany,
        find: mockInvoiceFind,
    },
}));

jest.unstable_mockModule("../../models/propertyModel.js", () => ({
    default: { findOne: mockPropertyFindOne },
}));

jest.unstable_mockModule("../../models/tenantModel.js", () => ({
    default: { find: mockTenantFind },
}));

jest.unstable_mockModule("../../controllers/notificationController.js", () => ({
    createNotification: mockCreateNotification,
}));

jest.unstable_mockModule("../../utils/storage.js", () => ({
    removeStoredFile: mockRemoveStoredFile,
    getUploadedFileUrl: mockGetUploadedFileUrl,
    getUploadedStorageId: mockGetUploadedStorageId,
    resolveStoredFileUrl: jest.fn(),
}));

jest.unstable_mockModule("../../utils/utilitySplit.js", () => ({
    buildUtilitySplitDetails: mockBuildUtilitySplitDetails,
    isUtilitySplitValidationError: mockIsUtilitySplitValidationError,
    roundCurrency: mockRoundCurrency,
}));

// helpers

const makeFile = () => ({
    filename: "bill.jpg",
    originalname: "bill.jpg",
    mimetype: "image/jpeg",
    size: 12345,
    path: "/tmp/bill.jpg",
});

const makeTenant = (id, name = "Tenant", email = "t@t.com") => ({
    _id: { toString: () => id },
    userId: { _id: id, name, email },
});

const makeProperty = (overrides = {}) => ({
    _id: "prop1",
    title: "Test Property",
    landlordId: "landlord1",
    splitMethod: "equal",
    roomSizes: {},
    ...overrides,
});

const makeReq = (overrides = {}) => ({
    user: { _id: "landlord1", role: "landlord" },
    file: makeFile(),
    body: {
        propertyId: "prop1",
        totalAmount: "1000",
        dueDate: "2026-05-01",
        description: "",
        splitMethod: "",
        occupancyData: null,
        customSplits: null,
    },
    ...overrides,
});

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// chainable query helper for Invoice.find().sort().populate() etc
const makeChainQuery = (resolvedValue) => {
    // this is what sort() returns, supports populate and then
    const inner = {
        populate: jest.fn(),
        then: (onFulfilled, onRejected) =>
            Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
    };
    inner.populate.mockReturnValue(inner);

    // this is what find() returns, has sort()
    const outer = {
        sort: jest.fn().mockReturnValue(inner),
    };
    return outer;
};

// importing the function we're testing

let splitUtilityBill;

beforeAll(async () => {
    const mod = await import("../../controllers/invoiceController.js");
    splitUtilityBill = mod.splitUtilityBill;
});

beforeEach(() => {
    jest.resetAllMocks();
    mockRoundCurrency.mockImplementation((v) => Math.round(v * 100) / 100);
    mockRemoveStoredFile.mockResolvedValue(undefined);
    mockGetUploadedFileUrl.mockReturnValue("http://cdn/bill.jpg");
    mockGetUploadedStorageId.mockReturnValue("cld_id_123");
    mockCreateNotification.mockResolvedValue(undefined);
    mockIsUtilitySplitValidationError.mockReturnValue(false);
});

// tests

describe("splitUtilityBill", () => {
    describe("authorization & input validation", () => {
        test("non-landlord role should return 403", async () => {
            const req = makeReq({ user: { _id: "u1", role: "tenant" } });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("landlords") })
            );
        });

        test("missing propertyId returns 400", async () => {
            const req = makeReq({
                body: { totalAmount: "1000", dueDate: "2026-05-01" },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("missing totalAmount returns 400", async () => {
            const req = makeReq({
                body: { propertyId: "prop1", dueDate: "2026-05-01" },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("missing dueDate returns 400", async () => {
            const req = makeReq({
                body: { propertyId: "prop1", totalAmount: "1000" },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("no uploaded file returns 400", async () => {
            const req = makeReq({ file: undefined });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("upload") })
            );
        });

        test("invalid totalAmount (NaN) returns 400", async () => {
            const req = makeReq({
                body: { propertyId: "prop1", totalAmount: "abc", dueDate: "2026-05-01" },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("valid total") })
            );
        });

        test("zero totalAmount returns 400", async () => {
            const req = makeReq({
                body: { propertyId: "prop1", totalAmount: "0", dueDate: "2026-05-01" },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("invalid dueDate returns 400", async () => {
            const req = makeReq({
                body: { propertyId: "prop1", totalAmount: "1000", dueDate: "not-a-date" },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("valid due date") })
            );
        });
    });

    describe("database lookups", () => {
        test("property not found returns 404", async () => {
            mockPropertyFindOne.mockResolvedValue(null);
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("Property not found") })
            );
        });

        test("no active tenants returns 400", async () => {
            mockPropertyFindOne.mockResolvedValue(makeProperty());
            mockTenantFind.mockReturnValue({
                populate: jest.fn().mockResolvedValue([]),
            });
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("No active tenants") })
            );
        });
    });

    describe("JSON field parsing", () => {
        test("invalid JSON in occupancyData returns 400", async () => {
            mockPropertyFindOne.mockResolvedValue(makeProperty());
            const tenants = [makeTenant("t1"), makeTenant("t2")];
            mockTenantFind.mockReturnValue({
                populate: jest.fn().mockResolvedValue(tenants),
            });
            const req = makeReq({
                body: {
                    propertyId: "prop1",
                    totalAmount: "1000",
                    dueDate: "2026-05-01",
                    occupancyData: "{invalid-json",
                    splitMethod: "occupancy",
                },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe("successful split (equal, 2 tenants)", () => {
        const tenants = [makeTenant("t1", "Alice", "alice@test.com"), makeTenant("t2", "Bob", "bob@test.com")];
        const property = makeProperty({ title: "Green House" });

        const splitResult = {
            splits: [
                { tenantId: "t1", userId: "u1", totalAmount: 500, utilities: { other: 500 } },
                { tenantId: "t2", userId: "u2", totalAmount: 500, utilities: { other: 500 } },
            ],
        };

        const createdInvoices = [{ _id: "inv1" }, { _id: "inv2" }];
        const populatedInvoices = [
            { _id: "inv1", amount: 500 },
            { _id: "inv2", amount: 500 },
        ];

        beforeEach(() => {
            mockPropertyFindOne.mockResolvedValue(property);
            mockTenantFind.mockReturnValue({
                populate: jest.fn().mockResolvedValue(tenants),
            });
            mockBuildUtilitySplitDetails.mockReturnValue(splitResult);
            mockInvoiceInsertMany.mockResolvedValue(createdInvoices);
            mockInvoiceFind.mockReturnValue(makeChainQuery(populatedInvoices));
        });

        test("responds 201 with invoice list", async () => {
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            const body = res.json.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.invoices).toHaveLength(2);
            expect(body.splitMethod).toBe("equal");
            expect(body.totalAmount).toBe(1000);
        });

        test("calls insertMany with correct invoice count", async () => {
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(mockInvoiceInsertMany).toHaveBeenCalledTimes(1);
            const insertArg = mockInvoiceInsertMany.mock.calls[0][0];
            expect(insertArg).toHaveLength(2);
        });

        test("each inserted invoice has type Utilities", async () => {
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            const insertArg = mockInvoiceInsertMany.mock.calls[0][0];
            insertArg.forEach((inv) => expect(inv.type).toBe("Utilities"));
        });

        test("each inserted invoice references propertyId and landlordId", async () => {
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            const insertArg = mockInvoiceInsertMany.mock.calls[0][0];
            insertArg.forEach((inv) => {
                expect(inv.propertyId).toBe("prop1");
                expect(inv.landlordId).toBe("landlord1");
            });
        });

        test("sends a notification to each tenant", async () => {
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(mockCreateNotification).toHaveBeenCalledTimes(2);
        });

        test("uses custom description when provided", async () => {
            const req = makeReq({
                body: {
                    propertyId: "prop1",
                    totalAmount: "1000",
                    dueDate: "2026-05-01",
                    description: "May water bill",
                },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            const insertArg = mockInvoiceInsertMany.mock.calls[0][0];
            insertArg.forEach((inv) => expect(inv.description).toBe("May water bill"));
        });

        test("falls back to property splitMethod when none given in body", async () => {
            const propertyWithMethod = makeProperty({ splitMethod: "room-size" });
            mockPropertyFindOne.mockResolvedValue(propertyWithMethod);
            const req = makeReq({
                body: {
                    propertyId: "prop1",
                    totalAmount: "1000",
                    dueDate: "2026-05-01",
                    splitMethod: "",
                },
            });
            const res = makeRes();
            await splitUtilityBill(req, res);
            const buildArg = mockBuildUtilitySplitDetails.mock.calls[0][0];
            expect(buildArg.splitMethod).toBe("room-size");
        });
    });

    describe("notification failure is non-fatal", () => {
        test("notification error does NOT prevent 201 response", async () => {
            const tenants = [makeTenant("t1"), makeTenant("t2")];
            mockPropertyFindOne.mockResolvedValue(makeProperty());
            mockTenantFind.mockReturnValue({
                populate: jest.fn().mockResolvedValue(tenants),
            });
            mockBuildUtilitySplitDetails.mockReturnValue({
                splits: [
                    { tenantId: "t1", userId: "u1", totalAmount: 500, utilities: { other: 500 } },
                    { tenantId: "t2", userId: "u2", totalAmount: 500, utilities: { other: 500 } },
                ],
            });
            mockInvoiceInsertMany.mockResolvedValue([{ _id: "inv1" }, { _id: "inv2" }]);
            mockInvoiceFind.mockReturnValue(makeChainQuery([{ _id: "inv1" }, { _id: "inv2" }]));
            mockCreateNotification.mockRejectedValue(new Error("SMTP failure"));

            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe("cleanup on error", () => {
        test("calls removeStoredFile when property lookup fails", async () => {
            mockPropertyFindOne.mockResolvedValue(null);
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(mockRemoveStoredFile).toHaveBeenCalled();
        });

        test("calls removeStoredFile when no active tenants", async () => {
            mockPropertyFindOne.mockResolvedValue(makeProperty());
            mockTenantFind.mockReturnValue({
                populate: jest.fn().mockResolvedValue([]),
            });
            const req = makeReq();
            const res = makeRes();
            await splitUtilityBill(req, res);
            expect(mockRemoveStoredFile).toHaveBeenCalled();
        });
    });
});

// invoice controller tests
// all db calls and services are mocked

import { jest } from "@jest/globals";

// mock functions - need to declare these before the mock modules

const mockInvoiceCreate = jest.fn();
const mockInvoiceFindById = jest.fn();
const mockInvoiceFind = jest.fn();

const mockPropertyFindOne = jest.fn();

const mockTenantFindOne = jest.fn();
const mockTenantFind = jest.fn();
const mockTenantFindById = jest.fn();

const mockCreateNotification = jest.fn();

// module mocks

jest.unstable_mockModule("../../models/invoiceModel.js", () => ({
  default: {
    create: mockInvoiceCreate,
    findById: mockInvoiceFindById,
    find: mockInvoiceFind,
    insertMany: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/propertyModel.js", () => ({
  default: { findOne: mockPropertyFindOne },
}));

jest.unstable_mockModule("../../models/tenantModel.js", () => ({
  default: {
    findOne: mockTenantFindOne,
    find: mockTenantFind,
    findById: mockTenantFindById,
  },
}));

jest.unstable_mockModule("../../controllers/notificationController.js", () => ({
  createNotification: mockCreateNotification,
}));

jest.unstable_mockModule("../../utils/storage.js", () => ({
  getUploadedFileUrl: jest.fn(),
  getUploadedStorageId: jest.fn(),
  removeStoredFile: jest.fn().mockResolvedValue(undefined),
  resolveStoredFileUrl: jest.fn().mockReturnValue("http://storage.test/file"),
}));

// importing after mocks are registered

let createInvoice, getInvoices, getInvoiceById, updateInvoiceStatus, deleteInvoice;

beforeAll(async () => {
  const mod = await import("../../controllers/invoiceController.js");
  createInvoice = mod.createInvoice;
  getInvoices = mod.getInvoices;
  getInvoiceById = mod.getInvoiceById;
  updateInvoiceStatus = mod.updateInvoiceStatus;
  deleteInvoice = mod.deleteInvoice;
});

beforeEach(() => {
  jest.resetAllMocks();
  // createNotification is always a no-op in unit tests
  mockCreateNotification.mockResolvedValue(undefined);
});

// helpers

// fake mongoose query that supports chaining like .populate().sort() etc
const makeQuery = (value) => {
  const chain = {};
  chain.populate = jest.fn(() => chain);
  chain.sort = jest.fn(() => chain);
  chain.lean = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(value).then(onFulfilled, onRejected);
  chain.catch = (fn) => Promise.resolve(value).catch(fn);
  return chain;
};

const makeReq = (overrides = {}) => ({
  user: { _id: "landlord-1", role: "landlord", name: "Alice", email: "alice@test.com" },
  body: {},
  params: {},
  ...overrides,
});

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

// basic invoice doc with save and delete methods
const makeInvoiceDoc = (overrides = {}) => ({
  _id: "inv-1",
  tenantId: "tenant-1",
  propertyId: "prop-1",
  landlordId: "landlord-1",
  amount: 5000,
  type: "Rent",
  status: "Pending",
  dueDate: new Date("2025-01-31"),
  paidDate: null,
  utilityBill: {},
  save: jest.fn().mockResolvedValue(undefined),
  deleteOne: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// invoice with populated fields (like after doing .populate())
const makePopulatedInvoice = (overrides = {}) => ({
  _id: "inv-1",
  landlordId: { _id: "landlord-1", name: "Alice", email: "alice@test.com" },
  tenantId: { _id: "tenant-1", userId: { _id: "tenant-user-1", name: "Bob", email: "bob@test.com" } },
  propertyId: { _id: "prop-1", title: "Test Property" },
  amount: 5000,
  type: "Rent",
  status: "Pending",
  dueDate: new Date("2025-01-31"),
  paidDate: null,
  utilityBill: {},
  ...overrides,
});

const mockProperty = { _id: "prop-1", title: "Test Property", landlordId: "landlord-1" };
const mockTenant = { _id: "tenant-1", userId: "tenant-user-1", propertyId: "prop-1" };

// createInvoice tests

describe("createInvoice", () => {
  const baseBody = {
    tenantId: "tenant-1",
    propertyId: "prop-1",
    amount: 5000,
    type: "Rent",
    dueDate: "2025-01-31",
    description: "January rent",
  };

  test("404 when property not found or not owned by landlord", async () => {
    mockPropertyFindOne.mockResolvedValue(null);
    const req = makeReq({ body: baseBody });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Property not found or unauthorized" });
  });

  test("404 when tenant not found in the property", async () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(null);
    const req = makeReq({ body: baseBody });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Tenant not found in this property" });
  });

  test("400 when breakdown totalUtilities does not match sum of individual utilities", async () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(mockTenant);
    const req = makeReq({
      body: {
        ...baseBody,
        amount: 6000,
        breakdown: {
          baseRent: 5000,
          utilities: { electricity: 500, water: 100 },
          totalUtilities: 999, // wrong, should be 600
        },
      },
    });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Total utilities doesn't match sum of individual utilities",
    });
  });

  test("400 when amount does not equal baseRent + totalUtilities", async () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(mockTenant);
    const req = makeReq({
      body: {
        ...baseBody,
        amount: 9999, // wrong, should be 5600
        breakdown: {
          baseRent: 5000,
          utilities: { electricity: 500, water: 100 },
        },
      },
    });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/must equal base rent/i);
  });

  test("201 success without breakdown", async () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(mockTenant);
    const createdDoc = makeInvoiceDoc({ _id: "inv-new" });
    mockInvoiceCreate.mockResolvedValue(createdDoc);
    mockInvoiceFindById.mockReturnValue(makeQuery(makePopulatedInvoice()));
    const req = makeReq({ body: baseBody });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockInvoiceCreate).toHaveBeenCalledTimes(1);
  });

  test("201 success with valid breakdown (allows small rounding difference)", async () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(mockTenant);
    const createdDoc = makeInvoiceDoc({ _id: "inv-new" });
    mockInvoiceCreate.mockResolvedValue(createdDoc);
    mockInvoiceFindById.mockReturnValue(makeQuery(makePopulatedInvoice()));
    const req = makeReq({
      body: {
        ...baseBody,
        amount: 5600,
        breakdown: {
          baseRent: 5000,
          utilities: { electricity: 500, water: 100 },
        },
      },
    });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("sets billingYear and billingMonth for Rent invoices", async () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(mockTenant);
    const createdDoc = makeInvoiceDoc({ _id: "inv-new" });
    mockInvoiceCreate.mockResolvedValue(createdDoc);
    mockInvoiceFindById.mockReturnValue(makeQuery(makePopulatedInvoice()));
    const req = makeReq({
      body: { ...baseBody, type: "Rent", dueDate: "2025-03-15" },
    });
    const res = makeRes();
    await createInvoice(req, res);
    const callArg = mockInvoiceCreate.mock.calls[0][0];
    expect(callArg.billingYear).toBe(2025);
    expect(callArg.billingMonth).toBe(3);
  });

  test("sends notification to tenant after creating invoice", async () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(mockTenant);
    const createdDoc = makeInvoiceDoc({ _id: "inv-new" });
    mockInvoiceCreate.mockResolvedValue(createdDoc);
    mockInvoiceFindById.mockReturnValue(makeQuery(makePopulatedInvoice()));
    const req = makeReq({ body: baseBody });
    const res = makeRes();
    await createInvoice(req, res);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      mockTenant.userId,
      "invoice",
      expect.stringContaining("NPR 5000")
    );
  });

  test("500 when database throws", async () => {
    mockPropertyFindOne.mockRejectedValue(new Error("DB error"));
    const req = makeReq({ body: baseBody });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
  });
});

// getInvoices tests

describe("getInvoices", () => {
  test("landlord: returns invoices filtered by landlordId", async () => {
    const invoices = [makePopulatedInvoice(), makePopulatedInvoice({ _id: "inv-2" })];
    mockInvoiceFind.mockReturnValue(makeQuery(invoices));
    const req = makeReq({ user: { _id: "landlord-1", role: "landlord" } });
    const res = makeRes();
    await getInvoices(req, res);
    expect(mockInvoiceFind).toHaveBeenCalledWith({ landlordId: "landlord-1" });
    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([]));
  });

  test("tenant: finds tenant records then returns invoices by tenantId", async () => {
    const tenantRecords = [{ _id: "tenant-1" }, { _id: "tenant-2" }];
    const invoices = [makePopulatedInvoice()];
    mockTenantFind.mockResolvedValue(tenantRecords);
    mockInvoiceFind.mockReturnValue(makeQuery(invoices));
    const req = makeReq({
      user: { _id: "tenant-user-1", role: "tenant" },
    });
    const res = makeRes();
    await getInvoices(req, res);
    expect(mockTenantFind).toHaveBeenCalledWith({ userId: "tenant-user-1" });
    expect(mockInvoiceFind).toHaveBeenCalledWith({
      tenantId: { $in: ["tenant-1", "tenant-2"] },
    });
    expect(res.json).toHaveBeenCalled();
  });

  test("403 for unrecognized role", async () => {
    const req = makeReq({ user: { _id: "u1", role: "admin" } });
    const res = makeRes();
    await getInvoices(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid role" });
  });

  test("500 when database throws", async () => {
    mockInvoiceFind.mockImplementation(() => {
      throw new Error("DB error");
    });
    const req = makeReq({ user: { _id: "landlord-1", role: "landlord" } });
    const res = makeRes();
    await getInvoices(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// getInvoiceById tests

describe("getInvoiceById", () => {
  test("404 when invoice does not exist", async () => {
    mockInvoiceFindById.mockReturnValue(makeQuery(null));
    const req = makeReq({ params: { id: "inv-missing" } });
    const res = makeRes();
    await getInvoiceById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invoice not found" })
    );
  });

  test("200 when landlord requests their own invoice", async () => {
    const inv = makePopulatedInvoice({
      landlordId: { _id: "landlord-1", name: "Alice", email: "alice@test.com" },
    });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({
      user: { _id: "landlord-1", role: "landlord" },
      params: { id: "inv-1" },
    });
    const res = makeRes();
    await getInvoiceById(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("401 when landlord requests another landlord's invoice", async () => {
    const inv = makePopulatedInvoice({
      landlordId: { _id: "other-landlord", name: "Bob", email: "bob@test.com" },
    });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({
      user: { _id: "landlord-1", role: "landlord" },
      params: { id: "inv-1" },
    });
    const res = makeRes();
    await getInvoiceById(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not authorized to view this invoice" })
    );
  });

  test("200 when tenant requests their own invoice", async () => {
    const inv = makePopulatedInvoice({
      tenantId: { _id: "tenant-1", userId: { _id: "tenant-user-1", name: "Bob", email: "b@t.com" } },
    });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({
      user: { _id: "tenant-user-1", role: "tenant" },
      params: { id: "inv-1" },
    });
    const res = makeRes();
    await getInvoiceById(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("401 when tenant requests another tenant's invoice", async () => {
    const inv = makePopulatedInvoice({
      tenantId: { _id: "tenant-1", userId: { _id: "other-tenant-user", name: "Carol", email: "c@t.com" } },
    });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({
      user: { _id: "tenant-user-1", role: "tenant" },
      params: { id: "inv-1" },
    });
    const res = makeRes();
    await getInvoiceById(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// updateInvoiceStatus tests - checking status changes and paidDate

describe("updateInvoiceStatus", () => {
  const makeReqFor = (status, invoiceDoc) =>
    makeReq({
      body: { status },
      params: { id: invoiceDoc._id },
    });

  test("404 when invoice does not exist", async () => {
    mockInvoiceFindById.mockReturnValue(makeQuery(null));
    const req = makeReq({ body: { status: "Paid" }, params: { id: "inv-missing" } });
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Invoice not found" });
  });

  test("401 when non-owner tries to update status", async () => {
    const inv = makeInvoiceDoc({ landlordId: "other-landlord" });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({
      user: { _id: "landlord-1", role: "landlord" },
      body: { status: "Paid" },
      params: { id: "inv-1" },
    });
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized" });
  });

  test("sets paidDate when status is changed to Paid and paidDate was null", async () => {
    const inv = makeInvoiceDoc({ landlordId: "landlord-1", status: "Pending", paidDate: null });
    mockInvoiceFindById
      .mockReturnValueOnce(makeQuery(inv))
      .mockReturnValue(makeQuery(makePopulatedInvoice()));
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "tenant-user-1" });
    const req = makeReqFor("Paid", inv);
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    expect(inv.paidDate).toBeInstanceOf(Date);
    expect(inv.save).toHaveBeenCalled();
  });

  test("does NOT reset paidDate when status is already Paid and paidDate exists", async () => {
    const existingPaidDate = new Date("2025-01-10");
    const inv = makeInvoiceDoc({
      landlordId: "landlord-1",
      status: "Paid",
      paidDate: existingPaidDate,
    });
    mockInvoiceFindById
      .mockReturnValueOnce(makeQuery(inv))
      .mockReturnValue(makeQuery(makePopulatedInvoice({ status: "Paid" })));
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "tenant-user-1" });
    const req = makeReqFor("Paid", inv);
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    // paidDate should stay the same, not get overwritten
    expect(inv.paidDate).toBe(existingPaidDate);
  });

  test("clears paidDate when status changes from Paid to Pending", async () => {
    const inv = makeInvoiceDoc({
      landlordId: "landlord-1",
      status: "Paid",
      paidDate: new Date("2025-01-10"),
    });
    mockInvoiceFindById
      .mockReturnValueOnce(makeQuery(inv))
      .mockReturnValue(makeQuery(makePopulatedInvoice({ status: "Pending" })));
    const req = makeReqFor("Pending", inv);
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    expect(inv.paidDate).toBeNull();
    expect(inv.save).toHaveBeenCalled();
  });

  test("clears paidDate when status changes from Paid to Overdue", async () => {
    const inv = makeInvoiceDoc({
      landlordId: "landlord-1",
      status: "Paid",
      paidDate: new Date("2025-01-10"),
    });
    mockInvoiceFindById
      .mockReturnValueOnce(makeQuery(inv))
      .mockReturnValue(makeQuery(makePopulatedInvoice({ status: "Overdue" })));
    const req = makeReqFor("Overdue", inv);
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    expect(inv.paidDate).toBeNull();
  });

  test("sends notification to tenant when marked Paid", async () => {
    const inv = makeInvoiceDoc({ landlordId: "landlord-1", status: "Pending", paidDate: null });
    mockInvoiceFindById
      .mockReturnValueOnce(makeQuery(inv))
      .mockReturnValue(makeQuery(makePopulatedInvoice()));
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "tenant-user-1" });
    const req = makeReqFor("Paid", inv);
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "tenant-user-1",
      "invoice",
      expect.stringContaining("marked as Paid")
    );
  });

  test("returns updated invoice in response", async () => {
    const inv = makeInvoiceDoc({ landlordId: "landlord-1", status: "Pending" });
    const populated = makePopulatedInvoice({ status: "Paid" });
    mockInvoiceFindById
      .mockReturnValueOnce(makeQuery(inv))
      .mockReturnValue(makeQuery(populated));
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "tenant-user-1" });
    const req = makeReqFor("Paid", inv);
    const res = makeRes();
    await updateInvoiceStatus(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "Paid" }));
  });
});

// deleteInvoice tests

describe("deleteInvoice", () => {
  test("404 when invoice does not exist", async () => {
    mockInvoiceFindById.mockReturnValue(makeQuery(null));
    const req = makeReq({ params: { id: "inv-missing" } });
    const res = makeRes();
    await deleteInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Invoice not found" });
  });

  test("401 when non-owner tries to delete invoice", async () => {
    const inv = makeInvoiceDoc({ landlordId: "other-landlord" });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({ params: { id: "inv-1" } });
    const res = makeRes();
    await deleteInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized" });
  });

  test("200 with confirmation message when owner deletes invoice", async () => {
    const inv = makeInvoiceDoc({ landlordId: "landlord-1" });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({ params: { id: "inv-1" } });
    const res = makeRes();
    await deleteInvoice(req, res);
    expect(inv.deleteOne).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: "Invoice removed" });
  });

  test("500 when deleteOne throws", async () => {
    const inv = makeInvoiceDoc({ landlordId: "landlord-1" });
    inv.deleteOne.mockRejectedValue(new Error("DB error"));
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    const req = makeReq({ params: { id: "inv-1" } });
    const res = makeRes();
    await deleteInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// testing the breakdown validation in createInvoice

describe("invoice breakdown calculation validation", () => {
  const mockSetup = () => {
    mockPropertyFindOne.mockResolvedValue(mockProperty);
    mockTenantFindOne.mockResolvedValue(mockTenant);
    mockInvoiceCreate.mockResolvedValue(makeInvoiceDoc({ _id: "inv-new" }));
    mockInvoiceFindById.mockReturnValue(makeQuery(makePopulatedInvoice()));
  };

  test("allows up to 0.01 tolerance in totalUtilities mismatch", async () => {
    mockSetup();
    // 300.001 + 99.999 = 400.000 which is close enough to 400
    const req = makeReq({
      body: {
        tenantId: "tenant-1",
        propertyId: "prop-1",
        amount: 5400,
        type: "Rent",
        dueDate: "2025-01-31",
        breakdown: {
          baseRent: 5000,
          utilities: { electricity: 300.001, water: 99.999 },
          totalUtilities: 400,
        },
      },
    });
    const res = makeRes();
    await createInvoice(req, res);
    // should pass since its within the tolerance
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  test("rejects when totalUtilities mismatch exceeds 0.01", async () => {
    mockSetup();
    const req = makeReq({
      body: {
        tenantId: "tenant-1",
        propertyId: "prop-1",
        amount: 5600,
        type: "Rent",
        dueDate: "2025-01-31",
        breakdown: {
          baseRent: 5000,
          utilities: { electricity: 300, water: 100 },
          totalUtilities: 500, // this is wrong, should be 400
        },
      },
    });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("auto-calculates totalUtilities when not provided in breakdown", async () => {
    mockSetup();
    // 5000 + 300 + 100 = 5400
    const req = makeReq({
      body: {
        tenantId: "tenant-1",
        propertyId: "prop-1",
        amount: 5400,
        type: "Rent",
        dueDate: "2025-01-31",
        breakdown: {
          baseRent: 5000,
          utilities: { electricity: 300, water: 100 },
          // not sending totalUtilities, should auto calculate it
        },
      },
    });
    const res = makeRes();
    await createInvoice(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

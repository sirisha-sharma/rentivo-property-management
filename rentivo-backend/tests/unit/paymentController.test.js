// payment controller tests
// mocking everything - models, gateways, jwt
// esewa sandbox doesnt work so always mocked, khalti works tho

import { jest } from "@jest/globals";

// mock functions

const mockPaymentCreate = jest.fn();
const mockPaymentFindById = jest.fn();
const mockPaymentFind = jest.fn();
const mockPaymentFindOne = jest.fn();

const mockInvoiceFindById = jest.fn();
const mockTenantFindById = jest.fn();

const mockInitializeKhaltiPayment = jest.fn();
const mockKhaltiLookup = jest.fn();

const mockInitializeEsewaPayment = jest.fn();
const mockGetEsewaMerchantId = jest.fn();
const mockGetEsewaIntentProductCode = jest.fn();
const mockCheckEsewaTransactionStatus = jest.fn();
const mockVerifyEsewaSignature = jest.fn();
const mockVerifyEsewaIntentSignature = jest.fn();
const mockCheckEsewaIntentPaymentStatus = jest.fn();
const mockBookEsewaIntentPayment = jest.fn();

const mockCreateNotification = jest.fn();
const mockJwtSign = jest.fn();
const mockJwtVerify = jest.fn();

// module mocks

jest.unstable_mockModule("../../models/paymentModel.js", () => ({
  default: {
    create: mockPaymentCreate,
    findById: mockPaymentFindById,
    find: mockPaymentFind,
    findOne: mockPaymentFindOne,
  },
}));

jest.unstable_mockModule("../../models/invoiceModel.js", () => ({
  default: {
    findById: mockInvoiceFindById,
  },
}));

jest.unstable_mockModule("../../models/tenantModel.js", () => ({
  default: {
    findById: mockTenantFindById,
  },
}));

jest.unstable_mockModule("../../payment/gateways/khaltiGateway.js", () => ({
  initializeKhaltiPayment: mockInitializeKhaltiPayment,
  verifyKhaltiPayment: mockKhaltiLookup,
}));

jest.unstable_mockModule("../../payment/gateways/esewaGateway.js", () => ({
  initializeEsewaPayment: mockInitializeEsewaPayment,
  getEsewaMerchantId: mockGetEsewaMerchantId,
  getEsewaIntentProductCode: mockGetEsewaIntentProductCode,
  checkEsewaTransactionStatus: mockCheckEsewaTransactionStatus,
  verifyEsewaSignature: mockVerifyEsewaSignature,
  verifyEsewaIntentSignature: mockVerifyEsewaIntentSignature,
  checkEsewaIntentPaymentStatus: mockCheckEsewaIntentPaymentStatus,
  bookEsewaIntentPayment: mockBookEsewaIntentPayment,
}));

jest.unstable_mockModule("../../controllers/notificationController.js", () => ({
  createNotification: mockCreateNotification,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { sign: mockJwtSign, verify: mockJwtVerify },
}));

// importing after setting up mocks

let initiatePayment,
  getPaymentConfig,
  getPaymentHistory,
  getPaymentById,
  verifyKhaltiPayment,
  handlePaymentFailure;

beforeAll(async () => {
  const mod = await import("../../controllers/paymentController.js");
  initiatePayment = mod.initiatePayment;
  getPaymentConfig = mod.getPaymentConfig;
  getPaymentHistory = mod.getPaymentHistory;
  getPaymentById = mod.getPaymentById;
  verifyKhaltiPayment = mod.verifyKhaltiPayment;
  handlePaymentFailure = mod.handlePaymentFailure;
});

beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = "test-secret";
  process.env.BACKEND_URL = "http://localhost:3000";
  process.env.ESEWA_ENABLE_INTENT = "false";
  mockCreateNotification.mockResolvedValue(undefined);
  mockGetEsewaMerchantId.mockReturnValue("EPAYTEST");
  mockGetEsewaIntentProductCode.mockReturnValue("EPAYTEST");
  mockJwtSign.mockReturnValue("mock-jwt-token");
});

// helpers

const makeQuery = (value) => {
  const chain = {};
  chain.populate = jest.fn(() => chain);
  chain.sort = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.lean = jest.fn(() => chain);
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(value).then(onFulfilled, onRejected);
  chain.catch = (fn) => Promise.resolve(value).catch(fn);
  return chain;
};

const makeReq = (overrides = {}) => ({
  user: { _id: "user-1", name: "Bob", email: "bob@test.com", role: "tenant" },
  body: {},
  params: {},
  query: {},
  method: "GET",
  get: jest.fn().mockReturnValue(""),
  ...overrides,
});

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  redirect: jest.fn(),
  send: jest.fn(),
});

const makePaymentDoc = (overrides = {}) => ({
  _id: "pay-1",
  invoiceId: "inv-1",
  tenantId: "tenant-1",
  userId: "user-1",
  amount: 5000,
  gateway: "khalti",
  transactionId: "RENTIVO-xxx",
  status: "initiated",
  gatewayResponse: null,
  failureReason: undefined,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeInvoiceDoc = (overrides = {}) => ({
  _id: "inv-1",
  status: "Pending",
  amount: 5000,
  landlordId: "landlord-1",
  tenantId: "tenant-1",
  invoiceNumber: "INV-001",
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// getPaymentConfig tests

describe("getPaymentConfig", () => {
  test("returns available gateways with 200", async () => {
    const req = makeReq();
    const res = makeRes();
    await getPaymentConfig(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        availableGateways: expect.arrayContaining(["esewa", "khalti"]),
      })
    );
  });

  test("lists both esewa and khalti as available gateways", async () => {
    const req = makeReq();
    const res = makeRes();
    await getPaymentConfig(req, res);
    const { availableGateways } = res.json.mock.calls[0][0];
    expect(availableGateways).toContain("esewa");
    expect(availableGateways).toContain("khalti");
  });
});

// getPaymentHistory tests

describe("getPaymentHistory", () => {
  test("returns 200 with payment list for authenticated user", async () => {
    const payments = [makePaymentDoc(), makePaymentDoc({ _id: "pay-2" })];
    mockPaymentFind.mockReturnValue(makeQuery(payments));
    const req = makeReq();
    const res = makeRes();
    await getPaymentHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 2 })
    );
  });

  test("queries payments by req.user._id", async () => {
    mockPaymentFind.mockReturnValue(makeQuery([]));
    const req = makeReq({ user: { _id: "user-specific-id", role: "tenant" } });
    const res = makeRes();
    await getPaymentHistory(req, res);
    expect(mockPaymentFind).toHaveBeenCalledWith({ userId: "user-specific-id" });
  });

  test("returns empty list when user has no payments", async () => {
    mockPaymentFind.mockReturnValue(makeQuery([]));
    const req = makeReq();
    const res = makeRes();
    await getPaymentHistory(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ count: 0, payments: [] })
    );
  });

  test("500 when database throws", async () => {
    mockPaymentFind.mockReturnValue(makeQuery(Promise.reject(new Error("DB error"))));
    const req = makeReq();
    const res = makeRes();
    await getPaymentHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// getPaymentById tests

describe("getPaymentById", () => {
  test("404 when payment does not exist", async () => {
    mockPaymentFindById.mockReturnValue(makeQuery(null));
    const req = makeReq({ params: { id: "pay-missing" } });
    const res = makeRes();
    await getPaymentById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Payment not found" })
    );
  });

  test("403 when requesting another user's payment", async () => {
    const payment = makePaymentDoc({ userId: "other-user-id", gateway: "khalti", status: "completed" });
    mockPaymentFindById.mockReturnValue(makeQuery(payment));
    const req = makeReq({
      user: { _id: "user-1", role: "tenant" },
      params: { id: "pay-1" },
    });
    const res = makeRes();
    await getPaymentById(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not authorized to view this payment" })
    );
  });

  test("200 when user requests their own completed Khalti payment", async () => {
    const payment = makePaymentDoc({ userId: "user-1", gateway: "khalti", status: "completed" });
    mockPaymentFindById.mockReturnValue(makeQuery(payment));
    const req = makeReq({
      user: { _id: "user-1", role: "tenant" },
      params: { id: "pay-1" },
    });
    const res = makeRes();
    await getPaymentById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, payment: expect.objectContaining({ _id: "pay-1" }) })
    );
  });

  test("500 when database throws", async () => {
    mockPaymentFindById.mockReturnValue(makeQuery(Promise.reject(new Error("DB error"))));
    const req = makeReq({ params: { id: "pay-1" } });
    const res = makeRes();
    await getPaymentById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// initiatePayment tests

describe("initiatePayment", () => {
  const makeKhaltiInvoice = () => {
    const inv = makeInvoiceDoc({ status: "Pending" });
    // populate just returns itself so we can chain
    inv.populate = jest.fn().mockReturnThis();
    return inv;
  };

  test("400 when gateway is not esewa or khalti", async () => {
    const req = makeReq({
      body: { invoiceId: "inv-1", gateway: "paypal" },
    });
    const res = makeRes();
    await initiatePayment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Invalid payment gateway") })
    );
  });

  test("404 when invoice is not found", async () => {
    mockInvoiceFindById.mockReturnValue(makeQuery(null));
    const req = makeReq({ body: { invoiceId: "inv-missing", gateway: "khalti" } });
    const res = makeRes();
    await initiatePayment(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invoice not found" })
    );
  });

  test("403 when tenant does not own the invoice", async () => {
    const inv = makeKhaltiInvoice();
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    // this tenant belongs to someone else
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "different-user-999" });
    const req = makeReq({
      user: { _id: "user-1", role: "tenant", name: "Bob", email: "b@t.com" },
      body: { invoiceId: "inv-1", gateway: "khalti" },
    });
    const res = makeRes();
    await initiatePayment(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not authorized to pay this invoice" })
    );
  });

  test("400 when invoice is already paid", async () => {
    const inv = makeInvoiceDoc({ status: "Paid" });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "user-1" });
    const req = makeReq({
      user: { _id: "user-1", role: "tenant", name: "Bob", email: "b@t.com" },
      body: { invoiceId: "inv-1", gateway: "khalti" },
    });
    const res = makeRes();
    await initiatePayment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invoice is already paid" })
    );
  });

  test("200 successful Khalti payment initiation", async () => {
    const inv = makeInvoiceDoc({ status: "Pending", tenantId: "tenant-1" });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "user-1" });
    mockInitializeKhaltiPayment.mockResolvedValue({
      payment_url: "https://khalti.test/pay",
      pidx: "test-pidx",
    });
    mockPaymentCreate.mockResolvedValue(makePaymentDoc({ _id: "pay-new" }));
    const req = makeReq({
      user: { _id: "user-1", role: "tenant", name: "Bob", email: "b@t.com", phone: "9800000000" },
      body: { invoiceId: "inv-1", gateway: "khalti" },
    });
    const res = makeRes();
    await initiatePayment(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        payment: expect.objectContaining({ gateway: "khalti" }),
      })
    );
  });

  test("creates a Payment record in the database on success", async () => {
    const inv = makeInvoiceDoc({ status: "Pending", tenantId: "tenant-1", amount: 8000 });
    mockInvoiceFindById.mockReturnValue(makeQuery(inv));
    mockTenantFindById.mockResolvedValue({ _id: "tenant-1", userId: "user-1" });
    mockInitializeKhaltiPayment.mockResolvedValue({ pidx: "x" });
    mockPaymentCreate.mockResolvedValue(makePaymentDoc({ _id: "pay-new", amount: 8000 }));
    const req = makeReq({
      user: { _id: "user-1", role: "tenant", name: "Bob", email: "b@t.com" },
      body: { invoiceId: "inv-1", gateway: "khalti" },
    });
    const res = makeRes();
    await initiatePayment(req, res);
    expect(mockPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ gateway: "khalti", userId: "user-1" })
    );
  });

  test("500 on unexpected error", async () => {
    mockInvoiceFindById.mockReturnValue(makeQuery(Promise.reject(new Error("DB down"))));
    const req = makeReq({ body: { invoiceId: "inv-1", gateway: "khalti" } });
    const res = makeRes();
    await initiatePayment(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// verifyKhaltiPayment tests - checking how payment status gets updated

describe("verifyKhaltiPayment - status update logic", () => {
  // this function redirects to the mobile app after payment
  // checking the url params instead of the full url

  test("redirects to mobile URI with no_pidx reason when pidx is missing", async () => {
    const req = makeReq({ query: {} }); // no pidx
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("reason=no_pidx"));
  });

  test("redirects with lookup_failed reason when Khalti lookup API throws", async () => {
    mockKhaltiLookup.mockRejectedValue(new Error("Network error"));
    const req = makeReq({ query: { pidx: "test-pidx" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("reason=lookup_failed"));
  });

  test("redirects with no_txn_id reason when no transaction ID in Khalti response", async () => {
    mockKhaltiLookup.mockResolvedValue({ status: "Completed", total_amount: 500000 });
    const req = makeReq({ query: { pidx: "test-pidx" } }); // no purchase_order_id in query or response
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("reason=no_txn_id"));
  });

  test("redirects with not_found reason when payment record not found", async () => {
    mockKhaltiLookup.mockResolvedValue({
      status: "Completed",
      total_amount: 500000,
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(null);
    const req = makeReq({ query: { pidx: "test-pidx", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("reason=not_found"));
  });

  test("sets payment status to pending and redirects with result=failed when Khalti status is Pending", async () => {
    const payment = makePaymentDoc({ status: "initiated", amount: 5000 });
    mockKhaltiLookup.mockResolvedValue({
      status: "Pending",
      total_amount: 500000,
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(payment);
    const req = makeReq({ query: { pidx: "p", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("result=failed"));
    expect(payment.status).toBe("pending");
    expect(payment.save).toHaveBeenCalled();
  });

  test("sets payment status to failed and redirects with result=failed when Khalti status is Expired", async () => {
    const payment = makePaymentDoc({ status: "initiated", amount: 5000 });
    mockKhaltiLookup.mockResolvedValue({
      status: "Expired",
      total_amount: 500000,
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(payment);
    const req = makeReq({ query: { pidx: "p", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("result=failed"));
    expect(payment.status).toBe("failed");
    expect(payment.save).toHaveBeenCalled();
  });

  test("redirects with amount_mismatch reason and marks payment failed on paisa/NPR mismatch", async () => {
    const payment = makePaymentDoc({ status: "initiated", amount: 5000 }); // 5000 rupees
    mockKhaltiLookup.mockResolvedValue({
      status: "Completed",
      total_amount: 400000, // 4000 rupees but we paid 5000, doesnt match
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(payment);
    const req = makeReq({ query: { pidx: "p", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("reason=amount_mismatch"));
    expect(payment.status).toBe("failed");
    expect(payment.failureReason).toBe("Amount mismatch");
  });

  test("marks payment completed and invoice Paid on successful Khalti verification", async () => {
    const payment = makePaymentDoc({ status: "initiated", amount: 5000 });
    const invoice = makeInvoiceDoc({ status: "Pending" });
    mockKhaltiLookup.mockResolvedValue({
      status: "Completed",
      total_amount: 500000, // khalti uses paisa so 5000 rupees = 500000
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(payment);
    mockInvoiceFindById.mockReturnValue(makeQuery(invoice));
    const req = makeReq({ query: { pidx: "p", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(payment.status).toBe("completed");
    expect(payment.save).toHaveBeenCalled();
    expect(invoice.status).toBe("Paid");
    expect(invoice.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("result=success"));
  });

  test("sends notifications to tenant and landlord on successful verification", async () => {
    const payment = makePaymentDoc({ status: "initiated", amount: 5000 });
    const invoice = makeInvoiceDoc({ status: "Pending", landlordId: "landlord-1" });
    mockKhaltiLookup.mockResolvedValue({
      status: "Completed",
      total_amount: 500000,
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(payment);
    mockInvoiceFindById.mockReturnValue(makeQuery(invoice));
    const req = makeReq({ query: { pidx: "p", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    // should notify tenant
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "user-1",
      "payment",
      expect.stringContaining("Khalti")
    );
    // should notify landlord too
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "landlord-1",
      "payment",
      expect.stringContaining("Khalti")
    );
  });

  test("handles already-completed payment idempotently (redirects to result=success)", async () => {
    const payment = makePaymentDoc({ status: "completed", amount: 5000 });
    const invoice = makeInvoiceDoc({ status: "Paid" });
    mockKhaltiLookup.mockResolvedValue({
      status: "Completed",
      total_amount: 500000,
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(payment);
    mockInvoiceFindById.mockReturnValue(makeQuery(invoice));
    const req = makeReq({ query: { pidx: "p", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("result=success"));
  });

  test("sends failure notification to tenant when Khalti status is Expired", async () => {
    const payment = makePaymentDoc({ status: "initiated", userId: "user-1", amount: 5000 });
    mockKhaltiLookup.mockResolvedValue({
      status: "Expired",
      total_amount: 500000,
      purchase_order_id: "RENTIVO-txn-abc",
    });
    mockPaymentFindOne.mockResolvedValue(payment);
    const req = makeReq({ query: { pidx: "p", purchase_order_id: "RENTIVO-txn-abc" } });
    const res = makeRes();
    await verifyKhaltiPayment(req, res);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "user-1",
      "payment",
      expect.stringContaining("could not be completed")
    );
  });
});

// handlePaymentFailure tests

describe("handlePaymentFailure", () => {
  test("redirects to payment-failed with reason=cancelled when no txnId", async () => {
    const req = makeReq({ query: {}, params: {} });
    const res = makeRes();
    await handlePaymentFailure(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("payment-failed"));
  });

  test("marks payment as failed when txnId matches a non-completed payment", async () => {
    const payment = makePaymentDoc({ gateway: "khalti", status: "initiated" });
    mockPaymentFindOne.mockResolvedValue(payment);
    const req = makeReq({
      query: { transaction_uuid: "RENTIVO-txn-abc", gateway: "khalti" },
      params: {},
    });
    const res = makeRes();
    await handlePaymentFailure(req, res);
    expect(payment.status).toBe("failed");
    expect(payment.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("payment-failed"));
  });

  test("does not overwrite completed payment on failure callback", async () => {
    const payment = makePaymentDoc({ gateway: "khalti", status: "completed" });
    mockPaymentFindOne.mockResolvedValue(payment);
    const req = makeReq({
      query: { transaction_uuid: "RENTIVO-txn-abc", gateway: "khalti" },
      params: {},
    });
    const res = makeRes();
    await handlePaymentFailure(req, res);
    // already completed so shouldnt change to failed
    expect(payment.status).toBe("completed");
    expect(payment.save).not.toHaveBeenCalled();
  });
});

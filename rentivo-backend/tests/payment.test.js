// Critical financial endpoint tests: payments
// Native ESM with jest.unstable_mockModule.
// eSewa and Khalti gateways are always mocked — no real API calls.

import { jest } from "@jest/globals";

// Mock functions

const mockPaymentCreate = jest.fn();
const mockPaymentFind = jest.fn();
const mockPaymentFindById = jest.fn();
const mockPaymentFindOne = jest.fn();

const mockInvoiceFindById = jest.fn();
const mockTenantFindById = jest.fn();

const mockInitializeEsewaPayment = jest.fn();
const mockInitializeKhaltiPayment = jest.fn();
const mockKhaltiLookup = jest.fn();
const mockGetEsewaMerchantId = jest.fn();
const mockGetEsewaIntentProductCode = jest.fn();
const mockCheckEsewaTransactionStatus = jest.fn();
const mockVerifyEsewaSignature = jest.fn();
const mockVerifyEsewaIntentSignature = jest.fn();
const mockCheckEsewaIntentPaymentStatus = jest.fn();
const mockBookEsewaIntentPayment = jest.fn();

const mockCreateNotification = jest.fn();
const mockJwtSign = jest.fn();

// --- Module mocks (before any dynamic imports) ---

jest.unstable_mockModule("../middleware/authMiddleware.js", () => ({
    protect: (req, res, next) => {
        if (!currentUser) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }
        req.user = currentUser;
        next();
    },
}));

jest.unstable_mockModule("../models/paymentModel.js", () => ({
    default: {
        create: mockPaymentCreate,
        find: mockPaymentFind,
        findById: mockPaymentFindById,
        findOne: mockPaymentFindOne,
    },
}));

jest.unstable_mockModule("../models/invoiceModel.js", () => ({
    default: { findById: mockInvoiceFindById },
}));

jest.unstable_mockModule("../models/tenantModel.js", () => ({
    default: { findById: mockTenantFindById },
}));

jest.unstable_mockModule("../payment/gateways/esewaGateway.js", () => ({
    initializeEsewaPayment: mockInitializeEsewaPayment,
    getEsewaMerchantId: mockGetEsewaMerchantId,
    getEsewaIntentProductCode: mockGetEsewaIntentProductCode,
    checkEsewaTransactionStatus: mockCheckEsewaTransactionStatus,
    verifyEsewaSignature: mockVerifyEsewaSignature,
    verifyEsewaIntentSignature: mockVerifyEsewaIntentSignature,
    checkEsewaIntentPaymentStatus: mockCheckEsewaIntentPaymentStatus,
    bookEsewaIntentPayment: mockBookEsewaIntentPayment,
}));

jest.unstable_mockModule("../payment/gateways/khaltiGateway.js", () => ({
    initializeKhaltiPayment: mockInitializeKhaltiPayment,
    verifyKhaltiPayment: mockKhaltiLookup,
}));

jest.unstable_mockModule("../controllers/notificationController.js", () => ({
    createNotification: mockCreateNotification,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
    default: { sign: mockJwtSign, verify: jest.fn() },
}));

// Dynamic imports (after mocks)

const { default: express } = await import("express");
const { default: request } = await import("supertest");
const { default: paymentRoutes } = await import("../routes/paymentRoutes.js");

// App

const app = express();
app.use(express.json());
app.use("/api/payments", paymentRoutes);

// Helpers

function mockQuery(value) {
    const q = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
    };
    q.then = (res, rej) => Promise.resolve(value).then(res, rej);
    q.catch = (rej) => Promise.resolve(value).catch(rej);
    return q;
}

function createMockDoc(data) {
    return {
        ...data,
        save: jest.fn().mockResolvedValue({ ...data }),
    };
}

// Test data

const LANDLORD_ID = "507f1f77bcf86cd799439001";
const TENANT_USER_ID = "507f1f77bcf86cd799439002";
const TENANT_ID = "507f1f77bcf86cd799439004";
const INVOICE_ID = "507f1f77bcf86cd799439005";
const PAYMENT_ID = "507f1f77bcf86cd799439006";
const TXN_ID = "rtv-test123-abcd";

const tenantUser = {
    _id: TENANT_USER_ID,
    name: "Test Tenant",
    email: "tenant@test.com",
    phone: "9800000000",
    role: "tenant",
    toString: () => TENANT_USER_ID,
};

const otherUser = {
    _id: "999999999999999999999999",
    name: "Other",
    email: "other@test.com",
    role: "tenant",
    toString: () => "999999999999999999999999",
};

const mockTenantRecord = {
    _id: TENANT_ID,
    userId: { toString: () => TENANT_USER_ID },
};

const mockPendingInvoice = {
    _id: INVOICE_ID,
    tenantId: { _id: TENANT_ID, toString: () => TENANT_ID },
    propertyId: "507f1f77bcf86cd799439003",
    amount: 15000,
    status: "Pending",
    toString: () => INVOICE_ID,
    invoiceNumber: "INV-001",
};

const mockPayment = {
    _id: PAYMENT_ID,
    invoiceId: INVOICE_ID,
    tenantId: TENANT_ID,
    userId: { toString: () => TENANT_USER_ID },
    amount: 15000,
    gateway: "esewa",
    transactionId: TXN_ID,
    status: "initiated",
};

let currentUser = null;

beforeEach(() => {
    currentUser = null;
    jest.clearAllMocks();
    mockCreateNotification.mockResolvedValue(undefined);
    mockGetEsewaMerchantId.mockReturnValue("EPAYTEST");
    mockGetEsewaIntentProductCode.mockReturnValue("EPAYTEST");
    mockJwtSign.mockReturnValue("mock-launch-token");
    mockInitializeEsewaPayment.mockReturnValue({
        amount: "15000",
        tax_amount: "0",
        total_amount: "15000",
        transaction_uuid: TXN_ID,
        product_code: "EPAYTEST",
        signature: "mock-sig",
        payment_url: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        success_url: "http://localhost:3000/payment-success",
        failure_url: "http://localhost:3000/payment-failed",
        product_service_charge: "0",
        product_delivery_charge: "0",
        signed_field_names: "total_amount,transaction_uuid,product_code",
    });
    mockInitializeKhaltiPayment.mockResolvedValue({
        pidx: "mock-pidx-abc",
        payment_url: "https://pay.khalti.com/?pidx=mock-pidx-abc",
        expires_at: "2026-04-20T00:00:00Z",
        expires_in: 1800,
    });
});

const auth = () => ({ Authorization: "Bearer token" });

// POST /api/payments/initiate

describe("POST /api/payments/initiate — initiatePayment", () => {
    const payload = { invoiceId: INVOICE_ID, gateway: "esewa" };

    test("200 — successful eSewa payment initiation (mocked gateway)", async () => {
        currentUser = tenantUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(mockPendingInvoice));
        mockTenantFindById.mockResolvedValue(mockTenantRecord);
        mockPaymentCreate.mockResolvedValue({ ...mockPayment, _id: PAYMENT_ID });

        const res = await request(app).post("/api/payments/initiate").set(auth()).send(payload);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.payment.gateway).toBe("esewa");
        expect(mockInitializeEsewaPayment).toHaveBeenCalled();
    });

    test("200 — successful Khalti payment initiation (mocked gateway)", async () => {
        currentUser = tenantUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(mockPendingInvoice));
        mockTenantFindById.mockResolvedValue(mockTenantRecord);
        mockPaymentCreate.mockResolvedValue({ ...mockPayment, gateway: "khalti" });

        const res = await request(app)
            .post("/api/payments/initiate")
            .set(auth())
            .send({ invoiceId: INVOICE_ID, gateway: "khalti" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.payment.gateway).toBe("khalti");
        expect(mockInitializeKhaltiPayment).toHaveBeenCalled();
    });

    test("400 — invalid gateway name", async () => {
        currentUser = tenantUser;

        const res = await request(app)
            .post("/api/payments/initiate")
            .set(auth())
            .send({ invoiceId: INVOICE_ID, gateway: "stripe" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid payment gateway/i);
    });

    test("404 — invoice not found", async () => {
        currentUser = tenantUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(null));

        const res = await request(app).post("/api/payments/initiate").set(auth()).send(payload);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    test("400 — invoice already paid", async () => {
        currentUser = tenantUser;
        mockInvoiceFindById.mockReturnValue(
            mockQuery({ ...mockPendingInvoice, status: "Paid" })
        );
        mockTenantFindById.mockResolvedValue(mockTenantRecord);

        const res = await request(app).post("/api/payments/initiate").set(auth()).send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already paid/i);
    });

    test("403 — tenant does not own invoice", async () => {
        currentUser = otherUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(mockPendingInvoice));
        mockTenantFindById.mockResolvedValue(mockTenantRecord);

        const res = await request(app).post("/api/payments/initiate").set(auth()).send(payload);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/Not authorized/i);
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app).post("/api/payments/initiate").send(payload);
        expect(res.status).toBe(401);
    });

    test("payment record created with initiated status", async () => {
        currentUser = tenantUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(mockPendingInvoice));
        mockTenantFindById.mockResolvedValue(mockTenantRecord);
        mockPaymentCreate.mockResolvedValue({ ...mockPayment, status: "initiated" });

        await request(app).post("/api/payments/initiate").set(auth()).send(payload);

        expect(mockPaymentCreate).toHaveBeenCalledWith(
            expect.objectContaining({ status: "initiated" })
        );
    });
});

// GET /api/payments/history

describe("GET /api/payments/history — getPaymentHistory", () => {
    test("200 — returns user payment history", async () => {
        currentUser = tenantUser;
        mockPaymentFind.mockReturnValue(mockQuery([mockPayment]));

        const res = await request(app).get("/api/payments/history").set(auth());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.payments)).toBe(true);
    });

    test("200 — returns empty array when no payments", async () => {
        currentUser = tenantUser;
        mockPaymentFind.mockReturnValue(mockQuery([]));

        const res = await request(app).get("/api/payments/history").set(auth());

        expect(res.status).toBe(200);
        expect(res.body.payments).toHaveLength(0);
        expect(res.body.count).toBe(0);
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app).get("/api/payments/history");
        expect(res.status).toBe(401);
    });
});

// GET /api/payments/:id

describe("GET /api/payments/:id — getPaymentById", () => {
    test("200 — user views their own completed payment", async () => {
        currentUser = tenantUser;
        // Use completed status to skip eSewa reconciliation side-effects
        const doc = createMockDoc({ ...mockPayment, status: "completed" });
        mockPaymentFindById.mockReturnValue(mockQuery(doc));

        const res = await request(app).get(`/api/payments/${PAYMENT_ID}`).set(auth());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("404 — payment not found", async () => {
        currentUser = tenantUser;
        mockPaymentFindById.mockReturnValue(mockQuery(null));

        const res = await request(app).get(`/api/payments/${PAYMENT_ID}`).set(auth());
        expect(res.status).toBe(404);
    });

    test("403 — cannot view another user's payment", async () => {
        currentUser = otherUser;
        mockPaymentFindById.mockReturnValue(mockQuery(mockPayment));

        const res = await request(app).get(`/api/payments/${PAYMENT_ID}`).set(auth());
        expect(res.status).toBe(403);
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app).get(`/api/payments/${PAYMENT_ID}`);
        expect(res.status).toBe(401);
    });
});

// GET /api/payments/config

describe("GET /api/payments/config — getPaymentConfig", () => {
    test("200 — returns available gateways", async () => {
        currentUser = tenantUser;

        const res = await request(app).get("/api/payments/config").set(auth());

        expect(res.status).toBe(200);
        expect(res.body.availableGateways).toContain("esewa");
        expect(res.body.availableGateways).toContain("khalti");
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app).get("/api/payments/config");
        expect(res.status).toBe(401);
    });
});

// eSewa verify — full implementation

describe("GET /api/payments/esewa/verify — verifyEsewaPayment", () => {
    test("302 — redirects to failure when no data param", async () => {
        const res = await request(app).get("/api/payments/esewa/verify");
        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/payment-failed/);
    });

    test("302 — redirects to failure when base64 data is invalid JSON", async () => {
        const res = await request(app).get("/api/payments/esewa/verify?data=aW52YWxpZA==");
        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/payment-failed/);
    });

    test("302 — redirects to success after successful eSewa verification", async () => {
        const esewaPayload = {
            transaction_code: "TXN123",
            status: "COMPLETE",
            total_amount: "15000",
            transaction_uuid: TXN_ID,
            product_code: "EPAYTEST",
            signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
            signature: "valid-sig",
        };
        const data = Buffer.from(JSON.stringify(esewaPayload)).toString("base64");

        const doc = createMockDoc({ ...mockPayment, amount: 15000 });
        mockPaymentFindOne.mockResolvedValue(doc);
        mockVerifyEsewaSignature.mockReturnValue("valid-sig");
        mockInvoiceFindById.mockResolvedValue(
            createMockDoc({ _id: INVOICE_ID, status: "Pending", landlordId: LANDLORD_ID })
        );

        const res = await request(app).get(`/api/payments/esewa/verify?data=${data}`);

        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/payment-success/);
    });

    test("302 — redirects to failure on signature mismatch", async () => {
        const esewaPayload = {
            transaction_code: "TXN123",
            status: "COMPLETE",
            total_amount: "15000",
            transaction_uuid: TXN_ID,
            product_code: "EPAYTEST",
            signed_field_names: "transaction_code,status,total_amount",
            signature: "wrong-sig",
        };
        const data = Buffer.from(JSON.stringify(esewaPayload)).toString("base64");

        const doc = createMockDoc({ ...mockPayment, amount: 15000 });
        mockPaymentFindOne.mockResolvedValue(doc);
        mockVerifyEsewaSignature.mockReturnValue("expected-sig");

        const res = await request(app).get(`/api/payments/esewa/verify?data=${data}`);

        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/payment-failed/);
        expect(doc.status).toBe("failed");
    });
});

// Khalti verify — full implementation
// Note: Khalti redirects to frontendmobile:// deep links (mobile app protocol).
// Assertions check result param in the redirect URL instead of web path.

describe("GET|POST /api/payments/khalti/verify — verifyKhaltiPayment", () => {
    test("302 — redirects when no pidx provided", async () => {
        const res = await request(app).get("/api/payments/khalti/verify");
        expect([301, 302]).toContain(res.status);
    });

    test("302 — redirects to failure when Khalti lookup fails", async () => {
        mockKhaltiLookup.mockRejectedValue(new Error("Khalti API unavailable"));

        const res = await request(app).get("/api/payments/khalti/verify?pidx=testpidx");

        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/lookup_failed/);
    });

    test("302 — redirects to success after Khalti verification", async () => {
        mockKhaltiLookup.mockResolvedValue({
            total_amount: 1500000,
            status: "Completed",
            purchase_order_id: TXN_ID,
        });

        const doc = createMockDoc({ ...mockPayment, amount: 15000 });
        mockPaymentFindOne.mockResolvedValue(doc);
        mockInvoiceFindById.mockResolvedValue(
            createMockDoc({ _id: INVOICE_ID, status: "Pending", landlordId: LANDLORD_ID })
        );

        const res = await request(app)
            .get(`/api/payments/khalti/verify?pidx=testpidx&purchase_order_id=${TXN_ID}`);

        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/result=success/);
    });

    test("302 — redirects to failure on Khalti amount mismatch", async () => {
        mockKhaltiLookup.mockResolvedValue({
            total_amount: 50000, // 500 NPR != 15000 NPR
            status: "Completed",
            purchase_order_id: TXN_ID,
        });

        const doc = createMockDoc({ ...mockPayment, amount: 15000 });
        mockPaymentFindOne.mockResolvedValue(doc);

        const res = await request(app)
            .get(`/api/payments/khalti/verify?pidx=testpidx&purchase_order_id=${TXN_ID}`);

        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/amount_mismatch/);
    });
});

// Payment status transitions

describe("Payment status transitions", () => {
    test("initiated → failed via eSewa failure callback", async () => {
        const doc = createMockDoc({ ...mockPayment, status: "initiated" });
        mockPaymentFindOne.mockResolvedValue(doc);
        mockCheckEsewaTransactionStatus.mockResolvedValue({ status: "CANCELED" });

        await request(app)
            .get(`/api/payments/esewa/failure/${TXN_ID}?total_amount=15000&product_code=EPAYTEST`);

        expect(doc.save).toHaveBeenCalled();
        expect(doc.status).toBe("failed");
    });

    test("initiated → completed and invoice marked Paid via Khalti verification", async () => {
        mockKhaltiLookup.mockResolvedValue({
            total_amount: 1500000,
            status: "Completed",
            purchase_order_id: TXN_ID,
        });

        const paymentDoc = createMockDoc({ ...mockPayment, status: "initiated" });
        mockPaymentFindOne.mockResolvedValue(paymentDoc);

        const invoiceDoc = createMockDoc({
            _id: INVOICE_ID,
            status: "Pending",
            landlordId: LANDLORD_ID,
        });
        mockInvoiceFindById.mockResolvedValue(invoiceDoc);

        await request(app)
            .get(`/api/payments/khalti/verify?pidx=testpidx&purchase_order_id=${TXN_ID}`);

        expect(paymentDoc.status).toBe("completed");
        expect(invoiceDoc.status).toBe("Paid");
        expect(invoiceDoc.paidDate).toBeDefined();
    });

    test("already completed payment — invoice stays Paid (no double processing)", async () => {
        mockKhaltiLookup.mockResolvedValue({
            total_amount: 1500000,
            status: "Completed",
            purchase_order_id: TXN_ID,
        });

        const paymentDoc = createMockDoc({ ...mockPayment, status: "completed" });
        mockPaymentFindOne.mockResolvedValue(paymentDoc);

        const invoiceDoc = createMockDoc({
            _id: INVOICE_ID,
            status: "Paid",
            paidDate: new Date("2026-04-18"),
            landlordId: LANDLORD_ID,
        });
        mockInvoiceFindById.mockResolvedValue(invoiceDoc);

        const res = await request(app)
            .get(`/api/payments/khalti/verify?pidx=testpidx&purchase_order_id=${TXN_ID}`);

        expect([301, 302]).toContain(res.status);
        expect(res.headers.location).toMatch(/result=success/);
        // Invoice already paid — paidDate must not be overwritten
        expect(invoiceDoc.paidDate.toISOString()).toBe(new Date("2026-04-18").toISOString());
    });
});

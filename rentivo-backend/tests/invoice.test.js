// Stage 4 — Critical financial endpoint tests: invoicing
// Native ESM with jest.unstable_mockModule. No Babel needed.

import { jest } from "@jest/globals";

// --- Mock functions ---

const mockInvoiceFindById = jest.fn();
const mockInvoiceFind = jest.fn();
const mockInvoiceCreate = jest.fn();
const mockPropertyFindOne = jest.fn();
const mockTenantFindOne = jest.fn();
const mockTenantFind = jest.fn();
const mockTenantFindById = jest.fn();
const mockCreateNotification = jest.fn();

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

jest.unstable_mockModule("../models/invoiceModel.js", () => ({
    default: {
        findById: mockInvoiceFindById,
        find: mockInvoiceFind,
        create: mockInvoiceCreate,
    },
}));

jest.unstable_mockModule("../models/propertyModel.js", () => ({
    default: { findOne: mockPropertyFindOne },
}));

jest.unstable_mockModule("../models/tenantModel.js", () => ({
    default: {
        findOne: mockTenantFindOne,
        find: mockTenantFind,
        findById: mockTenantFindById,
    },
}));

jest.unstable_mockModule("../controllers/notificationController.js", () => ({
    createNotification: mockCreateNotification,
}));

jest.unstable_mockModule("../middleware/uploadMiddleware.js", () => ({
    upload: { single: jest.fn().mockReturnValue((req, res, next) => next()) },
}));

jest.unstable_mockModule("cloudinary", () => ({
    default: { config: jest.fn(), uploader: {}, api: {} },
    v2: { config: jest.fn(), uploader: {}, api: {} },
}));

jest.unstable_mockModule("multer-storage-cloudinary", () => ({
    default: jest.fn(),
    CloudinaryStorage: jest.fn().mockImplementation(() => ({})),
}));

// --- Dynamic imports (after mocks) ---

const { default: express } = await import("express");
const { default: request } = await import("supertest");
const { default: invoiceRoutes } = await import("../routes/invoiceRoutes.js");

// --- App ---

const app = express();
app.use(express.json());
app.use("/api/invoices", invoiceRoutes);

// --- Helpers ---

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
        deleteOne: jest.fn().mockResolvedValue({}),
    };
}

// --- Test data ---

const LANDLORD_ID = "507f1f77bcf86cd799439001";
const TENANT_USER_ID = "507f1f77bcf86cd799439002";
const PROPERTY_ID = "507f1f77bcf86cd799439003";
const TENANT_ID = "507f1f77bcf86cd799439004";
const INVOICE_ID = "507f1f77bcf86cd799439005";

const landlordUser = {
    _id: LANDLORD_ID,
    name: "Test Landlord",
    email: "landlord@test.com",
    role: "landlord",
    toString: () => LANDLORD_ID,
};

const tenantUser = {
    _id: TENANT_USER_ID,
    name: "Test Tenant",
    email: "tenant@test.com",
    role: "tenant",
    toString: () => TENANT_USER_ID,
};

const mockProperty = { _id: PROPERTY_ID, title: "Test Property" };
const mockTenantRecord = {
    _id: TENANT_ID,
    userId: { _id: TENANT_USER_ID, toString: () => TENANT_USER_ID, name: "Test Tenant", email: "tenant@test.com" },
    propertyId: PROPERTY_ID,
};
const mockLandlordField = {
    _id: LANDLORD_ID,
    toString: () => LANDLORD_ID,
    name: "Test Landlord",
    email: "landlord@test.com",
};
const baseInvoice = {
    _id: INVOICE_ID,
    landlordId: mockLandlordField,
    // tenantId populated with userId nested (matches populateInvoiceRelations pattern)
    tenantId: {
        _id: TENANT_ID,
        toString: () => TENANT_ID,
        userId: { _id: TENANT_USER_ID, toString: () => TENANT_USER_ID, name: "Test Tenant", email: "tenant@test.com" },
    },
    propertyId: PROPERTY_ID,
    amount: 15000,
    type: "Rent",
    status: "Pending",
    dueDate: new Date("2026-05-01"),
};

// currentUser is read by the mocked protect middleware
let currentUser = null;

beforeEach(() => {
    currentUser = null;
    jest.clearAllMocks();
    mockCreateNotification.mockResolvedValue(undefined);
});

const auth = () => ({ Authorization: "Bearer token" });

// ========== POST /api/invoices ==========

describe("POST /api/invoices — createInvoice", () => {
    const payload = {
        tenantId: TENANT_ID,
        propertyId: PROPERTY_ID,
        amount: 15000,
        type: "Rent",
        dueDate: "2026-05-01",
        description: "May rent",
    };

    test("201 — valid invoice creation", async () => {
        currentUser = landlordUser;
        mockPropertyFindOne.mockResolvedValue(mockProperty);
        mockTenantFindOne.mockResolvedValue(mockTenantRecord);
        mockInvoiceCreate.mockResolvedValue({ ...baseInvoice });
        // controller calls Invoice.findById after create to populate relations
        mockInvoiceFindById.mockReturnValue(mockQuery({ ...baseInvoice }));

        const res = await request(app).post("/api/invoices").set(auth()).send(payload);

        expect(res.status).toBe(201);
        expect(mockInvoiceCreate).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 15000, type: "Rent" })
        );
    });

    test("201 — valid invoice with correct breakdown", async () => {
        currentUser = landlordUser;
        mockPropertyFindOne.mockResolvedValue(mockProperty);
        mockTenantFindOne.mockResolvedValue(mockTenantRecord);
        mockInvoiceCreate.mockResolvedValue({ ...baseInvoice, amount: 16500 });
        mockInvoiceFindById.mockReturnValue(mockQuery({ ...baseInvoice, amount: 16500 }));

        const res = await request(app)
            .post("/api/invoices")
            .set(auth())
            .send({
                ...payload,
                amount: 16500,
                breakdown: {
                    baseRent: 15000,
                    utilities: { electricity: 1000, water: 500 },
                    totalUtilities: 1500,
                },
            });

        expect(res.status).toBe(201);
    });

    test("400 — totalUtilities mismatch in breakdown", async () => {
        currentUser = landlordUser;
        mockPropertyFindOne.mockResolvedValue(mockProperty);
        mockTenantFindOne.mockResolvedValue(mockTenantRecord);

        const res = await request(app)
            .post("/api/invoices")
            .set(auth())
            .send({
                ...payload,
                amount: 16500,
                breakdown: {
                    baseRent: 15000,
                    utilities: { electricity: 1000, water: 500 },
                    totalUtilities: 9999,
                },
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Total utilities doesn't match/i);
    });

    test("400 — amount doesn't match baseRent + utilities", async () => {
        currentUser = landlordUser;
        mockPropertyFindOne.mockResolvedValue(mockProperty);
        mockTenantFindOne.mockResolvedValue(mockTenantRecord);

        const res = await request(app)
            .post("/api/invoices")
            .set(auth())
            .send({
                ...payload,
                amount: 99999,
                breakdown: {
                    baseRent: 15000,
                    utilities: { electricity: 1000 },
                    totalUtilities: 1000,
                },
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/must equal base rent/i);
    });

    test("404 — property not found or unauthorized", async () => {
        currentUser = landlordUser;
        mockPropertyFindOne.mockResolvedValue(null);

        const res = await request(app).post("/api/invoices").set(auth()).send(payload);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Property not found/i);
    });

    test("404 — tenant not found in property", async () => {
        currentUser = landlordUser;
        mockPropertyFindOne.mockResolvedValue(mockProperty);
        mockTenantFindOne.mockResolvedValue(null);

        const res = await request(app).post("/api/invoices").set(auth()).send(payload);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Tenant not found/i);
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app).post("/api/invoices").send(payload);
        expect(res.status).toBe(401);
    });
});

// ========== GET /api/invoices ==========

describe("GET /api/invoices — getInvoices", () => {
    test("200 — landlord sees their issued invoices", async () => {
        currentUser = landlordUser;
        mockInvoiceFind.mockReturnValue(mockQuery([baseInvoice]));

        const res = await request(app).get("/api/invoices").set(auth());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(mockInvoiceFind).toHaveBeenCalledWith({ landlordId: LANDLORD_ID });
    });

    test("200 — tenant sees their received invoices", async () => {
        currentUser = tenantUser;
        mockTenantFind.mockResolvedValue([mockTenantRecord]);
        mockInvoiceFind.mockReturnValue(mockQuery([baseInvoice]));

        const res = await request(app).get("/api/invoices").set(auth());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("200 — returns Pending, Paid and Overdue invoices", async () => {
        currentUser = landlordUser;
        mockInvoiceFind.mockReturnValue(
            mockQuery([
                { ...baseInvoice, status: "Pending" },
                { ...baseInvoice, _id: "id2", status: "Paid" },
                { ...baseInvoice, _id: "id3", status: "Overdue" },
            ])
        );

        const res = await request(app).get("/api/invoices").set(auth());

        expect(res.status).toBe(200);
        const statuses = res.body.map((i) => i.status);
        expect(statuses).toContain("Pending");
        expect(statuses).toContain("Paid");
        expect(statuses).toContain("Overdue");
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app).get("/api/invoices");
        expect(res.status).toBe(401);
    });
});

// ========== GET /api/invoices/:id ==========

describe("GET /api/invoices/:id — getInvoiceById", () => {
    test("200 — landlord views their own invoice", async () => {
        currentUser = landlordUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(baseInvoice));

        const res = await request(app).get(`/api/invoices/${INVOICE_ID}`).set(auth());
        expect(res.status).toBe(200);
    });

    test("200 — tenant views invoice assigned to them", async () => {
        currentUser = tenantUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(baseInvoice));
        mockTenantFindById.mockResolvedValue(mockTenantRecord);

        const res = await request(app).get(`/api/invoices/${INVOICE_ID}`).set(auth());
        expect(res.status).toBe(200);
    });

    test("404 — invoice not found", async () => {
        currentUser = landlordUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(null));

        const res = await request(app).get(`/api/invoices/${INVOICE_ID}`).set(auth());
        expect(res.status).toBe(404);
    });

    test("401 — different landlord cannot view invoice", async () => {
        currentUser = {
            ...landlordUser,
            _id: "999999999999999999999999",
            toString: () => "999999999999999999999999",
        };
        mockInvoiceFindById.mockReturnValue(mockQuery(baseInvoice));

        const res = await request(app).get(`/api/invoices/${INVOICE_ID}`).set(auth());
        expect(res.status).toBe(401);
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app).get(`/api/invoices/${INVOICE_ID}`);
        expect(res.status).toBe(401);
    });
});

// ========== PUT /api/invoices/:id/status ==========

describe("PUT /api/invoices/:id/status — updateInvoiceStatus", () => {
    test("200 — Pending → Paid sets paidDate", async () => {
        currentUser = landlordUser;
        const doc = createMockDoc({ ...baseInvoice, status: "Pending", paidDate: null });
        doc.save.mockResolvedValue({ ...doc, status: "Paid", paidDate: new Date() });
        mockInvoiceFindById.mockReturnValue(mockQuery(doc));

        const res = await request(app)
            .put(`/api/invoices/${INVOICE_ID}/status`)
            .set(auth())
            .send({ status: "Paid" });

        expect(res.status).toBe(200);
        expect(doc.status).toBe("Paid");
        expect(doc.paidDate).not.toBeNull();
    });

    test("200 — Paid → Pending clears paidDate", async () => {
        currentUser = landlordUser;
        const doc = createMockDoc({
            ...baseInvoice,
            status: "Paid",
            paidDate: new Date("2026-04-01"),
        });
        doc.save.mockResolvedValue({ ...doc, status: "Pending", paidDate: null });
        mockInvoiceFindById.mockReturnValue(mockQuery(doc));

        const res = await request(app)
            .put(`/api/invoices/${INVOICE_ID}/status`)
            .set(auth())
            .send({ status: "Pending" });

        expect(res.status).toBe(200);
        expect(doc.paidDate).toBeNull();
    });

    test("200 — status can be set to Overdue", async () => {
        currentUser = landlordUser;
        const doc = createMockDoc({ ...baseInvoice, status: "Pending" });
        doc.save.mockResolvedValue({ ...doc, status: "Overdue" });
        mockInvoiceFindById.mockReturnValue(mockQuery(doc));

        const res = await request(app)
            .put(`/api/invoices/${INVOICE_ID}/status`)
            .set(auth())
            .send({ status: "Overdue" });

        expect(res.status).toBe(200);
    });

    test("401 — different landlord cannot update status", async () => {
        currentUser = {
            ...landlordUser,
            _id: "888888888888888888888888",
            toString: () => "888888888888888888888888",
        };
        mockInvoiceFindById.mockReturnValue(mockQuery(createMockDoc(baseInvoice)));

        const res = await request(app)
            .put(`/api/invoices/${INVOICE_ID}/status`)
            .set(auth())
            .send({ status: "Paid" });

        expect(res.status).toBe(401);
    });

    test("404 — invoice not found", async () => {
        currentUser = landlordUser;
        mockInvoiceFindById.mockReturnValue(mockQuery(null));

        const res = await request(app)
            .put(`/api/invoices/${INVOICE_ID}/status`)
            .set(auth())
            .send({ status: "Paid" });

        expect(res.status).toBe(404);
    });

    test("401 — unauthenticated request", async () => {
        const res = await request(app)
            .put(`/api/invoices/${INVOICE_ID}/status`)
            .send({ status: "Paid" });
        expect(res.status).toBe(401);
    });
});

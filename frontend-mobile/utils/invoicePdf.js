import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { getInvoiceById } from "../api/invoice";

const INVOICE_DIRECTORY = `${FileSystem.documentDirectory}invoices/`;

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const formatCurrency = (value = 0) => `NPR ${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
    if (!value) {
        return "N/A";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
};

const sanitizeFileName = (value) =>
    String(value || "invoice")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "invoice";

const buildTimestamp = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");

    return [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        "-",
        pad(now.getHours()),
        pad(now.getMinutes()),
    ].join("");
};

const buildInvoiceFileName = (invoice) => {
    const propertyTitle = invoice?.propertyId?.title || "property";
    return `${sanitizeFileName(propertyTitle)}-invoice-${buildTimestamp()}.pdf`;
};

const getInvoiceReference = (invoice) => {
    if (invoice?.billingMonth && invoice?.billingYear) {
        return `${invoice.billingMonth}/${invoice.billingYear}`;
    }

    if (invoice?._id) {
        return invoice._id.slice(-6).toUpperCase();
    }

    return "N/A";
};

const getPartyLabel = (invoice, key) => {
    const party = invoice?.[key];

    if (!party) {
        return "N/A";
    }

    if (typeof party === "string") {
        return party;
    }

    return party.name || party.title || party.email || "N/A";
};

const getBreakdownRows = (invoice) => {
    const utilities = invoice?.breakdown?.utilities || {};

    return [
        { label: "Base rent", value: invoice?.breakdown?.baseRent || 0 },
        { label: "Electricity", value: utilities.electricity || 0 },
        { label: "Water", value: utilities.water || 0 },
        { label: "Internet", value: utilities.internet || 0 },
        { label: "Gas", value: utilities.gas || 0 },
        { label: "Waste", value: utilities.waste || 0 },
        { label: "Other", value: utilities.other || 0 },
    ].filter((row) => row.value > 0);
};

const buildInvoiceHtml = (invoice) => {
    const breakdownRows = getBreakdownRows(invoice);
    const hasBreakdown = breakdownRows.length > 0;
    const propertyTitle = invoice?.propertyId?.title || "Rentivo Property";

    return `
        <html>
            <head>
                <meta charset="utf-8" />
                <style>
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        margin: 0;
                        padding: 32px;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                        color: #0f172a;
                        background: #f8fafc;
                    }
                    .page {
                        max-width: 820px;
                        margin: 0 auto;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 24px;
                        overflow: hidden;
                    }
                    .hero {
                        padding: 28px 32px;
                        background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
                        color: #ffffff;
                    }
                    .eyebrow {
                        font-size: 12px;
                        letter-spacing: 0.18em;
                        text-transform: uppercase;
                        opacity: 0.8;
                    }
                    .hero h1 {
                        margin: 10px 0 6px;
                        font-size: 34px;
                        line-height: 1.1;
                    }
                    .hero p {
                        margin: 0;
                        font-size: 14px;
                        opacity: 0.9;
                    }
                    .content {
                        padding: 28px 32px 32px;
                    }
                    .summary {
                        display: table;
                        width: 100%;
                        margin-bottom: 22px;
                    }
                    .summary-card {
                        display: table-cell;
                        width: 33.333%;
                        padding-right: 12px;
                    }
                    .summary-card:last-child {
                        padding-right: 0;
                    }
                    .summary-box {
                        border: 1px solid #dbeafe;
                        background: #eff6ff;
                        border-radius: 18px;
                        padding: 16px;
                    }
                    .summary-label {
                        display: block;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #475569;
                        margin-bottom: 8px;
                    }
                    .summary-value {
                        font-size: 19px;
                        font-weight: 700;
                        color: #0f172a;
                    }
                    .grid {
                        display: table;
                        width: 100%;
                        margin-bottom: 24px;
                    }
                    .grid-col {
                        display: table-cell;
                        width: 50%;
                        vertical-align: top;
                    }
                    .grid-col:first-child {
                        padding-right: 12px;
                    }
                    .grid-col:last-child {
                        padding-left: 12px;
                    }
                    .panel {
                        border: 1px solid #e2e8f0;
                        border-radius: 18px;
                        padding: 18px;
                        background: #ffffff;
                    }
                    .panel h2 {
                        margin: 0 0 14px;
                        font-size: 15px;
                        color: #0f172a;
                    }
                    .meta-row {
                        margin-bottom: 10px;
                    }
                    .meta-row:last-child {
                        margin-bottom: 0;
                    }
                    .meta-label {
                        display: block;
                        font-size: 12px;
                        color: #64748b;
                        margin-bottom: 3px;
                    }
                    .meta-value {
                        font-size: 14px;
                        color: #0f172a;
                        font-weight: 600;
                        word-break: break-word;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 6px;
                    }
                    th, td {
                        text-align: left;
                        padding: 12px 0;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 14px;
                    }
                    th {
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #64748b;
                    }
                    td:last-child, th:last-child {
                        text-align: right;
                    }
                    .notes {
                        margin-top: 22px;
                        padding: 18px;
                        border-radius: 18px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                    }
                    .notes h3 {
                        margin: 0 0 8px;
                        font-size: 14px;
                        color: #0f172a;
                    }
                    .notes p {
                        margin: 0;
                        font-size: 14px;
                        line-height: 1.55;
                        color: #334155;
                    }
                    .footer {
                        margin-top: 24px;
                        font-size: 12px;
                        color: #64748b;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="hero">
                        <div class="eyebrow">Rentivo Invoice</div>
                        <h1>${escapeHtml(propertyTitle)}</h1>
                        <p>${escapeHtml(invoice?.type || "Invoice")} for ${escapeHtml(getPartyLabel(invoice, "landlordId"))}</p>
                    </div>

                    <div class="content">
                        <div class="summary">
                            <div class="summary-card">
                                <div class="summary-box">
                                    <span class="summary-label">Amount Due</span>
                                    <span class="summary-value">${escapeHtml(formatCurrency(invoice?.amount))}</span>
                                </div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-box">
                                    <span class="summary-label">Status</span>
                                    <span class="summary-value">${escapeHtml(invoice?.status || "Pending")}</span>
                                </div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-box">
                                    <span class="summary-label">Due Date</span>
                                    <span class="summary-value">${escapeHtml(formatDate(invoice?.dueDate))}</span>
                                </div>
                            </div>
                        </div>

                        <div class="grid">
                            <div class="grid-col">
                                <div class="panel">
                                    <h2>Invoice Details</h2>
                                    <div class="meta-row">
                                        <span class="meta-label">Reference</span>
                                        <span class="meta-value">${escapeHtml(getInvoiceReference(invoice))}</span>
                                    </div>
                                    <div class="meta-row">
                                        <span class="meta-label">Issued On</span>
                                        <span class="meta-value">${escapeHtml(formatDate(invoice?.createdAt))}</span>
                                    </div>
                                    <div class="meta-row">
                                        <span class="meta-label">Paid On</span>
                                        <span class="meta-value">${escapeHtml(formatDate(invoice?.paidDate))}</span>
                                    </div>
                                    <div class="meta-row">
                                        <span class="meta-label">Invoice Type</span>
                                        <span class="meta-value">${escapeHtml(invoice?.type || "N/A")}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="grid-col">
                                <div class="panel">
                                    <h2>Property & Parties</h2>
                                    <div class="meta-row">
                                        <span class="meta-label">Property</span>
                                        <span class="meta-value">${escapeHtml(propertyTitle)}</span>
                                    </div>
                                    <div class="meta-row">
                                        <span class="meta-label">Landlord</span>
                                        <span class="meta-value">${escapeHtml(getPartyLabel(invoice, "landlordId"))}</span>
                                    </div>
                                    <div class="meta-row">
                                        <span class="meta-label">Tenant</span>
                                        <span class="meta-value">${escapeHtml(getPartyLabel(invoice, "tenantId"))}</span>
                                    </div>
                                    <div class="meta-row">
                                        <span class="meta-label">Billing Period</span>
                                        <span class="meta-value">${escapeHtml(
                                            invoice?.billingMonth && invoice?.billingYear
                                                ? `${invoice.billingMonth}/${invoice.billingYear}`
                                                : "Not specified"
                                        )}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="panel">
                            <h2>Charge Breakdown</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${
                                        hasBreakdown
                                            ? breakdownRows
                                                .map(
                                                    (row) => `
                                                        <tr>
                                                            <td>${escapeHtml(row.label)}</td>
                                                            <td>${escapeHtml(formatCurrency(row.value))}</td>
                                                        </tr>
                                                    `
                                                )
                                                .join("")
                                            : `
                                                <tr>
                                                    <td>${escapeHtml(invoice?.description || invoice?.type || "Invoice charge")}</td>
                                                    <td>${escapeHtml(formatCurrency(invoice?.amount))}</td>
                                                </tr>
                                            `
                                    }
                                    ${
                                        hasBreakdown
                                            ? `
                                                <tr>
                                                    <td><strong>Total utilities</strong></td>
                                                    <td><strong>${escapeHtml(formatCurrency(invoice?.breakdown?.totalUtilities || 0))}</strong></td>
                                                </tr>
                                            `
                                            : ""
                                    }
                                    <tr>
                                        <td><strong>Total amount</strong></td>
                                        <td><strong>${escapeHtml(formatCurrency(invoice?.amount))}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        ${
                            invoice?.description
                                ? `
                                    <div class="notes">
                                        <h3>Notes</h3>
                                        <p>${escapeHtml(invoice.description)}</p>
                                    </div>
                                `
                                : ""
                        }

                        <div class="footer">
                            Generated from Rentivo on ${escapeHtml(formatDate(new Date().toISOString()))}
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `;
};

const ensureInvoicesDirectoryAsync = async () => {
    const directoryInfo = await FileSystem.getInfoAsync(INVOICE_DIRECTORY);

    if (!directoryInfo.exists) {
        await FileSystem.makeDirectoryAsync(INVOICE_DIRECTORY, { intermediates: true });
    }
};

const resolveInvoiceDetails = async (invoice) => {
    if (!invoice?._id) {
        return invoice;
    }

    try {
        const response = await getInvoiceById(invoice._id);
        return response?.invoice || invoice;
    } catch (_error) {
        return invoice;
    }
};

export const shareInvoicePdfAsync = async (invoice) => {
    const invoiceDetails = await resolveInvoiceDetails(invoice);
    const html = buildInvoiceHtml(invoiceDetails);
    const fileName = buildInvoiceFileName(invoiceDetails);

    if (Platform.OS === "web") {
        await Print.printAsync({ html });
        return {
            fileName,
            openedPrintDialog: true,
            shared: false,
        };
    }

    const printResult = await Print.printToFileAsync({ html });

    await ensureInvoicesDirectoryAsync();

    const targetUri = `${INVOICE_DIRECTORY}${fileName}`;
    const targetInfo = await FileSystem.getInfoAsync(targetUri);

    if (targetInfo.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }

    await FileSystem.copyAsync({
        from: printResult.uri,
        to: targetUri,
    });

    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
        await Sharing.shareAsync(targetUri, {
            dialogTitle: "Save or share invoice PDF",
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
        });
    }

    return {
        fileName,
        localUri: targetUri,
        shared: sharingAvailable,
    };
};

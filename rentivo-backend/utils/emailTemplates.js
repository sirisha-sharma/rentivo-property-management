/**
 * Email template builder for notifications.
 * Keeps design consistent across notification types while allowing
 * type-specific subject lines and headings.
 */

const TYPE_META = {
    maintenance: {
        subject: "Maintenance Update - Rentivo",
        heading: "Maintenance Notification",
        accent: "#f59e0b", // amber
    },
    invoice: {
        subject: "Invoice Update - Rentivo",
        heading: "Invoice Notification",
        accent: "#2563eb", // blue
    },
    document: {
        subject: "New Document - Rentivo",
        heading: "Document Notification",
        accent: "#10b981", // green
    },
    tenant: {
        subject: "Tenancy Update - Rentivo",
        heading: "Tenancy Notification",
        accent: "#8b5cf6", // violet
    },
    general: {
        subject: "Notification - Rentivo",
        heading: "Notification",
        accent: "#6b7280", // gray
    },
};

export const buildEmailTemplate = ({ name, type, message }) => {
    const meta = TYPE_META[type] || TYPE_META.general;
    const greeting = name ? `Hi ${name},` : "Hello,";

    const text = `${greeting}\n\n${message}\n\n— Rentivo Property Management`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif; color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color:${meta.accent}; padding:20px 24px; color:#ffffff;">
              <h1 style="margin:0; font-size:20px; font-weight:600;">Rentivo</h1>
              <p style="margin:4px 0 0 0; font-size:13px; opacity:0.9;">${meta.heading}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px 0; font-size:15px;">${greeting}</p>
              <p style="margin:0 0 20px 0; font-size:15px; line-height:1.5; color:#374151;">${escapeHtml(message)}</p>
              <p style="margin:0; font-size:13px; color:#6b7280;">
                You can view more details by opening the Rentivo app.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px; border-top:1px solid #e5e7eb; background-color:#f9fafb;">
              <p style="margin:0; font-size:12px; color:#9ca3af; text-align:center;">
                This is an automated notification from Rentivo Property Management.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { subject: meta.subject, html, text };
};

// Basic HTML escape so messages can't break the template or inject markup
const escapeHtml = (str = "") =>
    String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

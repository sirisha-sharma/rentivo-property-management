import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { buildEmailTemplate } from "./emailTemplates.js";

dotenv.config();

let transporter = null;

/**
 * Lazily create (and cache) the nodemailer transporter.
 * Supports standard SMTP via env vars. Works with Gmail (App Password),
 * Brevo/Sendinblue, Mailtrap, SendGrid SMTP, etc.
 */
const getTransporter = () => {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    // Gmail App Passwords are displayed with spaces (e.g. "mhnw aais gpct viyj")
    // but the spaces are purely cosmetic — the actual password has no spaces.
    // Strip any whitespace so users can paste the password verbatim from Gmail.
    const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

    if (!host || !user || !pass) {
        console.warn(
            "[emailService] SMTP credentials not fully configured. Emails will be skipped.",
            { hasHost: !!host, hasUser: !!user, hasPass: !!pass }
        );
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: { user, pass },
    });

    console.log(
        `[emailService] Transporter initialized: ${user} via ${host}:${port}`
    );

    return transporter;
};

/**
 * Send an email notification.
 * Silent-fail by design: notification creation should never break because
 * email sending failed. Errors are logged instead of thrown.
 *
 * @param {Object} params
 * @param {string} params.to       - recipient email address
 * @param {string} params.name     - recipient name (for greeting)
 * @param {string} params.type     - notification type (maintenance|invoice|document|tenant|general)
 * @param {string} params.message  - notification message body
 */
export const sendNotificationEmail = async ({ to, name, type, message }) => {
    try {
        if (!to) {
            console.warn("[emailService] No recipient email provided. Skipping.");
            return;
        }

        const tx = getTransporter();
        if (!tx) return;

        const { subject, html, text } = buildEmailTemplate({ name, type, message });

        const fromName = process.env.SMTP_FROM_NAME || "Rentivo";
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

        await tx.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
        });

        console.log(`[emailService] Email sent to ${to} (${type})`);
    } catch (error) {
        console.error("[emailService] Failed to send email:", error.message);
    }
};

/**
 * Send an email verification link to a newly registered user.
 *
 * @param {Object} params
 * @param {string} params.to               - recipient email address
 * @param {string} params.name             - recipient name
 * @param {string} params.verificationUrl  - full URL the user must click
 */
export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
    try {
        if (!to) return;
        const tx = getTransporter();
        if (!tx) return;

        const greeting = name ? `Hi ${name},` : "Hello,";
        const fromName = process.env.SMTP_FROM_NAME || "Rentivo";
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email - Rentivo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <tr>
          <td style="background-color:#2563eb;padding:20px 24px;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;font-weight:600;">Rentivo</h1>
            <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Email Verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;font-size:15px;">${greeting}</p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;color:#374151;">
              Thank you for registering with Rentivo. Please verify your email address by clicking the button below.
            </p>
            <a href="${verificationUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Verify Email Address
            </a>
            <p style="margin:20px 0 0 0;font-size:13px;color:#6b7280;">
              Or copy this link into your browser:<br>
              <a href="${verificationUrl}" style="color:#2563eb;word-break:break-all;">${verificationUrl}</a>
            </p>
            <p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;">This link expires in 24 hours.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              If you did not create a Rentivo account, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const text = `${greeting}\n\nPlease verify your email address by visiting:\n${verificationUrl}\n\nThis link expires in 24 hours.\n\n— Rentivo`;

        await tx.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject: "Verify your email - Rentivo",
            text,
            html,
        });

        console.log(`[emailService] Verification email sent to ${to}`);
    } catch (error) {
        console.error("[emailService] Failed to send verification email:", error.message);
    }
};

/**
 * Send a password reset code to the user.
 * The raw token is displayed prominently so the user can copy it into the app.
 *
 * @param {Object} params
 * @param {string} params.to        - recipient email address
 * @param {string} params.name      - recipient name
 * @param {string} params.resetToken - raw reset token to display in the email
 */
export const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
    try {
        if (!to) return;
        const tx = getTransporter();
        if (!tx) return;

        const greeting = name ? `Hi ${name},` : "Hello,";
        const fromName = process.env.SMTP_FROM_NAME || "Rentivo";
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password - Rentivo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <tr>
          <td style="background-color:#2563eb;padding:20px 24px;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;font-weight:600;">Rentivo</h1>
            <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Password Reset</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;font-size:15px;">${greeting}</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;color:#374151;">
              We received a request to reset your Rentivo password. Copy the reset code below and paste it into the app.
            </p>
            <div style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;margin-bottom:16px;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Your reset code</p>
              <p style="margin:0;font-size:13px;font-family:monospace;color:#0f172a;word-break:break-all;">${resetToken}</p>
            </div>
            <p style="margin:0;font-size:13px;color:#6b7280;">This code expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email — your password will not change.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              This is an automated message from Rentivo Property Management. Do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const text = `${greeting}\n\nYour Rentivo password reset code is:\n\n${resetToken}\n\nThis code expires in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\n— Rentivo`;

        await tx.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject: "Reset your password - Rentivo",
            text,
            html,
        });

        console.log(`[emailService] Password reset email sent to ${to}`);
    } catch (error) {
        console.error("[emailService] Failed to send password reset email:", error.message);
    }
};

/**
 * Send a 2FA OTP code to the user.
 *
 * @param {Object} params
 * @param {string} params.to   - recipient email address
 * @param {string} params.name - recipient name
 * @param {string} params.code - 6-digit OTP code
 */
export const send2FAEmail = async ({ to, name, code }) => {
    try {
        if (!to) return;
        const tx = getTransporter();
        if (!tx) return;

        const greeting = name ? `Hi ${name},` : "Hello,";
        const fromName = process.env.SMTP_FROM_NAME || "Rentivo";
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your verification code - Rentivo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <tr>
          <td style="background-color:#2563eb;padding:20px 24px;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;font-weight:600;">Rentivo</h1>
            <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Two-Factor Authentication</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;font-size:15px;">${greeting}</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;color:#374151;">
              Enter the code below to complete your sign-in. This code expires in <strong>10 minutes</strong>.
            </p>
            <div style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Verification code</p>
              <p style="margin:0;font-size:32px;font-weight:700;font-family:monospace;color:#0f172a;letter-spacing:0.3em;">${code}</p>
            </div>
            <p style="margin:0;font-size:13px;color:#6b7280;">If you did not attempt to sign in, please ignore this email. Your account is safe.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              This is an automated message from Rentivo Property Management. Do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const text = `${greeting}\n\nYour Rentivo verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not attempt to sign in, please ignore this email.\n\n— Rentivo`;

        await tx.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject: "Your Rentivo verification code",
            text,
            html,
        });

        console.log(`[emailService] 2FA email sent to ${to}`);
    } catch (error) {
        console.error("[emailService] Failed to send 2FA email:", error.message);
    }
};

/**
 * Verify SMTP connection (useful at startup for debugging).
 */
export const verifyEmailConnection = async () => {
    const tx = getTransporter();
    if (!tx) {
        console.log("[emailService] SMTP not configured, skipping verification");
        return false;
    }
    try {
        await tx.verify();
        console.log("[emailService] SMTP connection verified");
        return true;
    } catch (error) {
        console.error("[emailService] SMTP verification failed:", error.message);
        return false;
    }
};

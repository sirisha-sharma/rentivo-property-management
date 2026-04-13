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
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn(
            "[emailService] SMTP credentials not fully configured. Emails will be skipped."
        );
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: { user, pass },
    });

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

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDatabase from "./config/database.js";
import { startScheduler as startInvoiceScheduler } from "./jobs/invoiceScheduler.js";
import { startSubscriptionScheduler } from "./jobs/subscriptionScheduler.js";
import { verifyEmailConnection } from "./utils/emailService.js";
import authRoutes from "./routes/authRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import utilityRoutes from "./routes/utilityRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

// Connect to database
connectDatabase();

// Start automated schedulers (invoice generation, overdue updates)
startInvoiceScheduler();
startSubscriptionScheduler();

// Verify SMTP connection for email notifications (non-blocking)
verifyEmailConnection();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/utilities", utilityRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Serve public files (payment success/failure pages)
app.use(express.static("public", { extensions: ["html"] }));

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Rentivo API is running..." });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

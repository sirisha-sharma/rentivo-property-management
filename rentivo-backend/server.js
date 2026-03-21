import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDatabase from "./config/database.js";
import { startScheduler } from "./jobs/invoiceScheduler.js";
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

dotenv.config();

// Connect to database
connectDatabase();

// Start automated schedulers (invoice generation, overdue updates)
startScheduler();

const app = express();

// Middleware
app.use(express.json());
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

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Serve public files (payment success/failure pages)
app.use(express.static("public"));

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Rentivo API is running..." });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
export default {
    testEnvironment: "node",
    transform: {},
    testMatch: ["**/tests/integration/**/*.test.js"],
    testTimeout: 30000,
    collectCoverageFrom: [
        "controllers/authController.js",
        "controllers/invoiceController.js",
        "controllers/propertyController.js",
        "controllers/tenantController.js",
        "controllers/maintenanceController.js",
        "controllers/notificationController.js",
        "middleware/authMiddleware.js",
    ],
};

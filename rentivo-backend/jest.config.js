export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/unit/**/*.test.js", "**/tests/*.test.js"],
  collectCoverageFrom: [
    "utils/utilitySplit.js",
    "controllers/invoiceController.js",
    "controllers/paymentController.js",
    "controllers/authController.js",
    "middleware/authMiddleware.js",
    "models/invoiceModel.js",
    "models/paymentModel.js",
    "models/userModel.js",
    "models/tenantModel.js",
  ],
};

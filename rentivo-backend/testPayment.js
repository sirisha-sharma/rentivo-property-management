import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = "http://localhost:3000/api";

// Test credentials (from createTestUser.js)
const TEST_USER = {
    email: "test@test.com",
    password: "password123"
};

async function testPaymentInitiation() {
    try {
        console.log("\n=== Testing Payment Gateway Integration ===\n");

        // Step 1: Login to get token
        console.log("1. Logging in...");
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
        const token = loginResponse.data.token;
        const userId = loginResponse.data._id;
        console.log(`   ✓ Login successful. User ID: ${userId}`);

        // Step 2: Get payment config
        console.log("\n2. Fetching payment gateway config...");
        const configResponse = await axios.get(`${API_BASE_URL}/payments/config`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`   ✓ Available gateways:`, configResponse.data.availableGateways);
        console.log(`   ✓ Default gateway:`, configResponse.data.defaultGateway);

        // Step 3: Find or create a test invoice
        console.log("\n3. Looking for an invoice to pay...");
        const invoicesResponse = await axios.get(`${API_BASE_URL}/invoices`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (invoicesResponse.data.length === 0) {
            console.log("   ⚠️  No invoices found. You need to create a property, tenant, and invoice first.");
            console.log("   For now, skipping payment initiation test.");
            return;
        }

        const testInvoice = invoicesResponse.data[0];
        console.log(`   ✓ Found invoice: ${testInvoice.invoiceNumber}`);
        console.log(`     Amount: Rs. ${testInvoice.amount}`);
        console.log(`     Status: ${testInvoice.status}`);

        // Step 4: Test eSewa payment initiation
        console.log("\n4. Testing eSewa payment initiation...");
        try {
            const esewaResponse = await axios.post(
                `${API_BASE_URL}/payments/initiate`,
                {
                    invoiceId: testInvoice._id,
                    gateway: "esewa"
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            console.log(`   ✓ eSewa payment initiated successfully`);
            console.log(`     Payment ID: ${esewaResponse.data.payment.paymentId}`);
            console.log(`     Transaction ID: ${esewaResponse.data.payment.transactionId}`);
            console.log(`     Gateway Data:`, JSON.stringify(esewaResponse.data.gatewayData, null, 2));
        } catch (error) {
            console.log(`   ✗ eSewa initiation failed:`, error.response?.data?.message || error.message);
        }

        // Step 5: Test Khalti payment initiation
        console.log("\n5. Testing Khalti payment initiation...");
        try {
            const khaltiResponse = await axios.post(
                `${API_BASE_URL}/payments/initiate`,
                {
                    invoiceId: testInvoice._id,
                    gateway: "khalti"
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            console.log(`   ✓ Khalti payment initiated successfully`);
            console.log(`     Payment ID: ${khaltiResponse.data.payment.paymentId}`);
            console.log(`     Transaction ID: ${khaltiResponse.data.payment.transactionId}`);
            console.log(`     Gateway Data:`, JSON.stringify(khaltiResponse.data.gatewayData, null, 2));
        } catch (error) {
            console.log(`   ✗ Khalti initiation failed:`, error.response?.data?.message || error.message);
        }

        // Step 6: Check payment history
        console.log("\n6. Checking payment history...");
        const historyResponse = await axios.get(`${API_BASE_URL}/payments/history`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`   ✓ Found ${historyResponse.data.count} payment(s)`);
        historyResponse.data.payments.forEach((payment, index) => {
            console.log(`     ${index + 1}. Gateway: ${payment.gateway}, Status: ${payment.status}, Amount: Rs. ${payment.amount}`);
        });

        console.log("\n=== Test Complete ===\n");

    } catch (error) {
        console.error("\n❌ Test failed:", error.response?.data || error.message);
    }
}

testPaymentInitiation();

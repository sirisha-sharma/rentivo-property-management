import axios from "axios";

async function quickTest() {
    try {
        // Login
        const login = await axios.post("http://localhost:3000/api/auth/login", {
            email: "test@test.com",
            password: "password123"
        });
        
        console.log("✓ Login successful");
        const token = login.data.token;
        
        // Test payment config
        const config = await axios.get("http://localhost:3000/api/payments/config", {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("✓ Available gateways:", config.data.availableGateways);
        
        // Test eSewa init with dummy invoice (will fail but should show error)
        try {
            const payment = await axios.post("http://localhost:3000/api/payments/initiate", 
                {
                    invoiceId: "507f1f77bcf86cd799439011",
                    gateway: "esewa"
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            console.log("eSewa response:", payment.data);
        } catch (error) {
            console.log("Expected error (no invoice):", error.response?.data?.message);
        }
        
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

quickTest();

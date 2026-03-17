import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = "http://localhost:3000/api";

async function setupTestData() {
    try {
        console.log("\n=== Setting up test data for payment testing ===\n");

        // Step 1: Create landlord
        console.log("1. Creating landlord user...");
        let landlordToken, landlordId;
        try {
            const landlordRegister = await axios.post(`${API_BASE_URL}/auth/register`, {
                name: "Test Landlord",
                email: "landlord@test.com",
                password: "password123",
                phone: "9800000001",
                role: "landlord"
            });
            landlordToken = landlordRegister.data.token;
            landlordId = landlordRegister.data._id;
            console.log(`   ✓ Landlord created: ${landlordRegister.data.email}`);
        } catch (error) {
            if (error.response?.data?.message === "User already exists") {
                console.log("   ℹ️  Landlord already exists, logging in...");
                const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                    email: "landlord@test.com",
                    password: "password123"
                });
                landlordToken = loginResponse.data.token;
                landlordId = loginResponse.data._id;
                console.log(`   ✓ Landlord logged in`);
            } else {
                throw error;
            }
        }

        // Step 2: Create property
        console.log("\n2. Creating property...");
        const propertyResponse = await axios.post(
            `${API_BASE_URL}/properties`,
            {
                title: "Test Apartment",
                address: "Kathmandu, Nepal",
                type: "Apartment",
                units: 1,
                splitMethod: "equal",
                amenities: ["WiFi", "Parking"]
            },
            {
                headers: { Authorization: `Bearer ${landlordToken}` }
            }
        );
        const propertyId = propertyResponse.data._id;
        console.log(`   ✓ Property created: ${propertyResponse.data.title}`);

        // Step 3: Create tenant record
        console.log("\n3. Creating tenant invitation...");
        const tenantResponse = await axios.post(
            `${API_BASE_URL}/tenants`,
            {
                propertyId: propertyId,
                email: "test@test.com",
                roomNumber: "101",
                rentAmount: 15000,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            {
                headers: { Authorization: `Bearer ${landlordToken}` }
            }
        );
        const tenantId = tenantResponse.data._id;
        console.log(`   ✓ Tenant invited: ${tenantResponse.data.email}`);

        // Step 4: Accept invitation as tenant
        console.log("\n4. Accepting tenant invitation...");
        const tenantLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: "test@test.com",
            password: "password123"
        });
        const tenantToken = tenantLoginResponse.data.token;

        await axios.put(
            `${API_BASE_URL}/tenants/${tenantId}/respond`,
            { action: "accept" },
            {
                headers: { Authorization: `Bearer ${tenantToken}` }
            }
        );
        console.log(`   ✓ Tenant invitation accepted`);

        // Step 5: Create invoice
        console.log("\n5. Creating invoice...");
        const invoiceResponse = await axios.post(
            `${API_BASE_URL}/invoices`,
            {
                tenantId: tenantId,
                propertyId: propertyId,
                amount: 15000,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                description: "Monthly Rent - Test"
            },
            {
                headers: { Authorization: `Bearer ${landlordToken}` }
            }
        );
        const invoiceId = invoiceResponse.data._id;
        console.log(`   ✓ Invoice created: ${invoiceResponse.data.invoiceNumber}`);
        console.log(`     Amount: Rs. ${invoiceResponse.data.amount}`);

        // Summary
        console.log("\n=== Test Data Setup Complete! ===\n");
        console.log("Test Credentials:");
        console.log(`  Landlord: landlord@test.com / password123`);
        console.log(`  Tenant: test@test.com / password123`);
        console.log(`\nTest Data IDs:`);
        console.log(`  Property ID: ${propertyId}`);
        console.log(`  Tenant ID: ${tenantId}`);
        console.log(`  Invoice ID: ${invoiceId}`);
        console.log(`\nYou can now test payment with this invoice ID!\n`);

    } catch (error) {
        console.error("\n❌ Setup failed:", error.response?.data || error.message);
    }
}

setupTestData();

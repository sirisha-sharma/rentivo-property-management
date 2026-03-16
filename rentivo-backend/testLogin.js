import mongoose from "mongoose";
import User from "./models/userModel.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

async function testLogin() {
  const testEmail = "test@test.com";
  const testPassword = "password123";

  try {
    console.log("\n=== Testing Login ===");
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}\n`);

    // Step 1: Find user
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log("❌ User NOT found in database");
      console.log("\nAll users:");
      const allUsers = await User.find({});
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.role})`);
      });
      mongoose.connection.close();
      return;
    }

    console.log("✓ User found in database");
    console.log(`  ID: ${user._id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Password hash: ${user.password.substring(0, 30)}...`);

    // Step 2: Test password comparison
    console.log("\n=== Testing Password ===");
    const isMatch = await bcrypt.compare(testPassword, user.password);

    if (isMatch) {
      console.log("✓ Password matches!");
    } else {
      console.log("❌ Password does NOT match");

      // Test if password is stored in plain text (shouldn't be)
      if (user.password === testPassword) {
        console.log("⚠️  WARNING: Password is stored in plain text!");
      }
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    mongoose.connection.close();
  }
}

testLogin();

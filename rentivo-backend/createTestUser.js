import mongoose from "mongoose";
import User from "./models/userModel.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Test user credentials
const testUser = {
  name: "Test User",
  email: "test@test.com",
  password: "password123",
  phone: "9800000000",
  role: "tenant" // or "landlord"
};

async function createUser() {
  try {
    // Check if user already exists
    const exists = await User.findOne({ email: testUser.email.toLowerCase() });
    if (exists) {
      console.log(`\n✗ User already exists with email: ${testUser.email}`);
      console.log("Deleting existing user and creating new one...\n");
      await User.deleteOne({ email: testUser.email.toLowerCase() });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testUser.password, salt);

    // Create user
    const user = await User.create({
      name: testUser.name,
      email: testUser.email.toLowerCase(),
      password: hashedPassword,
      phone: testUser.phone,
      role: testUser.role,
    });

    console.log("✓ Test user created successfully!");
    console.log("\nLogin credentials:");
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Password: ${testUser.password}`);
    console.log(`  Role: ${testUser.role}`);

    mongoose.connection.close();
  } catch (error) {
    console.error("Error creating user:", error);
    mongoose.connection.close();
  }
}

createUser();

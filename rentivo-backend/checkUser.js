import mongoose from "mongoose";
import User from "./models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Check user - Replace with your email
const checkEmail = "your.email@example.com";

User.findOne({ email: checkEmail.toLowerCase() })
  .then((user) => {
    if (user) {
      console.log("\n✓ User found:");
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Password Hash: ${user.password.substring(0, 20)}...`);
    } else {
      console.log(`\n✗ No user found with email: ${checkEmail}`);
      console.log("\nAll users in database:");
      User.find().then((users) => {
        users.forEach((u) => {
          console.log(`  - ${u.email} (${u.role})`);
        });
        mongoose.connection.close();
      });
    }
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.connection.close();
  });

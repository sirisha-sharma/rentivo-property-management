import mongoose from "mongoose";

// Core module for database features.

const connectDatabase = async () => {
  try {
    console.log("Attempting to connect to:", process.env.MONGO_URI);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDatabase;

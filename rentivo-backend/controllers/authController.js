import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    // Trim and lowercase email for consistent storage
    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email: trimmedEmail,
      password: hashedPassword,
      phone,
      role: role || "tenant",
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login a user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Trim and lowercase email for consistent lookup
    const trimmedEmail = email.trim().toLowerCase();

    // Check for user
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      console.log(`Login failed: No user found with email ${trimmedEmail}`);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      console.log(`Login failed: Incorrect password for email ${trimmedEmail}`);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Successful login
    console.log(`Login successful for user: ${user.email}`);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, loginUser };

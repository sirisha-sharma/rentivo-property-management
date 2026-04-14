import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/emailService.js";

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

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token (raw sent in email, hashed stored in DB)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await User.create({
      name,
      email: trimmedEmail,
      password: hashedPassword,
      phone,
      role: role || "tenant",
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const backendUrl =
      process.env.BACKEND_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const verificationUrl = `${backendUrl}/api/auth/verify-email/${rawToken}`;

    await sendVerificationEmail({ to: trimmedEmail, name, verificationUrl });

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login a user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        needsVerification: true,
        email: user.email,
      });
    }

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

// Verify email via token link (opened in browser from email)
const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Failed - Rentivo</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);}
    .card{background:white;padding:40px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.1);text-align:center;max-width:400px;}
    .icon{width:80px;height:80px;background:#EF4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
    .x{color:white;font-size:40px;font-weight:bold;line-height:80px;}
    h1{color:#0F172A;font-size:24px;margin-bottom:10px;}
    p{color:#64748B;font-size:16px;line-height:1.5;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"><div class="x">✕</div></div>
    <h1>Verification Failed</h1>
    <p>This verification link is invalid or has expired. Please request a new verification email from the Rentivo app.</p>
  </div>
</body>
</html>`);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verified - Rentivo</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
    .card{background:white;padding:40px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.1);text-align:center;max-width:400px;}
    .icon{width:80px;height:80px;background:#10B981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
    .check{color:white;font-size:40px;font-weight:bold;line-height:80px;}
    h1{color:#0F172A;font-size:24px;margin-bottom:10px;}
    p{color:#64748B;font-size:16px;line-height:1.5;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"><div class="check">✓</div></div>
    <h1>Email Verified!</h1>
    <p>Your email has been verified successfully. You can now open the Rentivo app and sign in.</p>
  </div>
</body>
</html>`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always return the same message to avoid revealing whether an email is registered
    if (!user) {
      return res.json({
        message:
          "If that email is registered and unverified, a new verification link has been sent.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "This email is already verified." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const backendUrl =
      process.env.BACKEND_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const verificationUrl = `${backendUrl}/api/auth/verify-email/${rawToken}`;

    await sendVerificationEmail({ to: user.email, name: user.name, verificationUrl });

    res.json({
      message:
        "If that email is registered and unverified, a new verification link has been sent.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send a password reset code to the user's email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always respond the same way — don't reveal if the email is registered
    if (!user) {
      return res.json({
        message: "If that email is registered, a password reset code has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail({ to: user.email, name: user.name, resetToken: rawToken });

    res.json({
      message: "If that email is registered, a password reset code has been sent.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password using the code from email
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Reset code and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset code is invalid or has expired. Please request a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, loginUser, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword };

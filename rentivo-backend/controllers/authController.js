import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail, send2FAEmail } from "../utils/emailService.js";

// Shared auth constraints used by register/login validation paths.
const REGISTRATION_ROLES = new Set(["landlord", "tenant"]);
const LOGIN_SELECTOR_ROLES = new Set(["landlord", "tenant"]);

const normalizeRole = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const formatRoleLabel = (value) => {
  const normalizedRole = normalizeRole(value);
  if (!normalizedRole) return "the correct role";
  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Raw token goes in the email link, hashed version is stored so we never keep plaintext tokens in the DB
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const normalizedRole = normalizeRole(role) || "tenant";

    if (!REGISTRATION_ROLES.has(normalizedRole)) {
      return res.status(400).json({
        message: "Only landlord and tenant accounts can be registered here.",
      });
    }

    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await User.create({
      name,
      email: trimmedEmail,
      password: hashedPassword,
      phone,
      role: normalizedRole,
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

// If 2FA is enabled, we pause login here and send an OTP instead of issuing a token immediately
const loginUser = async (req, res) => {
  try {
    const { email, password, selectedRole } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const normalizedSelectedRole = normalizeRole(selectedRole);
    if (
      normalizedSelectedRole &&
      !LOGIN_SELECTOR_ROLES.has(normalizedSelectedRole)
    ) {
      return res.status(400).json({
        message: "Please choose either landlord or tenant before logging in.",
      });
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

    if (user.isActive === false) {
      return res.status(403).json({
        message:
          "This account has been disabled by an administrator. Please contact support.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        needsVerification: true,
        email: user.email,
      });
    }

    if (
      user.role !== "admin" &&
      normalizedSelectedRole &&
      user.role !== normalizedSelectedRole
    ) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please select ${formatRoleLabel(
          user.role
        )} to continue.`,
        code: "ROLE_MISMATCH",
        actualRole: user.role,
      });
    }

    if (user.is2faEnabled) {
      const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = crypto.createHash("sha256").update(rawCode).digest("hex");
      user.twoFactorCode = hashedCode;
      user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await send2FAEmail({ to: user.email, name: user.name, code: rawCode });

      return res.json({
        needs2FA: true,
        userId: user._id,
        message: "A verification code has been sent to your email.",
      });
    }

    console.log(`Login successful for user: ${user.email}`);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is2faEnabled: user.is2faEnabled,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Returns HTML directly since users open this in a browser, not through the app
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

// Returns the same message whether the email exists or not, to avoid leaking account info
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

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

// Responds identically whether the email is registered or not, to avoid account enumeration
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.json({
        message: "If that email is registered, a password reset code has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // expires in 1 hour
    await user.save();

    await sendPasswordResetEmail({ to: user.email, name: user.name, resetToken: rawToken });

    res.json({
      message: "If that email is registered, a password reset code has been sent.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

// Clears the OTP after use so it can't be replayed
const verify2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "User ID and verification code are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "Invalid verification attempt" });
    }

    if (!user.twoFactorCode || !user.twoFactorExpires) {
      return res.status(400).json({ message: "No verification code was requested" });
    }

    if (user.twoFactorExpires < Date.now()) {
      return res.status(400).json({ message: "Verification code has expired. Please sign in again." });
    }

    const hashedCode = crypto.createHash("sha256").update(code.trim()).digest("hex");
    if (hashedCode !== user.twoFactorCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    console.log(`2FA verified for user: ${user.email}`);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is2faEnabled: user.is2faEnabled,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggle2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.is2faEnabled = !user.is2faEnabled;
    await user.save();

    res.json({
      is2faEnabled: user.is2faEnabled,
      message: `Two-factor authentication has been ${user.is2faEnabled ? "enabled" : "disabled"}.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, loginUser, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, verify2FA, toggle2FA };

import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ message: "Not authorized" });
            }

            if (req.user.isActive === false) {
                return res.status(403).json({
                    message: "This account has been disabled. Please contact the administrator.",
                    code: "ACCOUNT_DEACTIVATED",
                });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: "Not authorized" });
        }
    }

    if (!token) {
        res.status(401).json({ message: "Not authorized, no token" });
    }
};

export const requireAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access is required for this action.",
            code: "ADMIN_ONLY",
        });
    }

    return next();
};

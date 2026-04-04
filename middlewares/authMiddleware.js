const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // Detect admin routes: /api/admin/* OR admin sub-routes like /api/orders/admin/*
  const isAdminRoute = req.originalUrl.startsWith("/api/admin") || req.originalUrl.includes("/admin/");
  const isAuthMeRoute = req.originalUrl.startsWith("/api/auth/me");
  let token = null;

  // 1. Bearer token from header (highest priority)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  // 2. Cookie-based token selection — STRICT separation
  else if (isAdminRoute) {
    // Admin API routes: ONLY admin_token, no fallback
    token = req.cookies.admin_token || null;
  } else if (isAuthMeRoute) {
    // /api/auth/me serves both sides — pick the right one based on Referer
    const referer = req.headers.referer || "";
    if (referer.includes("/admin/")) {
      token = req.cookies.admin_token || null;
    } else {
      token = req.cookies.user_token || null;
    }
  } else {
    // All other routes (user APIs): ONLY user_token, no admin fallback
    token = req.cookies.user_token || null;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized. Please login." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found. Please login again." });
    }

    if (user.isBlocked) {
      // Clear ALL session cookies when blocked
      res.clearCookie("user_token", { path: "/" });
      res.clearCookie("admin_token", { path: "/" });
      res.clearCookie("user_role", { path: "/" });
      res.clearCookie("admin_role", { path: "/" });
      res.clearCookie("role", { path: "/" });
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    // Set req.admin for admins, req.user for users
    if (decoded.role === "admin") {
      req.admin = { ...decoded, _id: decoded.id, ...user.toObject() };
    } 
    
    // Always provide req.user for backward compatibility on shared logic if needed,
    // but adminMiddleware will now strictly check req.admin.
    req.user = user;
    
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token. Please login again." });
  }
};

module.exports = authMiddleware;

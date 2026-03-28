const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith("Bearer "))
    ? authHeader.split(" ")[1]
    : req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    console.log("USER:", req.user);

    if (req.user && req.user.isBlocked) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;

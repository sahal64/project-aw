const adminMiddleware = (req, res, next) => {
  if (req.admin && req.admin.role === "admin") {
    return next();
  }

  return res.status(403).json({
    message: "Unauthorized admin access"
  });
};

module.exports = adminMiddleware;

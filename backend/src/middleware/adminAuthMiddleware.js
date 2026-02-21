const jwt = require("jsonwebtoken");

const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "A123B456cdef1234567"
    );

    // Verify it's an admin token
    if (decoded.userType !== 'admin') {
      return res.status(403).json({ message: "Invalid token type. Admin access required." });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.userType = decoded.userType;
    next(); // continue
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyAdminToken;


import { requireAuth } from "./requireAuth.js";

/**
 * Wraps requireAuth and then enforces ADMIN role.
 */
export const requireAdmin = (req, res, next) => {
  // ensure user decoded
  return requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
};

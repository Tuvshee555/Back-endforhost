import { requireAuth } from "./requireAuth.js";
import { prisma } from "../prismaClient.js";

/**
 * Wraps requireAuth and then enforces ADMIN role.
 *
 * The role is re-checked against the database (not just read from the JWT)
 * so that a demoted / revoked admin loses access immediately, instead of
 * keeping ADMIN rights until their long-lived token expires.
 */
export const requireAdmin = (req, res, next) => {
  return requireAuth(req, res, async (err) => {
    if (err) return next(err);

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Trust the database as the source of truth for the rest of the request.
      req.user.role = user.role;
      next();
    } catch (checkErr) {
      console.error("requireAdmin DB check failed:", checkErr?.message || checkErr);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  });
};

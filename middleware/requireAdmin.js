import { requireAuth } from "./requireAuth.js";
import { prisma } from "../prismaClient.js";

// Short-lived role cache so an admin dashboard (which fires many requests in
// quick succession) doesn't do a DB round-trip for the role on every single
// call. Revocation still takes effect within ROLE_TTL_MS.
const ROLE_TTL_MS = 15_000;
const roleCache = new Map(); // userId -> { role, expires }

async function resolveRole(userId) {
  const hit = roleCache.get(userId);
  if (hit && Date.now() < hit.expires) return hit.role;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const role = user?.role ?? null;
  roleCache.set(userId, { role, expires: Date.now() + ROLE_TTL_MS });
  return role;
}

/**
 * Wraps requireAuth and then enforces ADMIN role.
 *
 * The role is re-checked against the database (not just read from the JWT,
 * cached briefly) so that a demoted / revoked admin loses access within
 * seconds, instead of keeping ADMIN rights until their long-lived token expires.
 */
export const requireAdmin = (req, res, next) => {
  return requireAuth(req, res, async (err) => {
    if (err) return next(err);

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const role = await resolveRole(req.user.id);

      if (role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Trust the database as the source of truth for the rest of the request.
      req.user.role = role;
      next();
    } catch (checkErr) {
      console.error("requireAdmin DB check failed:", checkErr?.message || checkErr);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  });
};

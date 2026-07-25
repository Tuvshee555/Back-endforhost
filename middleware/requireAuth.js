import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const auth =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers["authorization"];

  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set; refusing to process auth");
    return res.status(500).json({ message: "Auth misconfiguration" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject non-access tokens (e.g. password-reset tokens) so a reset link
    // — which travels through email, browser history and Referer headers —
    // can never be replayed as an API credential.
    if (decoded?.type && decoded.type !== "access") {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Accept several common claim names so tokens from different flows work.
    const userId =
      decoded?.id ??
      decoded?.userId ??
      decoded?.user_id ??
      decoded?.userID ??
      null;
    const role = decoded?.role ?? decoded?.userRole ?? null;

    if (!userId) {
      console.error(
        "requireAuth: token decoded but missing user id claims:",
        decoded
      );
      return res
        .status(401)
        .json({ message: "Invalid token: missing user id" });
    }

    req.user = { id: userId, role: role || "USER" };
    next();
  } catch (err) {
    console.error("requireAuth: token verify error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization || req.headers.Authorization || req.headers["authorization"];

  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Accept several common claim names so tokens from different flows work.
    const userId =
      decoded?.id ??
      decoded?.userId ??
      decoded?.user_id ??
      decoded?.userID ??
      null;

    if (!userId) {
      console.error("requireAuth: token decoded but missing user id claims:", decoded);
      return res.status(401).json({ message: "Invalid token: missing user id" });
    }

    req.user = { id: userId };
    next();
  } catch (err) {
    console.error("requireAuth: token verify error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

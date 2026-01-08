import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../prismaClient.js";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token missing" });

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    let email = payload.email;
    if (!email) return res.status(400).json({ message: "Email not found in token" });

    // 🔥 Normalize email EXACTLY like OTP login
    email = email.trim().toLowerCase();

    console.log("Google normalized email:", email);

    // 🔥 Now Google login and OTP login use SAME identity
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: "USER",
        },
      });
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "14d" }
    );

    return res.json({ token: jwtToken, user });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(401).json({ message: "Google authentication failed" });
  }
};


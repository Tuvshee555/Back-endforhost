import axios from "axios";
import jwt from "jsonwebtoken";
import { prisma } from "../../prismaClient.js"; // Make sure prisma is exported from prismaClient.js

export const facebookAuth = async (req, res) => {
  const { token, role } = req.body;
  if (!token) return res.status(400).json({ message: "Token missing" });

  try {
    // Verify token with Facebook Graph API
    const fbResponse = await axios.get(
      `https://graph.facebook.com/me?access_token=${token}&fields=id,name,email`
    );

    const { name, email } = fbResponse.data;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Facebook account does not provide an email" });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    // If not, create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: role || "USER",
        },
      });
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ token: jwtToken, user });
  } catch (err) {
    console.error("Facebook auth error:", err.response?.data || err.message);
    res.status(401).json({ message: "Facebook authentication failed" });
  }
};

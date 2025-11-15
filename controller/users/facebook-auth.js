import axios from "axios";
import jwt from "jsonwebtoken";
import { prisma } from "../../prismaClient.js"; // Ensure prisma is correctly exported

export const facebookAuth = async (req, res) => {
  const { token, role } = req.body;
  if (!token) return res.status(400).json({ message: "Token missing" });

  try {
    // 🧠 STEP 1: Verify the token really belongs to *your* Facebook App
    const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const verifyUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appToken}`;
    const verifyResponse = await axios.get(verifyUrl);

    const isValid = verifyResponse.data?.data?.is_valid;
    if (!isValid) {
      return res.status(401).json({ message: "Invalid Facebook token" });
    }

    // 🧠 STEP 2: Now safely get user info from Facebook Graph API
    const fbResponse = await axios.get(
      `https://graph.facebook.com/me?access_token=${token}&fields=id,name,email`
    );

    const { name, email } = fbResponse.data;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Facebook account does not provide an email" });
    }

    // 🧠 STEP 3: Find or create the user in your database
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name, // include the user's name if available
          role: role || "USER",
        },
      });
    }

    // 🧠 STEP 4: Generate a JWT token for authentication
    const jwtToken = jwt.sign(
  {
    id: user.id,
    userId: user.id,      // FIXED → now same as OTP
    email: user.email,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

    // 🧠 STEP 5: Send response to frontend
    res.status(200).json({ token: jwtToken, user });
  } catch (err) {
    console.error("Facebook auth error:", err.response?.data || err.message);
    res.status(401).json({
      message: "Facebook authentication failed",
      details: err.response?.data || err.message, // temporary for debugging
    });
  }
};

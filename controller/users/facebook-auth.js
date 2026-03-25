import axios from "axios";
import jwt from "jsonwebtoken";
import { prisma } from "../../prismaClient.js";
import { USER_PUBLIC_SELECT } from "../../utils/serializeUser.js";

const splitFullName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: null, lastName: null };
  }

  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || null,
  };
};

export const facebookAuth = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token missing" });

  try {
    const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const verifyUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appToken}`;
    const verifyResponse = await axios.get(verifyUrl);

    const isValid = verifyResponse.data?.data?.is_valid;
    if (!isValid) {
      return res.status(401).json({ message: "Invalid Facebook token" });
    }

    const fbResponse = await axios.get(
      `https://graph.facebook.com/me?access_token=${token}&fields=id,name,email`
    );

    const { name, email } = fbResponse.data;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Facebook account does not provide an email" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { firstName, lastName } = splitFullName(name);

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          firstName,
          lastName,
          role: "USER",
        },
        select: USER_PUBLIC_SELECT,
      });
    }

    const jwtToken = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "21d" }
    );

    res.status(200).json({ token: jwtToken, user });
  } catch (err) {
    console.error("Facebook auth error:", err.response?.data || err.message);
    res.status(401).json({
      message: "Facebook authentication failed",
      details: err.response?.data || err.message,
    });
  }
};

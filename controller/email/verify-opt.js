import { checkOtp } from "../../utils/otp-store.js";
import { prisma } from "../../prismaClient.js";
import jwt from "jsonwebtoken";

const OTP_ERROR_MESSAGES = {
  not_found: "Код илгээгүй",
  expired: "Код хугацаа дууссан",
  locked: "Хэт олон буруу оролдлого. Шинэ код авна уу.",
  mismatch: "Код буруу",
};

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Мэдээлэл дутуу" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode = String(code).trim();

  const result = await checkOtp(normalizedEmail, normalizedCode);

  if (!result.ok) {
    return res.status(400).json({
      message: OTP_ERROR_MESSAGES[result.reason] || "Код буруу",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Auth not configured" });
  }

  // OTP verified — continue normal login logic
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: "USER",
      },
    });
  }

  const jwtToken = jwt.sign(
    { userId: user.id, role: user.role, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: "21d" }
  );

  return res.json({
    success: true,
    token: jwtToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
};

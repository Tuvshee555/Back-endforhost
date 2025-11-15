import { otpStore } from "../../utils/otp-store.js";
import { prisma } from "../../prismaClient.js";
import jwt from "jsonwebtoken";

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code)
    return res.status(400).json({ message: "Мэдээлэл дутуу" });

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ message: "Код илгээгүй" });

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: "Код хугацаа дууссан" });
  }

  if (record.otp !== code) {
    return res.status(400).json({ message: "Код буруу" });
  }

  otpStore.delete(email);

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
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
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

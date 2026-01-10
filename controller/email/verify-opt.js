import { otpStore } from "../../utils/otp-store.js";
import { prisma } from "../../prismaClient.js";
import jwt from "jsonwebtoken";

export const verifyOtp = async (req, res) => {
  let { email, code } = req.body;

  console.log("=== VERIFY OTP DEBUG START ===");
  console.log("Raw request body:", req.body);

  if (!email || !code) {
    console.log("Missing fields");
    return res.status(400).json({ message: "Мэдээлэл дутуу" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = String(code).trim();

  console.log("Normalized Email:", normalizedEmail);
  console.log("Normalized Code:", normalizedCode);

  const storedValue = otpStore.get(normalizedEmail);
  const rawStored = otpStore.get(email); // check both forms

  console.log("Stored Value (normalized):", storedValue);
  console.log("Stored Value (raw):", rawStored);
  console.log("Entire otpStore:", otpStore);

  // Check for wrong key
  if (!storedValue) {
    console.log("OTP not found under normalized key");
    return res.status(400).json({ message: "Код илгээгүй" });
  }

  // Expiration
  if (Date.now() > storedValue.expiresAt) {
    console.log("OTP expired. expiresAt =", storedValue.expiresAt);
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ message: "Код хугацаа дууссан" });
  }


  if (String(storedValue.otp) !== normalizedCode) {
    return res.status(400).json({ message: "Код буруу" });
  }

  otpStore.delete(normalizedEmail);

  // now continue your normal login logic
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
    { userId: user.id, role: user.role },
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



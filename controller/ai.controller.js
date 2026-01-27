// src/controllers/ai.controller.js
import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../utils/prisma.js";

const GEN_MODEL = "gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/* ---------------- Helpers ---------------- */

function extractFirstJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function findIdsByName(replyText, foods) {
  if (!replyText) return [];
  const lowered = replyText.toLowerCase();
  return foods
    .filter((f) => lowered.includes(f.foodName.toLowerCase()))
    .slice(0, 3)
    .map((f) => f.id);
}

/* ---------------- Controller ---------------- */

export async function aiChat(req, res) {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "message is required" });
    }

    // 🧠 UPGRADE 2 — Instant name search (no AI needed)
    const foods = await prisma.food.findMany({
      take: 50,
      select: {
        id: true,
        foodName: true,
        price: true,
        ingredients: true,
        category: { select: { categoryName: true } },
      },
    });

    const directMatches = foods.filter((f) =>
      f.foodName.toLowerCase().includes(message.toLowerCase())
    );

    if (directMatches.length > 0) {
      return res.json({
        reply: `I found these items: ${directMatches
          .slice(0, 3)
          .map((f) => `${f.foodName} — https://delivery-customer.shop/mn/food/${f.id}`)
          .join(", ")}`,
        ids: directMatches.slice(0, 3).map((f) => f.id),
      });
    }

    // 🧠 UPGRADE 3 — Better food context with categories
    const foodContext = foods
      .map(
        (f) =>
          `ID:${f.id} | NAME:${f.foodName} | PRICE:${f.price} | CATEGORY:${
            f.category?.categoryName || "General"
          } | DESC:${(f.ingredients || "").replace(/\n/g, " ")}`
      )
      .join("\n");

    // 🧠 UPGRADE 4 — Conversation memory
    const memory = history
      .slice(-5)
      .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
      .join("\n");

    const prompt = `
You are a smart AI sales assistant for a food ordering website.

Conversation so far:
${memory}

Available foods:
${foodContext}

User: ${message}

Rules:
- Recommend max 3 foods from the list only.
- You may include product links using:
  https://delivery-customer.shop/mn/food/{id}
- Respond ONLY in JSON:
{
  "reply": "friendly helpful text",
  "ids": ["foodId1","foodId2"]
}
`;

    const model = genAI.getGenerativeModel({ model: GEN_MODEL });
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "";

    let parsed = extractFirstJson(text);
    if (!parsed) parsed = { reply: text, ids: findIdsByName(text, foods) };

    const validIds = (parsed.ids || []).filter((id) =>
      foods.some((f) => f.id === id)
    );

    return res.json({
      reply: parsed.reply || "Here are some suggestions.",
      ids: validIds,
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return res.status(500).json({ reply: "AI temporarily unavailable.", ids: [] });
  }
}

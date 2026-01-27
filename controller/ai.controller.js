// src/controllers/ai.controller.js
import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../utils/prisma.js";

const GEN_MODEL = process.env.GEN_MODEL || "gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
    .filter((f) => (f.foodName || "").toLowerCase().includes(lowered))
    .slice(0, 3)
    .map((f) => f.id);
}

/**
 * aiChat:
 * - supports instant direct name search (fast, no model)
 * - provides richer food context (category names)
 * - sends short conversation history to model (history param)
 * - parses model JSON { reply, ids } and returns items array for UI
 */
export async function aiChat(req, res) {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "message is required" });
    }

    // fetch a small set of foods (tune limit if needed)
    const foods = await prisma.food.findMany({
      take: 50,
      select: {
        id: true,
        foodName: true,
        price: true,
        image: true,
        ingredients: true,
        category: { select: { categoryName: true } },
      },
    });

    // UPGRADE 2: instant direct name search (very fast and accurate)
    const directMatches = foods.filter((f) =>
      (f.foodName || "").toLowerCase().includes(message.toLowerCase())
    );

    if (directMatches.length > 0) {
      const items = directMatches.slice(0, 3).map((f) => ({
        id: f.id,
        name: f.foodName,
        price: f.price,
        image: f.image ?? null,
      }));

      return res.json({
        reply: `I found these items matching "${message}": ${items
          .map((it) => it.name)
          .join(", ")}`,
        ids: items.map((i) => i.id),
        items,
      });
    }

    // UPGRADE 3: build context including category names
    const foodContext = foods
      .map(
        (f) =>
          `ID:${f.id} | NAME:${(f.foodName || "").replace(/[\n\r]/g, " ")} | PRICE:${f.price} | CATEGORY:${f.category?.categoryName || "General"} | DESC:${((f.ingredients || "")).replace(/[\n\r]/g, " ")}`
      )
      .join("\n");

    // UPGRADE 4: conversation memory (send a short history)
    const memory = (Array.isArray(history) ? history : [])
      .slice(-6)
      .map((m) => `${(m.role || "USER").toUpperCase()}: ${m.text}`)
      .join("\n");

    const prompt = `
You are a helpful sales assistant for a food ordering site. Use only the items listed below.

Conversation so far:
${memory}

Available foods:
${foodContext}

User: ${message}

Rules:
- Recommend at most 3 items from the list above.
- You may include product links but MUST return a JSON object only.
- Product link format (if used) is: https://delivery-customer.shop/mn/food/{id}

Return EXACTLY one JSON object and nothing else with this schema:
{
  "reply": "friendly response text",
  "ids": ["foodId1","foodId2"]
}
If no items match, return: { "reply": "I couldn't find matching items.", "ids": [] }.
`;

    // call model
    const model = genAI.getGenerativeModel({ model: GEN_MODEL });
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "";

    // try to extract JSON; fallback to name-matching heuristic
    let parsed = extractFirstJson(text);
    if (!parsed) {
      // try single-line extraction
      parsed = extractFirstJson(text.replace(/[\r\n]+/g, " "));
    }
    if (!parsed) {
      // no JSON — try to infer ids from text
      const inferred = findIdsByName(text, foods);
      const items = foods.filter((f) => inferred.includes(f.id)).slice(0, 3).map((f) => ({
        id: f.id,
        name: f.foodName,
        price: f.price,
        image: f.image ?? null,
      }));
      return res.json({
        reply: text?.trim() || "Sorry, I couldn't find matching food items.",
        ids: inferred,
        items,
        raw: text,
      });
    }

    const idsFromModel = Array.isArray(parsed.ids) ? parsed.ids : [];
    // sanitize ids
    const validIds = idsFromModel.filter((id) => foods.some((f) => f.id === id));
    const items = foods
      .filter((f) => validIds.includes(f.id))
      .map((f) => ({ id: f.id, name: f.foodName, price: f.price, image: f.image ?? null }));

    return res.json({
      reply: parsed.reply || "Here are some suggestions.",
      ids: validIds,
      items,
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return res.status(500).json({ reply: "AI temporarily unavailable.", ids: [], items: [] });
  }
}

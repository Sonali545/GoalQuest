import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // API Routes
  const isQuotaError = (error: any) => {
    if (!error) return false;
    const errorString = JSON.stringify(error).toLowerCase();
    const message = error.message?.toLowerCase() || "";
    const status = error.status || error.code || error.error?.code || error.response?.status;
    
    return (
      status === 429 ||
      status === "RESOURCE_EXHAUSTED" ||
      message.includes("429") ||
      message.includes("quota") ||
      message.includes("resource_exhausted") ||
      message.includes("too many requests") ||
      errorString.includes("429") ||
      errorString.includes("quota") ||
      errorString.includes("resource_exhausted")
    );
  };

  app.post("/api/ai/suggest-goal", async (req, res) => {
    try {
      const { title } = req.body;
      const prompt = `Act as a Goal Architect. Given this goal title: "${title}", generate a SMART goal JSON object with:
      - description: A professional 1-sentence description.
      - target: A realistic numeric or percentage target (just the number/string).
      - weightage: A suggested priority weightage (number between 10-25).
      - uom: One of "numeric", "percentage", "timeline", "zero".
      - thrustArea: One of "Operational", "Strategic", "Value", "Team".
      Only return the JSON.`;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const text = result.text.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(text));
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.warn("Gemini Quota Exceeded for suggest-goal");
        return res.status(429).json({ error: "AI capacity reached. Please try manual entry." });
      }
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to generate goal suggestion" });
    }
  });

  app.post("/api/ai/analyze-health", async (req, res) => {
    try {
      const { goals } = req.body;
      const prompt = `Act as a Performance Consultant. Analyze these goals: ${JSON.stringify(goals)}.
      Assess structural integrity, alignment, and risks. Return a JSON object:
      {
        "score": number (0-100),
        "feedback": "Concise high-level feedback",
        "risks": ["Specific risk 1", "Specific risk 2"]
      }
      Only return JSON.`;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const text = result.text.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(text));
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.warn("Gemini Quota Exceeded for analyze-health");
        return res.status(429).json({ error: "AI capacity reached. Falling back to local analysis." });
      }
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to analyze goals" });
    }
  });

  app.post("/api/ai/summarize-progress", async (req, res) => {
    try {
      const { teamData } = req.body;
      const prompt = `Summarize the following team quarterly progress data and provide 3 key insights or risks. 
                     Keep it professional and concise. Data: ${JSON.stringify(teamData)}`;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      res.json({ summary: result.text });
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.warn("Gemini Quota Exceeded for summarize-progress");
        return res.status(429).json({ error: "AI capacity reached. Performance summary unavailable." });
      }
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

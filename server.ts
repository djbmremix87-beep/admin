import express from "express";
import path from "path";
import JSZip from "jszip";
import fs from "fs";
import os from "os";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// AI endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "Gemini API key is missing or is the default placeholder. Please set a valid GEMINI_API_KEY in the Secrets panel." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      })),
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message || "Failed to process AI request" });
  }
});

const DEPLOYMENTS_DIR = path.join(os.tmpdir(), "deployments");
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
}

app.post("/api/deploy", async (req, res) => {
  try {
    const { file, apkFile, apkFileName } = req.body;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    // Extract base64 data section: data:application/zip;base64,....
    const base64Data = file.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');

    const zip = await JSZip.loadAsync(buffer);
    const deployId = Math.random().toString(36).substring(2, 8);
    const targetDir = path.join(DEPLOYMENTS_DIR, deployId);
    
    fs.mkdirSync(targetDir, { recursive: true });

    // Try to save APK if uploaded
    if (apkFile) {
        const apkBase64Data = apkFile.split(';base64,').pop();
        const apkBuffer = Buffer.from(apkBase64Data, 'base64');
        fs.writeFileSync(path.join(targetDir, apkFileName || 'app.apk'), apkBuffer);
    }

    const promises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        promises.push(
          zipEntry.async("nodebuffer").then((content) => {
            const filePath = path.join(targetDir, relativePath);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, content);
          })
        );
      }
    });

    await Promise.all(promises);

    res.json({ success: true, deployId });
  } catch (err: any) {
    console.error("Deploy error:", err);
    res.status(500).json({ error: "Failed to deploy: " + err.message });
  }
});

// Serve the deployments
app.use("/d", express.static(DEPLOYMENTS_DIR));

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

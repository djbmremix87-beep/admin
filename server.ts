import express from "express";
import path from "path";
import multer from "multer";
import JSZip from "jszip";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Set up deploy endpoint
const upload = multer({ storage: multer.memoryStorage() });

const DEPLOYMENTS_DIR = path.join(process.cwd(), "deployments");
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
}

app.post("/api/deploy", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const zip = await JSZip.loadAsync(req.file.buffer);
    const deployId = Math.random().toString(36).substring(2, 8);
    const targetDir = path.join(DEPLOYMENTS_DIR, deployId);
    
    fs.mkdirSync(targetDir, { recursive: true });

    const promises: Promise<void>[] = [];

    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        promises.push(
          file.async("nodebuffer").then((content) => {
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

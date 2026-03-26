// Tiny Express server for Tila
// Provides /api/tts endpoint that calls Google Cloud Text-to-Speech.
// Secrets stay server-side — the frontend never touches Google credentials.
//
// In development: runs alongside Vite (Vite proxies /api to this server)
// In production: serves the built Vite app AND handles /api routes

import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- TTS voice/synthesis constants ---
const TTS_PROVIDER = "Google Cloud Text-to-Speech";
const TTS_LANGUAGE_CODE = "ar-XA";
const TTS_VOICE_NAME = "ar-XA-Wavenet-A";
const TTS_GENDER = "FEMALE";
const TTS_AUDIO_ENCODING = "MP3";
const TTS_SPEAKING_RATE = 0.85;
const TTS_PITCH = 0;

// --- Startup diagnostics ---
console.log("[Server] dotenv loaded — checking environment...");
const _credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
console.log("[Server] GOOGLE_APPLICATION_CREDENTIALS =", _credPath || "(not set)");
if (_credPath) {
  const _absPath = path.isAbsolute(_credPath) ? _credPath : path.resolve(__dirname, _credPath);
  const _exists = fs.existsSync(_absPath);
  console.log("[Server] Resolved credential path:", _absPath);
  console.log("[Server] Credential file exists:", _exists);
  if (!_exists) {
    console.error("[Server] ⚠ Credential file NOT FOUND — TTS will fail!");
  }
} else {
  console.warn("[Server] ⚠ No GOOGLE_APPLICATION_CREDENTIALS set — TTS will rely on ADC or fail.");
}

const app = express();
const PORT = process.env.API_PORT || 3001;

// --- File-based audio cache ---
// Generated audio is cached as MP3 files in audio/generated/.
// Cache key includes all synthesis settings so a voice/rate change
// automatically invalidates old files. Persists across server restarts.
const CACHE_DIR = path.join(__dirname, "audio", "generated");
const CACHE_MAX_FILES = 500;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCacheStats() {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith(".mp3"));
    let totalBytes = 0;
    for (const f of files) {
      try { totalBytes += fs.statSync(path.join(CACHE_DIR, f)).size; } catch {}
    }
    return { fileCount: files.length, totalBytes };
  } catch {
    return { fileCount: 0, totalBytes: 0 };
  }
}

// Remove oldest cache files when count exceeds CACHE_MAX_FILES
function pruneCache() {
  try {
    const entries = fs.readdirSync(CACHE_DIR)
      .filter(f => f.endsWith(".mp3"))
      .map(f => {
        const fp = path.join(CACHE_DIR, f);
        try { return { name: f, path: fp, mtime: fs.statSync(fp).mtimeMs }; }
        catch { return null; }
      })
      .filter(Boolean);

    if (entries.length <= CACHE_MAX_FILES) return;

    entries.sort((a, b) => a.mtime - b.mtime); // oldest first
    const toDelete = entries.length - CACHE_MAX_FILES;
    let deleted = 0;
    for (let i = 0; i < toDelete; i++) {
      try { fs.unlinkSync(entries[i].path); deleted++; } catch {}
    }
    if (deleted > 0) {
      console.log(`[Cache] pruned ${deleted} oldest files (was ${entries.length}, now ${entries.length - deleted})`);
    }
  } catch (err) {
    console.error("[Cache] prune error:", err.message);
  }
}

// Prune at startup
pruneCache();

function getCachePath(text) {
  const cacheInput = [
    TTS_PROVIDER,
    TTS_LANGUAGE_CODE,
    TTS_VOICE_NAME,
    TTS_GENDER,
    String(TTS_SPEAKING_RATE),
    String(TTS_PITCH),
    text,
  ].join("|");
  const hash = crypto.createHash("sha256").update(cacheInput).digest("hex").slice(0, 16);
  return path.join(CACHE_DIR, `${hash}.mp3`);
}

// --- Google Cloud TTS client (lazy-initialized) ---
let ttsClient = null;
let ttsAvailable = false;

async function initTTS() {
  if (ttsClient !== null) return ttsAvailable;

  // Check for credentials. Google Cloud TTS auth can use either:
  // 1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON file
  // 2. Application Default Credentials (gcloud auth application-default login)
  let credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  // Resolve relative paths from project root
  if (credPath && !path.isAbsolute(credPath)) {
    credPath = path.resolve(__dirname, credPath);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    console.log("[TTS Server] Resolved relative credential path to:", credPath);
  }
  if (credPath && !fs.existsSync(credPath)) {
    console.error(`[TTS Server] GOOGLE_APPLICATION_CREDENTIALS points to missing file: ${credPath}`);
    ttsClient = false;
    ttsAvailable = false;
    return false;
  }

  try {
    const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
    const client = new TextToSpeechClient();
    // Verify credentials work by listing voices (lightweight API call)
    await client.listVoices({ languageCode: TTS_LANGUAGE_CODE });
    ttsClient = client;
    ttsAvailable = true;
    console.log("[TTS Server] Google Cloud TTS client initialized and verified");
    console.log(`[TTS Server] Provider: ${TTS_PROVIDER}`);
    console.log(`[TTS Server] Voice: ${TTS_VOICE_NAME} (${TTS_GENDER})`);
    console.log(`[TTS Server] Encoding: ${TTS_AUDIO_ENCODING} | Rate: ${TTS_SPEAKING_RATE} | Pitch: ${TTS_PITCH}`);
    return true;
  } catch (err) {
    console.error("[TTS Server] Failed to initialize Google Cloud TTS:", err);
    console.error("[TTS Server] Set GOOGLE_APPLICATION_CREDENTIALS to a service account key file,");
    console.error("[TTS Server] or run: gcloud auth application-default login");
    ttsClient = false;
    ttsAvailable = false;
    return false;
  }
}

// --- Security headers ---
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// --- TTS rate limiter ---
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many TTS requests. Please try again shortly." },
});

// --- TTS endpoint ---
// GET /api/tts?text=بَ
// Returns MP3 audio for the given Arabic text.
app.get("/api/tts", ttsLimiter, async (req, res) => {
  const rawText = req.query.text;
  const text = typeof rawText === "string"
    ? rawText.normalize("NFC").trim().replace(/\s+/g, " ")
    : "";

  console.log(`[TTS] /api/tts hit, text: "${text}"`);

  // Validate input
  if (text.length === 0) {
    console.log("[TTS] rejected: missing or empty text");
    return res.status(400).json({ error: "Missing or empty 'text' query parameter" });
  }
  // Safety: limit text length to prevent abuse (harakat combos are 1-10 chars)
  if (text.length > 200) {
    console.log("[TTS] rejected: text too long");
    return res.status(400).json({ error: "Text too long (max 200 characters)" });
  }

  // Check file cache first
  const cachePath = getCachePath(text);
  if (fs.existsSync(cachePath)) {
    const stat = fs.statSync(cachePath);
    console.log(`[TTS] cache HIT: "${text}" → ${path.basename(cachePath)} (${stat.size} bytes)`);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    const stream = fs.createReadStream(cachePath);
    stream.on("error", (err) => {
      console.error("[TTS] cache read error:", err.message);
      if (!res.headersSent) res.status(500).json({ error: "Failed to read cached audio." });
    });
    return stream.pipe(res);
  }

  // Initialize TTS client if needed
  console.log(`[TTS] cache MISS: "${text}", calling Google Cloud TTS...`);
  const ready = await initTTS();
  if (!ready) {
    console.error("[TTS] Google Cloud TTS not available");
    return res.status(503).json({
      error: "Google Cloud TTS not available. Check server logs for credential setup instructions."
    });
  }

  try {
    console.log(`[TTS] synthesizing: "${text}"`);
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: TTS_LANGUAGE_CODE,
        name: TTS_VOICE_NAME,
        ssmlGender: TTS_GENDER,
      },
      audioConfig: {
        audioEncoding: TTS_AUDIO_ENCODING,
        speakingRate: TTS_SPEAKING_RATE,
        pitch: TTS_PITCH,
      },
    });

    // Ensure audioContent is a Buffer (Google TTS v6+ returns Uint8Array)
    const audioBuffer = Buffer.isBuffer(response.audioContent)
      ? response.audioContent
      : Buffer.from(response.audioContent);

    console.log(`[TTS] synth OK: ${audioBuffer.length} bytes`);

    // Cache to disk for future requests, then prune if needed
    fs.writeFileSync(cachePath, audioBuffer);
    pruneCache();
    console.log(`[TTS] cached: "${text}" → ${path.basename(cachePath)}`);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audioBuffer);
  } catch (err) {
    console.error(`[TTS] Google Cloud TTS error for "${text}":`, err);
    res.status(500).json({ error: "TTS generation failed. Please try again." });
  }
});

// --- Health check ---
app.get("/api/health", async (req, res) => {
  await initTTS();
  const cache = getCacheStats();
  res.json({
    ok: true,
    ttsAvailable,
    ttsProvider: TTS_PROVIDER,
    ttsVoice: TTS_VOICE_NAME,
    ttsGender: TTS_GENDER,
    ttsEncoding: TTS_AUDIO_ENCODING,
    ttsSpeakingRate: TTS_SPEAKING_RATE,
    ttsPitch: TTS_PITCH,
    cacheDir: CACHE_DIR,
    cacheFileCount: cache.fileCount,
    cacheTotalBytes: cache.totalBytes,
    cacheMaxFiles: CACHE_MAX_FILES,
  });
});

// --- Production: serve built Vite app ---
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5 requires named params — catch-all for SPA routing
  app.get("/{*splat}", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Unknown API route" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
  console.log(`[Server] Serving production build from ${distPath}`);
}

process.on("unhandledRejection", (err) => {
  console.error("[Server] Unhandled rejection (suppressed):", err);
});

app.listen(PORT, () => {
  console.log(`[Server] API server running on http://localhost:${PORT}`);
  console.log(`[Server] TTS endpoint: GET /api/tts?text=بَ`);
  console.log(`[Server] Health check: GET /api/health`);
});

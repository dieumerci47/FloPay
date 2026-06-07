// src/index.js
require("dotenv").config();

const express    = require("express");
const helmet     = require("helmet");
const cors       = require("cors");
const morgan     = require("morgan");
const compression = require("compression");
const rateLimit  = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const { connectDB }  = require("./config/database");
const routes         = require("./routes/index");
const logger         = require("./utils/logger");
const { error }      = require("./utils/response");
const { startReconcileCron } = require("./services/reconcile.cron");

const app  = express();
const PORT = process.env.PORT || 3000;
// const IP="192.168.100.254"

// ── Sécurité ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());

// CORS — autorise le frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3001",
  "http://localhost:3000",
  "https://dugout-cornbread-headscarf.ngrok-free.dev"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      100,
  message:  { success: false, message: "Trop de requêtes, réessayez dans 15 minutes" },
}));

// Paiements — plus strict pour éviter les abus
app.use("/api/payments", rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max:      10,
  message:  { success: false, message: "Trop de tentatives de paiement" },
}));

// ── Parsing ───────────────────────────────────────────────────────────────────
// Le webhook PawaPay nécessite le body brut pour vérifier la signature
app.use("/api/payments/pawapay/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logs HTTP ─────────────────────────────────────────────────────────────────
app.use(morgan("dev", {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "UMG PayTech API", timestamp: new Date().toISOString() });
});

// ── Routes API ────────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  error(res, `Route non trouvée: ${req.method} ${req.originalUrl}`, 404);
});

// ── Gestion globale des erreurs ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Erreur non gérée:", err);
  error(res, "Erreur serveur interne", 500);
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`🚀 UMG PayTech API démarrée sur le port ${PORT}`);
    logger.info(`📍 Environnement : ${process.env.NODE_ENV || "development"}`);
    logger.info(`🔗 Health check  : http://localhost:${PORT}/health`);
    startReconcileCron();
  });
};

start();

module.exports = app;

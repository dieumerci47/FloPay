// src/config/database.js
const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["query", "info", "warn", "error"]
    : ["error"],
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info("✅ PostgreSQL connecté via Prisma");
  } catch (err) {
    logger.error("❌ Erreur connexion base de données:", err);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };

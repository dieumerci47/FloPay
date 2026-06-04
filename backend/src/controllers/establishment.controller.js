// src/controllers/establishment.controller.js
const { prisma }        = require("../config/database");
const { success, error } = require("../utils/response");
const logger            = require("../utils/logger");

// ── Liste des établissements (public) ─────────────────────────────────────────
const getEstablishments = async (req, res) => {
  try {
    const establishments = await prisma.establishment.findMany({
      where:   { isActive: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, code: true },
    });
    return success(res, establishments);
  } catch (err) {
    logger.error("Erreur getEstablishments:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Programmes d'un établissement (public) ────────────────────────────────────
const getProgramsByEstablishment = async (req, res) => {
  const { establishmentId } = req.params;

  try {
    const programs = await prisma.program.findMany({
      where: { establishmentId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id:    true,
        name:  true,
        level: { select: { id: true, name: true, amount: true, years: true } },
      },
    });

    // Aplati : le frontend utilise p.level (cycle), p.amount, p.levelYears
    const data = programs.map((p) => ({
      id:         p.id,
      name:       p.name,
      levelId:    p.level.id,
      level:      p.level.name,
      levelYears: p.level.years,
      amount:     Number(p.level.amount),
    }));
    return success(res, data);

  } catch (err) {
    logger.error("Erreur getProgramsByEstablishment:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Liste des niveaux/cycles (public) ─────────────────────────────────────────
const getLevels = async (req, res) => {
  try {
    const levels = await prisma.level.findMany({
      where:   { isActive: true },
      orderBy: { amount: "asc" },
      select:  { id: true, name: true, amount: true, years: true },
    });
    return success(res, levels.map((l) => ({ ...l, amount: Number(l.amount) })));
  } catch (err) {
    logger.error("Erreur getLevels:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Créer un établissement (admin) ────────────────────────────────────────────
const createEstablishment = async (req, res) => {
  const { name, code } = req.body;
  try {
    const existing = await prisma.establishment.findUnique({ where: { code } });
    if (existing) return error(res, "Ce code d'établissement existe déjà", 409);

    const establishment = await prisma.establishment.create({ data: { name, code } });
    return success(res, establishment, "Établissement créé", 201);
  } catch (err) {
    logger.error("Erreur createEstablishment:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Créer un niveau/cycle (admin) ─────────────────────────────────────────────
const createLevel = async (req, res) => {
  const { name, amount, years } = req.body;
  try {
    const existing = await prisma.level.findUnique({ where: { name } });
    if (existing) return error(res, "Ce niveau existe déjà", 409);

    const level = await prisma.level.create({ data: { name, amount, ...(years ? { years } : {}) } });
    return success(res, { ...level, amount: Number(level.amount) }, "Niveau créé", 201);
  } catch (err) {
    logger.error("Erreur createLevel:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Créer un programme (admin) ────────────────────────────────────────────────
const createProgram = async (req, res) => {
  const { name, levelId, establishmentId } = req.body;
  try {
    const establishment = await prisma.establishment.findUnique({ where: { id: establishmentId } });
    if (!establishment) return error(res, "Établissement non trouvé", 404);

    const level = await prisma.level.findUnique({ where: { id: levelId } });
    if (!level) return error(res, "Niveau non trouvé", 404);

    const program = await prisma.program.create({
      data:    { name, levelId, establishmentId },
      include: { level: true },
    });
    return success(res, {
      id:     program.id,
      name:   program.name,
      level:  program.level.name,
      amount: Number(program.level.amount),
    }, "Programme créé", 201);

  } catch (err) {
    logger.error("Erreur createProgram:", err);
    return error(res, "Erreur serveur", 500);
  }
};

module.exports = {
  getEstablishments, getProgramsByEstablishment, getLevels,
  createEstablishment, createLevel, createProgram,
};

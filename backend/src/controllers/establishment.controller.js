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
      orderBy: [{ level: "asc" }, { name: "asc" }],
      select: { id: true, name: true, level: true, amount: true },
    });

    const data = programs.map((p) => ({ ...p, amount: Number(p.amount) }));
    return success(res, data);

  } catch (err) {
    logger.error("Erreur getProgramsByEstablishment:", err);
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

// ── Créer un programme (admin) ────────────────────────────────────────────────
const createProgram = async (req, res) => {
  const { name, level, amount, establishmentId } = req.body;
  try {
    const establishment = await prisma.establishment.findUnique({ where: { id: establishmentId } });
    if (!establishment) return error(res, "Établissement non trouvé", 404);

    const program = await prisma.program.create({
      data: { name, level, amount, establishmentId },
    });
    return success(res, { ...program, amount: Number(program.amount) }, "Programme créé", 201);

  } catch (err) {
    logger.error("Erreur createProgram:", err);
    return error(res, "Erreur serveur", 500);
  }
};

module.exports = { getEstablishments, getProgramsByEstablishment, createEstablishment, createProgram };

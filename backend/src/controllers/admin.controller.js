// src/controllers/admin.controller.js
const { prisma }          = require("../config/database");
const bcrypt              = require("bcryptjs");
const jwt                 = require("jsonwebtoken");
const { success, error, paginated } = require("../utils/response");
const logger              = require("../utils/logger");

// ── Login admin ───────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin || !admin.isActive) {
      return error(res, "Identifiants incorrects", 401);
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) return error(res, "Identifiants incorrects", 401);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    logger.info(`🔐 Admin connecté: ${email}`);
    return success(res, { token, admin: { id: admin.id, email, fullName: admin.fullName, role: admin.role } });

  } catch (err) {
    logger.error("Erreur login:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Recherche par matricule (interface scolarité) ─────────────────────────────
const searchByMatricule = async (req, res) => {
  const { matricule } = req.params;
  try {
    const student = await prisma.student.findUnique({
      where: { matricule },
      include: {
        establishment: true,
        program:       true,
        payments: {
          orderBy: { createdAt: "desc" },
          include: { receipt: true },
        },
      },
    });

    if (!student) return error(res, "Aucun étudiant trouvé avec ce matricule", 404);

    // Paiement validé de l'année en cours
    const latestSuccess = student.payments.find((p) => p.status === "SUCCESS");

    return success(res, {
      student: {
        id:            student.id,
        matricule:     student.matricule,
        fullName:      student.fullName,
        birthDate:     student.birthDate,
        birthPlace:    student.birthPlace,
        phone:         student.phone,
        establishment: student.establishment.name,
        program:       student.program.name,
        level:         student.program.level,
        academicYear:  student.program.academicYear,
      },
      paymentStatus:  latestSuccess ? "PAYÉ" : "NON PAYÉ",
      latestPayment:  latestSuccess
        ? {
            receiptNumber: latestSuccess.receiptNumber,
            amount:        Number(latestSuccess.amount),
            paidAt:        latestSuccess.paidAt,
            paymentMethod: latestSuccess.paymentMethod,
            hasReceipt:    !!latestSuccess.receipt,
          }
        : null,
      allPayments: student.payments.map((p) => ({
        receiptNumber: p.receiptNumber,
        amount:        Number(p.amount),
        status:        p.status,
        method:        p.paymentMethod,
        createdAt:     p.createdAt,
        paidAt:        p.paidAt,
      })),
    });

  } catch (err) {
    logger.error("Erreur searchByMatricule:", err);
    return error(res, "Erreur lors de la recherche", 500);
  }
};

// ── Liste des paiements (avec filtres) ────────────────────────────────────────
const listPayments = async (req, res) => {
  const { page = 1, limit = 20, status, method, establishmentId, academicYear } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};
    if (status)        where.status        = status;
    if (method)        where.paymentMethod = method;
    if (academicYear)  where.academicYear  = academicYear;
    if (establishmentId) {
      where.student = { establishmentId };
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take:    parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          student: { include: { establishment: true } },
          program: true,
        },
      }),
      prisma.payment.count({ where }),
    ]);

    const data = payments.map((p) => ({
      id:            p.id,
      receiptNumber: p.receiptNumber,
      student:       p.student.fullName,
      matricule:     p.student.matricule,
      establishment: p.student.establishment.name,
      program:       p.program.name,
      level:         p.program.level,
      amount:        Number(p.amount),
      method:        p.paymentMethod,
      phone:         p.phoneNumber,
      status:        p.status,
      paidAt:        p.paidAt,
      createdAt:     p.createdAt,
    }));

    return paginated(res, data, total, page, limit);

  } catch (err) {
    logger.error("Erreur listPayments:", err);
    return error(res, "Erreur lors de la récupération", 500);
  }
};

// ── Statistiques dashboard ────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  const { academicYear } = req.query;
  try {
    const yearFilter = academicYear ? { academicYear } : {};

    const [
      totalPayments,
      successPayments,
      pendingPayments,
      failedPayments,
      revenueData,
      byMethod,
      recentPayments,
    ] = await Promise.all([
      prisma.payment.count({ where: yearFilter }),
      prisma.payment.count({ where: { ...yearFilter, status: "SUCCESS" } }),
      prisma.payment.count({ where: { ...yearFilter, status: "PENDING" } }),
      prisma.payment.count({ where: { ...yearFilter, status: "FAILED" } }),
      prisma.payment.aggregate({
        where:   { ...yearFilter, status: "SUCCESS" },
        _sum:    { amount: true },
      }),
      prisma.payment.groupBy({
        by:      ["paymentMethod"],
        where:   { ...yearFilter, status: "SUCCESS" },
        _count:  true,
        _sum:    { amount: true },
      }),
      prisma.payment.findMany({
        where:   { status: "SUCCESS", ...yearFilter },
        take:    5,
        orderBy: { paidAt: "desc" },
        include: { student: true },
      }),
    ]);

    return success(res, {
      overview: {
        total:    totalPayments,
        success:  successPayments,
        pending:  pendingPayments,
        failed:   failedPayments,
        revenue:  Number(revenueData._sum.amount || 0),
      },
      byMethod: byMethod.map((m) => ({
        method:  m.paymentMethod,
        count:   m._count,
        revenue: Number(m._sum.amount || 0),
      })),
      recentPayments: recentPayments.map((p) => ({
        receiptNumber: p.receiptNumber,
        student:       p.student.fullName,
        matricule:     p.student.matricule,
        amount:        Number(p.amount),
        method:        p.paymentMethod,
        paidAt:        p.paidAt,
      })),
    });

  } catch (err) {
    logger.error("Erreur getDashboardStats:", err);
    return error(res, "Erreur lors de la récupération des statistiques", 500);
  }
};

module.exports = { login, searchByMatricule, listPayments, getDashboardStats };

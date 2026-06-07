// src/controllers/admin.controller.js
const { prisma }          = require("../config/database");
const bcrypt              = require("bcryptjs");
const { success, error, paginated } = require("../utils/response");
const logger              = require("../utils/logger");
const { audit }           = require("../utils/audit");
const { reconcileWithPawapay, failureToFrench } = require("../services/payment.sync");
const {
  signAccessToken, generateRefreshToken, hashToken,
  refreshExpiry, refreshCookieOptions, REFRESH_COOKIE,
} = require("../utils/tokens");

// ── Politique anti brute-force ────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MIN   = 15;

// Profil public d'un admin (jamais le hash de mot de passe)
const publicAdmin = (a) => ({
  id:            a.id,
  email:         a.email,
  fullName:      a.fullName,
  role:          a.role,
  establishmentId: a.establishmentId,
  establishment: a.establishment
    ? { id: a.establishment.id, name: a.establishment.name, code: a.establishment.code }
    : null,
});

// Émet un refresh token : le stocke hashé en base et le pose en cookie httpOnly.
async function issueRefreshToken(res, req, adminId) {
  const raw = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(raw),
      adminId,
      expiresAt: refreshExpiry(),
      userAgent: (req.headers["user-agent"] || "").slice(0, 250),
      ip:        (req.ip || "").toString(),
    },
  });
  res.cookie(REFRESH_COOKIE, raw, refreshCookieOptions());
}

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: { establishment: true },
    });

    // Réponse volontairement générique pour ne pas révéler l'existence du compte
    if (!admin || !admin.isActive) {
      return error(res, "Identifiants incorrects", 401);
    }

    // Compte verrouillé ?
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const mins = Math.ceil((admin.lockedUntil - new Date()) / 60000);
      return error(res, `Compte temporairement verrouillé. Réessayez dans ${mins} min.`, 423);
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      const attempts = admin.failedLoginAttempts + 1;
      const lock     = attempts >= MAX_FAILED_ATTEMPTS;
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCK_DURATION_MIN * 60000) : null,
        },
      });
      await audit(req, { action: "LOGIN_FAILED", targetType: "Admin", targetId: admin.id, adminId: admin.id });
      return error(
        res,
        lock
          ? `Trop de tentatives. Compte verrouillé ${LOCK_DURATION_MIN} min.`
          : "Identifiants incorrects",
        lock ? 423 : 401
      );
    }

    // Succès : reset compteur + horodatage
    await prisma.admin.update({
      where: { id: admin.id },
      data:  { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken(admin);
    await issueRefreshToken(res, req, admin.id);
    await audit(req, { action: "LOGIN", adminId: admin.id });

    logger.info(`🔐 Admin connecté: ${email}`);
    return success(res, { accessToken, admin: publicAdmin(admin) });

  } catch (err) {
    logger.error("Erreur login:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Refresh : échange le cookie refresh contre un nouvel access token ──────────
const refresh = async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) return error(res, "Session expirée", 401);

  try {
    const stored = await prisma.refreshToken.findUnique({
      where:   { tokenHash: hashToken(raw) },
      include: { admin: { include: { establishment: true } } },
    });

    const invalid =
      !stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.admin?.isActive;

    if (invalid) {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      return error(res, "Session invalide, reconnectez-vous", 401);
    }

    // Rotation : on révoque l'ancien et on en émet un nouveau
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data:  { revokedAt: new Date() },
    });
    await issueRefreshToken(res, req, stored.adminId);

    const accessToken = signAccessToken(stored.admin);
    return success(res, { accessToken, admin: publicAdmin(stored.admin) });

  } catch (err) {
    logger.error("Erreur refresh:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Logout : révoque le refresh token courant ─────────────────────────────────
const logout = async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  try {
    if (raw) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(raw), revokedAt: null },
        data:  { revokedAt: new Date() },
      });
    }
  } catch (err) {
    logger.error("Erreur logout:", err);
  }
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  return success(res, null, "Déconnecté");
};

// ── Profil de l'admin connecté ────────────────────────────────────────────────
const me = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where:   { id: req.admin.id },
      include: { establishment: true },
    });
    if (!admin || !admin.isActive) return error(res, "Compte introuvable", 401);
    return success(res, { admin: publicAdmin(admin) });
  } catch (err) {
    logger.error("Erreur me:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// Filtre Prisma "Payment" restreint à l'établissement de l'admin (vide pour super admin)
const scopedPaymentWhere = (req) =>
  req.scope?.isSuperAdmin ? {} : { student: { establishmentId: req.scope.establishmentId } };

// ── Vérification par numéro de reçu (action métier principale) ────────────────
const searchByReceipt = async (req, res) => {
  const { receiptNumber } = req.params;
  try {
    const includeShape = {
      student: { include: { establishment: true } },
      program: { include: { level: true } },
      receipt: true,
    };

    let payment = await prisma.payment.findUnique({ where: { receiptNumber }, include: includeShape });

    if (!payment) return error(res, "Aucun paiement trouvé avec ce numéro de reçu", 404);

    // Cloisonnement : un admin d'établissement ne vérifie que SES étudiants
    if (!req.scope.isSuperAdmin && payment.student.establishmentId !== req.scope.establishmentId) {
      return error(res, "Ce reçu n'appartient pas à votre établissement", 403);
    }

    // Réconciliation à la demande : si le paiement est encore en attente, on
    // redemande la vérité à PawaPay (le webhook a pu ne jamais arriver).
    let reconciled = null;
    if (payment.status === "PENDING" && payment.pawapayDepositId) {
      const r = await reconcileWithPawapay(payment);
      reconciled = { reachable: r.reachable, changed: r.changed, pawapayStatus: r.pawapayStatus };
      if (r.changed) {
        payment = await prisma.payment.findUnique({ where: { receiptNumber }, include: includeShape });
        await audit(req, {
          action: "RECONCILE_PAYMENT", targetType: "Payment", targetId: payment.id,
          detail: `${receiptNumber} → ${r.status}`,
        });
      }
    }

    await audit(req, {
      action: "VERIFY_RECEIPT", targetType: "Payment", targetId: payment.id, detail: receiptNumber,
    });

    return success(res, {
      reconciled,
      receiptNumber: payment.receiptNumber,
      status:        payment.status,
      paymentStatus: payment.status === "SUCCESS" ? "PAYÉ" : "NON PAYÉ",
      amount:        Number(payment.amount),
      currency:      payment.currency,
      paymentMethod: payment.paymentMethod,
      paidAt:        payment.paidAt,
      academicYear:  payment.academicYear,
      hasReceipt:    !!payment.receipt,
      failure:       payment.status === "FAILED"
        ? {
            code:    payment.pawapayFailureCode,
            message: failureToFrench(payment.pawapayFailureCode, payment.pawapayFailureReason),
          }
        : null,
      student: {
        lastName:      payment.student.lastName,
        firstName:     payment.student.firstName,
        fullName:      `${payment.student.lastName} ${payment.student.firstName}`,
        gender:        payment.student.gender,
        matricule:     payment.student.matricule,
        birthDate:     payment.student.birthDate,
        birthPlace:    payment.student.birthPlace,
        phone:         payment.student.phone,
        establishment: payment.student.establishment.name,
        program:       payment.program.name,
        level:         `${payment.program.level.name} ${payment.studyYear}`,
      },
    });

  } catch (err) {
    logger.error("Erreur searchByReceipt:", err);
    return error(res, "Erreur lors de la recherche", 500);
  }
};

// ── Recherche par matricule (secondaire) ──────────────────────────────────────
const searchByMatricule = async (req, res) => {
  const { matricule } = req.params;
  try {
    const student = await prisma.student.findFirst({
      where: { matricule },
      include: {
        establishment: true,
        program:       { include: { level: true } },
        payments:      { orderBy: { createdAt: "desc" }, include: { receipt: true } },
      },
    });

    if (!student) return error(res, "Aucun étudiant trouvé avec ce matricule", 404);

    if (!req.scope.isSuperAdmin && student.establishmentId !== req.scope.establishmentId) {
      return error(res, "Cet étudiant n'appartient pas à votre établissement", 403);
    }

    await audit(req, {
      action: "SEARCH_MATRICULE", targetType: "Student", targetId: student.id, detail: matricule,
    });

    const latestSuccess = student.payments.find((p) => p.status === "SUCCESS");

    return success(res, {
      student: {
        id:            student.id,
        matricule:     student.matricule,
        lastName:      student.lastName,
        firstName:     student.firstName,
        fullName:      `${student.lastName} ${student.firstName}`,
        gender:        student.gender,
        birthDate:     student.birthDate,
        birthPlace:    student.birthPlace,
        phone:         student.phone,
        establishment: student.establishment.name,
        program:       student.program.name,
        level:         student.program.level.name,
      },
      paymentStatus: latestSuccess ? "PAYÉ" : "NON PAYÉ",
      latestPayment: latestSuccess
        ? {
            receiptNumber: latestSuccess.receiptNumber,
            amount:        Number(latestSuccess.amount),
            academicYear:  latestSuccess.academicYear,
            niveau:        `${student.program.level.name} ${latestSuccess.studyYear}`,
            paidAt:        latestSuccess.paidAt,
            paymentMethod: latestSuccess.paymentMethod,
            hasReceipt:    !!latestSuccess.receipt,
          }
        : null,
      allPayments: student.payments.map((p) => ({
        receiptNumber: p.receiptNumber,
        amount:        Number(p.amount),
        academicYear:  p.academicYear,
        niveau:        `${student.program.level.name} ${p.studyYear}`,
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

// Construit le filtre Prisma "Payment" à partir du scope + des filtres de requête.
// Source unique utilisée par la liste paginée ET l'export CSV (même cloisonnement).
const buildPaymentWhere = (req) => {
  const { status, method, establishmentId, academicYear, search } = req.query;
  const where = { ...scopedPaymentWhere(req) };
  if (status)       where.status        = status;
  if (method)       where.paymentMethod = method;
  if (academicYear) where.academicYear  = academicYear;

  // Le super admin peut filtrer par établissement ; l'admin d'établissement est déjà restreint
  if (req.scope.isSuperAdmin && establishmentId) {
    where.student = { ...(where.student || {}), establishmentId };
  }
  if (search) {
    where.OR = [
      { receiptNumber: { contains: search, mode: "insensitive" } },
      { student: { ...(where.student || {}), matricule: { contains: search, mode: "insensitive" } } },
      { student: { ...(where.student || {}), lastName:  { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
};

// ── Liste des paiements (cloisonnée) ──────────────────────────────────────────
const listPayments = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = buildPaymentWhere(req);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          student: { include: { establishment: true } },
          program: { include: { level: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    const data = payments.map((p) => ({
      id:            p.id,
      receiptNumber: p.receiptNumber,
      student:       `${p.student.lastName} ${p.student.firstName}`,
      matricule:     p.student.matricule,
      establishment: p.student.establishment.name,
      program:       p.program.name,
      level:         `${p.program.level.name} ${p.studyYear}`,
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

// ── Export CSV des paiements (cloisonné, mêmes filtres que la liste) ──────────
// Échappe une cellule pour un CSV à séparateur ";" (compatible Excel FR)
const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvDateTime = (d) => {
  if (!d) return "";
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()} ${p(x.getHours())}:${p(x.getMinutes())}`;
};

const exportPayments = async (req, res) => {
  try {
    const where = buildPaymentWhere(req);
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        student: { include: { establishment: true } },
        program: { include: { level: true } },
      },
    });

    await audit(req, { action: "EXPORT_PAYMENTS", detail: `${payments.length} ligne(s)` });

    const header = [
      "N° reçu", "Nom", "Prénom", "Matricule", "Établissement", "Parcours", "Niveau",
      "Montant", "Devise", "Moyen", "Téléphone", "Statut", "Année académique", "Payé le", "Créé le",
    ];
    const lines = payments.map((p) => [
      p.receiptNumber,
      p.student.lastName,
      p.student.firstName,
      p.student.matricule,
      p.student.establishment.name,
      p.program.name,
      `${p.program.level.name} ${p.studyYear}`,
      Number(p.amount),
      p.currency,
      p.paymentMethod,
      p.phoneNumber,
      p.status,
      p.academicYear,
      csvDateTime(p.paidAt),
      csvDateTime(p.createdAt),
    ]);

    // BOM UTF-8 pour qu'Excel affiche correctement les accents
    const BOM = String.fromCharCode(0xFEFF); // Excel affiche les accents correctement avec un BOM UTF-8
    const csv = BOM + [header, ...lines].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const filename = `paiements_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);

  } catch (err) {
    logger.error("Erreur exportPayments:", err);
    return error(res, "Erreur lors de l'export", 500);
  }
};

// ── Statistiques dashboard (cloisonnées) ──────────────────────────────────────
const getDashboardStats = async (req, res) => {
  const { academicYear } = req.query;
  try {
    const base = { ...scopedPaymentWhere(req), ...(academicYear ? { academicYear } : {}) };

    const [
      totalPayments, successPayments, pendingPayments, failedPayments,
      revenueData, byMethod, recentPayments,
    ] = await Promise.all([
      prisma.payment.count({ where: base }),
      prisma.payment.count({ where: { ...base, status: "SUCCESS" } }),
      prisma.payment.count({ where: { ...base, status: "PENDING" } }),
      prisma.payment.count({ where: { ...base, status: "FAILED" } }),
      prisma.payment.aggregate({ where: { ...base, status: "SUCCESS" }, _sum: { amount: true } }),
      prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: { ...base, status: "SUCCESS" },
        _count: true, _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where: { ...base, status: "SUCCESS" },
        take: 6, orderBy: { paidAt: "desc" },
        include: { student: { include: { establishment: true } } },
      }),
    ]);

    // Répartition par établissement (super admin uniquement)
    let byEstablishment = null;
    if (req.scope.isSuperAdmin) {
      const establishments = await prisma.establishment.findMany({
        where: { isActive: true }, orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      });
      byEstablishment = await Promise.all(
        establishments.map(async (e) => {
          const w = { ...(academicYear ? { academicYear } : {}), student: { establishmentId: e.id } };
          const [count, rev] = await Promise.all([
            prisma.payment.count({ where: { ...w, status: "SUCCESS" } }),
            prisma.payment.aggregate({ where: { ...w, status: "SUCCESS" }, _sum: { amount: true } }),
          ]);
          return { id: e.id, name: e.name, code: e.code, count, revenue: Number(rev._sum.amount || 0) };
        })
      );
    }

    return success(res, {
      scope: {
        isSuperAdmin:  req.scope.isSuperAdmin,
        establishmentId: req.scope.establishmentId,
      },
      overview: {
        total:   totalPayments,
        success: successPayments,
        pending: pendingPayments,
        failed:  failedPayments,
        revenue: Number(revenueData._sum.amount || 0),
      },
      byMethod: byMethod.map((m) => ({
        method: m.paymentMethod, count: m._count, revenue: Number(m._sum.amount || 0),
      })),
      byEstablishment,
      recentPayments: recentPayments.map((p) => ({
        receiptNumber: p.receiptNumber,
        student:       `${p.student.lastName} ${p.student.firstName}`,
        matricule:     p.student.matricule,
        establishment: p.student.establishment.name,
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

module.exports = {
  login, refresh, logout, me,
  searchByMatricule, searchByReceipt, listPayments, exportPayments, getDashboardStats,
};

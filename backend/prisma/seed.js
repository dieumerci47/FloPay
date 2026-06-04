// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Etablissements ──────────────────────────────────────────────────────────
  const establishments = await Promise.all([
    prisma.establishment.upsert({
      where: { code: "FST" },
      update: {},
      create: { name: "Faculté des Sciences et Techniques", code: "FST" },
    }),
    prisma.establishment.upsert({
      where: { code: "FLLASH" },
      update: {},
      create: { name: "Faculté des Lettres, Langues, Arts et Sciences Humaines", code: "FLLASH" },
    }),
    prisma.establishment.upsert({
      where: { code: "FDSE" },
      update: {},
      create: { name: "Faculté de Droit et des Sciences Economiques", code: "FDSE" },
    }),
    prisma.establishment.upsert({
      where: { code: "FSSA" },
      update: {},
      create: { name: "Faculté des Sciences de la Santé", code: "FSSA" },
    }),
    prisma.establishment.upsert({
      where: { code: "IUT" },
      update: {},
      create: { name: "Institut Universitaire de Technologie", code: "IUT" },
    }),
    prisma.establishment.upsert({
      where: { code: "ENSP" },
      update: {},
      create: { name: "Ecole Nationale Supérieure Polytechnique", code: "ENSP" },
    }),
  ]);

  console.log(`✅ ${establishments.length} établissements créés`);

  // ── Parcours FST ────────────────────────────────────────────────────────────
  const fst = establishments.find((e) => e.code === "FST");
  const YEAR = "2024-2025";

  const fstPrograms = [
    { name: "Informatique", level: "Licence 1", amount: 10750 },
    { name: "Informatique", level: "Licence 2", amount: 10750 },
    { name: "Informatique", level: "Licence 3", amount: 10750 },
    { name: "Physique",     level: "Licence 1", amount: 10750 },
    { name: "Physique",     level: "Licence 2", amount: 10750 },
    { name: "Mathématiques",level: "Licence 1", amount: 10750 },
    { name: "Chimie",       level: "Licence 1", amount: 10750 },
    { name: "Informatique", level: "Master 1",  amount: 15000 },
    { name: "Informatique", level: "Master 2",  amount: 15000 },
  ];

  for (const p of fstPrograms) {
    await prisma.program.upsert({
      where: {
        // compound unique — on simule avec findFirst
        id: (await prisma.program.findFirst({
          where: { name: p.name, level: p.level, establishmentId: fst.id, academicYear: YEAR },
        }))?.id ?? "nonexistent",
      },
      update: {},
      create: { ...p, academicYear: YEAR, establishmentId: fst.id },
    });
  }

  console.log(`✅ Parcours FST créés`);

  // ── Admin par défaut ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin@2025!", 12);

  await prisma.admin.upsert({
    where: { email: "admin@umg-paytech.cg" },
    update: {},
    create: {
      email: "admin@umg-paytech.cg",
      passwordHash,
      fullName: "Super Administrateur",
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Admin créé → admin@umg-paytech.cg / Admin@2025!");
  console.log("🎉 Seed terminé !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

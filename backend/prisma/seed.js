// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { LEVELS, ESTABLISHMENTS } = require("./catalog");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Niveaux (cycles) avec leur montant ──────────────────────────────────────
  const levels = {};
  for (const l of LEVELS) {
    levels[l.name] = await prisma.level.upsert({
      where:  { name: l.name },
      update: { amount: l.amount, years: l.years },
      create: l,
    });
  }
  console.log(`✅ ${LEVELS.length} niveaux`);

  const licenceId = levels["Licence"].id;
  const activeCodes = ESTABLISHMENTS.map((e) => e.code);

  // Désactiver les anciens établissements hors catalogue (non destructif)
  await prisma.establishment.updateMany({
    where: { code: { notIn: activeCodes } },
    data:  { isActive: false },
  });

  // ── Établissements + parcours (tous au cycle Licence) ───────────────────────
  let nbParcours = 0;
  for (const e of ESTABLISHMENTS) {
    const establishment = await prisma.establishment.upsert({
      where:  { code: e.code },
      update: { name: e.name, isActive: true },
      create: { name: e.name, code: e.code },
    });

    for (const name of e.parcours) {
      const existing = await prisma.program.findFirst({
        where: { name, levelId: licenceId, establishmentId: establishment.id },
      });
      if (!existing) {
        await prisma.program.create({
          data: { name, levelId: licenceId, establishmentId: establishment.id },
        });
        nbParcours++;
      }
    }
  }
  console.log(`✅ ${ESTABLISHMENTS.length} établissements · ${nbParcours} nouveaux parcours`);

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
  console.log("✅ Admin → admin@umg-paytech.cg / Admin@2025!");
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

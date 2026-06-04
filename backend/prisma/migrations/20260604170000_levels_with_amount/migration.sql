-- Pour gen_random_uuid() sur d'anciennes versions de Postgres
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Nouvelle table "levels" (niveaux/cycles avec montant) ─────────────────────
CREATE TABLE "levels" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "amount"    DECIMAL(10,2) NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "levels_name_key" ON "levels"("name");

-- Montants par cycle (définis par l'utilisateur)
INSERT INTO "levels" ("id","name","amount","updatedAt") VALUES
  (gen_random_uuid(), 'Licence',  21000, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Master',   50000, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Doctorat', 75000, CURRENT_TIMESTAMP);

-- ── Lier les programmes à un niveau ───────────────────────────────────────────
ALTER TABLE "programs" ADD COLUMN "levelId" TEXT;

-- Backfill : "Licence 1/2/3" -> Licence, "Master 1/2" -> Master, "Doctorat..." -> Doctorat
UPDATE "programs" p SET "levelId" = l."id"
FROM "levels" l
WHERE (p."level" ILIKE 'licence%'  AND l."name" = 'Licence')
   OR (p."level" ILIKE 'master%'   AND l."name" = 'Master')
   OR (p."level" ILIKE 'doctorat%' AND l."name" = 'Doctorat');

-- Filet de sécurité : tout programme non rattaché -> Licence
UPDATE "programs" SET "levelId" = (SELECT "id" FROM "levels" WHERE "name" = 'Licence')
WHERE "levelId" IS NULL;

-- ── Dédoublonnage : les anciens L1/L2/L3 fusionnent en un seul parcours ───────
-- On garde un programme canonique par (name, levelId, establishmentId) et on
-- repointe les paiements/étudiants dessus avant de supprimer les doublons.
WITH ranked AS (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "name", "levelId", "establishmentId"
           ORDER BY "createdAt", "id"
         ) AS keep_id
  FROM "programs"
)
UPDATE "payments" pay SET "programId" = r.keep_id
FROM ranked r WHERE pay."programId" = r."id" AND r."id" <> r.keep_id;

WITH ranked AS (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "name", "levelId", "establishmentId"
           ORDER BY "createdAt", "id"
         ) AS keep_id
  FROM "programs"
)
UPDATE "students" stu SET "programId" = r.keep_id
FROM ranked r WHERE stu."programId" = r."id" AND r."id" <> r.keep_id;

WITH ranked AS (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "name", "levelId", "establishmentId"
           ORDER BY "createdAt", "id"
         ) AS keep_id
  FROM "programs"
)
DELETE FROM "programs" WHERE "id" IN (SELECT "id" FROM ranked WHERE "id" <> keep_id);

-- ── Contraintes finales + suppression des anciennes colonnes ──────────────────
ALTER TABLE "programs" ALTER COLUMN "levelId" SET NOT NULL;
ALTER TABLE "programs" ADD CONSTRAINT "programs_levelId_fkey"
  FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "programs" DROP COLUMN "level";
ALTER TABLE "programs" DROP COLUMN "amount";

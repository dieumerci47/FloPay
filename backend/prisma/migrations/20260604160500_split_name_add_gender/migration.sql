-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- AlterTable : nouvelles colonnes (nullable le temps du backfill)
ALTER TABLE "students" ADD COLUMN "lastName"  TEXT;
ALTER TABLE "students" ADD COLUMN "firstName" TEXT;
ALTER TABLE "students" ADD COLUMN "gender"    "Gender";

-- Backfill des lignes existantes à partir de l'ancien fullName
UPDATE "students"
SET "lastName"  = COALESCE(NULLIF(split_part("fullName", ' ', 1), ''), 'INCONNU'),
    "firstName" = COALESCE(NULLIF(BTRIM(SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1)), ''), 'INCONNU'),
    "gender"    = 'M'
WHERE "lastName" IS NULL;

-- Contraintes NOT NULL une fois les données remplies
ALTER TABLE "students" ALTER COLUMN "lastName"  SET NOT NULL;
ALTER TABLE "students" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "students" ALTER COLUMN "gender"    SET NOT NULL;

-- Suppression de l'ancienne colonne
ALTER TABLE "students" DROP COLUMN "fullName";

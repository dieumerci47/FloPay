-- DropIndex
DROP INDEX "students_matricule_key";

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "matricule" DROP NOT NULL;

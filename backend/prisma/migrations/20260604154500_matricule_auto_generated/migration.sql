-- AlterTable : le matricule est désormais toujours généré côté backend
ALTER TABLE "students" ALTER COLUMN "matricule" SET NOT NULL;

-- CreateIndex : unicité du matricule interne
CREATE UNIQUE INDEX "students_matricule_key" ON "students"("matricule");

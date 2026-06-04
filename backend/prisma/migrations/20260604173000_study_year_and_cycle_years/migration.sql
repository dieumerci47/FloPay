-- Nombre d'années par cycle (Licence/Doctorat = 3, Master = 2)
ALTER TABLE "levels" ADD COLUMN "years" INTEGER NOT NULL DEFAULT 3;
UPDATE "levels" SET "years" = 2 WHERE "name" = 'Master';

-- Année dans le cycle choisie au paiement (1 = L1/M1, 2 = L2/M2, ...)
ALTER TABLE "payments" ADD COLUMN "studyYear" INTEGER NOT NULL DEFAULT 1;

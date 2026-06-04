-- AlterTable : l'année n'est plus un attribut du programme.
-- Elle est choisie au moment du paiement et stockée sur "payments".
ALTER TABLE "programs" DROP COLUMN "academicYear";

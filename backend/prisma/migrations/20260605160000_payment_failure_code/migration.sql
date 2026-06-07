-- Code d'échec PawaPay stable (enum), en complément du message d'origine
ALTER TABLE "payments" ADD COLUMN "pawapayFailureCode" TEXT;

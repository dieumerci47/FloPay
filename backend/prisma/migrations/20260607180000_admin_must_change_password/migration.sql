-- Mot de passe provisoire à changer à la première connexion
ALTER TABLE "admins" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

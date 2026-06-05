-- ─── Enum AdminRole : AGENT → ESTABLISHMENT_ADMIN (rename non destructif) ──────
ALTER TYPE "AdminRole" RENAME VALUE 'AGENT' TO 'ESTABLISHMENT_ADMIN';
ALTER TABLE "admins" ALTER COLUMN "role" SET DEFAULT 'ESTABLISHMENT_ADMIN';

-- ─── Admins : rattachement établissement + sécurité anti brute-force ───────────
ALTER TABLE "admins" ADD COLUMN "establishmentId" TEXT;
ALTER TABLE "admins" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "admins" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "admins" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "admins" ADD CONSTRAINT "admins_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Refresh tokens (rotation, stockés hashés) ────────────────────────────────
CREATE TABLE "refresh_tokens" (
  "id"        TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "userAgent" TEXT,
  "ip"        TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "adminId"   TEXT NOT NULL,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_adminId_idx" ON "refresh_tokens"("adminId");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "admins"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Journal d'audit ──────────────────────────────────────────────────────────
CREATE TABLE "audit_logs" (
  "id"         TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "targetType" TEXT,
  "targetId"   TEXT,
  "detail"     TEXT,
  "ip"         TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "adminId"    TEXT,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "admins"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

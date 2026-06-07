-- Index de performance pour les filtres fréquents (liste paiements, dashboard, scope)
CREATE INDEX "payments_status_idx"       ON "payments"("status");
CREATE INDEX "payments_academicYear_idx" ON "payments"("academicYear");
CREATE INDEX "payments_createdAt_idx"    ON "payments"("createdAt");
CREATE INDEX "payments_paidAt_idx"       ON "payments"("paidAt");
CREATE INDEX "students_establishmentId_idx" ON "students"("establishmentId");

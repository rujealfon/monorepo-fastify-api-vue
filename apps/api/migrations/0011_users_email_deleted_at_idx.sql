CREATE INDEX "users_email_deleted_at_idx" ON "users" ("email","deleted_at") WHERE "deleted_at" IS NOT NULL;

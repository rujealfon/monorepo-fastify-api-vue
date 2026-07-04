-- Fine as-is for dev/test/CI (empty or small `users` table — lock is instant).
-- On a production `users` table with real rows, run
-- src/db/prod-migrations/0014-email-lowercase.ts instead of letting drizzle-kit
-- apply this file: it does the same backfill + index swap without holding a
-- write lock (see the comment in that script for why this file can't).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
    WHERE deleted_at IS NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'users_email_unique migration aborted: active rows collide on lower(email); resolve duplicates manually before re-running';
  END IF;
END $$;--> statement-breakpoint
UPDATE "users" SET "email" = lower("email") WHERE "email" <> lower("email");--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email")) WHERE "users"."deleted_at" IS NULL;

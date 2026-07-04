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

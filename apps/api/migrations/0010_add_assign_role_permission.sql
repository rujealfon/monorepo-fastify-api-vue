INSERT INTO "permissions" ("id", "resource", "action", "scope")
VALUES
  (gen_random_uuid(), 'user', 'assign-role', 'any')
ON CONFLICT ("resource", "action", "scope") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON (
  p."resource" = 'user'
  AND p."action" = 'assign-role'
  AND p."scope" = 'any'
)
WHERE r."name" = 'super-admin'
ON CONFLICT DO NOTHING;

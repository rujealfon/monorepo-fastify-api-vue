INSERT INTO "permissions" ("id", "resource", "action", "scope")
VALUES
  (gen_random_uuid(), 'product', 'read', 'any'),
  (gen_random_uuid(), 'product', 'create', 'any'),
  (gen_random_uuid(), 'product', 'update', 'any'),
  (gen_random_uuid(), 'product', 'delete', 'any'),
  (gen_random_uuid(), 'metrics', 'read', 'any'),
  (gen_random_uuid(), 'health', 'read', 'details')
ON CONFLICT ("resource", "action", "scope") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN (
  VALUES
    ('product', 'read', 'any'),
    ('product', 'create', 'any'),
    ('product', 'update', 'any'),
    ('product', 'delete', 'any'),
    ('metrics', 'read', 'any'),
    ('health', 'read', 'details')
) AS added_permissions("resource", "action", "scope")
  ON true
JOIN "permissions" p ON (
  p."resource" = added_permissions."resource"
  AND p."action" = added_permissions."action"
  AND p."scope" = added_permissions."scope"
)
WHERE r."name" = 'super-admin'
  OR (r."name" = 'admin' AND (
    added_permissions."resource" = 'product'
    OR added_permissions."resource" = 'health'
  ))
  OR (r."name" = 'user' AND added_permissions."resource" = 'product' AND added_permissions."action" = 'read')
ON CONFLICT DO NOTHING;

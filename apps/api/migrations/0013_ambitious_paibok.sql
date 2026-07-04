DROP INDEX "audit_logs_user_id_idx";--> statement-breakpoint
DROP INDEX "products_deleted_at_idx";--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "products_live_created_at_idx" ON "products" USING btree ("created_at") WHERE "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");
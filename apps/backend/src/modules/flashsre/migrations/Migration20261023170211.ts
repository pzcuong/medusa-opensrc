import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261023170211 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "flashsre_check_run" ("id" text not null, "contract_id" text not null, "contract_version" integer not null, "trigger" text check ("trigger" in ('manual', 'scheduled')) not null default 'manual', "total" integer not null, "by_kind" jsonb not null, "result" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "flashsre_check_run_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_check_run_deleted_at" ON "flashsre_check_run" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_check_run_contract_id" ON "flashsre_check_run" ("contract_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "flashsre_check_run" cascade;`);
  }

}

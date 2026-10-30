import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261023180133 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "flashsre_agent_run" ("id" text not null, "contract_id" text not null, "finding_key" text not null, "title" text not null, "verdict" text not null, "confidence" integer not null, "status" text not null, "llm" text not null, "dossier" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "flashsre_agent_run_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_agent_run_deleted_at" ON "flashsre_agent_run" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_agent_run_contract_id" ON "flashsre_agent_run" ("contract_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "flashsre_agent_run" cascade;`);
  }

}

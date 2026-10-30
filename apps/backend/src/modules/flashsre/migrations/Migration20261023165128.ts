import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261023165128 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "flashsre_campaign_contract" drop constraint if exists "flashsre_campaign_contract_contract_id_version_unique";`);
    this.addSql(`create table if not exists "flashsre_campaign_contract" ("id" text not null, "contract_id" text not null, "version" integer not null, "status" text check ("status" in ('draft', 'approved', 'retired')) not null default 'approved', "approved_by" text null, "body" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "flashsre_campaign_contract_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_campaign_contract_deleted_at" ON "flashsre_campaign_contract" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_flashsre_campaign_contract_contract_id_version_unique" ON "flashsre_campaign_contract" ("contract_id", "version") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "flashsre_config_change" ("id" text not null, "actor_id" text null, "actor_email" text null, "team" text null, "method" text not null, "route" text not null, "entity_type" text not null, "entity_id" text null, "entity_label" text null, "status_code" integer not null, "request_body" jsonb null, "before" jsonb null, "after" jsonb null, "diff" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "flashsre_config_change_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_config_change_deleted_at" ON "flashsre_config_change" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_config_change_entity_id" ON "flashsre_config_change" ("entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_flashsre_config_change_team" ON "flashsre_config_change" ("team") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "flashsre_campaign_contract" cascade;`);

    this.addSql(`drop table if exists "flashsre_config_change" cascade;`);
  }

}

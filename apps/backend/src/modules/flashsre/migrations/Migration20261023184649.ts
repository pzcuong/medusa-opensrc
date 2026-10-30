import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261023184649 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "flashsre_agent_run" alter column "confidence" type real using ("confidence"::real);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "flashsre_agent_run" alter column "confidence" type integer using ("confidence"::integer);`);
  }

}

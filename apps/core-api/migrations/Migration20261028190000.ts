'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

/** Identity facts on the user, and the salary history table. */
class Migration20261028190000 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "hire_date" date null, add column "end_date" date null, add column "insurance_number" varchar(255) null, add column "sheba" varchar(255) null, add column "email" varchar(255) null;`);

    this.addSql(`create table "salary_change_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "period" int not null, "salary" bigint not null, "type" text check ("type" in ('start', 'raise', 'decrease')) not null, "note" varchar(255) null, "created_by_id" int null);`);
    this.addSql(`alter table "salary_change_entity" add constraint "salary_change_entity_user_id_period_unique" unique ("user_id", "period");`);

    this.addSql(`alter table "salary_change_entity" add constraint "salary_change_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade;`);
    this.addSql(`alter table "salary_change_entity" add constraint "salary_change_entity_created_by_id_foreign" foreign key ("created_by_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`drop table if exists "salary_change_entity" cascade;`);
    this.addSql(`alter table "user_entity" drop column "hire_date", drop column "end_date", drop column "insurance_number", drop column "sheba", drop column "email";`);
  }

}
exports.Migration20261028190000 = Migration20261028190000;

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261025193727 extends Migration {

  async up() {
    this.addSql(`alter table "job_group_entity" add column "attendance_mode" text check ("attendance_mode" in ('tracked', 'flexible', 'untracked')) not null default 'tracked';`);

    this.addSql(`alter table "employee_profile_entity" add column "attendance_mode_override" text check ("attendance_mode_override" in ('tracked', 'flexible', 'untracked')) null;`);

    this.addSql(`alter table "attendance_request_entity" add column "auto_suggested" boolean not null default false;`);

    this.addSql(`create table "employee_mode_period_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "employee_id" int not null, "mode" text check ("mode" in ('tracked', 'flexible', 'untracked')) not null, "start_date" date not null);`);
    this.addSql(`create index "employee_mode_period_entity_employee_id_start_date_index" on "employee_mode_period_entity" ("employee_id", "start_date");`);

    this.addSql(`create table "presence_declaration_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "employee_id" int not null, "date" date not null, "declared_at" timestamptz not null, "declared_by_id" int null, "note" varchar(500) null);`);
    this.addSql(`alter table "presence_declaration_entity" add constraint "presence_declaration_entity_employee_id_date_unique" unique ("employee_id", "date");`);

    this.addSql(`alter table "employee_mode_period_entity" add constraint "employee_mode_period_entity_employee_id_foreign" foreign key ("employee_id") references "employee_profile_entity" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "presence_declaration_entity" add constraint "presence_declaration_entity_employee_id_foreign" foreign key ("employee_id") references "employee_profile_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "presence_declaration_entity" add constraint "presence_declaration_entity_declared_by_id_foreign" foreign key ("declared_by_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`drop table if exists "presence_declaration_entity" cascade;`);

    this.addSql(`drop table if exists "employee_mode_period_entity" cascade;`);

    this.addSql(`alter table "attendance_request_entity" drop column "auto_suggested";`);

    this.addSql(`alter table "employee_profile_entity" drop column "attendance_mode_override";`);

    this.addSql(`alter table "job_group_entity" drop column "attendance_mode";`);
  }

}
exports.Migration20261025193727 = Migration20261025193727;

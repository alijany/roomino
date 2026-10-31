'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261028192327 extends Migration {

  async up() {
    this.addSql(`create table "payroll_line_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "period" int not null, "status" text check ("status" in ('draft', 'final')) not null default 'draft', "days" numeric(5,2) not null default 30, "overtime_hours" numeric(7,2) not null default 0, "night_hours" numeric(7,2) not null default 0, "holiday_hours" numeric(7,2) not null default 0, "deficit_hours" numeric(7,2) not null default 0, "mission_days" numeric(5,2) not null default 0, "leave_remain_days" numeric(5,2) not null default 0, "bonus" bigint not null default 0, "advance" bigint not null default 0, "loan" bigint not null default 0, "other_deductions" bigint not null default 0, "pay_eidi" boolean not null default false, "settle" boolean not null default false, "note" varchar(255) null, "agreed" bigint not null default 0, "agreement" varchar(255) not null default 'gross', "base" bigint not null default 0, "housing" bigint not null default 0, "bon" bigint not null default 0, "marriage" bigint not null default 0, "child" bigint not null default 0, "seniority" bigint not null default 0, "overtime" bigint not null default 0, "mission" bigint not null default 0, "eidi" bigint not null default 0, "severance" bigint not null default 0, "leave_buyout" bigint not null default 0, "gross" bigint not null default 0, "deficit" bigint not null default 0, "worker_insurance" bigint not null default 0, "tax" bigint not null default 0, "total_deductions" bigint not null default 0, "net" bigint not null default 0, "employer_insurance" bigint not null default 0, "accrual" bigint not null default 0, "total_cost" bigint not null default 0, "warnings" jsonb not null);`);
    this.addSql(`alter table "payroll_line_entity" add constraint "payroll_line_entity_user_id_period_unique" unique ("user_id", "period");`);

    this.addSql(`alter table "payroll_line_entity" add constraint "payroll_line_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade;`);
  }

  async down() {
    this.addSql(`drop table if exists "payroll_line_entity" cascade;`);
  }

}
exports.Migration20261028192327 = Migration20261028192327;

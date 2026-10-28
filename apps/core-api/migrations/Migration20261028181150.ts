'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261028181150 extends Migration {

  async up() {
    this.addSql(`create table "payroll_setting_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "year" int not null, "min_daily" bigint not null, "min_monthly" bigint not null, "seniority_daily" bigint not null, "housing" bigint not null, "bon" bigint not null, "marriage" bigint not null, "child" bigint not null, "ins_ceiling" bigint not null, "tax_exempt" bigint not null, "tax_limit1" bigint not null, "tax_limit2" bigint not null, "tax_limit3" bigint not null, "tax_limit4" bigint not null, "tax_eidi_exempt" bigint not null, "eidi_cap" bigint not null, "ins_worker" numeric(5,2) not null, "ins_employer" numeric(5,2) not null, "ins_unemployment" numeric(5,2) not null, "tax_rate1" numeric(5,2) not null, "tax_rate2" numeric(5,2) not null, "tax_rate3" numeric(5,2) not null, "tax_rate4" numeric(5,2) not null, "tax_rate5" numeric(5,2) not null, "tax_overtime_rate" numeric(5,2) not null, "tax_insurance_fraction" numeric(5,2) not null, "tax_noncash" numeric(5,2) not null, "overtime_rate" numeric(5,2) not null, "night_rate" numeric(5,2) not null, "holiday_rate" numeric(5,2) not null, "mission_rate" numeric(5,2) not null, "eidi_days" int not null, "severance_days" int not null, "leave_days" int not null, "leave_carry_days" int not null, "week_hours" int not null, "wage_hours" int not null, "inclusion" jsonb not null);`);
    this.addSql(`alter table "payroll_setting_entity" add constraint "payroll_setting_entity_year_unique" unique ("year");`);
  }

  async down() {
    this.addSql(`drop table if exists "payroll_setting_entity" cascade;`);
  }

}
exports.Migration20261028181150 = Migration20261028181150;

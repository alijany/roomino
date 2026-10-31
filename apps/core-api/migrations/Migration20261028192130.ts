'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261028192130 extends Migration {

  async up() {
    this.addSql(`alter table "payroll_setting_entity" alter column "ins_worker" type numeric(7,4) using ("ins_worker"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "ins_employer" type numeric(7,4) using ("ins_employer"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "ins_unemployment" type numeric(7,4) using ("ins_unemployment"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate1" type numeric(7,4) using ("tax_rate1"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate2" type numeric(7,4) using ("tax_rate2"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate3" type numeric(7,4) using ("tax_rate3"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate4" type numeric(7,4) using ("tax_rate4"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate5" type numeric(7,4) using ("tax_rate5"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_overtime_rate" type numeric(7,4) using ("tax_overtime_rate"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_insurance_fraction" type numeric(7,4) using ("tax_insurance_fraction"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_noncash" type numeric(7,4) using ("tax_noncash"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "overtime_rate" type numeric(7,4) using ("overtime_rate"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "night_rate" type numeric(7,4) using ("night_rate"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "holiday_rate" type numeric(7,4) using ("holiday_rate"::numeric(7,4));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "mission_rate" type numeric(7,4) using ("mission_rate"::numeric(7,4));`);
  }

  async down() {
    this.addSql(`alter table "payroll_setting_entity" alter column "ins_worker" type numeric(5,2) using ("ins_worker"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "ins_employer" type numeric(5,2) using ("ins_employer"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "ins_unemployment" type numeric(5,2) using ("ins_unemployment"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate1" type numeric(5,2) using ("tax_rate1"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate2" type numeric(5,2) using ("tax_rate2"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate3" type numeric(5,2) using ("tax_rate3"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate4" type numeric(5,2) using ("tax_rate4"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_rate5" type numeric(5,2) using ("tax_rate5"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_overtime_rate" type numeric(5,2) using ("tax_overtime_rate"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_insurance_fraction" type numeric(5,2) using ("tax_insurance_fraction"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "tax_noncash" type numeric(5,2) using ("tax_noncash"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "overtime_rate" type numeric(5,2) using ("overtime_rate"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "night_rate" type numeric(5,2) using ("night_rate"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "holiday_rate" type numeric(5,2) using ("holiday_rate"::numeric(5,2));`);
    this.addSql(`alter table "payroll_setting_entity" alter column "mission_rate" type numeric(5,2) using ("mission_rate"::numeric(5,2));`);
  }

}
exports.Migration20261028192130 = Migration20261028192130;

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261102210215 extends Migration {

  async up() {
    this.addSql(`alter table "payroll_setting_entity" add column "supp_start_month" int null, add column "supp_end_month" int null, add column "supp_amount" bigint not null default 0;`);

    this.addSql(`alter table "user_entity" add column "supplementary_insurance" boolean not null default false, add column "supplementary_insurance_start" date null, add column "supplementary_insurance_amount" bigint null;`);

    this.addSql(`alter table "payroll_line_entity" add column "supplementary_insurance" bigint not null default 0;`);
  }

  async down() {
    this.addSql(`alter table "payroll_line_entity" drop column "supplementary_insurance";`);

    this.addSql(`alter table "payroll_setting_entity" drop column "supp_start_month", drop column "supp_end_month", drop column "supp_amount";`);

    this.addSql(`alter table "user_entity" drop column "supplementary_insurance", drop column "supplementary_insurance_start", drop column "supplementary_insurance_amount";`);
  }

}
exports.Migration20261102210215 = Migration20261102210215;

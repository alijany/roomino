'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261120132657 extends Migration {

  async up() {
    this.addSql(`alter table "payroll_line_entity" add column "salary_paid_on" date null, add column "extras_paid_on" date null;`);
  }

  async down() {
    this.addSql(`alter table "payroll_line_entity" drop column "salary_paid_on", drop column "extras_paid_on";`);
  }

}
exports.Migration20261120132657 = Migration20261120132657;

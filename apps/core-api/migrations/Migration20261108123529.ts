'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261108123529 extends Migration {

  async up() {
    this.addSql(`alter table "payroll_setting_entity" add column "seniority_raise" numeric(7,4) not null default 45;`);
  }

  async down() {
    this.addSql(`alter table "payroll_setting_entity" drop column "seniority_raise";`);
  }

}
exports.Migration20261108123529 = Migration20261108123529;

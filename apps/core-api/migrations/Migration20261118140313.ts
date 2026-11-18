'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261118140313 extends Migration {

  async up() {
    this.addSql(`alter table "payroll_line_entity" add column "commission" bigint not null default 0, add column "on_call" bigint not null default 0;`);
  }

  async down() {
    this.addSql(`alter table "payroll_line_entity" drop column "commission", drop column "on_call";`);
  }

}
exports.Migration20261118140313 = Migration20261118140313;

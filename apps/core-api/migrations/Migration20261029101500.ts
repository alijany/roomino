'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261029101500 extends Migration {

  async up() {
    this.addSql(`alter table "payroll_line_entity" add column "facts" jsonb null;`);
  }

  async down() {
    this.addSql(`alter table "payroll_line_entity" drop column "facts";`);
  }

}
exports.Migration20261029101500 = Migration20261029101500;

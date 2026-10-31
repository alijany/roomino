'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261028211929 extends Migration {

  async up() {
    this.addSql(`alter table "payroll_line_entity" add column "revisions" jsonb not null default '[]';`);
  }

  async down() {
    this.addSql(`alter table "payroll_line_entity" drop column "revisions";`);
  }

}
exports.Migration20261028211929 = Migration20261028211929;

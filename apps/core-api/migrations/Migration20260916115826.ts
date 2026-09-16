'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260916115826 extends Migration {

  async up() {
    this.addSql(`alter table "recurring_expense_entity" drop column "auto_generate";`);
  }

  async down() {
    this.addSql(`alter table "recurring_expense_entity" add column "auto_generate" bool not null default true;`);
  }

}
exports.Migration20260916115826 = Migration20260916115826;

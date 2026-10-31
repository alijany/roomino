'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261030095904 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "probation_end_date" date null;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "probation_end_date";`);
  }

}
exports.Migration20261030095904 = Migration20261030095904;

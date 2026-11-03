'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261103095629 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "birth_date" date null;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "birth_date";`);
  }

}
exports.Migration20261103095629 = Migration20261103095629;

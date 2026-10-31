'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261030130734 extends Migration {

  async up() {
    this.addSql(`alter table "final_settlement_entity" add column "severance_from" date null, add column "severance_to" date null;`);
  }

  async down() {
    this.addSql(`alter table "final_settlement_entity" drop column "severance_from", drop column "severance_to";`);
  }

}
exports.Migration20261030130734 = Migration20261030130734;

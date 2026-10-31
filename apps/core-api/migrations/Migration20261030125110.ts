'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261030125110 extends Migration {

  async up() {
    this.addSql(`alter table "final_settlement_entity" add column "eidi_months" numeric(5,2) null;`);
  }

  async down() {
    this.addSql(`alter table "final_settlement_entity" drop column "eidi_months";`);
  }

}
exports.Migration20261030125110 = Migration20261030125110;

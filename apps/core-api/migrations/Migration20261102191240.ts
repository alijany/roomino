'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261102191240 extends Migration {

  async up() {
    this.addSql(`alter table "contract_entity" drop column "reminder_stage";`);
  }

  async down() {
    this.addSql(`alter table "contract_entity" add column "reminder_stage" int4 null;`);
  }

}
exports.Migration20261102191240 = Migration20261102191240;

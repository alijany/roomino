'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261030125738 extends Migration {

  async up() {
    this.addSql(`alter table "final_settlement_entity" add column "severance_pro_rata" boolean not null default false;`);
  }

  async down() {
    this.addSql(`alter table "final_settlement_entity" drop column "severance_pro_rata";`);
  }

}
exports.Migration20261030125738 = Migration20261030125738;

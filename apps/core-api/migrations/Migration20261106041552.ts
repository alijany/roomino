'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261106041552 extends Migration {

  async up() {
    this.addSql(`alter table "on_call_settings_entity" add column "hourly_rates" jsonb null;`);
  }

  async down() {
    this.addSql(`alter table "on_call_settings_entity" drop column "hourly_rates";`);
  }

}
exports.Migration20261106041552 = Migration20261106041552;

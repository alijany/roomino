'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261115090000 extends Migration {

  async up() {
    this.addSql(`alter table "on_call_settings_entity" drop column "hourly_rates";`);
    this.addSql(`alter table "on_call_settings_entity" add column "multipliers" jsonb null;`);
  }

  async down() {
    this.addSql(`alter table "on_call_settings_entity" drop column "multipliers";`);
    this.addSql(`alter table "on_call_settings_entity" add column "hourly_rates" jsonb null;`);
  }

}
exports.Migration20261115090000 = Migration20261115090000;

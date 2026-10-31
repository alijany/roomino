'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261031072512 extends Migration {

  async up() {
    this.addSql(`create table "site_setting_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "key" varchar(255) not null, "value" jsonb not null);`);
    this.addSql(`alter table "site_setting_entity" add constraint "site_setting_entity_key_unique" unique ("key");`);
  }

  async down() {
    this.addSql(`drop table if exists "site_setting_entity" cascade;`);
  }

}
exports.Migration20261031072512 = Migration20261031072512;

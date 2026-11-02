'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261102185032 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "nda_signed" boolean not null default false, add column "nda_signed_date" date null;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "nda_signed", drop column "nda_signed_date";`);
  }

}
exports.Migration20261102185032 = Migration20261102185032;

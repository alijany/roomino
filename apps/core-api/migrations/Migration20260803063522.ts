'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260803063522 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "is_approved" boolean not null default true;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "is_approved";`);
  }

}
exports.Migration20260803063522 = Migration20260803063522;

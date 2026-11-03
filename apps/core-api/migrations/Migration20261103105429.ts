'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261103105429 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "display_name" varchar(60) null;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "display_name";`);
  }

}
exports.Migration20261103105429 = Migration20261103105429;

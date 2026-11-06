'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261106035519 extends Migration {

  async up() {
    this.addSql(`alter table "notification_entity" alter column "message" type text using ("message"::text);`);
  }

  async down() {
    this.addSql(`alter table "notification_entity" alter column "message" type varchar(255) using ("message"::varchar(255));`);
  }

}
exports.Migration20261106035519 = Migration20261106035519;

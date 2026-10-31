'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261031124624 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "cooperation_ended" boolean not null default false;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "cooperation_ended";`);
  }

}
exports.Migration20261031124624 = Migration20261031124624;

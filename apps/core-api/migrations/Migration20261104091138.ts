'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261104091138 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "father_name" varchar(60) null;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "father_name";`);
  }

}
exports.Migration20261104091138 = Migration20261104091138;

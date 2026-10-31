'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261028190100 extends Migration {

  async up() {
    this.addSql(`alter table "salary_change_entity" add column "status" text check ("status" in ('proposed', 'confirmed')) not null default 'confirmed';`);
    this.addSql(`alter table "salary_change_entity" alter column "type" type text using ("type"::text);`);
    this.addSql(`alter table "salary_change_entity" alter column "type" drop not null;`);
  }

  async down() {
    this.addSql(`alter table "salary_change_entity" drop column "status";`);

    this.addSql(`alter table "salary_change_entity" alter column "type" type text using ("type"::text);`);
    this.addSql(`alter table "salary_change_entity" alter column "type" set not null;`);
  }

}
exports.Migration20261028190100 = Migration20261028190100;

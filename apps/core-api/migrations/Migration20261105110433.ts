'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261105110433 extends Migration {

  async up() {
    this.addSql(`alter table "job_group_entity" add column "parent_id" int null;`);
    this.addSql(`alter table "job_group_entity" add constraint "job_group_entity_parent_id_foreign" foreign key ("parent_id") references "job_group_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`alter table "job_group_entity" drop constraint "job_group_entity_parent_id_foreign";`);

    this.addSql(`alter table "job_group_entity" drop column "parent_id";`);
  }

}
exports.Migration20261105110433 = Migration20261105110433;

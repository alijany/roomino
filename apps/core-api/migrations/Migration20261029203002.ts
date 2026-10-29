'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261029203002 extends Migration {

  async up() {
    this.addSql(`alter table "job_group_entity" add column "remote_days" jsonb null;`);
  }

  async down() {
    this.addSql(`alter table "job_group_entity" drop column "remote_days";`);
  }

}
exports.Migration20261029203002 = Migration20261029203002;

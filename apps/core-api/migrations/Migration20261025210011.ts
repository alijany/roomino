'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261025210011 extends Migration {

  async up() {
    this.addSql(`alter table "presence_declaration_entity" add column "work_mode" text check ("work_mode" in ('office', 'remote')) not null default 'office', add column "lat" double precision null, add column "lng" double precision null, add column "distance_m" int null;`);
  }

  async down() {
    this.addSql(`alter table "presence_declaration_entity" drop column "work_mode", drop column "lat", drop column "lng", drop column "distance_m";`);
  }

}
exports.Migration20261025210011 = Migration20261025210011;

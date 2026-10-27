'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261027063935 extends Migration {

  async up() {
    this.addSql(`create table "attendance_settings_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "self_declared" boolean not null default false, "self_declared_changed_at" timestamptz null, "self_declared_changed_by_id" int null);`);

    this.addSql(`alter table "attendance_settings_entity" add constraint "attendance_settings_entity_self_declared_changed_by_id_foreign" foreign key ("self_declared_changed_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "attendance_entity" drop constraint if exists "attendance_entity_check_in_source_check";`);
    this.addSql(`alter table "attendance_entity" drop constraint if exists "attendance_entity_check_out_source_check";`);

    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_check_in_source_check" check("check_in_source" in ('gps', 'wifi', 'manual', 'self'));`);
    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_check_out_source_check" check("check_out_source" in ('gps', 'wifi', 'manual', 'self'));`);
  }

  async down() {
    this.addSql(`drop table if exists "attendance_settings_entity" cascade;`);

    this.addSql(`alter table "attendance_entity" drop constraint if exists "attendance_entity_check_in_source_check";`);
    this.addSql(`alter table "attendance_entity" drop constraint if exists "attendance_entity_check_out_source_check";`);

    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_check_in_source_check" check("check_in_source" in ('gps', 'wifi', 'manual'));`);
    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_check_out_source_check" check("check_out_source" in ('gps', 'wifi', 'manual'));`);
  }

}
exports.Migration20261027063935 = Migration20261027063935;

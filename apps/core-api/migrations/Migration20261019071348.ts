'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261019071348 extends Migration {

  async up() {
    this.addSql(`create table "attendance_settings_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_only" boolean not null default false, "request_only_note" varchar(500) null, "updated_by_id" int null);`);

    this.addSql(`alter table "attendance_settings_entity" add constraint "attendance_settings_entity_updated_by_id_foreign" foreign key ("updated_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    // The single settings row (AttendanceSettingsService reads id 1). Fixed
    // id, so the serial sequence is never used.
    this.addSql(`insert into "attendance_settings_entity" ("id", "created_at", "updated_at", "request_only") values (1, now(), now(), false);`);
  }

  async down() {
    this.addSql(`drop table if exists "attendance_settings_entity" cascade;`);
  }

}
exports.Migration20261019071348 = Migration20261019071348;

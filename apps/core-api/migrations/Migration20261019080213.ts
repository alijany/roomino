'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261019080213 extends Migration {

  async up() {
    this.addSql(`create table "schedule_mode_period_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "start_date" date not null, "end_date" date null, "note" varchar(500) null, "started_by_id" int null, "ended_by_id" int null);`);
    this.addSql(`create index "schedule_mode_period_entity_start_date_end_date_index" on "schedule_mode_period_entity" ("start_date", "end_date");`);

    this.addSql(`alter table "schedule_mode_period_entity" add constraint "schedule_mode_period_entity_started_by_id_foreign" foreign key ("started_by_id") references "user_entity" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "schedule_mode_period_entity" add constraint "schedule_mode_period_entity_ended_by_id_foreign" foreign key ("ended_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`drop table if exists "attendance_settings_entity" cascade;`);
  }

  async down() {
    this.addSql(`create table "attendance_settings_entity" ("id" serial primary key, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "request_only" bool not null default false, "request_only_note" varchar(500) null, "updated_by_id" int4 null);`);

    this.addSql(`alter table "attendance_settings_entity" add constraint "attendance_settings_entity_updated_by_id_foreign" foreign key ("updated_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`drop table if exists "schedule_mode_period_entity" cascade;`);
  }

}
exports.Migration20261019080213 = Migration20261019080213;

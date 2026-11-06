'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261105172937 extends Migration {

  async up() {
    this.addSql(`create table "on_call_period_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "start_date" date not null, "status" text check ("status" in ('draft', 'published')) not null default 'draft');`);
    this.addSql(`alter table "on_call_period_entity" add constraint "on_call_period_entity_start_date_unique" unique ("start_date");`);

    this.addSql(`create table "on_call_settings_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "templates" jsonb not null, "period_start_day" int not null default 26, "member_order" jsonb not null);`);

    this.addSql(`create table "on_call_shift_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "date" date not null, "user_id" int not null, "start_time" varchar(5) not null, "end_time" varchar(5) not null);`);
    this.addSql(`create index "on_call_shift_entity_date_index" on "on_call_shift_entity" ("date");`);

    this.addSql(`alter table "on_call_shift_entity" add constraint "on_call_shift_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade on delete cascade;`);
  }

  async down() {
    this.addSql(`drop table if exists "on_call_period_entity" cascade;`);

    this.addSql(`drop table if exists "on_call_settings_entity" cascade;`);

    this.addSql(`drop table if exists "on_call_shift_entity" cascade;`);
  }

}
exports.Migration20261105172937 = Migration20261105172937;

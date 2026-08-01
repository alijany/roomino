'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260801124243 extends Migration {

  async up() {
    this.addSql(`create table "meeting_room_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "description" varchar(255) null, "capacity" int null, "location" varchar(255) null, "active" boolean not null default true);`);

    this.addSql(`create table "recurring_reservation_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "room_id" int not null, "weekday" int not null, "start_minutes" int not null, "end_minutes" int not null, "title" varchar(255) not null, "active" boolean not null default true);`);

    this.addSql(`create table "sms_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "to" varchar(255) not null, "from" varchar(255) not null, "message" varchar(255) not null, "metadata" jsonb not null, "status" text check ("status" in ('pending', 'sent', 'delivered', 'failed')) not null default 'pending');`);

    this.addSql(`create table "user_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "first_name" varchar(255) null, "last_name" varchar(255) null, "national_id" varchar(255) null, "organization_name" varchar(255) null, "organization_registration_number" varchar(255) null, "organization_national_id" varchar(255) null, "organization_representative" varchar(255) null, "chat_id" bigint null, "phone" varchar(255) null, "profile_picture" varchar(255) null, "user_type" varchar(255) not null default 'individual');`);
    this.addSql(`alter table "user_entity" add constraint "user_entity_chat_id_unique" unique ("chat_id");`);
    this.addSql(`alter table "user_entity" add constraint "user_entity_phone_unique" unique ("phone");`);

    this.addSql(`create table "roles_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "role" text check ("role" in ('admin', 'owner', 'manager', 'member', 'user', 'guest')) not null default 'user', "description" varchar(255) null, "user_id" int not null, "invitation_status" text check ("invitation_status" in ('pending', 'awaiting_profile_completion', 'accepted')) not null default 'pending');`);

    this.addSql(`create table "reservation_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "room_id" int not null, "user_id" int not null, "start_at" timestamptz not null, "end_at" timestamptz not null, "title" varchar(255) null, "purpose" varchar(255) null);`);
    this.addSql(`create index "reservation_entity_room_id_start_at_index" on "reservation_entity" ("room_id", "start_at");`);

    this.addSql(`create table "notification_preference_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "category" text check ("category" in ('system', 'general')) not null, "enabled" boolean not null default true, "sms_enabled" boolean not null default true, "email_enabled" boolean not null default true, "app_push_enabled" boolean not null default true, "telegram_enabled" boolean not null default true);`);

    this.addSql(`create table "notification_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int null, "recipient_phone" varchar(255) null, "recipient_chat_id" bigint null, "type" text check ("type" in ('sms', 'email', 'app_push', 'telegram_bot', 'system')) not null, "category" text check ("category" in ('system', 'general')) not null default 'general', "message" varchar(255) not null, "link" varchar(255) null, "metadata" jsonb not null, "status" text check ("status" in ('pending', 'sent', 'delivered', 'failed', 'canceled')) not null default 'pending', "priority" varchar(255) not null default 'normal', "is_read" boolean not null default false, "read_at" timestamptz null, "sent_at" timestamptz null, "error_message" varchar(255) null);`);

    this.addSql(`alter table "recurring_reservation_entity" add constraint "recurring_reservation_entity_room_id_foreign" foreign key ("room_id") references "meeting_room_entity" ("id") on update cascade;`);

    this.addSql(`alter table "roles_entity" add constraint "roles_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade;`);

    this.addSql(`alter table "reservation_entity" add constraint "reservation_entity_room_id_foreign" foreign key ("room_id") references "meeting_room_entity" ("id") on update cascade;`);
    this.addSql(`alter table "reservation_entity" add constraint "reservation_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade;`);

    this.addSql(`alter table "notification_preference_entity" add constraint "notification_preference_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade;`);

    this.addSql(`alter table "notification_entity" add constraint "notification_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

}
exports.Migration20260801124243 = Migration20260801124243;

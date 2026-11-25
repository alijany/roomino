'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261125192602 extends Migration {

  async up() {
    this.addSql(`alter table "attendance_settings_entity" add column "checkin_reminder_enabled" boolean not null default false, add column "checkin_reminder_time" varchar(5) not null default '09:30', add column "checkin_reminder_changed_at" timestamptz null, add column "checkin_reminder_changed_by_id" int null;`);
    this.addSql(`alter table "attendance_settings_entity" add constraint "attendance_settings_entity_checkin_reminder_chan_300ce_foreign" foreign key ("checkin_reminder_changed_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "employee_profile_entity" add column "checkin_reminder_sent_on" date null;`);
  }

  async down() {
    this.addSql(`alter table "attendance_settings_entity" drop constraint "attendance_settings_entity_checkin_reminder_chan_300ce_foreign";`);

    this.addSql(`alter table "attendance_settings_entity" drop column "checkin_reminder_enabled", drop column "checkin_reminder_time", drop column "checkin_reminder_changed_at", drop column "checkin_reminder_changed_by_id";`);

    this.addSql(`alter table "employee_profile_entity" drop column "checkin_reminder_sent_on";`);
  }

}
exports.Migration20261125192602 = Migration20261125192602;

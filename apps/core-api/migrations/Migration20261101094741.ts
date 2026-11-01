'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261101094741 extends Migration {

  async up() {
    this.addSql(`alter table "attendance_request_entity" drop constraint if exists "attendance_request_entity_type_check";`);

    this.addSql(`alter table "attendance_request_entity" add constraint "attendance_request_entity_type_check" check("type" in ('leave_entitled_daily', 'leave_entitled_hourly', 'leave_sick_daily', 'leave_sick_hourly', 'leave_unpaid_daily', 'leave_unpaid_hourly', 'mission_daily', 'mission_hourly', 'remote_daily', 'remote_hourly', 'overtime', 'manual_attendance', 'presence', 'other'));`);
  }

  async down() {
    this.addSql(`alter table "attendance_request_entity" drop constraint if exists "attendance_request_entity_type_check";`);

    this.addSql(`alter table "attendance_request_entity" add constraint "attendance_request_entity_type_check" check("type" in ('leave_entitled_daily', 'leave_entitled_hourly', 'leave_sick_daily', 'leave_sick_hourly', 'leave_unpaid_daily', 'leave_unpaid_hourly', 'mission_daily', 'mission_hourly', 'remote_daily', 'remote_hourly', 'overtime', 'manual_attendance', 'other'));`);
  }

}
exports.Migration20261101094741 = Migration20261101094741;

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261004080542 extends Migration {

  async up() {
    this.addSql(`create table "holiday_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "date" date not null, "title" varchar(250) not null, "source" text check ("source" in ('official', 'manual')) not null default 'manual', "active" boolean not null default true);`);
    this.addSql(`alter table "holiday_entity" add constraint "holiday_entity_date_unique" unique ("date");`);

    this.addSql(`create table "job_group_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null);`);
    this.addSql(`alter table "job_group_entity" add constraint "job_group_entity_name_unique" unique ("name");`);

    this.addSql(`create table "shift_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "year" int not null, "flex_minutes" int not null default 0, "daily_overtime_cap_minutes" int null);`);

    this.addSql(`create table "shift_day_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "shift_id" int not null, "day_of_week" int not null, "is_active" boolean not null default false, "start_time" varchar(5) null, "end_time" varchar(5) null, "has_second_part" boolean not null default false, "second_start_time" varchar(5) null, "second_end_time" varchar(5) null);`);
    this.addSql(`alter table "shift_day_entity" add constraint "shift_day_entity_shift_id_day_of_week_unique" unique ("shift_id", "day_of_week");`);

    this.addSql(`create table "attendance_job_group_approver" ("job_group_id" int not null, "user_id" int not null, constraint "attendance_job_group_approver_pkey" primary key ("job_group_id", "user_id"));`);

    this.addSql(`create table "workplace_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "city" varchar(255) null, "address" varchar(255) null, "lat" double precision not null, "lng" double precision not null, "radius_meters" int not null default 100, "active" boolean not null default true);`);

    this.addSql(`create table "work_policy_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "description" text null, "restrict_approval_time" boolean not null default false, "is_default" boolean not null default false);`);

    this.addSql(`create table "employee_profile_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "personnel_code" varchar(255) not null, "job_title" varchar(255) null, "workplace_id" int not null, "job_group_id" int null, "work_policy_id" int null, "use_gps" boolean not null default true, "use_wifi" boolean not null default false, "allowed_device_type" text check ("allowed_device_type" in ('any', 'web', 'android')) not null default 'any', "tracking_enabled" boolean not null default false, "remote_days" jsonb null, "active" boolean not null default true);`);
    this.addSql(`alter table "employee_profile_entity" add constraint "employee_profile_entity_user_id_unique" unique ("user_id");`);
    this.addSql(`alter table "employee_profile_entity" add constraint "employee_profile_entity_personnel_code_unique" unique ("personnel_code");`);

    this.addSql(`create table "leave_balance_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "employee_id" int not null, "leave_type" text check ("leave_type" in ('entitled', 'sick', 'unpaid')) not null, "year" int not null, "accrued_minutes" int not null default 0, "used_minutes" int not null default 0, "carried_over_minutes" int not null default 0);`);
    this.addSql(`alter table "leave_balance_entity" add constraint "leave_balance_entity_employee_id_leave_type_year_unique" unique ("employee_id", "leave_type", "year");`);

    this.addSql(`create table "employee_shift_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "employee_id" int not null, "shift_id" int not null, "start_date" date not null, "end_date" date null);`);
    this.addSql(`create index "employee_shift_entity_employee_id_start_date_index" on "employee_shift_entity" ("employee_id", "start_date");`);

    this.addSql(`create table "attendance_request_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "employee_id" int not null, "workplace_id" int null, "type" text check ("type" in ('leave_entitled_daily', 'leave_entitled_hourly', 'leave_sick_daily', 'leave_sick_hourly', 'leave_unpaid_daily', 'leave_unpaid_hourly', 'mission_daily', 'mission_hourly', 'remote_daily', 'remote_hourly', 'overtime', 'manual_attendance', 'other')) not null, "date_from" date null, "date_to" date null, "date" date null, "time_from" varchar(5) null, "time_to" varchar(5) null, "manual_time" varchar(5) null, "manual_direction" text check ("manual_direction" in ('in', 'out')) null, "description" text null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "reviewed_by_id" int null, "reviewed_at" timestamptz null, "review_note" text null, "duration_minutes" int null);`);
    this.addSql(`create index "attendance_request_entity_type_status_index" on "attendance_request_entity" ("type", "status");`);
    this.addSql(`create index "attendance_request_entity_employee_id_status_index" on "attendance_request_entity" ("employee_id", "status");`);

    this.addSql(`create table "attendance_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "employee_id" int not null, "workplace_id" int null, "date" date not null, "check_in_at" timestamptz null, "check_in_lat" double precision null, "check_in_lng" double precision null, "check_in_distance_m" int null, "check_in_source" text check ("check_in_source" in ('gps', 'wifi', 'manual')) null, "check_out_at" timestamptz null, "check_out_lat" double precision null, "check_out_lng" double precision null, "check_out_distance_m" int null, "check_out_source" text check ("check_out_source" in ('gps', 'wifi', 'manual')) null, "status" text check ("status" in ('present', 'absent', 'on_leave', 'holiday', 'partial')) not null default 'present', "work_mode" text check ("work_mode" in ('office', 'remote')) not null default 'office', "edited_by_id" int null, "edited_at" timestamptz null, "edit_note" varchar(500) null);`);
    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_employee_id_date_unique" unique ("employee_id", "date");`);

    this.addSql(`create table "work_policy_rule_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "policy_id" int not null, "request_type" text check ("request_type" in ('leave_entitled', 'leave_sick', 'leave_unpaid', 'mission', 'overtime', 'manual_attendance')) not null, "period" text check ("period" in ('daily', 'hourly')) null, "year" int not null, "monthly_cap_minutes" int null, "yearly_cap_minutes" int null, "allow_over_monthly_cap" boolean not null default true, "allow_over_yearly_cap" boolean not null default true, "carryover_cap_minutes" int null);`);
    this.addSql(`alter table "work_policy_rule_entity" add constraint "work_policy_rule_entity_policy_id_request_type_pe_23890_unique" unique ("policy_id", "request_type", "period", "year");`);

    this.addSql(`alter table "shift_day_entity" add constraint "shift_day_entity_shift_id_foreign" foreign key ("shift_id") references "shift_entity" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "attendance_job_group_approver" add constraint "attendance_job_group_approver_job_group_id_foreign" foreign key ("job_group_id") references "job_group_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "attendance_job_group_approver" add constraint "attendance_job_group_approver_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "employee_profile_entity" add constraint "employee_profile_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade;`);
    this.addSql(`alter table "employee_profile_entity" add constraint "employee_profile_entity_workplace_id_foreign" foreign key ("workplace_id") references "workplace_entity" ("id") on update cascade;`);
    this.addSql(`alter table "employee_profile_entity" add constraint "employee_profile_entity_job_group_id_foreign" foreign key ("job_group_id") references "job_group_entity" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "employee_profile_entity" add constraint "employee_profile_entity_work_policy_id_foreign" foreign key ("work_policy_id") references "work_policy_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "leave_balance_entity" add constraint "leave_balance_entity_employee_id_foreign" foreign key ("employee_id") references "employee_profile_entity" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "employee_shift_entity" add constraint "employee_shift_entity_employee_id_foreign" foreign key ("employee_id") references "employee_profile_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "employee_shift_entity" add constraint "employee_shift_entity_shift_id_foreign" foreign key ("shift_id") references "shift_entity" ("id") on update cascade;`);

    this.addSql(`alter table "attendance_request_entity" add constraint "attendance_request_entity_employee_id_foreign" foreign key ("employee_id") references "employee_profile_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "attendance_request_entity" add constraint "attendance_request_entity_workplace_id_foreign" foreign key ("workplace_id") references "workplace_entity" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "attendance_request_entity" add constraint "attendance_request_entity_reviewed_by_id_foreign" foreign key ("reviewed_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_employee_id_foreign" foreign key ("employee_id") references "employee_profile_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_workplace_id_foreign" foreign key ("workplace_id") references "workplace_entity" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "attendance_entity" add constraint "attendance_entity_edited_by_id_foreign" foreign key ("edited_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "work_policy_rule_entity" add constraint "work_policy_rule_entity_policy_id_foreign" foreign key ("policy_id") references "work_policy_entity" ("id") on update cascade on delete cascade;`);
  }

  async down() {
    this.addSql(`alter table "attendance_job_group_approver" drop constraint "attendance_job_group_approver_job_group_id_foreign";`);

    this.addSql(`alter table "employee_profile_entity" drop constraint "employee_profile_entity_job_group_id_foreign";`);

    this.addSql(`alter table "shift_day_entity" drop constraint "shift_day_entity_shift_id_foreign";`);

    this.addSql(`alter table "employee_shift_entity" drop constraint "employee_shift_entity_shift_id_foreign";`);

    this.addSql(`alter table "employee_profile_entity" drop constraint "employee_profile_entity_workplace_id_foreign";`);

    this.addSql(`alter table "attendance_request_entity" drop constraint "attendance_request_entity_workplace_id_foreign";`);

    this.addSql(`alter table "attendance_entity" drop constraint "attendance_entity_workplace_id_foreign";`);

    this.addSql(`alter table "employee_profile_entity" drop constraint "employee_profile_entity_work_policy_id_foreign";`);

    this.addSql(`alter table "work_policy_rule_entity" drop constraint "work_policy_rule_entity_policy_id_foreign";`);

    this.addSql(`alter table "leave_balance_entity" drop constraint "leave_balance_entity_employee_id_foreign";`);

    this.addSql(`alter table "employee_shift_entity" drop constraint "employee_shift_entity_employee_id_foreign";`);

    this.addSql(`alter table "attendance_request_entity" drop constraint "attendance_request_entity_employee_id_foreign";`);

    this.addSql(`alter table "attendance_entity" drop constraint "attendance_entity_employee_id_foreign";`);

    this.addSql(`drop table if exists "holiday_entity" cascade;`);

    this.addSql(`drop table if exists "job_group_entity" cascade;`);

    this.addSql(`drop table if exists "shift_entity" cascade;`);

    this.addSql(`drop table if exists "shift_day_entity" cascade;`);

    this.addSql(`drop table if exists "attendance_job_group_approver" cascade;`);

    this.addSql(`drop table if exists "workplace_entity" cascade;`);

    this.addSql(`drop table if exists "work_policy_entity" cascade;`);

    this.addSql(`drop table if exists "employee_profile_entity" cascade;`);

    this.addSql(`drop table if exists "leave_balance_entity" cascade;`);

    this.addSql(`drop table if exists "employee_shift_entity" cascade;`);

    this.addSql(`drop table if exists "attendance_request_entity" cascade;`);

    this.addSql(`drop table if exists "attendance_entity" cascade;`);

    this.addSql(`drop table if exists "work_policy_rule_entity" cascade;`);
  }

}
exports.Migration20261004080542 = Migration20261004080542;

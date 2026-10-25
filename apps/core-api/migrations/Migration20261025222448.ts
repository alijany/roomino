'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

/**
 * Personnel code and job title move from the attendance profile to the user.
 * One transaction: add the columns, copy what profiles hold, give every user
 * without a code the next `T<number>`, then drop the profile columns.
 */
class Migration20261025222448 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "personnel_code" varchar(255) null, add column "job_title" varchar(255) null;`);

    // What profiles hold today.
    this.addSql(`update "user_entity" u set "personnel_code" = p."personnel_code", "job_title" = p."job_title" from "employee_profile_entity" p where p."user_id" = u."id";`);

    // Everyone else gets a code, after the highest `T<number>` already in use.
    this.addSql(`with next as (select coalesce(max(substring("personnel_code" from 2)::int), 0) as base from "user_entity" where "personnel_code" ~ '^T[0-9]{1,9}$'), numbered as (select u."id", row_number() over (order by u."id") as n from "user_entity" u where u."personnel_code" is null) update "user_entity" u set "personnel_code" = 'T' || lpad((next.base + numbered.n)::text, 2, '0') from numbered, next where u."id" = numbered."id";`);

    this.addSql(`alter table "user_entity" add constraint "user_entity_personnel_code_unique" unique ("personnel_code");`);

    this.addSql(`alter table "employee_profile_entity" drop constraint "employee_profile_entity_personnel_code_unique";`);
    this.addSql(`alter table "employee_profile_entity" drop column "personnel_code", drop column "job_title";`);
  }

  async down() {
    this.addSql(`alter table "employee_profile_entity" add column "personnel_code" varchar(255) null, add column "job_title" varchar(255) null;`);
    this.addSql(`update "employee_profile_entity" p set "personnel_code" = u."personnel_code", "job_title" = u."job_title" from "user_entity" u where u."id" = p."user_id";`);
    this.addSql(`alter table "employee_profile_entity" alter column "personnel_code" set not null;`);
    this.addSql(`alter table "employee_profile_entity" add constraint "employee_profile_entity_personnel_code_unique" unique ("personnel_code");`);

    this.addSql(`alter table "user_entity" drop constraint "user_entity_personnel_code_unique";`);
    this.addSql(`alter table "user_entity" drop column "personnel_code", drop column "job_title";`);
  }

}
exports.Migration20261025222448 = Migration20261025222448;

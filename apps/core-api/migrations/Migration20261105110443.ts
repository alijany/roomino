'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261105110443 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "team_id" int null;`);
    this.addSql(`alter table "user_entity" add constraint "user_entity_team_id_foreign" foreign key ("team_id") references "job_group_entity" ("id") on update cascade on delete set null;`);
    // Everyone already in a job group becomes a member of that team.
    this.addSql(`update "user_entity" u set "team_id" = p."job_group_id" from "employee_profile_entity" p where p."user_id" = u."id" and p."job_group_id" is not null;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop constraint "user_entity_team_id_foreign";`);

    this.addSql(`alter table "user_entity" drop column "team_id";`);
  }

}
exports.Migration20261105110443 = Migration20261105110443;

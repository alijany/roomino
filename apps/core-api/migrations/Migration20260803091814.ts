'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260803091814 extends Migration {

  async up() {
    this.addSql(`update "roles_entity" set "role" = 'user' where "role" not in ('admin', 'user');`);

    this.addSql(`alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`);

    this.addSql(`alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'user'));`);
  }

  async down() {
    this.addSql(`alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`);

    this.addSql(`alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'owner', 'manager', 'member', 'user', 'guest'));`);
  }

}
exports.Migration20260803091814 = Migration20260803091814;

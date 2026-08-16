'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

/**
 * Widens the roles check constraint to admit the two roles the Finance &
 * External Payments module introduces: `finance` (processes and records
 * payments) and `approver` (budget holder who approves their team's requests).
 *
 * Hand-written rather than auto-generated: enum members map to a Postgres check
 * constraint, and the generator emits the drop/add pair without the safety
 * downgrade in `down()`.
 */
class Migration20260816090000 extends Migration {
  async up() {
    this.addSql(
      `alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`,
    );

    this.addSql(
      `alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'finance', 'approver', 'user'));`,
    );
  }

  async down() {
    // Any user left holding a now-invalid role falls back to `user`, otherwise
    // re-adding the narrower constraint fails.
    this.addSql(
      `update "roles_entity" set "role" = 'user' where "role" not in ('admin', 'user');`,
    );

    this.addSql(
      `alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`,
    );

    this.addSql(
      `alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'user'));`,
    );
  }
}

exports.Migration20260816090000 = Migration20260816090000;

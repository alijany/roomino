'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260817121818 extends Migration {

  async up() {
    this.addSql(`alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`);

    this.addSql(`alter table "payment_request_entity" drop constraint if exists "payment_request_entity_pending_role_check";`);

    this.addSql(`alter table "approval_step_entity" drop constraint if exists "approval_step_entity_required_role_check";`);

    this.addSql(`alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'finance', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_pending_role_check" check("pending_role" in ('admin', 'finance', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "approval_step_entity" add constraint "approval_step_entity_required_role_check" check("required_role" in ('admin', 'finance', 'approver', 'hr', 'user'));`);
  }

  async down() {
    this.addSql(`alter table "approval_step_entity" drop constraint if exists "approval_step_entity_required_role_check";`);

    this.addSql(`alter table "payment_request_entity" drop constraint if exists "payment_request_entity_pending_role_check";`);

    this.addSql(`alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`);

    this.addSql(`alter table "approval_step_entity" add constraint "approval_step_entity_required_role_check" check("required_role" in ('admin', 'finance', 'approver', 'user'));`);

    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_pending_role_check" check("pending_role" in ('admin', 'finance', 'approver', 'user'));`);

    this.addSql(`alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'finance', 'approver', 'user'));`);
  }

}
exports.Migration20260817121818 = Migration20260817121818;

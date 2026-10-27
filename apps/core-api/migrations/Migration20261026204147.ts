'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261026204147 extends Migration {

  async up() {
    this.addSql(`alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`);

    this.addSql(`alter table "advance_request_entity" drop constraint if exists "advance_request_entity_pending_role_check";`);

    this.addSql(`alter table "advance_approval_step_entity" drop constraint if exists "advance_approval_step_entity_required_role_check";`);

    this.addSql(`alter table "payment_request_entity" drop constraint if exists "payment_request_entity_pending_role_check";`);

    this.addSql(`alter table "approval_step_entity" drop constraint if exists "approval_step_entity_required_role_check";`);

    this.addSql(`alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'ceo', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "advance_request_entity" add constraint "advance_request_entity_pending_role_check" check("pending_role" in ('admin', 'ceo', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "advance_approval_step_entity" add constraint "advance_approval_step_entity_required_role_check" check("required_role" in ('admin', 'ceo', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_pending_role_check" check("pending_role" in ('admin', 'ceo', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "approval_step_entity" add constraint "approval_step_entity_required_role_check" check("required_role" in ('admin', 'ceo', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);
  }

  async down() {
    this.addSql(`alter table "advance_approval_step_entity" drop constraint if exists "advance_approval_step_entity_required_role_check";`);

    this.addSql(`alter table "advance_request_entity" drop constraint if exists "advance_request_entity_pending_role_check";`);

    this.addSql(`alter table "approval_step_entity" drop constraint if exists "approval_step_entity_required_role_check";`);

    this.addSql(`alter table "payment_request_entity" drop constraint if exists "payment_request_entity_pending_role_check";`);

    this.addSql(`alter table "roles_entity" drop constraint if exists "roles_entity_role_check";`);

    this.addSql(`alter table "advance_approval_step_entity" add constraint "advance_approval_step_entity_required_role_check" check("required_role" in ('admin', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "advance_request_entity" add constraint "advance_request_entity_pending_role_check" check("pending_role" in ('admin', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "approval_step_entity" add constraint "approval_step_entity_required_role_check" check("required_role" in ('admin', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_pending_role_check" check("pending_role" in ('admin', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);

    this.addSql(`alter table "roles_entity" add constraint "roles_entity_role_check" check("role" in ('admin', 'finance', 'finance_manager', 'approver', 'hr', 'user'));`);
  }

}
exports.Migration20261026204147 = Migration20261026204147;

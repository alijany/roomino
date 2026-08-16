'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260816105259 extends Migration {

  async up() {
    this.addSql(`create table "expense_category_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "code" varchar(255) not null, "parent_id" int null, "requires_invoice" boolean not null default true, "active" boolean not null default true);`);
    this.addSql(`alter table "expense_category_entity" add constraint "expense_category_entity_code_unique" unique ("code");`);

    this.addSql(`create table "approval_rule_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "min_amount_rial" bigint not null, "max_amount_rial" bigint null, "category_id" int null, "approver_chain" jsonb not null, "priority" int not null default 0, "description" varchar(255) null, "active" boolean not null default true);`);

    this.addSql(`create table "payment_source_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "label" varchar(255) not null, "type" text check ("type" in ('bank_account', 'card', 'petty_cash', 'intermediary')) not null default 'bank_account', "bank_name" varchar(255) null, "sheba" varchar(255) null, "card_last4" varchar(255) null, "account_holder" varchar(255) null, "currency" text check ("currency" in ('IRR', 'USD', 'EUR', 'AED', 'TRY')) not null default 'IRR', "notes" varchar(255) null, "active" boolean not null default true);`);

    this.addSql(`create table "payment_request_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "requester_id" int not null, "origin" text check ("origin" in ('employee', 'finance', 'recurring')) not null default 'employee', "title" varchar(255) not null, "description" varchar(255) null, "category_id" int not null, "amount_minor" bigint not null, "currency" text check ("currency" in ('IRR', 'USD', 'EUR', 'AED', 'TRY')) not null default 'IRR', "payee_name" varchar(255) not null, "payee_account_type" text check ("payee_account_type" in ('sheba', 'card', 'iban_swift', 'paypal', 'other')) not null default 'sheba', "payee_account_holder" varchar(255) null, "payee_sheba" varchar(255) null, "payee_card_number" varchar(255) null, "payee_account_details" varchar(255) null, "due_date" timestamptz not null, "status" text check ("status" in ('draft', 'pending_approval', 'needs_info', 'approved', 'scheduled', 'paid', 'rejected', 'cancelled', 'failed')) not null default 'draft', "pending_role" text check ("pending_role" in ('admin', 'finance', 'approver', 'user')) null, "pending_sequence" int null, "cost_center" varchar(255) null, "last_decision_comment" varchar(255) null, "submitted_at" timestamptz null, "decided_at" timestamptz null, "paid_at" timestamptz null);`);
    this.addSql(`create index "payment_request_entity_requester_id_status_index" on "payment_request_entity" ("requester_id", "status");`);
    this.addSql(`create index "payment_request_entity_status_due_date_index" on "payment_request_entity" ("status", "due_date");`);

    this.addSql(`create table "request_attachment_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "storage_key" varchar(255) not null, "url" varchar(255) not null, "filename" varchar(255) not null, "mime_type" varchar(255) not null, "size_bytes" int not null, "kind" text check ("kind" in ('invoice', 'quote', 'receipt', 'contract', 'other')) not null default 'invoice', "uploaded_by_id" int null);`);

    this.addSql(`create table "payment_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "payment_source_id" int not null, "paid_at" timestamptz not null, "settled_amount_rial" bigint not null, "fx_rate_rial_per_unit" bigint null, "fee_rial" bigint null, "intermediary" varchar(255) null, "reference_number" varchar(255) null, "receipt_id" int null, "paid_by_id" int not null, "status" text check ("status" in ('succeeded', 'failed')) not null default 'succeeded', "failure_reason" varchar(255) null, "notes" varchar(255) null);`);
    this.addSql(`create index "payment_entity_paid_at_index" on "payment_entity" ("paid_at");`);

    this.addSql(`create table "finance_activity_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "actor_id" int null, "action" text check ("action" in ('created', 'updated', 'submitted', 'approved', 'rejected', 'info_requested', 'cancelled', 'paid', 'payment_failed', 'attachment_added', 'attachment_removed')) not null, "from_status" text check ("from_status" in ('draft', 'pending_approval', 'needs_info', 'approved', 'scheduled', 'paid', 'rejected', 'cancelled', 'failed')) null, "to_status" text check ("to_status" in ('draft', 'pending_approval', 'needs_info', 'approved', 'scheduled', 'paid', 'rejected', 'cancelled', 'failed')) null, "comment" varchar(255) null, "meta" jsonb null);`);
    this.addSql(`create index "finance_activity_entity_request_id_created_at_index" on "finance_activity_entity" ("request_id", "created_at");`);

    this.addSql(`create table "approval_step_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "sequence" int not null, "required_role" text check ("required_role" in ('admin', 'finance', 'approver', 'user')) not null, "status" text check ("status" in ('pending', 'approved', 'rejected', 'skipped')) not null default 'pending', "actor_id" int null, "decided_at" timestamptz null, "comment" varchar(255) null);`);
    this.addSql(`create index "approval_step_entity_request_id_sequence_index" on "approval_step_entity" ("request_id", "sequence");`);

    this.addSql(`alter table "expense_category_entity" add constraint "expense_category_entity_parent_id_foreign" foreign key ("parent_id") references "expense_category_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "approval_rule_entity" add constraint "approval_rule_entity_category_id_foreign" foreign key ("category_id") references "expense_category_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_requester_id_foreign" foreign key ("requester_id") references "user_entity" ("id") on update cascade;`);
    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_category_id_foreign" foreign key ("category_id") references "expense_category_entity" ("id") on update cascade;`);

    this.addSql(`alter table "request_attachment_entity" add constraint "request_attachment_entity_request_id_foreign" foreign key ("request_id") references "payment_request_entity" ("id") on update cascade;`);
    this.addSql(`alter table "request_attachment_entity" add constraint "request_attachment_entity_uploaded_by_id_foreign" foreign key ("uploaded_by_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "payment_entity" add constraint "payment_entity_request_id_foreign" foreign key ("request_id") references "payment_request_entity" ("id") on update cascade;`);
    this.addSql(`alter table "payment_entity" add constraint "payment_entity_payment_source_id_foreign" foreign key ("payment_source_id") references "payment_source_entity" ("id") on update cascade;`);
    this.addSql(`alter table "payment_entity" add constraint "payment_entity_receipt_id_foreign" foreign key ("receipt_id") references "request_attachment_entity" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "payment_entity" add constraint "payment_entity_paid_by_id_foreign" foreign key ("paid_by_id") references "user_entity" ("id") on update cascade;`);

    this.addSql(`alter table "finance_activity_entity" add constraint "finance_activity_entity_request_id_foreign" foreign key ("request_id") references "payment_request_entity" ("id") on update cascade;`);
    this.addSql(`alter table "finance_activity_entity" add constraint "finance_activity_entity_actor_id_foreign" foreign key ("actor_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "approval_step_entity" add constraint "approval_step_entity_request_id_foreign" foreign key ("request_id") references "payment_request_entity" ("id") on update cascade;`);
    this.addSql(`alter table "approval_step_entity" add constraint "approval_step_entity_actor_id_foreign" foreign key ("actor_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`alter table "expense_category_entity" drop constraint "expense_category_entity_parent_id_foreign";`);

    this.addSql(`alter table "approval_rule_entity" drop constraint "approval_rule_entity_category_id_foreign";`);

    this.addSql(`alter table "payment_request_entity" drop constraint "payment_request_entity_category_id_foreign";`);

    this.addSql(`alter table "payment_entity" drop constraint "payment_entity_payment_source_id_foreign";`);

    this.addSql(`alter table "request_attachment_entity" drop constraint "request_attachment_entity_request_id_foreign";`);

    this.addSql(`alter table "payment_entity" drop constraint "payment_entity_request_id_foreign";`);

    this.addSql(`alter table "finance_activity_entity" drop constraint "finance_activity_entity_request_id_foreign";`);

    this.addSql(`alter table "approval_step_entity" drop constraint "approval_step_entity_request_id_foreign";`);

    this.addSql(`alter table "payment_entity" drop constraint "payment_entity_receipt_id_foreign";`);

    this.addSql(`drop table if exists "expense_category_entity" cascade;`);

    this.addSql(`drop table if exists "approval_rule_entity" cascade;`);

    this.addSql(`drop table if exists "payment_source_entity" cascade;`);

    this.addSql(`drop table if exists "payment_request_entity" cascade;`);

    this.addSql(`drop table if exists "request_attachment_entity" cascade;`);

    this.addSql(`drop table if exists "payment_entity" cascade;`);

    this.addSql(`drop table if exists "finance_activity_entity" cascade;`);

    this.addSql(`drop table if exists "approval_step_entity" cascade;`);
  }

}
exports.Migration20260816105259 = Migration20260816105259;

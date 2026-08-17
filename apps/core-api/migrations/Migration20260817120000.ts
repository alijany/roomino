'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

/**
 * Finance phase 2 — the vendor directory and recurring expenses.
 *
 * Hand-written rather than auto-generated: `MigrationService` diffs the entities
 * *before* it applies pending migrations, so on a fresh database it emits a
 * whole-schema file that then collides with the migrations it was derived from.
 * The DDL below is the generator's output for the new objects only.
 */
class Migration20260817120000 extends Migration {
  async up() {
    // --- vendor directory ---------------------------------------------------
    this.addSql(
      `create table "vendor_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "name_en" varchar(255) null, "kind" text check ("kind" in ('domestic', 'foreign')) not null default 'domestic', "economic_code" varchar(255) null, "national_id" varchar(255) null, "website" varchar(255) null, "contact_name" varchar(255) null, "contact_phone" varchar(255) null, "default_currency" text check ("default_currency" in ('IRR', 'USD', 'EUR', 'AED', 'TRY')) not null default 'IRR', "notes" varchar(255) null, "active" boolean not null default true);`,
    );

    this.addSql(
      `create table "payee_account_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "vendor_id" int not null, "label" varchar(255) not null, "type" text check ("type" in ('sheba', 'card', 'iban_swift', 'paypal', 'other')) not null default 'sheba', "holder_name" varchar(255) null, "sheba" varchar(255) null, "card_number" varchar(255) null, "iban" varchar(255) null, "swift" varchar(255) null, "details" varchar(255) null, "is_default" boolean not null default false, "active" boolean not null default true);`,
    );

    this.addSql(
      `alter table "payee_account_entity" add constraint "payee_account_entity_vendor_id_foreign" foreign key ("vendor_id") references "vendor_entity" ("id") on update cascade;`,
    );

    // --- recurring expenses -------------------------------------------------
    this.addSql(
      `create table "recurring_expense_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "title" varchar(255) not null, "vendor_id" int not null, "category_id" int not null, "payee_account_id" int null, "default_payment_source_id" int null, "amount_minor" bigint not null, "currency" text check ("currency" in ('IRR', 'USD', 'EUR', 'AED', 'TRY')) not null default 'IRR', "cycle" text check ("cycle" in ('monthly', 'quarterly', 'yearly', 'custom_days')) not null default 'monthly', "cycle_days" int null, "calendar" text check ("calendar" in ('gregorian', 'jalali')) not null default 'gregorian', "next_due_date" timestamptz not null, "end_date" timestamptz null, "reminder_days" jsonb not null, "lead_days" int not null default 7, "owner_id" int not null, "auto_generate" boolean not null default true, "notes" varchar(255) null, "active" boolean not null default true, "last_reminder_days_sent" int null);`,
    );

    this.addSql(
      `create index "recurring_expense_entity_next_due_date_active_index" on "recurring_expense_entity" ("next_due_date", "active");`,
    );

    this.addSql(
      `alter table "recurring_expense_entity" add constraint "recurring_expense_entity_vendor_id_foreign" foreign key ("vendor_id") references "vendor_entity" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "recurring_expense_entity" add constraint "recurring_expense_entity_category_id_foreign" foreign key ("category_id") references "expense_category_entity" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "recurring_expense_entity" add constraint "recurring_expense_entity_payee_account_id_foreign" foreign key ("payee_account_id") references "payee_account_entity" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "recurring_expense_entity" add constraint "recurring_expense_entity_default_payment_source_id_foreign" foreign key ("default_payment_source_id") references "payment_source_entity" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "recurring_expense_entity" add constraint "recurring_expense_entity_owner_id_foreign" foreign key ("owner_id") references "user_entity" ("id") on update cascade;`,
    );

    // --- payment requests link to all three ---------------------------------
    this.addSql(
      `alter table "payment_request_entity" add column "vendor_id" int null, add column "payee_account_id" int null, add column "recurring_source_id" int null;`,
    );

    this.addSql(
      `alter table "payment_request_entity" add constraint "payment_request_entity_vendor_id_foreign" foreign key ("vendor_id") references "vendor_entity" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "payment_request_entity" add constraint "payment_request_entity_payee_account_id_foreign" foreign key ("payee_account_id") references "payee_account_entity" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "payment_request_entity" add constraint "payment_request_entity_recurring_source_id_foreign" foreign key ("recurring_source_id") references "recurring_expense_entity" ("id") on update cascade on delete set null;`,
    );

    // One request per schedule per cycle — this is what makes the daily
    // materialiser idempotent rather than merely careful.
    this.addSql(
      `alter table "payment_request_entity" add constraint "payment_request_entity_recurring_source_id_due_date_unique" unique ("recurring_source_id", "due_date");`,
    );

    this.addSql(
      `create index "payment_request_entity_paid_at_index" on "payment_request_entity" ("paid_at");`,
    );

    // --- notification category gains `finance` ------------------------------
    this.addSql(
      `alter table "notification_entity" drop constraint if exists "notification_entity_category_check";`,
    );
    this.addSql(
      `alter table "notification_entity" add constraint "notification_entity_category_check" check("category" in ('system', 'general', 'finance'));`,
    );
    this.addSql(
      `alter table "notification_preference_entity" drop constraint if exists "notification_preference_entity_category_check";`,
    );
    this.addSql(
      `alter table "notification_preference_entity" add constraint "notification_preference_entity_category_check" check("category" in ('system', 'general', 'finance'));`,
    );
  }

  async down() {
    this.addSql(
      `alter table "payment_request_entity" drop constraint if exists "payment_request_entity_recurring_source_id_due_date_unique";`,
    );
    this.addSql(
      `drop index if exists "payment_request_entity_paid_at_index";`,
    );
    this.addSql(
      `alter table "payment_request_entity" drop constraint if exists "payment_request_entity_vendor_id_foreign";`,
    );
    this.addSql(
      `alter table "payment_request_entity" drop constraint if exists "payment_request_entity_payee_account_id_foreign";`,
    );
    this.addSql(
      `alter table "payment_request_entity" drop constraint if exists "payment_request_entity_recurring_source_id_foreign";`,
    );
    this.addSql(
      `alter table "payment_request_entity" drop column if exists "vendor_id", drop column if exists "payee_account_id", drop column if exists "recurring_source_id";`,
    );

    this.addSql(`drop table if exists "recurring_expense_entity" cascade;`);
    this.addSql(`drop table if exists "payee_account_entity" cascade;`);
    this.addSql(`drop table if exists "vendor_entity" cascade;`);

    // Anything filed under the departing category falls back to `general`,
    // otherwise re-adding the narrower constraint fails.
    this.addSql(
      `update "notification_entity" set "category" = 'general' where "category" = 'finance';`,
    );
    this.addSql(
      `alter table "notification_entity" drop constraint if exists "notification_entity_category_check";`,
    );
    this.addSql(
      `alter table "notification_entity" add constraint "notification_entity_category_check" check("category" in ('system', 'general'));`,
    );
    this.addSql(
      `delete from "notification_preference_entity" where "category" = 'finance';`,
    );
    this.addSql(
      `alter table "notification_preference_entity" drop constraint if exists "notification_preference_entity_category_check";`,
    );
    this.addSql(
      `alter table "notification_preference_entity" add constraint "notification_preference_entity_category_check" check("category" in ('system', 'general'));`,
    );
  }
}

exports.Migration20260817120000 = Migration20260817120000;

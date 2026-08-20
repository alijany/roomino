'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

/**
 * Splits payment destinations into two kinds.
 *
 * A bank transfer needs an account number to pay into; topping up a company
 * account on a website needs the site and a login. The form previously only
 * supported the first, so the second was being typed into a free-text field
 * that Finance could not act on reliably.
 *
 * Existing rows are all bank transfers, which is what the column default gives
 * them — no backfill needed.
 */
class Migration20260820090000 extends Migration {
  async up() {
    this.addSql(
      `alter table "payment_request_entity"
         add column "destination_kind" text check ("destination_kind" in ('bank_transfer', 'online_account')) not null default 'bank_transfer',
         add column "destination_url" varchar(255) null,
         add column "destination_account" varchar(255) null,
         add column "destination_credential_enc" text null;`,
    );

    // An online top-up has no payee bank instrument, so the column that
    // describes one has to be allowed to say nothing.
    this.addSql(
      `alter table "payment_request_entity"
         alter column "payee_account_type" drop not null,
         alter column "payee_account_type" drop default;`,
    );
  }

  async down() {
    this.addSql(
      `alter table "payment_request_entity"
         drop column if exists "destination_kind",
         drop column if exists "destination_url",
         drop column if exists "destination_account",
         drop column if exists "destination_credential_enc";`,
    );

    this.addSql(
      `update "payment_request_entity" set "payee_account_type" = 'sheba' where "payee_account_type" is null;`,
    );
    this.addSql(
      `alter table "payment_request_entity"
         alter column "payee_account_type" set default 'sheba',
         alter column "payee_account_type" set not null;`,
    );
  }
}

exports.Migration20260820090000 = Migration20260820090000;

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261101114820 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "insurance_start_date" date null, add column "bank_card_number" varchar(255) null, add column "bank_account_number" varchar(255) null, add column "address" text null;`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "insurance_start_date", drop column "bank_card_number", drop column "bank_account_number", drop column "address";`);
  }

}
exports.Migration20261101114820 = Migration20261101114820;

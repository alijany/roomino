'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261028192230 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "married" boolean not null default false, add column "children_count" int not null default 0, add column "insured" boolean not null default true, add column "insurance_type" varchar(255) not null default 'worker', add column "tax_exempt" boolean not null default false, add column "agreement_type" varchar(255) not null default 'gross';`);
  }

  async down() {
    this.addSql(`alter table "user_entity" drop column "married", drop column "children_count", drop column "insured", drop column "insurance_type", drop column "tax_exempt", drop column "agreement_type";`);
  }

}
exports.Migration20261028192230 = Migration20261028192230;

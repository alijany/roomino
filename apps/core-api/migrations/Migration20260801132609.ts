'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260801132609 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" drop column "organization_name", drop column "organization_registration_number", drop column "organization_national_id", drop column "organization_representative", drop column "user_type";`);
  }

  async down() {
    this.addSql(`alter table "user_entity" add column "organization_name" varchar(255) null, add column "organization_registration_number" varchar(255) null, add column "organization_national_id" varchar(255) null, add column "organization_representative" varchar(255) null, add column "user_type" varchar(255) not null default 'individual';`);
  }

}
exports.Migration20260801132609 = Migration20260801132609;

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20260916115737 extends Migration {

  async up() {
    this.addSql(`alter table "payment_request_entity" drop constraint "payment_request_entity_category_id_foreign";`);

    this.addSql(`alter table "payment_entity" drop constraint "payment_entity_payment_source_id_foreign";`);

    this.addSql(`alter table "payment_request_entity" alter column "category_id" type int using ("category_id"::int);`);
    this.addSql(`alter table "payment_request_entity" alter column "category_id" drop not null;`);
    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_category_id_foreign" foreign key ("category_id") references "expense_category_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "payment_entity" alter column "payment_source_id" type int using ("payment_source_id"::int);`);
    this.addSql(`alter table "payment_entity" alter column "payment_source_id" drop not null;`);
    this.addSql(`alter table "payment_entity" add constraint "payment_entity_payment_source_id_foreign" foreign key ("payment_source_id") references "payment_source_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`alter table "payment_entity" drop constraint "payment_entity_payment_source_id_foreign";`);

    this.addSql(`alter table "payment_request_entity" drop constraint "payment_request_entity_category_id_foreign";`);

    this.addSql(`alter table "payment_entity" alter column "payment_source_id" type int4 using ("payment_source_id"::int4);`);
    this.addSql(`alter table "payment_entity" alter column "payment_source_id" set not null;`);
    this.addSql(`alter table "payment_entity" add constraint "payment_entity_payment_source_id_foreign" foreign key ("payment_source_id") references "payment_source_entity" ("id") on update cascade on delete no action;`);

    this.addSql(`alter table "payment_request_entity" alter column "category_id" type int4 using ("category_id"::int4);`);
    this.addSql(`alter table "payment_request_entity" alter column "category_id" set not null;`);
    this.addSql(`alter table "payment_request_entity" add constraint "payment_request_entity_category_id_foreign" foreign key ("category_id") references "expense_category_entity" ("id") on update cascade on delete no action;`);
  }

}
exports.Migration20260916115737 = Migration20260916115737;

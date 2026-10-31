'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261029210309 extends Migration {

  async up() {
    this.addSql(`create table "advance_deduction_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "line_id" int null, "amount" bigint not null, "paid_on" date null, "recorded_by_id" int null, "note" varchar(255) null);`);
    this.addSql(`create index "advance_deduction_entity_request_id_index" on "advance_deduction_entity" ("request_id");`);

    this.addSql(`alter table "advance_deduction_entity" add constraint "advance_deduction_entity_request_id_foreign" foreign key ("request_id") references "advance_request_entity" ("id") on update cascade;`);
    this.addSql(`alter table "advance_deduction_entity" add constraint "advance_deduction_entity_line_id_foreign" foreign key ("line_id") references "payroll_line_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "advance_deduction_entity" add constraint "advance_deduction_entity_recorded_by_id_foreign" foreign key ("recorded_by_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`drop table if exists "advance_deduction_entity" cascade;`);

  }

}
exports.Migration20261029210309 = Migration20261029210309;

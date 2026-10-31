'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261030104122 extends Migration {

  async up() {
    this.addSql(`create table "final_settlement_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "date" date not null, "status" text check ("status" in ('draft', 'final')) not null default 'draft', "leave_remain_days" numeric(5,2) not null default 0, "eidi_paid" bigint not null default 0, "adjustment" bigint not null default 0, "advance" bigint not null default 0, "loan" bigint not null default 0, "other_deductions" bigint not null default 0, "note" varchar(255) null, "service_years" int not null default 0, "year_months" numeric(5,2) not null default 0, "severance" bigint not null default 0, "leave_buyout" bigint not null default 0, "eidi" bigint not null default 0, "gross" bigint not null default 0, "worker_insurance" bigint not null default 0, "tax" bigint not null default 0, "total_deductions" bigint not null default 0, "net" bigint not null default 0, "warnings" jsonb not null, "created_by_id" int null);`);
    this.addSql(`alter table "final_settlement_entity" add constraint "final_settlement_entity_user_id_unique" unique ("user_id");`);

    this.addSql(`alter table "final_settlement_entity" add constraint "final_settlement_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade;`);
    this.addSql(`alter table "final_settlement_entity" add constraint "final_settlement_entity_created_by_id_foreign" foreign key ("created_by_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`drop table if exists "final_settlement_entity" cascade;`);
  }

}
exports.Migration20261030104122 = Migration20261030104122;

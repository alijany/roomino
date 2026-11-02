'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261102185053 extends Migration {

  async up() {
    this.addSql(`create table "contract_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "start_date" date not null, "end_date" date not null, "signed" boolean not null default false, "note" varchar(500) null, "reminder_stage" int null);`);

    this.addSql(`alter table "contract_entity" add constraint "contract_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade on delete cascade;`);
  }

  async down() {
    this.addSql(`drop table if exists "contract_entity" cascade;`);
  }

}
exports.Migration20261102185053 = Migration20261102185053;

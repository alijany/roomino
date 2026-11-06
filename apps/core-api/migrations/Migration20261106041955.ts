'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261106041955 extends Migration {

  async up() {
    this.addSql(`create table "on_call_change_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "date" date not null, "user_id" int not null, "before" jsonb null, "after" jsonb null);`);
    this.addSql(`alter table "on_call_change_entity" add constraint "on_call_change_entity_date_user_id_unique" unique ("date", "user_id");`);

    this.addSql(`alter table "on_call_change_entity" add constraint "on_call_change_entity_user_id_foreign" foreign key ("user_id") references "user_entity" ("id") on update cascade on delete cascade;`);
  }

  async down() {
    this.addSql(`drop table if exists "on_call_change_entity" cascade;`);
  }

}
exports.Migration20261106041955 = Migration20261106041955;

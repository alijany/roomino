'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261105175726 extends Migration {

  async up() {
    this.addSql(`create table "on_call_swap_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "requester_id" int not null, "target_id" int not null, "kind" text check ("kind" in ('swap', 'handover')) not null, "requester_date" date not null, "target_date" date null, "status" text check ("status" in ('pending', 'accepted', 'declined', 'cancelled')) not null default 'pending', "responded_at" timestamptz null);`);

    this.addSql(`alter table "on_call_swap_entity" add constraint "on_call_swap_entity_requester_id_foreign" foreign key ("requester_id") references "user_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "on_call_swap_entity" add constraint "on_call_swap_entity_target_id_foreign" foreign key ("target_id") references "user_entity" ("id") on update cascade on delete cascade;`);
  }

  async down() {
    this.addSql(`drop table if exists "on_call_swap_entity" cascade;`);
  }

}
exports.Migration20261105175726 = Migration20261105175726;

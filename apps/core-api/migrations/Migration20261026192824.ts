'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261026192824 extends Migration {

  async up() {
    this.addSql(`create table "advance_request_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "requester_id" int not null, "amount_rial" bigint not null, "reason" text null, "status" text check ("status" in ('pending_approval', 'approved', 'rejected', 'cancelled')) not null default 'pending_approval', "pending_role" text check ("pending_role" in ('admin', 'finance', 'finance_manager', 'approver', 'hr', 'user')) null, "pending_sequence" int null, "last_decision_comment" varchar(255) null, "decided_at" timestamptz null);`);
    this.addSql(`create index "advance_request_entity_requester_id_status_index" on "advance_request_entity" ("requester_id", "status");`);
    this.addSql(`create index "advance_request_entity_status_index" on "advance_request_entity" ("status");`);

    this.addSql(`create table "advance_request_activity_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "actor_id" int null, "action" text check ("action" in ('submitted', 'approved', 'rejected', 'cancelled')) not null, "from_status" text check ("from_status" in ('pending_approval', 'approved', 'rejected', 'cancelled')) null, "to_status" text check ("to_status" in ('pending_approval', 'approved', 'rejected', 'cancelled')) null, "comment" varchar(255) null);`);
    this.addSql(`create index "advance_request_activity_entity_request_id_created_at_index" on "advance_request_activity_entity" ("request_id", "created_at");`);

    this.addSql(`create table "advance_approval_step_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "sequence" int not null, "required_role" text check ("required_role" in ('admin', 'finance', 'finance_manager', 'approver', 'hr', 'user')) not null, "status" text check ("status" in ('pending', 'approved', 'rejected', 'skipped')) not null default 'pending', "actor_id" int null, "decided_at" timestamptz null, "comment" varchar(255) null);`);
    this.addSql(`create index "advance_approval_step_entity_request_id_sequence_index" on "advance_approval_step_entity" ("request_id", "sequence");`);

    this.addSql(`alter table "advance_request_entity" add constraint "advance_request_entity_requester_id_foreign" foreign key ("requester_id") references "user_entity" ("id") on update cascade;`);

    this.addSql(`alter table "advance_request_activity_entity" add constraint "advance_request_activity_entity_request_id_foreign" foreign key ("request_id") references "advance_request_entity" ("id") on update cascade;`);
    this.addSql(`alter table "advance_request_activity_entity" add constraint "advance_request_activity_entity_actor_id_foreign" foreign key ("actor_id") references "user_entity" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "advance_approval_step_entity" add constraint "advance_approval_step_entity_request_id_foreign" foreign key ("request_id") references "advance_request_entity" ("id") on update cascade;`);
    this.addSql(`alter table "advance_approval_step_entity" add constraint "advance_approval_step_entity_actor_id_foreign" foreign key ("actor_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`alter table "advance_request_activity_entity" drop constraint "advance_request_activity_entity_request_id_foreign";`);

    this.addSql(`alter table "advance_approval_step_entity" drop constraint "advance_approval_step_entity_request_id_foreign";`);

    this.addSql(`drop table if exists "advance_request_entity" cascade;`);

    this.addSql(`drop table if exists "advance_request_activity_entity" cascade;`);

    this.addSql(`drop table if exists "advance_approval_step_entity" cascade;`);
  }

}
exports.Migration20261026192824 = Migration20261026192824;

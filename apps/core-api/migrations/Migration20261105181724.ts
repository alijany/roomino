'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261105181724 extends Migration {

  async up() {
    this.addSql(`alter table "on_call_swap_entity" drop constraint if exists "on_call_swap_entity_kind_check";`);

    this.addSql(`alter table "on_call_swap_entity" add column "start_time" varchar(5) null, add column "end_time" varchar(5) null, add column "coordinated" boolean not null default false;`);
    this.addSql(`alter table "on_call_swap_entity" add constraint "on_call_swap_entity_kind_check" check("kind" in ('swap', 'handover', 'partial'));`);
  }

  async down() {
    this.addSql(`alter table "on_call_swap_entity" drop constraint if exists "on_call_swap_entity_kind_check";`);

    this.addSql(`alter table "on_call_swap_entity" drop column "start_time", drop column "end_time", drop column "coordinated";`);

    this.addSql(`alter table "on_call_swap_entity" add constraint "on_call_swap_entity_kind_check" check("kind" in ('swap', 'handover'));`);
  }

}
exports.Migration20261105181724 = Migration20261105181724;

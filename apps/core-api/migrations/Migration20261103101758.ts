'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261103101758 extends Migration {

  async up() {
    this.addSql(`create table "welcome_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "newcomer_id" int not null, "viewer_id" int not null, "greeted" boolean not null default false, "dismissed" boolean not null default false);`);
    this.addSql(`alter table "welcome_entity" add constraint "welcome_entity_newcomer_id_viewer_id_unique" unique ("newcomer_id", "viewer_id");`);

    this.addSql(`alter table "welcome_entity" add constraint "welcome_entity_newcomer_id_foreign" foreign key ("newcomer_id") references "user_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "welcome_entity" add constraint "welcome_entity_viewer_id_foreign" foreign key ("viewer_id") references "user_entity" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "user_entity" add column "introduce" boolean not null default false;`);
  }

  async down() {
    this.addSql(`drop table if exists "welcome_entity" cascade;`);

    this.addSql(`alter table "user_entity" drop column "introduce";`);
  }

}
exports.Migration20261103101758 = Migration20261103101758;

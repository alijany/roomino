'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261025170137 extends Migration {

  async up() {
    this.addSql(`create table "attendance_request_attachment_entity" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "storage_key" varchar(255) not null, "filename" varchar(255) not null, "mime_type" varchar(255) not null, "size_bytes" int not null, "uploaded_by_id" int null);`);

    this.addSql(`alter table "attendance_request_attachment_entity" add constraint "attendance_request_attachment_entity_request_id_foreign" foreign key ("request_id") references "attendance_request_entity" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "attendance_request_attachment_entity" add constraint "attendance_request_attachment_entity_uploaded_by_id_foreign" foreign key ("uploaded_by_id") references "user_entity" ("id") on update cascade on delete set null;`);
  }

  async down() {
    this.addSql(`drop table if exists "attendance_request_attachment_entity" cascade;`);
  }

}
exports.Migration20261025170137 = Migration20261025170137;

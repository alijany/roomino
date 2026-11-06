'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261106031214 extends Migration {

  async up() {
    this.addSql(`alter table "on_call_shift_entity" add column "reminder_sent_at" timestamptz null;`);
  }

  async down() {
    this.addSql(`alter table "on_call_shift_entity" drop column "reminder_sent_at";`);
  }

}
exports.Migration20261106031214 = Migration20261106031214;

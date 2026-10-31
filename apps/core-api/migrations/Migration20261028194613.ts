'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20261028194613 extends Migration {

  async up() {
    this.addSql(`alter table "user_entity" add column "salary_mode" varchar(255) not null default 'regular';`);

    this.addSql(`alter table "payroll_line_entity" add column "extras" bigint not null default 0;`);
  }

  async down() {
    this.addSql(`alter table "payroll_line_entity" drop column "extras";`);

    this.addSql(`alter table "user_entity" drop column "salary_mode";`);
  }

}
exports.Migration20261028194613 = Migration20261028194613;

import { MikroORM } from '@mikro-orm/core';
import { MigrationRow, UmzugMigration } from '@mikro-orm/migrations';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service responsible for handling database migrations.
 */
@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(
    private orm: MikroORM,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Lifecycle hook that is called when the module is initialized.
   * It performs the necessary database migrations.
   */
  async onModuleInit() {
    // create database if it does not exist
    const generator = this.orm.getSchemaGenerator();
    // check if the database exists
    await generator.ensureDatabase({
      create: true,
    });
    const migrator = this.orm.getMigrator();
    const executedMigrations = await migrator.getExecutedMigrations();
    const pendingMigrations = await migrator.getPendingMigrations();

    // Apply what is already committed FIRST. Diffing the entities against a
    // schema that is behind by even one migration produces a file that
    // re-creates objects the pending migrations are about to create.
    for (const migration of pendingMigrations) {
      await migrator.up(migration.name);
    }

    await this.createMigration(pendingMigrations, executedMigrations, migrator);
  }

  /**
   * Generates a migration for whatever the entities now say that the database
   * does not, in non-production only.
   *
   * Runs *after* pending migrations have been applied, so the diff is against
   * the real current schema. Generating beforehand — as this used to — meant a
   * fresh database produced a whole-schema migration that then collided with
   * the very migrations it was derived from, on the next boot.
   *
   * @param pendingMigrations - migrations that were outstanding at boot.
   * @param executedMigrations - migrations already recorded as applied.
   * @param migrator - the migrator instance.
   */
  private async createMigration(
    pendingMigrations: UmzugMigration[],
    executedMigrations: MigrationRow[],
    migrator,
  ) {
    if (this.configService.get('NODE_ENV') === 'production') return;

    if (pendingMigrations.length === 0 && executedMigrations.length === 0) {
      await migrator.createInitialMigration();
      return;
    }

    await migrator.createMigration();
  }
}

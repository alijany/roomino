import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Enable CORS
  app.enableCors();

  // Seeding of production personas now happens in PersonaService's lifecycle hook

  // PORT from the environment (4000 by default), so a second instance — the
  // end-to-end suites run against a database of their own — can sit beside it.
  await app.listen(Number(process.env.PORT) || 4000);
  return app;
}

bootstrap();

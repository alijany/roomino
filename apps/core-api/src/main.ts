import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Traefik, so the client's address (what the rate limits key on) is
  // the first hop of X-Forwarded-For rather than the proxy itself.
  app.set('trust proxy', 1);

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

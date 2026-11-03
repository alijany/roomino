import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { WelcomeController } from './welcome.controller';
import { WelcomeEntity } from './welcome.entity';
import { WelcomeService } from './welcome.service';

/** Welcoming new colleagues on the dashboard. */
@Module({
  imports: [MikroOrmModule.forFeature([WelcomeEntity])],
  providers: [WelcomeService],
  controllers: [WelcomeController],
})
export class WelcomeModule {}

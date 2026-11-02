import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ContractController } from './contract.controller';
import { ContractEntity } from './contract.entity';
import { ContractService } from './contract.service';

/** Contract terms and NDAs of the staff. */
@Module({
  imports: [MikroOrmModule.forFeature([ContractEntity])],
  providers: [ContractService],
  controllers: [ContractController],
  exports: [ContractService],
})
export class ContractModule {}

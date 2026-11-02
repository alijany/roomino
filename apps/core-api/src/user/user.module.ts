import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ContractModule } from 'src/contract/contract.module';
import { RolesModule } from 'src/roles/roles.module';
import { S3StorageModule } from 'src/storage/s3-storage.module';
import { AdminUserController, UserController } from './user.controller';
import { AdminUserBootstrapService } from './user.service.admin-bootstrap';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    RolesModule,
    ContractModule,
    MikroOrmModule.forFeature([UserEntity]),
    S3StorageModule,
  ],
  providers: [UserService, AdminUserBootstrapService],
  controllers: [UserController, AdminUserController],
  exports: [UserService],
})
export class UserModule {}

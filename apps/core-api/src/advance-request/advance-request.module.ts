import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { RolesModule } from '../roles/roles.module';
import { AdvanceRequestController } from './controllers/advance-request.controller';
import { AdvanceApprovalStepEntity } from './entities/advance-approval-step.entity';
import { AdvanceRequestActivityEntity } from './entities/advance-request-activity.entity';
import { AdvanceRequestEntity } from './entities/advance-request.entity';
import { AdvanceRequestActivityService } from './services/advance-request-activity.service';
import { AdvanceRequestNotificationService } from './services/advance-request-notification.service';
import { AdvanceRequestService } from './services/advance-request.service';

/**
 * مساعده مالی — personnel salary/financial advance requests.
 *
 * Independent from the `finance` module: that module pays external vendors
 * on the company's behalf, this one pays an employee their own advance, with
 * a fixed two-step approval chain (manager, then finance manager) instead of
 * an amount-based matrix.
 */
@Module({
  imports: [
    MikroOrmModule.forFeature([
      AdvanceRequestEntity,
      AdvanceApprovalStepEntity,
      AdvanceRequestActivityEntity,
    ]),
    NotificationModule,
    RolesModule,
  ],
  providers: [
    AdvanceRequestActivityService,
    AdvanceRequestNotificationService,
    AdvanceRequestService,
  ],
  controllers: [AdvanceRequestController],
})
export class AdvanceRequestModule {}

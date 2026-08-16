import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { RolesModule } from '../roles/roles.module';
import { S3StorageModule } from '../storage/s3-storage.module';
import { ApprovalRuleController } from './controllers/approval-rule.controller';
import { ExpenseCategoryController } from './controllers/expense-category.controller';
import { PaymentRequestController } from './controllers/payment-request.controller';
import { PaymentSourceController } from './controllers/payment-source.controller';
import { ApprovalRuleEntity } from './entities/approval-rule.entity';
import { ApprovalStepEntity } from './entities/approval-step.entity';
import { ExpenseCategoryEntity } from './entities/expense-category.entity';
import { FinanceActivityEntity } from './entities/finance-activity.entity';
import { PaymentRequestEntity } from './entities/payment-request.entity';
import { PaymentSourceEntity } from './entities/payment-source.entity';
import { PaymentEntity } from './entities/payment.entity';
import { RequestAttachmentEntity } from './entities/request-attachment.entity';
import { ApprovalRuleService } from './services/approval-rule.service';
import { ExpenseCategoryService } from './services/expense-category.service';
import { FinanceActivityService } from './services/finance-activity.service';
import { FinanceAttachmentService } from './services/finance-attachment.service';
import { FinanceBootstrapService } from './services/finance-bootstrap.service';
import { FinanceNotificationService } from './services/finance-notification.service';
import { PaymentRequestService } from './services/payment-request.service';
import { PaymentSourceService } from './services/payment-source.service';

/**
 * Finance & External Payments.
 *
 * Phase 1 covers the request → approve → pay spine. Vendors, recurring
 * expenses and reporting land in later phases and plug into the same entities.
 */
@Module({
  imports: [
    MikroOrmModule.forFeature([
      ExpenseCategoryEntity,
      PaymentSourceEntity,
      PaymentRequestEntity,
      RequestAttachmentEntity,
      ApprovalRuleEntity,
      ApprovalStepEntity,
      PaymentEntity,
      FinanceActivityEntity,
    ]),
    NotificationModule,
    RolesModule,
    S3StorageModule,
  ],
  providers: [
    ExpenseCategoryService,
    PaymentSourceService,
    ApprovalRuleService,
    FinanceActivityService,
    FinanceAttachmentService,
    FinanceNotificationService,
    PaymentRequestService,
    FinanceBootstrapService,
  ],
  controllers: [
    PaymentRequestController,
    ExpenseCategoryController,
    ApprovalRuleController,
    PaymentSourceController,
  ],
  exports: [PaymentRequestService],
})
export class FinanceModule {}

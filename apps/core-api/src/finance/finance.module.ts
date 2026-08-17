import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { RolesModule } from '../roles/roles.module';
import { S3StorageModule } from '../storage/s3-storage.module';
import { ApprovalRuleController } from './controllers/approval-rule.controller';
import { ExpenseCategoryController } from './controllers/expense-category.controller';
import { FinanceReportController } from './controllers/finance-report.controller';
import { PaymentRequestController } from './controllers/payment-request.controller';
import { PaymentSourceController } from './controllers/payment-source.controller';
import { RecurringExpenseController } from './controllers/recurring-expense.controller';
import { VendorController } from './controllers/vendor.controller';
import { ApprovalRuleEntity } from './entities/approval-rule.entity';
import { ApprovalStepEntity } from './entities/approval-step.entity';
import { ExpenseCategoryEntity } from './entities/expense-category.entity';
import { FinanceActivityEntity } from './entities/finance-activity.entity';
import { PayeeAccountEntity } from './entities/payee-account.entity';
import { PaymentRequestEntity } from './entities/payment-request.entity';
import { PaymentSourceEntity } from './entities/payment-source.entity';
import { PaymentEntity } from './entities/payment.entity';
import { RecurringExpenseEntity } from './entities/recurring-expense.entity';
import { RequestAttachmentEntity } from './entities/request-attachment.entity';
import { VendorEntity } from './entities/vendor.entity';
import { ApprovalRuleService } from './services/approval-rule.service';
import { ExpenseCategoryService } from './services/expense-category.service';
import { FinanceActivityService } from './services/finance-activity.service';
import { FinanceAttachmentService } from './services/finance-attachment.service';
import { FinanceBootstrapService } from './services/finance-bootstrap.service';
import { FinanceNotificationService } from './services/finance-notification.service';
import { FinanceReportService } from './services/finance-report.service';
import { FinanceScheduleService } from './services/finance-schedule.service';
import { PaymentRequestService } from './services/payment-request.service';
import { PaymentSourceService } from './services/payment-source.service';
import { RecurringExpenseService } from './services/recurring-expense.service';
import { VendorService } from './services/vendor.service';

/**
 * Finance & External Payments.
 *
 * Phase 1 — the request → approve → pay spine.
 * Phase 2 — the vendor directory, recurring expenses and the scheduled jobs.
 * Phase 3 — the dashboard, monthly close and CSV export.
 *
 * Budgets and cost centres remain deferred; `PaymentRequestEntity.costCenter`
 * is already in place for them.
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
      VendorEntity,
      PayeeAccountEntity,
      RecurringExpenseEntity,
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
    VendorService,
    RecurringExpenseService,
    FinanceReportService,
    FinanceScheduleService,
    FinanceBootstrapService,
  ],
  controllers: [
    PaymentRequestController,
    ExpenseCategoryController,
    ApprovalRuleController,
    PaymentSourceController,
    VendorController,
    RecurringExpenseController,
    FinanceReportController,
  ],
  exports: [PaymentRequestService],
})
export class FinanceModule {}

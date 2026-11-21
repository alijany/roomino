import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserEntity } from '../../user/user.entity';
import { PayrollService } from '../services/payroll.service';

/** A person's own payslips: every endpoint reads only the caller's final months. */
@Controller('finance/payroll/my')
@UseGuards(JwtAuthGuard)
export class PayrollMeController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.payroll.myList(user.id);
  }

  @Get(':id')
  payslip(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.payroll.myPayslip(user.id, id);
  }
}

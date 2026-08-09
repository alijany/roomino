import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../roles/roles.constants';
import { RoomUsageHeatmapQueryDto } from '../dtos/room-usage-heatmap-query.dto';
import { ReportService } from '../services/report.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('room-usage-heatmap')
  @Roles(Role.ADMIN)
  getRoomUsageHeatmap(@Query() query: RoomUsageHeatmapQueryDto) {
    return this.reportService.getRoomUsageHeatmap(
      query.from,
      query.to,
      query.roomIds,
      query.groupBy ?? 'hour',
    );
  }
}

import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserEntity } from '../../user/user.entity';
import { MAX_REQUEST_ATTACHMENT_BYTES } from '../attendance.constants';
import { RequestAttachmentService } from '../services/request-attachment.service';

/**
 * Documents on a request. Reading follows who may see the request (owner,
 * admin/HR, team approvers); adding and removing is the owner's, while the
 * request is still pending — enforced in the service.
 */
@Controller('attendance/request-attachments')
@UseGuards(JwtAuthGuard)
export class RequestAttachmentController {
  constructor(private readonly attachments: RequestAttachmentService) {}

  @Get(':requestId')
  async list(
    @Param('requestId', ParseIntPipe) requestId: number,
    @CurrentUser() user: UserEntity,
  ) {
    return { items: await this.attachments.list(requestId, user) };
  }

  @Post(':requestId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_REQUEST_ATTACHMENT_BYTES },
    }),
  )
  upload(
    @Param('requestId', ParseIntPipe) requestId: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserEntity,
  ) {
    return this.attachments.upload(requestId, file, user);
  }

  @Delete(':requestId/:id')
  async remove(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    await this.attachments.remove(requestId, id, user);
    return { success: true };
  }
}

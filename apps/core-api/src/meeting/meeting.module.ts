import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { RecurringReservationController } from './controllers/recurring-reservation.controller';
import { ReservationController } from './controllers/reservation.controller';
import { RoomController } from './controllers/room.controller';
import { MeetingRoomEntity } from './entities/meeting-room.entity';
import { RecurringReservationEntity } from './entities/recurring-reservation.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { MeetingRoomService } from './services/meeting-room.service';
import { RecurringReservationService } from './services/recurring-reservation.service';
import { ReservationService } from './services/reservation.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      MeetingRoomEntity,
      ReservationEntity,
      RecurringReservationEntity,
    ]),
  ],
  providers: [
    MeetingRoomService,
    ReservationService,
    RecurringReservationService,
  ],
  controllers: [
    RoomController,
    ReservationController,
    RecurringReservationController,
  ],
})
export class MeetingModule {}

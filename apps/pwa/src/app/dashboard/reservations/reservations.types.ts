export type SlotStatus = 'available' | 'reserved' | 'locked';

export interface AvailabilitySlot {
  startMinutes: number;
  endMinutes: number;
  status: SlotStatus;
  reservation?: {
    id: number;
    title?: string;
    purpose?: string;
    ownerName: string;
    ownerPhone?: string;
    isOwn: boolean;
  };
  lockTitle?: string;
}

export interface AvailabilityRoom {
  roomId: number;
  roomName: string;
  capacity?: number;
  slots: AvailabilitySlot[];
}

export interface AvailabilityResponse {
  date: string;
  weekday: number;
  slotStarts: number[];
  rooms: AvailabilityRoom[];
}

export interface CreateReservationDto {
  roomId: number;
  date: string;
  startMinutes: number;
  endMinutes: number;
  title?: string;
  purpose?: string;
}

export interface UpdateReservationDto {
  date: string;
  startMinutes: number;
  endMinutes: number;
  title?: string;
  purpose?: string;
}

export interface MyReservation {
  id: number;
  startAt: string;
  endAt: string;
  title?: string;
  purpose?: string;
  room: { id: number; name: string };
}

export interface GetMyReservationsResponse {
  items: MyReservation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

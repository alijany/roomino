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

export interface Room {
  id: number;
  name: string;
  description?: string;
  capacity?: number;
  location?: string;
  active: boolean;
}

export interface GetRoomsResponse {
  items: Room[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

export interface CreateRoomDto {
  name: string;
  description?: string;
  capacity?: number;
  location?: string;
  active?: boolean;
}

export type UpdateRoomDto = Partial<CreateRoomDto>;

export interface RoomFilterDto {
  page?: number;
  limit?: number;
}

export interface Recurring {
  id: number;
  room: Room;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  title: string;
  active: boolean;
}

export interface GetRecurringResponse {
  items: Recurring[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

export interface CreateRecurringDto {
  roomId: number;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  title: string;
}

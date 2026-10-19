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
    ownerPicture?: string | null;
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

/** Only hour-of-day grouping is implemented today; day-of-week is reserved for later. */
export type ReportGroupBy = 'hour';

export interface HeatmapBucket {
  /** Hour of day (Tehran civil time), e.g. 9 for the 09:00–10:00 bucket. */
  key: number;
  /** "HH:mm" start of the bucket. */
  label: string;
}

export interface HeatmapCell {
  /** Total booked minutes summed across every day in the range. */
  minutes: number;
  /** Number of reservations overlapping this bucket. */
  count: number;
  /** minutes / (60 * days in range), clamped to [0, 1]. */
  occupancyRate: number;
}

export interface RoomUsageRow {
  roomId: number;
  roomName: string;
  values: HeatmapCell[];
}

export interface RoomUsageHeatmapResponse {
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  buckets: HeatmapBucket[];
  rooms: RoomUsageRow[];
  totalReservations: number;
}

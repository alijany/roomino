import { useSwrHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import {
  RoomUsageHeatmapFilterDto,
  RoomUsageHeatmapResponse,
} from '@/app/admin/reports/reports.types';

export function useRoomUsageHeatmap(filters: RoomUsageHeatmapFilterDto) {
  const query = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: Array.isArray(value) ? value.join(',') : String(value),
        }),
        {} as Record<string, string>,
      ),
  ).toString();

  const swr = useSWR<RoomUsageHeatmapResponse>(
    filters.from && filters.to ? `/admin/reports/room-usage-heatmap?${query}` : null,
    fetcher,
  );
  return useSwrHelper(swr);
}

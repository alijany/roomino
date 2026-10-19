import { useState } from 'react';
import { toast } from 'react-toastify';
import { useCheckIn, useCheckOut } from './attendance.api';
import { CheckResult } from './attendance.types';
import { errorMessage, getPosition } from './attendance.util';

/**
 * Check-in/out with GPS and the remote fallback — shared by the attendance
 * home and the dashboard widget so both behave the same.
 */
export function useCheckInFlow(onChange: () => void) {
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [locating, setLocating] = useState(false);
  const [offerRemote, setOfferRemote] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  /** Where GPS last put the person, drawn on the map as «موقعیت شما». */
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  /**
   * Position is optional: without it the server decides (no GPS rule, a
   * remote day, or a refusal that offers remote check-in).
   */
  const locate = async () => {
    setLocating(true);
    try {
      const position = await getPosition();
      setMe(position);
      return position;
    } catch (error) {
      toast.warning((error as Error).message);
      return {};
    } finally {
      setLocating(false);
    }
  };

  const handle = (result: CheckResult) => {
    if (result.success) {
      toast.success(result.message);
      setOfferRemote(false);
      setLastError(null);
      onChange();
    } else {
      setLastError(result.message);
      setOfferRemote(Boolean(result.canRemote));
    }
  };

  const doCheckIn = async (remote = false) => {
    const position = await locate();
    try {
      handle(await checkIn.submit({ ...position, remote: remote || undefined }));
    } catch (error) {
      toast.error(errorMessage(error, 'ثبت ورود انجام نشد'));
      // An admin may have just switched to schedule mode.
      onChange();
    }
  };

  const doCheckOut = async () => {
    const position = await locate();
    try {
      handle(await checkOut.submit(position));
    } catch (error) {
      toast.error(errorMessage(error, 'ثبت خروج انجام نشد'));
      onChange();
    }
  };

  return {
    locating,
    busy: locating || checkIn.isLoading || checkOut.isLoading,
    offerRemote,
    lastError,
    me,
    doCheckIn,
    doCheckOut,
  };
}

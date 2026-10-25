import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useCheckIn, useCheckOut } from './attendance.api';
import { overtimeLine } from './attendance.component.mode-today';
import { CheckResult } from './attendance.types';
import { errorMessage, getPosition, LocationError } from './attendance.util';

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
  /** Set while the last attempt couldn't read a position; cleared by the next that can. */
  const [locationIssue, setLocationIssue] = useState<LocationError | null>(null);
  const lastAction = useRef<'in' | 'out'>('in');
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
      setLocationIssue(null);
      return position;
    } catch (error) {
      toast.warning((error as Error).message);
      if (error instanceof LocationError) setLocationIssue(error);
      return {};
    } finally {
      setLocating(false);
    }
  };

  const handle = (result: CheckResult) => {
    if (result.success) {
      toast.success(result.message);
      if (result.overtimeSuggestion) toast.info(overtimeLine(result.overtimeSuggestion));
      setOfferRemote(false);
      setLastError(null);
      onChange();
    } else {
      setLastError(result.message);
      setOfferRemote(Boolean(result.canRemote));
    }
  };

  const doCheckIn = async (remote = false) => {
    lastAction.current = 'in';
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
    lastAction.current = 'out';
    const position = await locate();
    try {
      handle(await checkOut.submit(position));
    } catch (error) {
      toast.error(errorMessage(error, 'ثبت خروج انجام نشد'));
      onChange();
    }
  };

  /** Asks for the position again — which prompts afresh wherever the browser allows it. */
  const retryLocation = () => (lastAction.current === 'out' ? doCheckOut() : doCheckIn());

  return {
    locating,
    busy: locating || checkIn.isLoading || checkOut.isLoading,
    offerRemote,
    lastError,
    locationIssue,
    retryLocation,
    me,
    doCheckIn,
    doCheckOut,
  };
}

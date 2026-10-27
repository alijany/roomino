import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDeclarePresence } from './attendance.api';
import { errorMessage, getPosition, LocationError } from './attendance.util';

/**
 * «امروز هستم» for someone in «بدون ثبت» — said the way a check-in is: from
 * the workplace (position read, inside the radius unless their profile
 * doesn't use GPS) or, failing that, as remote work, which files the remote
 * day for approval. Same refusal, same remote offer, same location help as
 * `useCheckInFlow` — and, like it, no position at all when `selfDeclared`.
 */
export function usePresenceFlow(onChange: () => void, selfDeclared = false) {
  const declare = useDeclarePresence();
  const [locating, setLocating] = useState(false);
  const [offerRemote, setOfferRemote] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [locationIssue, setLocationIssue] = useState<LocationError | null>(null);

  /** Position is optional: without it the server decides, as for a check-in. */
  const locate = async () => {
    setLocating(true);
    try {
      const position = await getPosition();
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

  const say = async (remote = false) => {
    const position = selfDeclared ? {} : await locate();
    try {
      const result = await declare.submit({ ...position, remote: remote || undefined });
      if (result.success) {
        toast.success(result.message);
        setOfferRemote(false);
        setLastError(null);
        onChange();
      } else {
        setLastError(result.message);
        setOfferRemote(Boolean(result.canRemote));
      }
    } catch (error) {
      toast.error(errorMessage(error, 'اعلام حضور انجام نشد'));
      onChange();
    }
  };

  return {
    locating,
    busy: locating || declare.isLoading,
    offerRemote,
    lastError,
    locationIssue,
    say,
    retryLocation: () => say(),
  };
}

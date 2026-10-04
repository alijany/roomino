import {
  LeaveType,
  PolicyPeriod,
  PolicyRequestType,
  RequestCategory,
  RequestType,
} from '../attendance.constants';

/** Which of the three request shapes a type uses. */
export type RequestShape = 'range' | 'timed' | 'manual' | 'free';

export function categoryOf(type: RequestType): RequestCategory {
  if (type.startsWith('leave_')) return RequestCategory.LEAVE;
  if (type.startsWith('mission')) return RequestCategory.MISSION;
  if (type.startsWith('remote')) return RequestCategory.REMOTE;
  if (type === RequestType.OVERTIME) return RequestCategory.OVERTIME;
  if (type === RequestType.MANUAL_ATTENDANCE) {
    return RequestCategory.MANUAL_ATTENDANCE;
  }
  return RequestCategory.OTHER;
}

export function isHourly(type: RequestType): boolean {
  return type.endsWith('_hourly');
}

export function isDaily(type: RequestType): boolean {
  return type.endsWith('_daily');
}

export function shapeOf(type: RequestType): RequestShape {
  if (isDaily(type)) return 'range';
  if (isHourly(type) || type === RequestType.OVERTIME) return 'timed';
  if (type === RequestType.MANUAL_ATTENDANCE) return 'manual';
  return 'free';
}

export function leaveTypeOf(type: RequestType): LeaveType | null {
  if (type.startsWith('leave_entitled')) return LeaveType.ENTITLED;
  if (type.startsWith('leave_sick')) return LeaveType.SICK;
  if (type.startsWith('leave_unpaid')) return LeaveType.UNPAID;
  return null;
}

/** The work-policy rule type that caps a request type, if any. */
export function policyTypeOf(type: RequestType): PolicyRequestType | null {
  const leave = leaveTypeOf(type);
  if (leave) return `leave_${leave}` as PolicyRequestType;
  if (type.startsWith('mission')) return PolicyRequestType.MISSION;
  if (type === RequestType.OVERTIME) return PolicyRequestType.OVERTIME;
  if (type === RequestType.MANUAL_ATTENDANCE) {
    return PolicyRequestType.MANUAL_ATTENDANCE;
  }
  return null;
}

export function periodOf(type: RequestType): PolicyPeriod | null {
  if (isDaily(type)) return PolicyPeriod.DAILY;
  if (isHourly(type)) return PolicyPeriod.HOURLY;
  return null;
}

/** Every request type a policy rule type covers (optionally one period). */
export function typesForPolicy(
  policyType: PolicyRequestType,
  period?: PolicyPeriod | null,
): RequestType[] {
  return Object.values(RequestType).filter(
    (type) =>
      policyTypeOf(type) === policyType &&
      (!period || periodOf(type) === null || periodOf(type) === period),
  );
}

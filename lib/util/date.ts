import type { Cohort } from '../domain/types';

/** Academic year — flips July 1, matching current_academic_year() in the DB. */
export function academicYear(now: Date = new Date()): number {
  return now.getFullYear() + (now.getMonth() >= 6 ? 1 : 0);
}

/** A member is a current student until their graduation year passes. */
export function cohortFor(gradYear: number, now: Date = new Date()): Cohort {
  return gradYear >= academicYear(now) ? 'student' : 'alumni';
}

/** Graduation-year validation (ported from member.html checkYear). Pure/testable. */
export const GRAD_YEAR_MIN = 2008;

export function gradYearMax(now: Date = new Date()): number {
  return now.getFullYear() + 12;
}

/** Strip to digits, cap at 4 chars — mirrors the input sanitizer. */
export function cleanYearInput(v: string): string {
  return v.replace(/\D/g, '').slice(0, 4);
}

export function isValidGradYear(year: number, now: Date = new Date()): boolean {
  return Number.isInteger(year) && year >= GRAD_YEAR_MIN && year <= gradYearMax(now);
}

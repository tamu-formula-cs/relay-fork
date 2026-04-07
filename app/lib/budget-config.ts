// Client-safe budget constants — no server imports here.

export const SUBTEAM_BUDGETS: Record<string, number> = {
  AERO: 8915,
  CHS: 4000,
  SUS: 18950,
  BAT: 17500,
  ECE: 7130,
  PT: 21274,
  SW: 500,
  DBMS: 2500,
  OPS: 10000,
  FACIL: 4500,
  FLEET: 2500,
  MKTG: 1000,
};

// Email(s) authorized to approve overbudget orders.
export const PM_EMAILS = ['athulraj123@tamu.edu'];

export function normalizeSubteam(subteam: string): string {
  const normalized = subteam.toUpperCase();
  const mapping: Record<string, string> = {
    AERODYNAMICS: 'AERO',
    CHASSIS: 'CHS',
    SUSPENSION: 'SUS',
    BATTERY: 'BAT',
    ELECTRONICS: 'ECE',
    POWERTRAIN: 'PT',
    SOFTWARE: 'SW',
    'DISTRIBUTED BMS': 'DBMS',
    OPERATIONS: 'OPS',
    'FACILITIES/INFRASTRUCTURE': 'FACIL',
    'FLEET MAINTENANCE': 'FLEET',
    MARKETING: 'MKTG',
  };
  return mapping[normalized] || normalized;
}

export function isPM(email: string): boolean {
  return PM_EMAILS.includes(email.toLowerCase());
}

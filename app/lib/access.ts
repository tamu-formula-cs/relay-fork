import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// OMS role flags plus the profile subteam. Lead is not limited to that subteam.
export type AccessFlags = {
  isAdmin: boolean;
  isLead: boolean;
  isPm: boolean;
  subteam: string;
};

const EDITOR_FIELDS = [
  'totalCost', 'costVerified', 'carrier', 'trackingId', 'meenOrderId',
  'costBreakdown', 'carYear', 'trouble',
] as const;

const SUBTEAMS_BY_ROLE: Record<string, readonly string[]> = {
  BUSINESS: ['FINANCE', 'OPERATIONS', 'MARKETING'],
  ENGINEER: [
    'AERODYNAMICS', 'BATTERY', 'CHASSIS', 'ELECTRONICS', 'POWERTRAIN',
    'SUSPENSION', 'DISTRIBUTED BMS', 'SOFTWARE', 'VEHICLE DYNAMICS',
  ],
};

export function canEdit(actor: AccessFlags): boolean {
  return actor.isAdmin || actor.isLead;
}

export function canApprove(actor: AccessFlags): boolean {
  return actor.isAdmin || actor.isPm;
}

export function canComment(actor: AccessFlags, orderSubteam: string): boolean {
  return canEdit(actor) || actor.subteam === orderSubteam;
}

// null when the change is allowed. Members may resend the current status and comment.
export function editDenied(
  actor: AccessFlags,
  body: Record<string, unknown>,
  current: { status: string; comments: string | null; subteam: string },
): 'Forbidden' | null {
  const statusChanged = body.status !== undefined && body.status !== current.status;
  const editorFieldSent = EDITOR_FIELDS.some((key) => body[key] !== undefined);
  if ((statusChanged || editorFieldSent) && !canEdit(actor)) return 'Forbidden';
  const nextComment = body.comments;
  const commentsChanged = nextComment !== undefined && nextComment !== (current.comments ?? '');
  if (commentsChanged && !canComment(actor, current.subteam)) return 'Forbidden';
  return null;
}

export function signupAllowed(role: unknown, subteam: unknown): boolean {
  if (typeof role !== 'string' || typeof subteam !== 'string') return false;
  return SUBTEAMS_BY_ROLE[role]?.includes(subteam) ?? false;
}

export function publicUser<T extends { phone?: unknown; password?: unknown }>(user: T): Omit<T, 'phone' | 'password'> {
  const { phone, password, ...rest } = user;
  void phone;
  void password;
  return rest;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function configuredSecrets(): string[] {
  return [process.env.SYNC_SECRET, process.env.CRON_SECRET].filter((secret): secret is string => !!secret);
}

// Fail closed when neither secret is set. Header or ?token= both count.
export function machineAuthOk(authorization: string | null, token: string | null = null): boolean {
  const secrets = configuredSecrets();
  if (secrets.length === 0) return false;
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
  return secrets.some((secret) =>
    (bearer !== null && safeEqual(bearer, secret)) || (token !== null && safeEqual(token, secret))
  );
}

function selfCheck() {
  const member: AccessFlags = { isAdmin: false, isLead: false, isPm: false, subteam: 'AERODYNAMICS' };
  const lead: AccessFlags = { isAdmin: false, isLead: true, isPm: false, subteam: 'AERODYNAMICS' };
  const admin: AccessFlags = { isAdmin: true, isLead: false, isPm: false, subteam: 'AERODYNAMICS' };
  const pm: AccessFlags = { isAdmin: false, isLead: false, isPm: true, subteam: 'AERODYNAMICS' };
  const order = { status: 'TO_ORDER', comments: '', subteam: 'BATTERY' };

  if (editDenied(member, { status: 'PLACED' }, order) !== 'Forbidden') throw new Error('member status change');
  if (editDenied(lead, { status: 'PLACED' }, order) !== null) throw new Error('lead edits any order');
  if (editDenied(member, { status: 'TO_ORDER', comments: 'note' }, { ...order, subteam: 'AERODYNAMICS' }) !== null) {
    throw new Error('member comment on own subteam');
  }
  if (editDenied(member, { comments: 'note' }, order) !== 'Forbidden') throw new Error('member comment on other subteam');
  if (editDenied(member, { totalCost: 1 }, order) !== 'Forbidden') throw new Error('member price change');
  if (!canEdit(admin) || canEdit(member)) throw new Error('edit flags');
  if (!canApprove(admin) || !canApprove(pm) || canApprove(lead)) throw new Error('approve flags');
  if (signupAllowed('FINANCE', 'FINANCE')) throw new Error('signup role');
  if (!signupAllowed('ENGINEER', 'BATTERY')) throw new Error('signup subteam');

  const prevSync = process.env.SYNC_SECRET;
  const prevCron = process.env.CRON_SECRET;
  delete process.env.SYNC_SECRET;
  delete process.env.CRON_SECRET;
  if (machineAuthOk('Bearer anything')) throw new Error('missing secret');
  process.env.SYNC_SECRET = 's3cret';
  if (!machineAuthOk('Bearer s3cret')) throw new Error('bearer match');
  if (machineAuthOk('Bearer nope')) throw new Error('bearer reject');
  if (!machineAuthOk(null, 's3cret')) throw new Error('token match');
  if (prevSync === undefined) delete process.env.SYNC_SECRET;
  else process.env.SYNC_SECRET = prevSync;
  if (prevCron === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = prevCron;
  console.log('access ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  selfCheck();
}

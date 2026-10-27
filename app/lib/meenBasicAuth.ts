import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function meenBasicAuthOk(authorization: string | null): boolean {
  const user = process.env.MEEN_BASIC_USER ?? '';
  const password = process.env.MEEN_BASIC_PASSWORD ?? '';
  if (!user || !password || !authorization) return false;

  const expected = Buffer.from(`Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`);
  const actual = Buffer.from(authorization);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function selfCheck() {
  const prevUser = process.env.MEEN_BASIC_USER;
  const prevPassword = process.env.MEEN_BASIC_PASSWORD;
  process.env.MEEN_BASIC_USER = 'admin';
  process.env.MEEN_BASIC_PASSWORD = 'secret';
  const ok = `Basic ${Buffer.from('admin:secret').toString('base64')}`;
  const wrong = `Basic ${Buffer.from('admin:nope').toString('base64')}`;
  if (!meenBasicAuthOk(ok)) throw new Error('expected match');
  if (meenBasicAuthOk(wrong)) throw new Error('expected reject wrong password');
  if (meenBasicAuthOk(null)) throw new Error('expected reject missing header');
  if (meenBasicAuthOk('Bearer token')) throw new Error('expected reject non-basic');
  delete process.env.MEEN_BASIC_PASSWORD;
  if (meenBasicAuthOk(ok)) throw new Error('expected reject when password unset');
  process.env.MEEN_BASIC_PASSWORD = 'secret';
  delete process.env.MEEN_BASIC_USER;
  if (meenBasicAuthOk(ok)) throw new Error('expected reject when user unset');
  if (prevUser === undefined) delete process.env.MEEN_BASIC_USER;
  else process.env.MEEN_BASIC_USER = prevUser;
  if (prevPassword === undefined) delete process.env.MEEN_BASIC_PASSWORD;
  else process.env.MEEN_BASIC_PASSWORD = prevPassword;
  console.log('meen basic auth ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  selfCheck();
}

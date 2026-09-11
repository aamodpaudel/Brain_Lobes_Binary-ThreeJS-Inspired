import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Returns true if the request carries a valid admin session cookie. Use at the top of every mutating route handler. */
export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('adminSession')?.value === 'authenticated';
}

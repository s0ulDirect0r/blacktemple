import { membershipDatabase } from './database';

export async function emailUpdatesFor(userId: string): Promise<boolean> {
  const { rows } = await membershipDatabase().query<{ emailUpdates: boolean }>('SELECT "emailUpdates" FROM member_user WHERE id = $1', [userId]);
  return rows[0]?.emailUpdates === true;
}

export async function setEmailUpdates(userId: string, enabled: boolean) {
  await membershipDatabase().query('UPDATE member_user SET "emailUpdates" = $2, "updatedAt" = NOW() WHERE id = $1', [userId, enabled]);
}

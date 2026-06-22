/**
 * Single-owner model. Auth was removed (private, single-user app); all server-side DB
 * access uses the service-role admin client scoped to this fixed owner id, which is a
 * real auth.users row (so the tables' FKs are satisfied).
 */
export function getOwnerId(): string {
  const id = process.env.APP_USER_ID;
  if (!id) throw new Error("APP_USER_ID is not set");
  return id;
}

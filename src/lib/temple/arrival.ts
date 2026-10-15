export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

/** A suggestion only: the server remains the authority on alias availability. */
export function suggestedAlias(name: string) {
  const alias = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-').replace(/^[^a-z0-9]+|-+$/g, '').slice(0, 30);
  return alias.length >= 3 ? alias : alias ? `${alias}-temple` : '';
}

/**
 * Pre-launch waitlist mode.
 *
 * While this is on, signing in is the only thing anyone can do: the product
 * itself (dashboard, projects, workspace, MCP, billing) is replaced by a
 * thank-you page, and the backend refuses to start builds. Signing in IS
 * joining the waitlist — the account is the list entry, so there's no separate
 * form to keep in sync.
 *
 * Defaults to ON deliberately. The two ways to get this wrong are not equal: a
 * forgotten flag that leaves the waitlist up is a visible annoyance fixed in
 * seconds, while one that opens an unfinished product to everyone who clicks a
 * launch post costs real money and a first impression. Set
 * VITE_WAITLIST_MODE=false to open the product.
 *
 * Parsed as an explicit string rather than Boolean(): the string "false" is
 * truthy in JS, so a coerced flag set to "false" would switch this ON.
 */
export const WAITLIST_MODE =
  (import.meta.env.VITE_WAITLIST_MODE as string | undefined)?.toLowerCase() !== "false";

import { getContact } from './contacts-cache.ts'

export function isAllowed(senderUsername: string | undefined, whitelist: string[]): boolean {
  if (!senderUsername) return false
  if (whitelist.length === 0) return false
  if (whitelist.includes(senderUsername)) return true
  const c = getContact(senderUsername)
  if (!c) return false
  for (const entry of whitelist) {
    if (c.alias && c.alias === entry) return true
    if (c.nickname && c.nickname === entry) return true
    if (c.remark && c.remark === entry) return true
    if (c.displayName && c.displayName === entry) return true
  }
  return false
}

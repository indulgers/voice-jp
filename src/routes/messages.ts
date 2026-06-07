import { recent } from '../store.ts'

export function handleMessages(url: URL): Response {
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 500)
  const rows = recent(limit)
  return Response.json({ rows })
}

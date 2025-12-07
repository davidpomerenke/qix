import { createClient } from '@libsql/client'

export const db = createClient({
  url: process.env.TURSO_DB!,
  authToken: process.env.TURSO_TOKEN,
})

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS highscores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      level INTEGER NOT NULL,
      date TEXT NOT NULL
    )
  `)
}


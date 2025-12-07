import { NextResponse } from 'next/server'
import { db, initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const result = await db.execute('SELECT name, score, level, date FROM highscores ORDER BY score DESC LIMIT 5')
  return NextResponse.json(result.rows)
}

export async function POST(req: Request) {
  await initDb()
  const { name, score, level } = await req.json()
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  
  await db.execute({
    sql: 'INSERT INTO highscores (name, score, level, date) VALUES (?, ?, ?, ?)',
    args: [name, score, level, date],
  })
  
  // Return updated top 5
  const result = await db.execute('SELECT name, score, level, date FROM highscores ORDER BY score DESC LIMIT 5')
  return NextResponse.json(result.rows)
}


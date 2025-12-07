export interface HighScore {
  name: string
  score: number
  level: number
  date: string
}

export async function getHighScores(): Promise<HighScore[]> {
  const res = await fetch('/api/highscores')
  return res.json()
}

export async function saveHighScore(name: string, score: number, level: number): Promise<HighScore[]> {
  const res = await fetch('/api/highscores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score, level }),
  })
  return res.json()
}

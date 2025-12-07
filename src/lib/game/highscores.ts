export interface HighScore {
  score: number
  level: number
  date: string
}

const STORAGE_KEY = 'qix-highscores'

export function getHighScores(): HighScore[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

export function saveHighScore(score: number, level: number): HighScore[] {
  const scores = getHighScores()
  const newEntry: HighScore = {
    score,
    level,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }
  
  scores.push(newEntry)
  scores.sort((a, b) => b.score - a.score)
  const top5 = scores.slice(0, 5)
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(top5))
  return top5
}

export function isHighScore(score: number): boolean {
  const scores = getHighScores()
  return scores.length < 10 || score > scores[scores.length - 1].score
}


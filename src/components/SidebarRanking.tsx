import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type RankingUser = {
  id: string
  name: string
  total_points: number
}

export function SidebarRanking() {
  const [ranking, setRanking] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRanking()
  }, [])

  const loadRanking = async () => {
    try {
      setLoading(true)
      const api = axios.create({
        baseURL: API_URL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('palpite_token') || ''}`
        }
      })

      const response = await api.get('/ranking/general')
      setRanking(response.data.slice(0, 5))
    } catch (err) {
      console.error('Erro ao carregar ranking:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || ranking.length === 0) return null

  const getMedal = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return '🏅'
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h3>🏆 Top 5</h3>
      </div>

      {ranking.map((user, index) => (
        <div key={user.id} className="leaderboard-item">
          <div className="leaderboard-position">
            {getMedal(index)}
          </div>
          <div className="leaderboard-user">
            <div className="leaderboard-user-name">{user.name}</div>
          </div>
          <div className="leaderboard-stat">
            <div className="leaderboard-stat-value">{user.total_points}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type RankingUser = {
  id: string
  name: string
  email: string
  photo?: string
  grupos_points: number
  knockout_points: number
  bracket_points: number
  total_points: number
}

export function GeneralRanking() {
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
      console.log('Raw ranking data:', response.data)
      const sorted = response.data.sort((a, b) => {
        const aPts = Number(b.total_points)
        const bPts = Number(a.total_points)
        return aPts - bPts
      })
      console.log('Sorted ranking:', sorted)
      setRanking(sorted)
    } catch (err) {
      console.error('Erro ao carregar ranking geral:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>Carregando ranking...</div>

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#60a5fa' }}>🏆 Ranking Geral</h2>
        <p style={{ margin: '0', color: '#94a3b8' }}>Grupos + Mata-Mata + Bracket</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <thead>
            <tr style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: '2px solid rgba(51, 65, 85, 0.8)' }}>
              <th style={{ padding: '15px', textAlign: 'left', color: '#60a5fa', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Posição</th>
              <th style={{ padding: '15px', textAlign: 'left', color: '#60a5fa', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Usuário</th>
              <th style={{ padding: '15px', textAlign: 'center', color: '#fbbf24', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Grupos</th>
              <th style={{ padding: '15px', textAlign: 'center', color: '#f87171', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Mata-Mata</th>
              <th style={{ padding: '15px', textAlign: 'center', color: '#86efac', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>Bracket</th>
              <th style={{ padding: '15px', textAlign: 'center', color: '#60a5fa', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((user, index) => {
              const getMedalEmoji = (pos: number) => {
                if (pos === 0) return '🥇'
                if (pos === 1) return '🥈'
                if (pos === 2) return '🥉'
                return null
              }

              return (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
                    background: index === 0 ? 'rgba(34, 197, 94, 0.08)' : index === 1 ? 'rgba(168, 85, 247, 0.08)' : index === 2 ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = index === 0 ? 'rgba(34, 197, 94, 0.08)' : index === 1 ? 'rgba(168, 85, 247, 0.08)' : index === 2 ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}
                >
                  <td style={{ padding: '15px', color: '#e2e8f0', fontWeight: 'bold', fontSize: '18px' }}>
                    {getMedalEmoji(index) || `${index + 1}º`}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ color: '#60a5fa', fontWeight: '600' }}>{user.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{user.email}</div>
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'center',
                    color: '#fbbf24',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {user.grupos_points}
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'center',
                    color: '#f87171',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {user.knockout_points}
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'center',
                    color: '#86efac',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {user.bracket_points}
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'center',
                    color: '#60a5fa',
                    fontWeight: '700',
                    fontSize: '18px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderRadius: '6px'
                  }}>
                    {user.total_points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

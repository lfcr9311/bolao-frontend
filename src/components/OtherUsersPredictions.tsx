import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type OtherPrediction = {
  name: string
  email: string
  home_score: number
  away_score: number
  home_score_extra_time?: number
  away_score_extra_time?: number
  home_penalties?: number
  away_penalties?: number
}

type Props = {
  matchId: string
  homeName: string
  awayName: string
}

export function OtherUsersPredictions({ matchId, homeName, awayName }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPredictions()
    // Atualiza a cada 30 segundos
    const interval = setInterval(loadPredictions, 30000)
    return () => clearInterval(interval)
  }, [matchId])

  const loadPredictions = async () => {
    try {
      const api = axios.create({
        baseURL: API_URL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('palpite_token') || ''}`
        }
      })

      const response = await api.get(`/knockout-matches/predictions-visible/${matchId}`)
      setData(response.data)
    } catch (err) {
      console.error('Erro ao carregar palpites:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  if (!data?.canView) {
    return (
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        fontSize: '12px',
        color: '#60a5fa',
        textAlign: 'center'
      }}>
        🔒 {data?.message}
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(34, 197, 94, 0.1)',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      marginTop: '12px'
    }}>
      {data?.predictions?.length === 0 ? (
        <div style={{ fontSize: '11px', color: '#86efac', textAlign: 'center' }}>
          Nenhum palpite de outros participantes ainda
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <div style={{ fontSize: '11px', color: '#86efac', marginBottom: '8px', fontWeight: 'bold' }}>
            👥 {data?.totalPredictions} participantes palpitaram
          </div>
          {data?.predictions?.map((pred: OtherPrediction, idx: number) => (
            <div
              key={idx}
              style={{
                background: idx % 2 === 0 ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                borderRadius: '4px'
              }}
            >
              <span style={{ fontWeight: '600', color: '#86efac', minWidth: '100px' }}>
                {pred.name}
              </span>

              <span style={{ color: '#cbd5e1', textAlign: 'center', flex: 1 }}>
                <strong>{pred.home_score}</strong>
                <span style={{ margin: '0 6px', color: '#94a3b8' }}>×</span>
                <strong>{pred.away_score}</strong>
                {pred.home_score_extra_time !== null && (
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>
                    ({pred.home_score_extra_time}×{pred.away_score_extra_time})
                  </span>
                )}
              </span>

              {pred.home_penalties !== null && (
                <span style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  marginLeft: '12px',
                  minWidth: '50px',
                  textAlign: 'right'
                }}>
                  Pen: {pred.home_penalties}×{pred.away_penalties}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

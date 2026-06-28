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
        <div>
          <div style={{ fontSize: '11px', color: '#86efac', marginBottom: '10px', fontWeight: 'bold' }}>
            👥 {data?.totalPredictions} participantes palpitaram
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data?.predictions?.map((pred: OtherPrediction, idx: number) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(34, 197, 94, 0.05)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  borderLeft: '3px solid #86efac',
                  paddingLeft: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#86efac', minWidth: '80px' }}>
                    {pred.name}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>
                    {homeName} <strong>{pred.home_score}</strong>
                    <span style={{ margin: '0 4px', color: '#94a3b8' }}>×</span>
                    <strong>{pred.away_score}</strong> {awayName}
                  </span>
                </div>
                {pred.home_score_extra_time !== null && (
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                    Prorr: {pred.home_score_extra_time}×{pred.away_score_extra_time} | Pen: {pred.home_penalties}×{pred.away_penalties}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

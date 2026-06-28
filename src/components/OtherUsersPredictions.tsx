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
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      marginTop: '12px'
    }}>
      <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '12px', fontWeight: 'bold' }}>
        👥 Palpites de {data?.totalPredictions} outros participantes
      </div>

      {data?.predictions?.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#86efac', textAlign: 'center' }}>
          Nenhum palpite ainda
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {data?.predictions?.map((pred: OtherPrediction, idx: number) => (
            <div
              key={idx}
              style={{
                background: 'rgba(34, 197, 94, 0.05)',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#e2e8f0'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#86efac' }}>
                {pred.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <div>{homeName}: {pred.home_score}</div>
                <div>{awayName}: {pred.away_score}</div>
              </div>
              {pred.home_score_extra_time !== null && (
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                  Prorr: {homeName} {pred.home_score_extra_time} x {pred.away_score_extra_time} {awayName}
                </div>
              )}
              {pred.home_penalties !== null && (
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Pen: {homeName} {pred.home_penalties} x {pred.away_penalties} {awayName}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

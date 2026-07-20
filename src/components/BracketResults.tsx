import { useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type BracketResult = {
  name: string
  email: string
  prediction_array: Record<string, string>
  results_array: Record<string, string>
  points: number
  is_correct: boolean
  correctPredictions: number
  totalPredictions: number
  createdAt: string
  updatedAt: string
}

type TeamInfo = {
  id: string
  name: string
  code: string
}

export function BracketResults() {
  const [results, setResults] = useState<BracketResult | null>(null)
  const [teamMap, setTeamMap] = useState<Record<string, TeamInfo>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      setLoading(true)

      const api = axios.create({
        baseURL: API_URL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('palpite_token') || ''}`
        }
      })

      // Carrega resultados
      const resultsResponse = await api.get('/bracket-predictions/my-results')
      setResults(resultsResponse.data)

      // Carrega times para mapear UUIDs → nomes
      const teamsResponse = await api.get('/teams')
      const teams = teamsResponse.data
      const map: Record<string, TeamInfo> = {}
      for (const team of teams) {
        map[team.id] = team
      }
      setTeamMap(map)
    } catch (err: any) {
      console.error('Erro ao carregar resultados:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>Carregando resultados...</div>

  if (!results || !results.prediction_array || Object.keys(results.prediction_array).length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
        📋 Você ainda não fez palpites no bracket
      </div>
    )
  }

  const roundNames: Record<string, string> = {
    '73': 'Round 32 - Match 1',
    '74': 'Round 32 - Match 2',
    '75': 'Round 32 - Match 3',
    '76': 'Round 32 - Match 4',
    '77': 'Round 32 - Match 5',
    '78': 'Round 32 - Match 6',
    '79': 'Round 32 - Match 7',
    '80': 'Round 32 - Match 8',
    '81': 'Round 32 - Match 9',
    '82': 'Round 32 - Match 10',
    '83': 'Round 32 - Match 11',
    '84': 'Round 32 - Match 12',
    '85': 'Round 32 - Match 13',
    '86': 'Round 32 - Match 14',
    '87': 'Round 32 - Match 15',
    '88': 'Round 32 - Match 16',
    'R16-89': 'Round 16 - Match 1',
    'R16-90': 'Round 16 - Match 2',
    'R16-91': 'Round 16 - Match 3',
    'R16-92': 'Round 16 - Match 4',
    'R16-93': 'Round 16 - Match 5',
    'R16-94': 'Round 16 - Match 6',
    'R16-95': 'Round 16 - Match 7',
    'R16-96': 'Round 16 - Match 8',
    'QF-97': 'Quarter-final 1',
    'QF-98': 'Quarter-final 2',
    'QF-99': 'Quarter-final 3',
    'QF-100': 'Quarter-final 4',
    'SF-101': 'Semi-final 1',
    'SF-102': 'Semi-final 2',
    'FINAL-104': 'Final'
  }

  const roundPoints: Record<string, number> = {
    '73': 1, '74': 1, '75': 1, '76': 1, '77': 1, '78': 1, '79': 1, '80': 1,
    '81': 1, '82': 1, '83': 1, '84': 1, '85': 1, '86': 1, '87': 1, '88': 1,
    'R16-89': 2, 'R16-90': 2, 'R16-91': 2, 'R16-92': 2, 'R16-93': 2, 'R16-94': 2, 'R16-95': 2, 'R16-96': 2,
    'QF-97': 4, 'QF-98': 4, 'QF-99': 4, 'QF-100': 4,
    'SF-101': 8, 'SF-102': 8,
    'FINAL-104': 16,
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#60a5fa' }}>Seus Resultados do Bracket</h2>
        <p style={{ margin: '0', color: '#94a3b8' }}>{results.name} ({results.email})</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#86efac', fontSize: '28px', fontWeight: 'bold' }}>
              {results.points}
            </div>
            <div style={{ color: '#86efac', fontSize: '12px' }}>Pontos Totais</div>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#86efac', fontSize: '28px', fontWeight: 'bold' }}>
              {results.correctPredictions}/{results.totalPredictions}
            </div>
            <div style={{ color: '#86efac', fontSize: '12px' }}>Acertos</div>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#86efac', fontSize: '28px', fontWeight: 'bold' }}>
              {results.totalPredictions > 0 ? Math.round((results.correctPredictions / results.totalPredictions) * 100) : 0}%
            </div>
            <div style={{ color: '#86efac', fontSize: '12px' }}>Taxa de Acerto</div>
          </div>
        </div>
      </div>

      {results.results_array && Object.keys(results.results_array).length > 0 ? (
        <div>
          <h3 style={{ color: '#60a5fa', marginBottom: '15px' }}>Comparação de Palpites</h3>
          {Object.entries(results.prediction_array).map(([matchNum, predictedTeamId]) => {
            const actualTeamId = results.results_array[matchNum]
            const isCorrect = predictedTeamId === actualTeamId
            const points = isCorrect ? roundPoints[matchNum] || 0 : 0

            return (
              <div
                key={matchNum}
                style={{
                  background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#60a5fa', fontSize: '12px', marginBottom: '5px' }}>
                      {roundNames[matchNum] || `Match ${matchNum}`}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Seu palpite:</div>
                        <div style={{
                          color: isCorrect ? '#86efac' : '#fca5a5',
                          fontWeight: 'bold',
                          padding: '8px 12px',
                          background: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          marginTop: '4px'
                        }}>
                          {teamMap[predictedTeamId]?.name || 'Desconhecido'}
                        </div>
                      </div>
                      {actualTeamId && !isCorrect && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 'bold' }}>❌ Resultado Real:</div>
                          <div style={{
                            color: '#86efac',
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            background: 'rgba(34, 197, 94, 0.3)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            border: '2px solid rgba(34, 197, 94, 0.5)'
                          }}>
                            {teamMap[actualTeamId]?.name || 'Desconhecido'}
                          </div>
                        </div>
                      )}
                      {actualTeamId && isCorrect && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#86efac' }}>✓ Resultado:</div>
                          <div style={{
                            color: '#86efac',
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            borderRadius: '6px',
                            marginTop: '4px'
                          }}>
                            {teamMap[actualTeamId]?.name || 'Desconhecido'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: isCorrect ? '#86efac' : '#fca5a5'
                    }}>
                      {isCorrect ? '✓' : '✗'}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: isCorrect ? '#86efac' : '#fca5a5'
                    }}>
                      {points} pts
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
          ⏳ Os resultados ainda não foram informados pelo admin
        </div>
      )}
    </div>
  )
}

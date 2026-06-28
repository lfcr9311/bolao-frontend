import { useState, useEffect } from 'react'
import type { BracketMatch } from '../hooks/useBracketPredictions'
import '../styles/bracket.css'

type BracketViewProps = {
  matches: BracketMatch[]
  predictions: BracketMatch[]
  onPredictionChange: (matchId: string, teamId: string) => void
  loading?: boolean
}

const ROUND_ORDER = ['Round 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Match for third place', 'Final']
const ROUND_LABELS = {
  'Round 32': 'Round 32',
  'Round of 16': 'Round 16',
  'Quarter-final': 'QF',
  'Semi-final': 'SF',
  'Match for third place': '3º Lugar',
  'Final': 'Final'
}

export function BracketView({ matches, predictions, onPredictionChange, loading = false }: BracketViewProps) {
  const [selectedPredictions, setSelectedPredictions] = useState<Map<string, { teamId: string; teamName: string }>>(
    new Map()
  )

  useEffect(() => {
    const map = new Map()
    predictions.forEach((p: any) => {
      if (p.predicted_team_id) {
        map.set(p.match_id || p.id, {
          teamId: p.predicted_team_id,
          teamName: p.predicted_team_name || ''
        })
      }
    })
    setSelectedPredictions(map)
  }, [predictions])

  const handleTeamSelect = (matchId: string, teamId: string, teamName: string) => {
    setSelectedPredictions((prev) => new Map(prev).set(matchId, { teamId, teamName }))
    onPredictionChange(matchId, teamId)
  }

  // Build bracket dynamically based on predictions
  const getMatchesByRound = () => {
    const result: Record<string, BracketMatch[]> = {}

    matches.forEach(m => {
      if (!result[m.round]) {
        result[m.round] = []
      }
      result[m.round].push(m)
    })

    // Build Round 16 from Round 32 predictions
    const round32Predictions = predictions.filter(p => p.round === 'Round 32')
    if (round32Predictions.length > 0 && result['Round of 16']) {
      const round16 = result['Round of 16'] || []

      // Group Round 32 into pairs and match them
      for (let i = 0; i < round32Predictions.length; i += 2) {
        const pred1 = round32Predictions[i]
        const pred2 = round32Predictions[i + 1]

        if (round16[i / 2] && pred1?.predicted_team_id && pred2?.predicted_team_id) {
          // Update Round 16 match with the predicted teams
          const match = round16[Math.floor(i / 2)]
          match.home_team_id = pred1.predicted_team_id
          match.home_team_name = pred1.predicted_team_name || 'TBD'
          match.home_team_code = pred1.predicted_team_code || '?'
          match.away_team_id = pred2.predicted_team_id
          match.away_team_name = pred2.predicted_team_name || 'TBD'
          match.away_team_code = pred2.predicted_team_code || '?'
        }
      }
    }

    return result
  }

  const groupedMatches = getMatchesByRound()
  const roundOrder = Object.keys(groupedMatches).sort((a, b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b))

  if (loading) {
    return <div className="bracket-loading">Carregando bracket...</div>
  }

  return (
    <div className="bracket-container">
      <div className="bracket-scroll">
        {roundOrder.map((round) => (
          <div key={round} className="bracket-round">
            <div className="round-header">
              <h3>{ROUND_LABELS[round as keyof typeof ROUND_LABELS] || round}</h3>
              <span className="round-count">{groupedMatches[round]?.length || 0} jogos</span>
            </div>

            <div className="matches-column">
              {groupedMatches[round]?.map((match) => {
                const prediction = selectedPredictions.get(match.id)
                const isFinished = match.status === 'FINISHED'
                const advancedTeam =
                  match.advance_team_id === match.home_team_id
                    ? { name: match.home_team_name, code: match.home_team_code, id: match.home_team_id }
                    : match.advance_team_id === match.away_team_id
                      ? { name: match.away_team_name, code: match.away_team_code, id: match.away_team_id }
                      : null

                return (
                  <div key={match.id} className={`match-card ${isFinished ? 'finished' : ''}`}>
                    <div className="match-header">
                      <span className="round-badge">{ROUND_LABELS[round as keyof typeof ROUND_LABELS]}</span>
                      {isFinished && <span className="status-finished">Encerrado</span>}
                      {match.status === 'LIVE' && <span className="status-live">AO VIVO</span>}
                    </div>

                    <div className="match-teams">
                      <div
                        className={`team-option ${prediction?.teamId === match.home_team_id ? 'selected' : ''} ${
                          advancedTeam?.id === match.home_team_id ? 'advanced' : ''
                        }`}
                        onClick={() =>
                          !isFinished && handleTeamSelect(match.id, match.home_team_id, match.home_team_name)
                        }
                      >
                        <div className="team-info">
                          <span className="team-flag">{match.home_team_code}</span>
                          <span className="team-name">{match.home_team_name}</span>
                        </div>
                        {prediction?.teamId === match.home_team_id && !isFinished && (
                          <span className="selected-indicator">✓</span>
                        )}
                        {advancedTeam?.id === match.home_team_id && isFinished && (
                          <span className="advanced-indicator">🏆</span>
                        )}
                      </div>

                      <div className="match-divider">vs</div>

                      <div
                        className={`team-option ${prediction?.teamId === match.away_team_id ? 'selected' : ''} ${
                          advancedTeam?.id === match.away_team_id ? 'advanced' : ''
                        }`}
                        onClick={() =>
                          !isFinished && handleTeamSelect(match.id, match.away_team_id, match.away_team_name)
                        }
                      >
                        <div className="team-info">
                          <span className="team-flag">{match.away_team_code}</span>
                          <span className="team-name">{match.away_team_name}</span>
                        </div>
                        {prediction?.teamId === match.away_team_id && !isFinished && (
                          <span className="selected-indicator">✓</span>
                        )}
                        {advancedTeam?.id === match.away_team_id && isFinished && (
                          <span className="advanced-indicator">🏆</span>
                        )}
                      </div>
                    </div>

                    {match.points !== undefined && (
                      <div className="match-result">
                        <span className={`points ${match.is_correct ? 'correct' : 'incorrect'}`}>
                          {match.is_correct ? '✓' : '✗'} {match.points} pts
                        </span>
                      </div>
                    )}

                    <div className="match-date">
                      {new Date(match.match_date).toLocaleDateString('pt-BR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

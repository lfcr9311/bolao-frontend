import { useState, useEffect } from 'react'
import type { BracketMatch } from '../hooks/useBracketPredictions'
import '../styles/bracket.css'

type BracketViewProps = {
  matches: BracketMatch[]
  predictions: BracketMatch[]
  onPredictionChange: (matchId: string, teamId: string) => void
  loading?: boolean
  disabled?: boolean
}

// Ordem EXATA dos confrontos segundo a lógica FIFA/CONMEBOL
const BRACKET_MATCHUPS = {
  'Round of 16': [
    { id: 'R16-89', r32_teams: [74, 77] },  // Match 89: W74 vs W77
    { id: 'R16-90', r32_teams: [73, 75] },  // Match 90: W73 vs W75
    { id: 'R16-91', r32_teams: [76, 78] },  // Match 91: W76 vs W78
    { id: 'R16-92', r32_teams: [79, 80] },  // Match 92: W79 vs W80
    { id: 'R16-93', r32_teams: [83, 84] },  // Match 93: W83 vs W84
    { id: 'R16-94', r32_teams: [81, 82] },  // Match 94: W81 vs W82
    { id: 'R16-95', r32_teams: [86, 88] },  // Match 95: W86 vs W88
    { id: 'R16-96', r32_teams: [85, 87] }   // Match 96: W85 vs W87
  ],
  'Quarter-final': [
    { id: 'QF-97', r16_matches: [89, 90] },   // W89 vs W90
    { id: 'QF-98', r16_matches: [93, 94] },   // W93 vs W94
    { id: 'QF-99', r16_matches: [91, 92] },   // W91 vs W92
    { id: 'QF-100', r16_matches: [95, 96] }   // W95 vs W96
  ],
  'Semi-final': [
    { id: 'SF-101', qf_matches: [97, 98] },   // W97 vs W98
    { id: 'SF-102', qf_matches: [99, 100] }   // W99 vs W100
  ],
  'Final': [
    { id: 'FINAL-104', sf_matches: [101, 102] }  // W101 vs W102
  ]
}

export function BracketView2({ matches, predictions, onPredictionChange, loading = false, disabled = false }: BracketViewProps) {
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
    if (disabled) return
    setSelectedPredictions((prev) => new Map(prev).set(matchId, { teamId, teamName }))
    onPredictionChange(matchId, teamId)
  }

  // Get Round 32 matches by their official match numbers (73-88)
  const round32ByNumber = new Map<number, BracketMatch>()
  matches
    .filter(m => m.round === 'Round 32')
    .forEach((m) => {
      // Use match_number from database (73-88)
      const matchNum = (m as any).match_number || 73 // fallback if not set
      round32ByNumber.set(matchNum, m)
    })

  // Map para encontrar winners facilmente
  const getWinner = (matchNumber: number): any => {
    const match = round32ByNumber.get(matchNumber)
    if (!match) return null
    const pred = selectedPredictions.get(match.id)
    if (!pred) return null
    return {
      teamId: pred.teamId,
      teamName: pred.teamName,
      teamCode: match.home_team_id === pred.teamId ? match.home_team_code : match.away_team_code
    }
  }

  // Build Round 16
  const buildRound16 = () => {
    return BRACKET_MATCHUPS['Round of 16'].map(matchup => {
      const [match1Num, match2Num] = matchup.r32_teams
      const team1 = getWinner(match1Num)
      const team2 = getWinner(match2Num)

      return {
        id: matchup.id,
        team1,
        team2,
        complete: team1 && team2
      }
    })
  }

  const round16 = buildRound16()

  const getR16Winner = (matchNumber: number): any => {
    const match = round16[matchNumber - 89]
    if (!match) return null
    const pred = selectedPredictions.get(match.id)
    if (!pred) return null
    return {
      teamId: pred.teamId,
      teamName: pred.teamName,
      teamCode: match.team1.teamId === pred.teamId ? match.team1.teamCode : match.team2.teamCode
    }
  }

  // Build Quarter-finals
  const buildQF = () => {
    return BRACKET_MATCHUPS['Quarter-final'].map(matchup => {
      const [match1Num, match2Num] = matchup.r16_matches
      const team1 = getR16Winner(match1Num)
      const team2 = getR16Winner(match2Num)

      return {
        id: matchup.id,
        team1,
        team2,
        complete: team1 && team2
      }
    })
  }

  const qf = buildQF()

  const getQFWinner = (matchNumber: number): any => {
    const match = qf[matchNumber - 97]
    if (!match) return null
    const pred = selectedPredictions.get(match.id)
    if (!pred) return null
    return {
      teamId: pred.teamId,
      teamName: pred.teamName,
      teamCode: match.team1.teamId === pred.teamId ? match.team1.teamCode : match.team2.teamCode
    }
  }

  // Build Semi-finals
  const buildSF = () => {
    return BRACKET_MATCHUPS['Semi-final'].map(matchup => {
      const [match1Num, match2Num] = (matchup as any).qf_matches
      const team1 = getQFWinner(match1Num)
      const team2 = getQFWinner(match2Num)

      return {
        id: matchup.id,
        team1,
        team2,
        complete: team1 && team2
      }
    })
  }

  const sf = buildSF()

  const getSFWinner = (matchNumber: number): any => {
    const match = sf[matchNumber - 101]
    if (!match) return null
    const pred = selectedPredictions.get(match.id)
    if (!pred) return null
    return {
      teamId: pred.teamId,
      teamName: pred.teamName,
      teamCode: match.team1.teamId === pred.teamId ? match.team1.teamCode : match.team2.teamCode
    }
  }

  // Build Final
  const buildFinal = () => {
    const team1 = getSFWinner(101)
    const team2 = getSFWinner(102)

    if (!team1 || !team2) return null

    return {
      id: 'FINAL-104',
      team1,
      team2,
      complete: true
    }
  }

  const final = buildFinal()

  const MatchCard = ({ matchId, team1, team2 }: any) => {
    if (!team1 || !team2) return null

    const pred = selectedPredictions.get(matchId)

    return (
      <div className="match-card">
        <div className="match-teams">
          <div
            className={`team-option ${pred?.teamId === team1.teamId ? 'selected' : ''}`}
            onClick={() => handleTeamSelect(matchId, team1.teamId, team1.teamName)}
          >
            <div className="team-info">
              <span className="team-flag">{team1.teamCode}</span>
              <span className="team-name">{team1.teamName}</span>
            </div>
            {pred?.teamId === team1.teamId && <span className="selected-indicator">✓</span>}
          </div>
          <div className="match-divider">vs</div>
          <div
            className={`team-option ${pred?.teamId === team2.teamId ? 'selected' : ''}`}
            onClick={() => handleTeamSelect(matchId, team2.teamId, team2.teamName)}
          >
            <div className="team-info">
              <span className="team-flag">{team2.teamCode}</span>
              <span className="team-name">{team2.teamName}</span>
            </div>
            {pred?.teamId === team2.teamId && <span className="selected-indicator">✓</span>}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="bracket-loading">Carregando bracket...</div>
  }

  return (
    <div className="bracket-container">
      <div className="bracket-scroll">
        {/* Round 32 */}
        <div className="bracket-round">
          <div className="round-header">
            <h3>ROUND 32</h3>
            <span className="round-count">{round32ByNumber.size} jogos</span>
          </div>
          <div className="matches-column">
            {Array.from(round32ByNumber.values()).map((match) => (
              <MatchCard
                key={match.id}
                matchId={match.id}
                team1={{ teamId: match.home_team_id, teamName: match.home_team_name, teamCode: match.home_team_code }}
                team2={{ teamId: match.away_team_id, teamName: match.away_team_name, teamCode: match.away_team_code }}
                isRound32={true}
              />
            ))}
          </div>
        </div>

        {/* Connector line */}
        <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '2px',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.1))',
            position: 'relative'
          }} />
        </div>

        {/* Round 16 */}
        {round16.some(m => m.complete) && (
          <>
            <div className="bracket-round">
              <div className="round-header">
                <h3>ROUND 16</h3>
                <span className="round-count">{round16.filter(m => m.complete).length} jogos</span>
              </div>
              <div className="matches-column">
                {round16.map((match) => (
                  match.complete ? (
                    <MatchCard
                      key={match.id}
                      matchId={match.id}
                      team1={match.team1}
                      team2={match.team2}
                    />
                  ) : null
                ))}
              </div>
            </div>

            {/* Connector line */}
            <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '2px',
                height: '100%',
                background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.1))'
              }} />
            </div>

            {/* Quarter-finals */}
            {qf.some(m => m.complete) && (
              <>
                <div className="bracket-round">
                  <div className="round-header">
                    <h3>QF</h3>
                    <span className="round-count">{qf.filter(m => m.complete).length} jogos</span>
                  </div>
                  <div className="matches-column">
                    {qf.map((match) => (
                      match.complete ? (
                        <MatchCard
                          key={match.id}
                          matchId={match.id}
                          team1={match.team1}
                          team2={match.team2}
                        />
                      ) : null
                    ))}
                  </div>
                </div>

                {/* Connector line */}
                <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '2px',
                    height: '100%',
                    background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.1))'
                  }} />
                </div>

                {/* Semi-finals */}
                {sf.some(m => m.complete) && (
                  <>
                    <div className="bracket-round">
                      <div className="round-header">
                        <h3>SF</h3>
                        <span className="round-count">{sf.filter(m => m.complete).length} jogos</span>
                      </div>
                      <div className="matches-column">
                        {sf.map((match) => (
                          match.complete ? (
                            <MatchCard
                              key={match.id}
                              matchId={match.id}
                              team1={match.team1}
                              team2={match.team2}
                            />
                          ) : null
                        ))}
                      </div>
                    </div>

                    {/* Connector line */}
                    <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{
                        width: '2px',
                        height: '100%',
                        background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.1))'
                      }} />
                    </div>

                    {/* Final */}
                    {final && (
                      <div className="bracket-round">
                        <div className="round-header">
                          <h3>FINAL</h3>
                          <span className="round-count">1 jogo</span>
                        </div>
                        <div className="matches-column">
                          <MatchCard
                            matchId={final.id}
                            team1={final.team1}
                            team2={final.team2}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

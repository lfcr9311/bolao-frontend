import { useState, useEffect } from 'react'
import type { BracketMatch } from '../hooks/useBracketPredictions'
import '../styles/bracket.css'

type BracketDynamicProps = {
  matches: BracketMatch[]
  predictions: BracketMatch[]
  onPredictionChange: (matchId: string, teamId: string) => void
  loading?: boolean
}

export function BracketDynamic({ matches, predictions, onPredictionChange, loading = false }: BracketDynamicProps) {
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

  const handleTeamSelect = (matchId: string, teamId: string, teamName: string, isRound32: boolean) => {
    setSelectedPredictions((prev) => new Map(prev).set(matchId, { teamId, teamName }))
    // Only save to backend if it's a Round 32 match (has real UUID)
    if (isRound32) {
      onPredictionChange(matchId, teamId)
    }
  }

  // Get Round 32 matches
  const round32Matches = matches.filter(m => m.round === 'Round 32').sort((a, b) =>
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )


  // Build Round 16 matches from Round 32 winners using official bracket logic
  const buildRound16 = () => {
    // Map de match number → winner team
    const winnerMap = new Map<number, any>()

    round32Matches.forEach((match) => {
      const pred = selectedPredictions.get(match.id)
      if (pred?.teamId) {
        const matchNum = round32Matches.indexOf(match) + 73 // 73-88
        winnerMap.set(matchNum, {
          teamId: pred.teamId,
          teamName: pred.teamName,
          teamCode: match.home_team_id === pred.teamId ? match.home_team_code : match.away_team_code
        })
      }
    })

    // Bracket logic para Round 16
    const round16Logic = [
      { id: 'R16-0', team1_ref: 74, team2_ref: 77 },
      { id: 'R16-1', team1_ref: 73, team2_ref: 75 },
      { id: 'R16-2', team1_ref: 76, team2_ref: 78 },
      { id: 'R16-3', team1_ref: 79, team2_ref: 80 },
      { id: 'R16-4', team1_ref: 83, team2_ref: 84 },
      { id: 'R16-5', team1_ref: 81, team2_ref: 82 },
      { id: 'R16-6', team1_ref: 86, team2_ref: 88 },
      { id: 'R16-7', team1_ref: 85, team2_ref: 87 }
    ]

    const round16Matches: any[] = []
    round16Logic.forEach(match => {
      const team1 = winnerMap.get(match.team1_ref)
      const team2 = winnerMap.get(match.team2_ref)

      if (team1 && team2) {
        round16Matches.push({
          id: match.id,
          team1,
          team2,
          round: 'Round of 16'
        })
      }
    })

    return round16Matches
  }

  // Build Quarter-finals from Round 16 winners
  const buildQF = () => {
    const round16 = buildRound16()
    const winners: any[] = []

    round16.forEach(match => {
      const pred = selectedPredictions.get(match.id)
      if (pred?.teamId) {
        const teamName = match.team1.teamId === pred.teamId ? match.team1.teamName : match.team2.teamName
        const teamCode = match.team1.teamId === pred.teamId ? match.team1.teamCode : match.team2.teamCode
        winners.push({
          id: match.id,
          teamId: pred.teamId,
          teamName,
          teamCode
        })
      }
    })

    const qfMatches = []
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        qfMatches.push({
          id: `QF-${i / 2}`,
          team1: winners[i],
          team2: winners[i + 1],
          round: 'Quarter-final'
        })
      }
    }
    return qfMatches
  }

  // Build Semi-finals
  const buildSF = () => {
    const qf = buildQF()
    const winners: any[] = []

    qf.forEach(match => {
      const pred = selectedPredictions.get(match.id)
      if (pred?.teamId) {
        const teamName = match.team1.teamId === pred.teamId ? match.team1.teamName : match.team2.teamName
        const teamCode = match.team1.teamId === pred.teamId ? match.team1.teamCode : match.team2.teamCode
        winners.push({
          id: match.id,
          teamId: pred.teamId,
          teamName,
          teamCode
        })
      }
    })

    const sfMatches = []
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        sfMatches.push({
          id: `SF-${i / 2}`,
          team1: winners[i],
          team2: winners[i + 1],
          round: 'Semi-final'
        })
      }
    }
    return sfMatches
  }

  // Build Final
  const buildFinal = () => {
    const sf = buildSF()
    const winners: any[] = []

    sf.forEach(match => {
      const pred = selectedPredictions.get(match.id)
      if (pred?.teamId) {
        const teamName = match.team1.teamId === pred.teamId ? match.team1.teamName : match.team2.teamName
        const teamCode = match.team1.teamId === pred.teamId ? match.team1.teamCode : match.team2.teamCode
        winners.push({
          id: match.id,
          teamId: pred.teamId,
          teamName,
          teamCode
        })
      }
    })

    if (winners.length >= 2) {
      return [{
        id: 'FINAL',
        team1: winners[0],
        team2: winners[1],
        round: 'Final'
      }]
    }
    return []
  }

  const round16 = buildRound16()
  const qf = buildQF()
  const sf = buildSF()
  const final = buildFinal()

  const MatchCard = ({ match, team1, team2, matchId, isRound32 = false }: any) => {
    const pred = selectedPredictions.get(matchId)

    return (
      <div className="match-card">
        <div className="match-header">
          <span className="round-badge">{match}</span>
          {!isRound32 && <span style={{ fontSize: '10px', color: '#94a3b8' }}>Visualização</span>}
        </div>
        <div className="match-teams">
          <div
            className={`team-option ${pred?.teamId === team1.teamId ? 'selected' : ''}`}
            onClick={() => handleTeamSelect(matchId, team1.teamId, team1.teamName, isRound32)}
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
            onClick={() => handleTeamSelect(matchId, team2.teamId, team2.teamName, isRound32)}
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
            <span className="round-count">{round32Matches.length} jogos</span>
          </div>
          <div className="matches-column">
            {round32Matches.map((match) => (
              <MatchCard
                key={match.id}
                match="R32"
                team1={{ teamId: match.home_team_id, teamName: match.home_team_name, teamCode: match.home_team_code }}
                team2={{ teamId: match.away_team_id, teamName: match.away_team_name, teamCode: match.away_team_code }}
                matchId={match.id}
                isRound32={true}
              />
            ))}
          </div>
        </div>

        {/* Round 16 */}
        {round16.length > 0 && (
          <div className="bracket-round">
            <div className="round-header">
              <h3>ROUND 16</h3>
              <span className="round-count">{round16.length} jogos</span>
            </div>
            <div className="matches-column">
              {round16.map((match: any) => (
                <MatchCard
                  key={match.id}
                  match="R16"
                  team1={match.team1}
                  team2={match.team2}
                  matchId={match.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quarter-finals */}
        {qf.length > 0 && (
          <div className="bracket-round">
            <div className="round-header">
              <h3>QF</h3>
              <span className="round-count">{qf.length} jogos</span>
            </div>
            <div className="matches-column">
              {qf.map((match: any) => (
                <MatchCard
                  key={match.id}
                  match="QF"
                  team1={match.team1}
                  team2={match.team2}
                  matchId={match.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Semi-finals */}
        {sf.length > 0 && (
          <div className="bracket-round">
            <div className="round-header">
              <h3>SF</h3>
              <span className="round-count">{sf.length} jogos</span>
            </div>
            <div className="matches-column">
              {sf.map((match: any) => (
                <MatchCard
                  key={match.id}
                  match="SF"
                  team1={match.team1}
                  team2={match.team2}
                  matchId={match.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Final */}
        {final.length > 0 && (
          <div className="bracket-round">
            <div className="round-header">
              <h3>FINAL</h3>
              <span className="round-count">1 jogo</span>
            </div>
            <div className="matches-column">
              {final.map((match: any) => (
                <MatchCard
                  key={match.id}
                  match="Final"
                  team1={match.team1}
                  team2={match.team2}
                  matchId={match.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

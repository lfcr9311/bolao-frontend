import type { BracketLeaderboard, BracketStats } from '../hooks/useBracketPredictions'
import '../styles/bracket.css'

type BracketLeaderboardProps = {
  leaderboard: BracketLeaderboard[]
  stats?: BracketStats | null
  loading?: boolean
}

export function BracketLeaderboard({ leaderboard, stats, loading = false }: BracketLeaderboardProps) {
  const getMedalEmoji = (position: number) => {
    if (position === 0) return '🥇'
    if (position === 1) return '🥈'
    if (position === 2) return '🥉'
    return null
  }

  const getPositionClass = (position: number) => {
    if (position === 0) return 'first'
    if (position === 1) return 'second'
    if (position === 2) return 'third'
    return 'other'
  }

  if (loading) {
    return <div className="bracket-loading">Carregando leaderboard...</div>
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h3>🏆 Leaderboard</h3>
        <p>Ranking geral de palpites do bracket</p>
      </div>

      {stats && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>
                Seus Pontos
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#dbeafe', marginTop: '4px' }}>
                {stats.total_points || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>
                Acertos
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#22c55e', marginTop: '4px' }}>
                {stats.correct_predictions || 0}/{stats.total_predictions || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>
                Acurácia
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6', marginTop: '4px' }}>
                {stats.accuracy_percentage || 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="leaderboard-list">
        {leaderboard.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
            Nenhum palpite registrado ainda
          </div>
        ) : (
          leaderboard.map((user, index) => (
            <div key={user.id} className="leaderboard-item">
              <div className={`leaderboard-position ${getPositionClass(index)}`}>
                {getMedalEmoji(index) || `${index + 1}`}
              </div>

              <div className="leaderboard-user">
                <div className="leaderboard-user-name">{user.name}</div>
                <div className="leaderboard-user-email">{user.email}</div>
              </div>

              <div className="leaderboard-stat">
                <div className="leaderboard-stat-label">Pontos</div>
                <div className={`leaderboard-stat-value ${!user.total_points ? 'zero' : ''}`}>
                  {user.total_points || 0}
                </div>
              </div>

              <div className="leaderboard-stat">
                <div className="leaderboard-stat-label">Acertos</div>
                <div className="leaderboard-stat-value">
                  {user.correct_predictions}/{user.total_predictions}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

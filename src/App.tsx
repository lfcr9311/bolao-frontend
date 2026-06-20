import { useEffect, useMemo, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const TIME_ZONE = 'America/Sao_Paulo'

const api = axios.create({
  baseURL: API_URL
})

const isVideoFile = (url?: string) => {
  if (!url) return false
  return /\.(mp4|webm|ogg|mov)$/i.test(url)
}

const MediaComponent = ({ src, alt, style }: { src?: string; alt: string; style?: React.CSSProperties }) => {
  if (!src) return null

  if (isVideoFile(src)) {
    return (
      <video style={style} autoPlay loop muted playsInline>
        <source src={src} type="video/mp4" />
      </video>
    )
  }

  return <img src={src} alt={alt} style={style} />
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('palpite_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type Page = 'inicio' | 'selecoes' | 'jogos' | 'palpites' | 'ranking'
type AuthMode = 'login' | 'register'
type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED'

type User = {
  id: string
  name: string
  email: string
  is_admin: boolean
}

type Team = {
  id: string
  name: string
  code: string
  flag_url?: string | null
}

type Match = {
  id: string
  home_team_id: string
  home_team_name: string
  home_team_code: string
  away_team_id: string
  away_team_name: string
  away_team_code: string
  home_score: number | null
  away_score: number | null
  match_date: string
  status: MatchStatus
  round?: string | null
  group_name?: string | null
}

type Prediction = {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  points: number
  exact_score: boolean
  correct_result: boolean
  correct_goal_difference: boolean
  real_home_score: number | null
  real_away_score: number | null
  match_date: string
  status: string
  home_team_name: string
  home_team_code?: string
  away_team_name: string
  away_team_code?: string
}

type OtherUserPrediction = {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  points: number
  exact_score: boolean
  correct_result: boolean
  correct_goal_difference: boolean
  user_name: string
  user_email: string
}

type RankingItem = {
  id: string
  name: string
  email: string
  photo?: string
  total_points: number
  exact_scores: number
  correct_results: number
  correct_goal_differences: number
}

type PredictionInputMap = Record<
  string,
  {
    home: string
    away: string
  }
>

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('palpite_user')
    return raw ? JSON.parse(raw) : null
  })

  const [page, setPage] = useState<Page>('inicio')
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [otherUserPredictions, setOtherUserPredictions] = useState<Record<string, OtherUserPrediction[]>>({})

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showBrazilWarning, setShowBrazilWarning] = useState(true)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')

  const [predictionInputs, setPredictionInputs] = useState<PredictionInputMap>({})

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [editMatchHomeScore, setEditMatchHomeScore] = useState('')
  const [editMatchAwayScore, setEditMatchAwayScore] = useState('')

  const matchesOrdenados = useMemo(() => {
    return [...matches].sort((a, b) => {
      const aFinished = a.status === 'FINISHED'
      const bFinished = b.status === 'FINISHED'

      if (aFinished !== bFinished) {
        return aFinished ? 1 : -1
      }

      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })
  }, [matches])

  const predictionsByMatchId = useMemo(() => {
    const map = new Map<string, Prediction>()

    for (const prediction of predictions) {
      map.set(String(prediction.match_id), prediction)
    }

    return map
  }, [predictions])

  const rankingOrdenado = useMemo(() => {
    return [...ranking].sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points
      }

      if (b.exact_scores !== a.exact_scores) {
        return b.exact_scores - a.exact_scores
      }

      if (b.correct_results !== a.correct_results) {
        return b.correct_results - a.correct_results
      }

      return a.name.localeCompare(b.name)
    })
  }, [ranking])

  const lider = rankingOrdenado[0]
  const jogosFinalizados = matches.filter((match) => match.status === 'FINISHED').length
  const jogosAoVivo = matches.filter((match) => match.status === 'LIVE').length
  const palpitesFeitos = predictions.length
  const palpitesPendentes = Math.max(matches.length - predictions.length, 0)

  async function loadTeams() {
    const response = await api.get<Team[]>('/teams')
    setTeams(response.data)
  }

  async function loadMatches() {
    const response = await api.get<Match[]>('/matches')
    setMatches(response.data)
  }

  async function loadRanking() {
    const response = await api.get<RankingItem[]>('/ranking')
    setRanking(response.data)
  }

  async function loadPredictions(userId: string) {
    const response = await api.get<Prediction[]>(`/predictions/user/${userId}`)
    setPredictions(response.data)
  }

  async function loadOtherUserPredictions(matchId: string) {
    try {
      const response = await api.get<OtherUserPrediction[]>(`/predictions/match/${matchId}`)
      setOtherUserPredictions((prev) => ({
        ...prev,
        [matchId]: response.data
      }))
    } catch (err) {
      // Silently fail if unable to load other predictions
    }
  }

  async function loadAll(currentUser?: User | null) {
    try {
      setError('')

      await Promise.all([
        loadTeams(),
        loadMatches(),
        loadRanking(),
        currentUser ? loadPredictions(currentUser.id) : Promise.resolve()
      ])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar dados do backend')
    }
  }

  async function handleLogin(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword
      })

      localStorage.setItem('palpite_token', response.data.token)
      localStorage.setItem('palpite_user', JSON.stringify(response.data.user))

      setUser(response.data.user)
      setPage('inicio')

      await loadAll(response.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/register', {
        name: registerName,
        email: registerEmail,
        password: registerPassword
      })

      localStorage.setItem('palpite_token', response.data.token)
      localStorage.setItem('palpite_user', JSON.stringify(response.data.user))

      setUser(response.data.user)
      setPage('inicio')

      await loadAll(response.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTeam(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      await api.post('/teams', {
        name: teamName.trim(),
        code: teamCode.trim().toUpperCase()
      })

      setTeamName('')
      setTeamCode('')

      await loadTeams()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar seleção')
    }
  }

  function updatePredictionInput(matchId: string, field: 'home' | 'away', value: string) {
    setPredictionInputs((prev) => ({
      ...prev,
      [matchId]: {
        home: field === 'home' ? value : prev[matchId]?.home || '',
        away: field === 'away' ? value : prev[matchId]?.away || ''
      }
    }))
  }

  async function handleCreatePrediction(matchId: string) {
    if (!user) {
      setError('Usuário não encontrado')
      return
    }

    const current = predictionInputs[matchId]

    if (!current || current.home === '' || current.away === '') {
      setError('Preencha os dois placares do palpite')
      return
    }

    try {
      setError('')

      await api.post('/predictions', {
        user_id: user.id,
        match_id: matchId,
        home_score: Number(current.home),
        away_score: Number(current.away)
      })

      await Promise.all([loadPredictions(user.id), loadRanking()])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar palpite')
    }
  }

  async function handleUpdateResult(matchId: string) {
    if (!user || !user.is_admin) {
      setError('Apenas administradores podem atualizar resultados')
      return
    }

    if (editMatchHomeScore === '' || editMatchAwayScore === '') {
      setError('Preencha os dois placares')
      return
    }

    try {
      setError('')

      await api.patch(`/matches/${matchId}/update-result`, {
        home_score: Number(editMatchHomeScore),
        away_score: Number(editMatchAwayScore)
      })

      setEditingMatchId(null)
      setEditMatchHomeScore('')
      setEditMatchAwayScore('')

      await Promise.all([loadMatches(), loadRanking()])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar resultado')
    }
  }

  function logout() {
    localStorage.removeItem('palpite_token')
    localStorage.removeItem('palpite_user')

    setUser(null)
    setPage('inicio')
    setTeams([])
    setMatches([])
    setPredictions([])
    setRanking([])
    setPredictionInputs({})
  }

  useEffect(() => {
    if (user) {
      loadAll(user)
    }
  }, [])

  useEffect(() => {
    setPredictionInputs((prev) => {
      const next: PredictionInputMap = {}

      for (const match of matchesOrdenados) {
        const prediction = predictionsByMatchId.get(match.id)

        next[match.id] = {
          home: prediction ? String(prediction.predicted_home_score) : prev[match.id]?.home || '',
          away: prediction ? String(prediction.predicted_away_score) : prev[match.id]?.away || ''
        }
      }

      return next
    })
  }, [matchesOrdenados, predictionsByMatchId])

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">🏆</div>

          <h1>Palpite Copa</h1>
          <p>Entre para cadastrar jogos, fazer palpites e acompanhar o ranking.</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => {
                setError('')
                setAuthMode('login')
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => {
                setError('')
                setAuthMode('register')
              }}
            >
              Cadastro
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}

          {authMode === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                E-mail
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </label>

              <label>
                Senha
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </label>

              <button type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {authMode === 'register' && (
            <form className="auth-form" onSubmit={handleRegister}>
              <label>
                Nome
                <input
                  value={registerName}
                  onChange={(event) => setRegisterName(event.target.value)}
                  required
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                  required
                />
              </label>

              <label>
                Senha
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  required
                />
              </label>

              <button type="submit" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon">🏆</div>

            <div>
              <h1>Palpite Copa</h1>
              <span>Palpites e ranking</span>
            </div>
          </div>

          <nav className="menu">
            <button type="button" className={page === 'inicio' ? 'active' : ''} onClick={() => setPage('inicio')}>
              <span>🏠</span>
              Início
            </button>

            <button
              type="button"
              className={page === 'selecoes' ? 'active' : ''}
              onClick={() => setPage('selecoes')}
            >
              <span>🌎</span>
              Seleções
            </button>

            <button type="button" className={page === 'jogos' ? 'active' : ''} onClick={() => setPage('jogos')}>
              <span>⚽</span>
              Jogos
            </button>

            <button
              type="button"
              className={page === 'palpites' ? 'active' : ''}
              onClick={() => setPage('palpites')}
            >
              <span>📝</span>
              Palpites
            </button>

            <button
              type="button"
              className={page === 'ranking' ? 'active' : ''}
              onClick={() => setPage('ranking')}
            >
              <span>🥇</span>
              Ranking
            </button>
          </nav>
        </div>

        <div className="sidebar-card">
          <strong>{user.name}</strong>
          <p>{user.email}</p>
          <small>{matches.length} jogos cadastrados</small>

          <button type="button" className="logout-button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Horário em America/São Paulo</span>
            <h2>{getPageTitle(page)}</h2>
          </div>

          <button type="button" className="ghost-button" onClick={() => loadAll(user)}>
            Atualizar dados
          </button>
        </header>

        {error && <div className="error-box page-error">{error}</div>}

        {showBrazilWarning && (
          <div className="brazil-warning">
            <div className="brazil-warning-content">
              <span className="warning-icon">🇧🇷</span>
              <div>
                <strong>Regra especial: Jogos do Brasil</strong>
                <p>
                  Placar exato: <strong>15 pts</strong> (em vez de 10)
                </p>
              </div>
              <button
                type="button"
                className="warning-close"
                onClick={() => setShowBrazilWarning(false)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {page === 'inicio' && (
          <section className="page">
            <div className="hero">
              <div>
                <span className="pill">Copa 2026</span>
                <h3>Faça seus palpites e acompanhe o ranking</h3>
                <p>Cadastre seleções, jogos, palpites e acompanhe o ranking calculado pelo backend.</p>
              </div>

              <div className="hero-score">
                <span>Líder atual</span>
                <strong>{lider?.name || '-'}</strong>
                <small>{lider?.total_points || 0} pontos</small>
              </div>
            </div>

            <div className="cards">
              <div className="card card-blue">
                <span>Seleções</span>
                <strong>{teams.length}</strong>
                <p>Total cadastradas</p>
              </div>

              <div className="card card-green">
                <span>Jogos</span>
                <strong>{matches.length}</strong>
                <p>Total cadastrados</p>
              </div>

              <div className="card card-yellow">
                <span>Palpites</span>
                <strong>{predictions.length}</strong>
                <p>Meus palpites</p>
              </div>

              <div className="card card-red">
                <span>Ao vivo</span>
                <strong>{jogosAoVivo}</strong>
                <p>Jogos em andamento</p>
              </div>
            </div>

            <div className="panel-grid">
              <div className="panel">
                <div className="panel-header">
                  <h3>Próximos jogos</h3>

                  <button type="button" onClick={() => setPage('jogos')}>
                    Ver jogos
                  </button>
                </div>

                <div className="mini-list">
                  {matchesOrdenados.slice(0, 5).map((match) => (
                    <div className="mini-item" key={match.id}>
                      <div>
                        <strong>
                          {match.home_team_name} x {match.away_team_name}
                        </strong>

                        <span>{formatDateSP(match.match_date)}</span>
                      </div>

                      <span className={getStatusClass(match.status)}>{getStatusLabel(match.status)}</span>
                    </div>
                  ))}

                  {matchesOrdenados.length === 0 && <p>Nenhum jogo cadastrado.</p>}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Top ranking</h3>

                  <button type="button" onClick={() => setPage('ranking')}>
                    Ver ranking
                  </button>
                </div>

                <div className="mini-list">
                  {rankingOrdenado.slice(0, 5).map((item, index) => (
                    <div className="mini-item" key={item.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.photo && <MediaComponent src={item.photo} alt={item.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />}
                        <div>
                          <strong>
                            {index + 1}º {item.name}
                          </strong>

                          <span>{item.total_points} pontos</span>
                        </div>
                      </div>

                      <span className="medal">{getMedal(index)}</span>
                    </div>
                  ))}

                  {rankingOrdenado.length === 0 && <p>Ranking vazio.</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {page === 'selecoes' && (
          <section className="page">
            <div className="section-header">
              <div>
                <h3>Seleções</h3>
              </div>
            </div>

            <form className="form-card form-card-3" onSubmit={handleCreateTeam}>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Nome da seleção"
                required
              />

              <input
                value={teamCode}
                onChange={(event) => setTeamCode(event.target.value.toUpperCase())}
                placeholder="Código, ex: BRA"
                required
              />

              <button type="submit">Cadastrar seleção</button>
            </form>

            <Table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Código</th>
                </tr>
              </thead>

              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td>
                      <strong>{team.name}</strong>
                    </td>

                    <td>{team.code}</td>
                  </tr>
                ))}

                {teams.length === 0 && (
                  <tr>
                    <td colSpan={2}>Nenhuma seleção cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>
        )}

        {page === 'jogos' && (
          <section className="page">
            <div className="section-header">
              <div>
                <h3>Jogos</h3>
                <p>Consulte as partidas cadastradas.</p>
              </div>
            </div>

            <Table>
              <thead>
                <tr>
                  <th>Data SP</th>
                  <th>Jogo</th>
                  <th>Fase</th>
                  <th>Status</th>
                  <th>Resultado</th>
                  {user?.is_admin && <th>Ação</th>}
                </tr>
              </thead>

              <tbody>
                {matchesOrdenados.map((match) => (
                  <tr key={match.id}>
                    <td>{formatDateSP(match.match_date)}</td>

                    <td>
                      <strong>
                        {match.home_team_name} x {match.away_team_name}
                      </strong>
                    </td>

                    <td>
                      {match.round || '-'} {match.group_name ? `- ${match.group_name}` : ''}
                    </td>

                    <td>
                      <span className={getStatusClass(match.status)}>{getStatusLabel(match.status)}</span>
                    </td>

                    <td>
                      {match.home_score === null || match.away_score === null
                        ? '-'
                        : `${match.home_score} x ${match.away_score}`}
                    </td>

                    {user?.is_admin && (
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMatchId(match.id)
                            setEditMatchHomeScore(match.home_score?.toString() || '')
                            setEditMatchAwayScore(match.away_score?.toString() || '')
                          }}
                          className="btn-small"
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {matchesOrdenados.length === 0 && (
                  <tr>
                    <td colSpan={user?.is_admin ? 6 : 5}>Nenhum jogo cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </Table>

            {editingMatchId && (
              <div className="modal-overlay" onClick={() => setEditingMatchId(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Atualizar Resultado</h3>
                    <button
                      type="button"
                      className="modal-close"
                      onClick={() => setEditingMatchId(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="modal-body">
                    {error && <div className="error-box">{error}</div>}

                    <div className="form-group">
                      <label>
                        Gols do Mandante
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={editMatchHomeScore}
                          onChange={(e) => setEditMatchHomeScore(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="form-group">
                      <label>
                        Gols do Visitante
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={editMatchAwayScore}
                          onChange={(e) => setEditMatchAwayScore(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      onClick={() => setEditingMatchId(null)}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateResult(editingMatchId)}
                      className="btn-primary"
                    >
                      Atualizar Resultado
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {page === 'palpites' && (
          <section className="page">
            <div className="section-header">
              <div>
                <h3>Palpites</h3>
                <p>Você pode criar ou alterar até 30 minutos antes da partida.</p>
              </div>
            </div>

            <div className="cards">
              <div className="card card-blue">
                <span>Total de jogos</span>
                <strong>{matchesOrdenados.length}</strong>
                <p>Disponíveis para consulta</p>
              </div>

              <div className="card card-green">
                <span>Palpites feitos</span>
                <strong>{palpitesFeitos}</strong>
                <p>Já enviados por você</p>
              </div>

              <div className="card card-yellow">
                <span>Faltando</span>
                <strong>{palpitesPendentes}</strong>
                <p>Jogos sem palpite</p>
              </div>

              <div className="card card-red">
                <span>Finalizados</span>
                <strong>{jogosFinalizados}</strong>
                <p>Jogos encerrados</p>
              </div>
            </div>

            <div className="rules-card">
              <div className="rules-header">
                <div>
                  <span className="match-badge">Regras de pontuação</span>
                  <h3>Como os pontos são calculados</h3>
                  <p>O palpite pode ser alterado até 30 minutos antes do início da partida.</p>
                </div>
              </div>

              <div className="rules-grid rules-grid-5">
                <div className="rule-item rule-gold">
                  <strong>10 pts</strong>
                  <span>Placar exato</span>
                </div>

                <div className="rule-item rule-blue">
                  <strong>8 pts</strong>
                  <span>Resultado certo + gols de um time</span>
                </div>

                <div className="rule-item rule-green">
                  <strong>6 pts</strong>
                  <span>Resultado certo + diferença de gols</span>
                </div>

                <div className="rule-item rule-dark">
                  <strong>5 pts</strong>
                  <span>Apenas resultado certo</span>
                </div>

                <div className="rule-item rule-gray">
                  <strong>1 pt</strong>
                  <span>Gols de um time certo</span>
                </div>
              </div>
            </div>

            <div className="prediction-grid">
              {matchesOrdenados.map((match) => {
                const existingPrediction = predictionsByMatchId.get(match.id)
                const currentInput = predictionInputs[match.id] || { home: '', away: '' }
                const isFinished = match.status === 'FINISHED'
                const isCancelled = match.status === 'CANCELLED'
                const isDeadlineClosed = isPredictionDeadlineClosed(match.match_date)
                const isLocked = isFinished || isCancelled || isDeadlineClosed

                return (
                  <div className="prediction-card" key={match.id}>
                    <div className="prediction-card-header">
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="match-badge">
                            {match.round || 'Fase de grupos'}
                            {match.group_name ? ` • Grupo ${match.group_name}` : ''}
                          </span>
                          {(match.home_team_code?.trim().toUpperCase() === 'BRA' || match.away_team_code?.trim().toUpperCase() === 'BRA') && (
                            <span className="brazil-badge">🇧🇷 Pontos especiais</span>
                          )}
                        </div>

                        <h4>
                          {match.home_team_name} <span>({match.home_team_code})</span>
                          {' x '}
                          {match.away_team_name} <span>({match.away_team_code})</span>
                        </h4>

                        <p>{formatDateSP(match.match_date)}</p>
                        <p>Fecha para palpite: {formatDateSP(getPredictionDeadline(match.match_date))}</p>
                      </div>

                      <span className={getPredictionStatusClass(match.status, isDeadlineClosed)}>
                        {getPredictionStatusLabel(match.status, isDeadlineClosed)}
                      </span>
                    </div>

                    <div className="prediction-result-line">
                      <div>
                        <strong>Resultado oficial</strong>
                        <span>
                          {match.home_score === null || match.away_score === null
                            ? 'Ainda não lançado'
                            : `${match.home_score} x ${match.away_score}`}
                        </span>
                      </div>

                      <div>
                        <strong>Meu palpite</strong>
                        <span>
                          {existingPrediction
                            ? `${existingPrediction.predicted_home_score} x ${existingPrediction.predicted_away_score}`
                            : 'Não enviado'}
                        </span>
                      </div>

                      <div>
                        <strong>Pontos</strong>
                        <span>{existingPrediction ? existingPrediction.points : 0}</span>
                      </div>
                    </div>

                    <div className="prediction-input-row">
                      <div className="prediction-team-block">
                        <label>{match.home_team_name}</label>
                        <input
                          type="number"
                          min="0"
                          value={currentInput.home}
                          onChange={(event) => updatePredictionInput(match.id, 'home', event.target.value)}
                          disabled={isLocked}
                          placeholder="0"
                        />
                      </div>

                      <div className="score-divider">x</div>

                      <div className="prediction-team-block">
                        <label>{match.away_team_name}</label>
                        <input
                          type="number"
                          min="0"
                          value={currentInput.away}
                          onChange={(event) => updatePredictionInput(match.id, 'away', event.target.value)}
                          disabled={isLocked}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="prediction-actions">
                      <button type="button" onClick={() => handleCreatePrediction(match.id)} disabled={isLocked}>
                        {isCancelled
                          ? 'Jogo cancelado'
                          : isFinished
                            ? 'Jogo encerrado'
                            : isDeadlineClosed
                              ? 'Prazo encerrado'
                              : existingPrediction
                                ? 'Atualizar palpite'
                                : 'Salvar palpite'}
                      </button>

                      <div className="prediction-note">
                        {existingPrediction && !isLocked && (
                          <span className="info-pill success">Palpite registrado, ainda pode alterar</span>
                        )}

                        {existingPrediction && isLocked && <span className="info-pill success">Palpite fechado</span>}

                        {!existingPrediction && isFinished && <span className="info-pill warning">Jogo encerrado</span>}

                        {!existingPrediction && isCancelled && <span className="info-pill warning">Jogo cancelado</span>}

                        {!existingPrediction && !isFinished && !isCancelled && isDeadlineClosed && (
                          <span className="info-pill warning">Prazo encerrado</span>
                        )}

                        {!existingPrediction && !isLocked && (
                          <span className="info-pill">Você ainda pode palpitar</span>
                        )}
                      </div>
                    </div>

                    {isDeadlineClosed && (
                      <div className="other-predictions-section">
                        <button
                          type="button"
                          className="show-predictions-btn"
                          onClick={() => {
                            if (!otherUserPredictions[match.id]) {
                              loadOtherUserPredictions(match.id)
                            }
                          }}
                        >
                          {otherUserPredictions[match.id]
                            ? `Palpites dos outros participantes (${otherUserPredictions[match.id].length})`
                            : 'Carregar palpites dos outros participantes'}
                        </button>

                        {otherUserPredictions[match.id] && otherUserPredictions[match.id].length > 0 && (
                          <div className="other-predictions-list">
                            {otherUserPredictions[match.id].map((pred) => (
                              <div className="other-prediction-item" key={pred.id}>
                                <div className="other-pred-user">
                                  <strong>{pred.user_name}</strong>
                                  <span className="other-pred-score">
                                    {pred.predicted_home_score} x {pred.predicted_away_score}
                                  </span>
                                </div>

                                <div className="other-pred-result">
                                  <span className={`other-pred-points points-${pred.points}`}>
                                    {pred.points} pts
                                  </span>

                                  {pred.exact_score && <span className="badge-exact">⭐ Placar exato</span>}
                                  {pred.correct_result && !pred.exact_score && (
                                    <span className="badge-result">✓ Resultado certo</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {matchesOrdenados.length === 0 && (
                <div className="empty-box">
                  <strong>Nenhum jogo encontrado.</strong>
                  <span>Cadastre ou carregue os jogos primeiro.</span>
                </div>
              )}
            </div>
          </section>
        )}

        {page === 'ranking' && (
          <section className="page">
            <div className="section-header">
              <div>
                <h3>Ranking</h3>
                <p>Classificação geral dos participantes.</p>
              </div>
            </div>

            <div className="podium">
              {rankingOrdenado.slice(0, 3).map((item, index) => (
                <div className={`podium-card podium-${index + 1}`} key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '32px', minHeight: '220px' }}>
                  {item.photo && <MediaComponent src={item.photo} alt={item.name} style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px' }}>{getMedal(index)}</span>
                      <strong style={{ fontSize: '20px' }}>{item.name}</strong>
                    </div>
                    <small style={{ fontSize: '16px' }}>{item.total_points} pontos</small>
                  </div>
                </div>
              ))}
            </div>

            <Table>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Nome</th>
                  <th>Pontos</th>
                  <th>Placares exatos</th>
                  <th>Resultados corretos</th>
                  <th>Saldo correto</th>
                </tr>
              </thead>

              <tbody>
                {rankingOrdenado.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{index + 1}º</strong>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {item.photo && <MediaComponent src={item.photo} alt={item.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />}
                        {item.name}
                      </div>
                    </td>

                    <td>
                      <strong>{item.total_points}</strong>
                    </td>

                    <td>{item.exact_scores}</td>
                    <td>{item.correct_results}</td>
                    <td>{item.correct_goal_differences}</td>
                  </tr>
                ))}

                {rankingOrdenado.length === 0 && (
                  <tr>
                    <td colSpan={6}>Ranking vazio.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>
        )}
      </main>
    </div>
  )
}

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="table-card">
      <table>{children}</table>
    </div>
  )
}

function getPageTitle(page: Page) {
  if (page === 'inicio') return 'Início'
  if (page === 'selecoes') return 'Seleções'
  if (page === 'jogos') return 'Jogos'
  if (page === 'palpites') return 'Palpites'
  return 'Ranking'
}

function getMedal(index: number) {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return '🏅'
}

function formatDateSP(value: string | Date) {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPredictionDeadline(value: string | Date) {
  return new Date(new Date(value).getTime() - 30 * 60 * 1000)
}

function isPredictionDeadlineClosed(value: string | Date) {
  return new Date() >= getPredictionDeadline(value)
}

function getStatusClass(status: MatchStatus) {
  if (status === 'FINISHED') return 'status done'
  if (status === 'LIVE') return 'status live'
  if (status === 'CANCELLED') return 'status closed'
  return 'status pending'
}

function getStatusLabel(status: MatchStatus) {
  if (status === 'FINISHED') return 'Finalizado'
  if (status === 'LIVE') return 'Ao vivo'
  if (status === 'CANCELLED') return 'Cancelado'
  return 'Pendente'
}

function getPredictionStatusClass(status: MatchStatus, deadlineClosed: boolean) {
  if (status === 'FINISHED') return 'status done'
  if (status === 'LIVE') return 'status live'
  if (status === 'CANCELLED') return 'status closed'
  if (deadlineClosed) return 'status closed'
  return 'status pending'
}

function getPredictionStatusLabel(status: MatchStatus, deadlineClosed: boolean) {
  if (status === 'FINISHED') return 'Finalizado'
  if (status === 'LIVE') return 'Ao vivo'
  if (status === 'CANCELLED') return 'Cancelado'
  if (deadlineClosed) return 'Fechado'
  return 'Aberto'
}

export default App
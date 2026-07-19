import { useEffect, useMemo, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import axios from 'axios'
import './App.css'
import { BracketView2 } from './components/BracketView2'
import { BracketLeaderboard } from './components/BracketLeaderboard'
import { BracketResults } from './components/BracketResults'
import { OtherUsersPredictions } from './components/OtherUsersPredictions'
import { useBracketPredictions } from './hooks/useBracketPredictions'

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

type Page = 'inicio' | 'selecoes' | 'jogos' | 'palpites' | 'palpites-knockout' | 'bracket' | 'ranking'
type RankingView = 'geral' | 'knockout'
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

type KnockoutMatch = {
  id: string
  home_team_id: string
  home_team_name: string
  home_team_code: string
  away_team_id: string
  away_team_name: string
  away_team_code: string
  home_score: number | null
  away_score: number | null
  home_score_extra_time: number | null
  away_score_extra_time: number | null
  home_penalties: number | null
  away_penalties: number | null
  match_date: string
  status: MatchStatus
  round: string
  advance_team_id?: string | null
}

type KnockoutPrediction = {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  predicted_home_score_extra_time?: number | null
  predicted_away_score_extra_time?: number | null
  predicted_home_penalties?: number | null
  predicted_away_penalties?: number | null
  points: number
  points_regular_time: number
  points_alternative: number
  correct_result_regular: boolean
  correct_score_regular: boolean
  correct_goal_difference_regular: boolean
  correct_alternative: boolean
  wrong_alternative: boolean
  real_home_score: number | null
  real_away_score: number | null
  real_home_score_extra_time?: number | null
  real_away_score_extra_time?: number | null
  real_home_penalties?: number | null
  real_away_penalties?: number | null
  match_date: string
  status: string
  round: string
  home_team_name: string
  home_team_code: string
  away_team_name: string
  away_team_code: string
}

type KnockoutPredictionInputMap = Record<
  string,
  {
    home: string
    away: string
    homeExtraTime: string
    awayExtraTime: string
    homePenalties: string
    awayPenalties: string
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
  const [rankingKnockout, setRankingKnockout] = useState<RankingItem[]>([])
  const [rankingView, setRankingView] = useState<RankingView>('geral')
  const [otherUserPredictions, setOtherUserPredictions] = useState<Record<string, OtherUserPrediction[]>>({})

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')

  const [predictionInputs, setPredictionInputs] = useState<PredictionInputMap>({})

  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>([])
  const [knockoutPredictions, setKnockoutPredictions] = useState<KnockoutPrediction[]>([])
  const [knockoutPredictionInputs, setKnockoutPredictionInputs] = useState<KnockoutPredictionInputMap>({})

  const bracketPredictions = useBracketPredictions()
  const [bracketSaved, setBracketSaved] = useState(false)
  const [bracketAllPredictions, setBracketAllPredictions] = useState<Record<string, string>>({})

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [editMatchHomeScore, setEditMatchHomeScore] = useState('')
  const [editMatchAwayScore, setEditMatchAwayScore] = useState('')
  const [showingOtherPredictions, setShowingOtherPredictions] = useState<string | null>(null)

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
    const dataToSort = rankingView === 'geral' ? ranking : rankingKnockout
    return [...dataToSort].sort((a, b) => {
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
  }, [ranking, rankingKnockout, rankingView])

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

  async function loadRankingKnockout() {
    const response = await api.get<RankingItem[]>('/ranking/knockout')
    setRankingKnockout(response.data)
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

  async function loadKnockoutMatches() {
    try {
      const response = await api.get<KnockoutMatch[]>('/knockout-matches')
      setKnockoutMatches(response.data)
    } catch (err) {
      // Silently fail if unable to load knockout matches
    }
  }

  async function loadKnockoutPredictions(userId: string) {
    try {
      const response = await api.get<KnockoutPrediction[]>(`/knockout-matches/predictions/user/${userId}`)
      setKnockoutPredictions(response.data)
    } catch (err) {
      // Silently fail if unable to load knockout predictions
    }
  }

  async function loadAll(currentUser?: User | null) {
    try {
      setError('')

      await Promise.all([
        loadTeams(),
        loadMatches(),
        loadKnockoutMatches(),
        loadRanking(),
        loadRankingKnockout(),
        currentUser ? loadPredictions(currentUser.id) : Promise.resolve(),
        currentUser ? loadKnockoutPredictions(currentUser.id) : Promise.resolve(),
        bracketPredictions.loadMatches(),
        currentUser ? bracketPredictions.loadPredictions() : Promise.resolve(),
        currentUser ? bracketPredictions.loadStats() : Promise.resolve(),
        bracketPredictions.loadLeaderboard()
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

  async function savePredictionKnockout(matchId: string, inputs: any) {
    if (!user) return

    if (inputs.home === '' || inputs.away === '') {
      setError('Preencha os placares do tempo normal')
      return
    }

    try {
      setError('')

      const payload: any = {
        userId: user.id,
        matchId,
        homeScore: Number(inputs.home),
        awayScore: Number(inputs.away)
      }

      if (inputs.homeExtraTime !== '') payload.homeScoreExtraTime = Number(inputs.homeExtraTime)
      if (inputs.awayExtraTime !== '') payload.awayScoreExtraTime = Number(inputs.awayExtraTime)
      if (inputs.homePenalties !== '') payload.homePenalties = Number(inputs.homePenalties)
      if (inputs.awayPenalties !== '') payload.awayPenalties = Number(inputs.awayPenalties)

      await api.post('/knockout-matches/predictions', payload)

      await loadKnockoutPredictions(user.id)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar palpite mata-mata')
    }
  }

  async function handleSaveBracketPredictions() {
    if (!user) {
      setError('Usuário não encontrado')
      return
    }

    // Verifica limite de data/hora: 29/06 20:00 UTC
    const deadline = new Date('2026-06-29T17:00:00Z')
    const now = new Date()

    if (now > deadline) {
      setError('⏰ Prazo encerrado! Palpites do bracket só podem ser salvos até 28/06 às 20:00 UTC')
      return
    }

    if (Object.keys(bracketAllPredictions).length !== 31) {
      setError('Complete todos os 31 palpites (Round 32 até Final) antes de salvar')
      return
    }

    try {
      setError('')
      setLoading(true)

      // Cria mapa de match_id → match_number
      const matchIdToNumber = new Map<string, number>()
      for (const match of bracketPredictions.matches) {
        if ((match as any).match_number) {
          matchIdToNumber.set(match.id, (match as any).match_number)
        }
      }

      // Converte match_ids para match_numbers no prediction array
      const predictionArray = Object.fromEntries(
        Object.entries(bracketAllPredictions).map(([matchId, teamId]) => {
          const matchNumber = matchIdToNumber.get(matchId) || matchId
          return [String(matchNumber), teamId]
        })
      )

      await api.post('/bracket-predictions/save-bracket', {
        userId: user.id,
        predictionArray
      })

      setBracketSaved(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar palpites do bracket')
    } finally {
      setLoading(false)
    }
  }

  async function updateKnockoutResult(matchId: string, inputs: any) {
    if (!user || !user.is_admin) {
      setError('Apenas administradores podem atualizar resultados')
      return
    }

    if (inputs.home === '' || inputs.away === '') {
      setError('Preencha os placares do tempo normal')
      return
    }

    try {
      setError('')

      const payload: any = {
        isAdmin: true,
        home_score: Number(inputs.home),
        away_score: Number(inputs.away)
      }

      if (inputs.homeExtraTime !== '') payload.home_score_extra_time = Number(inputs.homeExtraTime)
      if (inputs.awayExtraTime !== '') payload.away_score_extra_time = Number(inputs.awayExtraTime)
      if (inputs.homePenalties !== '') payload.home_penalties = Number(inputs.homePenalties)
      if (inputs.awayPenalties !== '') payload.away_penalties = Number(inputs.awayPenalties)

      await api.patch(`/knockout-matches/${matchId}/update-result`, payload)

      setEditingMatchId(null)
      await Promise.all([loadKnockoutMatches(), loadKnockoutPredictions(user.id)])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar resultado')
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

      // Verifica se user já salvou bracket
      const checkBracketSaved = async () => {
        try {
          const api = axios.create({
            baseURL: API_URL,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('palpite_token') || ''}`
            }
          })

          const result = await api.get('/bracket-predictions/my-bracket')
          if (result.data?.prediction_array && Object.keys(result.data.prediction_array).length > 0) {
            setBracketSaved(true)
          }
        } catch (err) {
          // Silently fail
        }
      }

      checkBracketSaved()
    }
  }, [])

  useEffect(() => {
    // Popula bracketAllPredictions com as previsões existentes
    if (bracketPredictions.predictions && bracketPredictions.predictions.length > 0) {
      const predictions = bracketPredictions.predictions.reduce((acc, pred) => {
        if (pred.predicted_team_id) {
          acc[pred.id] = pred.predicted_team_id
        }
        return acc
      }, {} as Record<string, string>)

      setBracketAllPredictions(predictions)
    }
  }, [bracketPredictions.predictions])


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
              className={page === 'palpites-knockout' ? 'active' : ''}
              onClick={() => setPage('palpites-knockout')}
            >
              <span>🏆</span>
              Palpites Mata-Mata
            </button>

            <button
              type="button"
              className={page === 'bracket' ? 'active' : ''}
              onClick={() => setPage('bracket')}
            >
              <span>🎯</span>
              Bracket
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
                        {item.photo && <MediaComponent src={item.photo} alt={item.name} style={{ width: '24px', height: '32px', borderRadius: '4px', objectFit: 'contain' }} />}
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

        {page === 'palpites-knockout' && (
          <section className="page">
            <div className="section-header">
              <div>
                <h3>Palpites Mata-Mata</h3>
                <p>Aposte nos vencedores do Round 32 até a Final, incluindo prorrogação e pênaltis.</p>
              </div>
            </div>

            <div className="cards">
              <div className="card card-blue">
                <span>Jogos Mata-Mata</span>
                <strong>{knockoutMatches.length}</strong>
                <p>Disponíveis para consulta</p>
              </div>

              <div className="card card-green">
                <span>Palpites feitos</span>
                <strong>{knockoutPredictions.length}</strong>
                <p>Já enviados por você</p>
              </div>

              <div className="card card-yellow">
                <span>Faltando</span>
                <strong>{Math.max(knockoutMatches.length - knockoutPredictions.length, 0)}</strong>
                <p>Jogos sem palpite</p>
              </div>

              <div className="card card-red">
                <span>Finalizados</span>
                <strong>{knockoutMatches.filter((m) => m.status === 'FINISHED').length}</strong>
                <p>Jogos encerrados</p>
              </div>
            </div>

            <div className="rules-card">
              <div className="rules-header">
                <div>
                  <span className="match-badge">Regras de pontuação</span>
                  <h3>Mata-Mata (Round 32 até Final)</h3>
                  <p>Você pode apostar no resultado do tempo normal e, opcionalmente, em cenários alternativos.</p>
                </div>
              </div>

              <div className="rules-grid rules-grid-6">
                <div className="rule-item rule-gold">
                  <strong>10 pts</strong>
                  <span>Placar exato</span>
                </div>

                <div className="rule-item rule-blue">
                  <strong>8 pts</strong>
                  <span>Vencedor + saldo</span>
                </div>

                <div className="rule-item rule-dark">
                  <strong>5 pts</strong>
                  <span>Apenas vencedor</span>
                </div>

                <div className="rule-item rule-green">
                  <strong>+3 pts</strong>
                  <span>Acertou cenário</span>
                </div>

                <div className="rule-item rule-gray">
                  <strong>-3 pts</strong>
                  <span>Errou cenário</span>
                </div>

                <div className="rule-item rule-dark">
                  <strong>8-10 pts</strong>
                  <span>Pênaltis/Prorrogação</span>
                </div>
              </div>
            </div>

            <div className="prediction-grid">
              {[
                ...knockoutMatches.filter((m) => m.status !== 'FINISHED').sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()),
                ...knockoutMatches.filter((m) => m.status === 'FINISHED').sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
              ].map((match) => {
                const existingPrediction = knockoutPredictions.find((p) => p.match_id === match.id)
                const currentInput = knockoutPredictionInputs[match.id] || {
                  home: '',
                  away: '',
                  homeExtraTime: '',
                  awayExtraTime: '',
                  homePenalties: '',
                  awayPenalties: ''
                }
                const isFinished = match.status === 'FINISHED'
                const isCancelled = match.status === 'CANCELLED'
                const isDeadlineClosed = isPredictionDeadlineClosed(match.match_date)
                const isLocked = isFinished || isCancelled || isDeadlineClosed

                // Validação: apenas habilita próximas seções se houver empate
                const tnHome = parseInt(currentInput.home) || 0
                const tnAway = parseInt(currentInput.away) || 0
                const isNormalTimeEqual = currentInput.home !== '' && currentInput.away !== '' && tnHome === tnAway

                const etHome = parseInt(currentInput.homeExtraTime) || 0
                const etAway = parseInt(currentInput.awayExtraTime) || 0
                const isExtraTimeEqual = currentInput.homeExtraTime !== '' && currentInput.awayExtraTime !== '' && etHome === etAway

                return (
                  <div className="prediction-card" key={match.id}>
                    <div className="prediction-card-header">
                      <div>
                        <span className="match-badge">{match.round}</span>
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

                    {existingPrediction && (
                      <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px' }}>Meus Palpites:</strong>
                          <small style={{ color: '#666' }}>
                            Tempo Normal: {existingPrediction.predicted_home_score} x {existingPrediction.predicted_away_score}
                          </small>
                          {existingPrediction.predicted_home_score_extra_time !== undefined && existingPrediction.predicted_home_score_extra_time !== null && (
                            <>
                              <br />
                              <small style={{ color: '#666' }}>
                                Prorrogação: {existingPrediction.predicted_home_score_extra_time} x {existingPrediction.predicted_away_score_extra_time}
                              </small>
                            </>
                          )}
                          {existingPrediction.predicted_home_penalties !== undefined && existingPrediction.predicted_home_penalties !== null && (
                            <>
                              <br />
                              <small style={{ color: '#666' }}>
                                Pênaltis: {existingPrediction.predicted_home_penalties} x {existingPrediction.predicted_away_penalties}
                              </small>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '8px' }}>
                          <div>
                            <strong style={{ fontSize: '12px' }}>Resultado T.N.</strong>
                            <span style={{ display: 'block', fontSize: '14px' }}>
                              {match.home_score === null || match.away_score === null
                                ? 'Não lançado'
                                : `${match.home_score} x ${match.away_score}`}
                            </span>
                          </div>
                          <div>
                            <strong style={{ fontSize: '12px' }}>Pontos</strong>
                            <span style={{ display: 'block', fontSize: '14px' }}>{existingPrediction.points}</span>
                          </div>
                          <div>
                            <strong style={{ fontSize: '12px' }}>Pts T.N.</strong>
                            <span style={{ display: 'block', fontSize: '14px' }}>{existingPrediction.points_regular_time}</span>
                          </div>
                          <div>
                            <strong style={{ fontSize: '12px' }}>Pts Alt.</strong>
                            <span style={{ display: 'block', fontSize: '14px' }}>{existingPrediction.points_alternative}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="prediction-input-row">
                      <div className="prediction-team-block">
                        <label>Tempo Normal • {match.home_team_name}</label>
                        <input
                          type="number"
                          min="0"
                          value={currentInput.home}
                          onChange={(event) =>
                            setKnockoutPredictionInputs({
                              ...knockoutPredictionInputs,
                              [match.id]: { ...currentInput, home: event.target.value }
                            })
                          }
                          disabled={isLocked}
                          placeholder="0"
                        />
                      </div>

                      <div className="score-divider">x</div>

                      <div className="prediction-team-block">
                        <label>Tempo Normal • {match.away_team_name}</label>
                        <input
                          type="number"
                          min="0"
                          value={currentInput.away}
                          onChange={(event) =>
                            setKnockoutPredictionInputs({
                              ...knockoutPredictionInputs,
                              [match.id]: { ...currentInput, away: event.target.value }
                            })
                          }
                          disabled={isLocked}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                      <small style={{ color: isNormalTimeEqual ? '#666' : '#999', display: 'block', marginBottom: '8px' }}>
                        Cenário alternativo (opcional) - Prorrogação {!isNormalTimeEqual && '(Habilitar com empate no T.N.)'}
                      </small>
                      <div className="prediction-input-row">
                        <div className="prediction-team-block">
                          <label>Prorrogação • {match.home_team_name}</label>
                          <input
                            type="number"
                            min="0"
                            value={currentInput.homeExtraTime}
                            onChange={(event) =>
                              setKnockoutPredictionInputs({
                                ...knockoutPredictionInputs,
                                [match.id]: { ...currentInput, homeExtraTime: event.target.value }
                              })
                            }
                            disabled={isLocked || !isNormalTimeEqual}
                            placeholder="0"
                            style={{ opacity: !isNormalTimeEqual ? 0.5 : 1 }}
                          />
                        </div>

                        <div className="score-divider">x</div>

                        <div className="prediction-team-block">
                          <label>Prorrogação • {match.away_team_name}</label>
                          <input
                            type="number"
                            min="0"
                            value={currentInput.awayExtraTime}
                            onChange={(event) =>
                              setKnockoutPredictionInputs({
                                ...knockoutPredictionInputs,
                                [match.id]: { ...currentInput, awayExtraTime: event.target.value }
                              })
                            }
                            disabled={isLocked || !isNormalTimeEqual}
                            placeholder="0"
                            style={{ opacity: !isNormalTimeEqual ? 0.5 : 1 }}
                          />
                        </div>
                      </div>

                      <small style={{ color: isExtraTimeEqual ? '#666' : '#999', display: 'block', marginBottom: '8px', marginTop: '8px' }}>
                        Se empatar na prorrogação - Pênaltis {!isExtraTimeEqual && '(Habilitar com empate na prorrogação)'}
                      </small>
                      <div className="prediction-input-row">
                        <div className="prediction-team-block">
                          <label>Pênaltis • {match.home_team_name}</label>
                          <input
                            type="number"
                            min="0"
                            value={currentInput.homePenalties}
                            onChange={(event) =>
                              setKnockoutPredictionInputs({
                                ...knockoutPredictionInputs,
                                [match.id]: { ...currentInput, homePenalties: event.target.value }
                              })
                            }
                            disabled={isLocked || !isExtraTimeEqual}
                            placeholder="0"
                            style={{ opacity: !isExtraTimeEqual ? 0.5 : 1 }}
                          />
                        </div>

                        <div className="score-divider">x</div>

                        <div className="prediction-team-block">
                          <label>Pênaltis • {match.away_team_name}</label>
                          <input
                            type="number"
                            min="0"
                            value={currentInput.awayPenalties}
                            onChange={(event) =>
                              setKnockoutPredictionInputs({
                                ...knockoutPredictionInputs,
                                [match.id]: { ...currentInput, awayPenalties: event.target.value }
                              })
                            }
                            disabled={isLocked || !isExtraTimeEqual}
                            placeholder="0"
                            style={{ opacity: !isExtraTimeEqual ? 0.5 : 1 }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => savePredictionKnockout(match.id, currentInput)}
                        disabled={isLocked}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          backgroundColor: isLocked ? '#ccc' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Salvar Palpite
                      </button>

                      {user?.is_admin && (
                        <button
                          type="button"
                          onClick={() => setEditingMatchId(editingMatchId === match.id ? null : match.id)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            backgroundColor: editingMatchId === match.id ? '#ff6b6b' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          {editingMatchId === match.id ? 'Cancelar' : 'Editar Resultado'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowingOtherPredictions(showingOtherPredictions === match.id ? null : match.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          backgroundColor: showingOtherPredictions === match.id ? '#6c757d' : '#6f42c1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {showingOtherPredictions === match.id ? 'Fechar' : '👥 Ver Outros'}
                      </button>
                    </div>

                    {showingOtherPredictions === match.id && (
                      <div style={{ marginTop: '12px' }}>
                        <OtherUsersPredictions
                          matchId={match.id}
                        />
                      </div>
                    )}

                    {editingMatchId === match.id && user?.is_admin && (
                      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                        <small style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#856404' }}>
                          Editar Resultado (Admin)
                        </small>

                        <div className="prediction-input-row">
                          <div className="prediction-team-block">
                            <label>Tempo Normal • {match.home_team_name}</label>
                            <input
                              type="number"
                              min="0"
                              value={currentInput.home}
                              onChange={(event) =>
                                setKnockoutPredictionInputs({
                                  ...knockoutPredictionInputs,
                                  [match.id]: { ...currentInput, home: event.target.value }
                                })
                              }
                              placeholder="0"
                            />
                          </div>

                          <div className="score-divider">x</div>

                          <div className="prediction-team-block">
                            <label>Tempo Normal • {match.away_team_name}</label>
                            <input
                              type="number"
                              min="0"
                              value={currentInput.away}
                              onChange={(event) =>
                                setKnockoutPredictionInputs({
                                  ...knockoutPredictionInputs,
                                  [match.id]: { ...currentInput, away: event.target.value }
                                })
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ffc107' }}>
                          <small style={{ color: '#856404', display: 'block', marginBottom: '8px' }}>
                            Prorrogação (opcional)
                          </small>
                          <div className="prediction-input-row">
                            <div className="prediction-team-block">
                              <label>Prorrogação • {match.home_team_name}</label>
                              <input
                                type="number"
                                min="0"
                                value={currentInput.homeExtraTime}
                                onChange={(event) =>
                                  setKnockoutPredictionInputs({
                                    ...knockoutPredictionInputs,
                                    [match.id]: { ...currentInput, homeExtraTime: event.target.value }
                                  })
                                }
                                placeholder="0"
                              />
                            </div>

                            <div className="score-divider">x</div>

                            <div className="prediction-team-block">
                              <label>Prorrogação • {match.away_team_name}</label>
                              <input
                                type="number"
                                min="0"
                                value={currentInput.awayExtraTime}
                                onChange={(event) =>
                                  setKnockoutPredictionInputs({
                                    ...knockoutPredictionInputs,
                                    [match.id]: { ...currentInput, awayExtraTime: event.target.value }
                                  })
                                }
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <small style={{ color: '#856404', display: 'block', marginTop: '8px', marginBottom: '8px' }}>
                            Pênaltis (opcional)
                          </small>
                          <div className="prediction-input-row">
                            <div className="prediction-team-block">
                              <label>Pênaltis • {match.home_team_name}</label>
                              <input
                                type="number"
                                min="0"
                                value={currentInput.homePenalties}
                                onChange={(event) =>
                                  setKnockoutPredictionInputs({
                                    ...knockoutPredictionInputs,
                                    [match.id]: { ...currentInput, homePenalties: event.target.value }
                                  })
                                }
                                placeholder="0"
                              />
                            </div>

                            <div className="score-divider">x</div>

                            <div className="prediction-team-block">
                              <label>Pênaltis • {match.away_team_name}</label>
                              <input
                                type="number"
                                min="0"
                                value={currentInput.awayPenalties}
                                onChange={(event) =>
                                  setKnockoutPredictionInputs({
                                    ...knockoutPredictionInputs,
                                    [match.id]: { ...currentInput, awayPenalties: event.target.value }
                                  })
                                }
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => updateKnockoutResult(match.id, currentInput)}
                          style={{
                            width: '100%',
                            marginTop: '8px',
                            padding: '8px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          Confirmar Resultado
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {page === 'bracket' && (
          <section className="page">
            <div className="section-header">
              <div>
                <h3>Bracket - Mata-Mata</h3>
                <p>Escolha os times que você acha que vão passar em cada jogo. Ganha em potência de 2!</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div>
                <strong style={{ color: '#60a5fa' }}>
                  {Object.keys(bracketAllPredictions).length} / 31 palpites feitos
                </strong>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
                  Complete seus palpites antes de salvar
                </p>
              </div>
              <button
                onClick={handleSaveBracketPredictions}
                style={{
                  background: bracketSaved
                    ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
                    : Object.keys(bracketAllPredictions).length === 31
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  opacity: bracketSaved ? 0.6 : Object.keys(bracketAllPredictions).length === 31 ? 1 : 0.6,
                  cursor: bracketSaved || Object.keys(bracketAllPredictions).length !== 31 ? 'not-allowed' : 'pointer',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '800',
                  border: 'none',
                  fontSize: '14px'
                }}
                disabled={bracketSaved || Object.keys(bracketAllPredictions).length !== 31 || loading}
              >
                {bracketSaved ? '✓ Salvo' : loading ? 'Salvando...' : '💾 Salvar Palpites'}
              </button>
            </div>

            {bracketPredictions.error && (
              <div style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#fca5a5',
                marginBottom: '16px'
              }}>
                {bracketPredictions.error}
              </div>
            )}

            <BracketView2
              matches={bracketPredictions.matches}
              predictions={bracketPredictions.predictions}
              onPredictionChange={(matchId, teamId) => {
                setBracketAllPredictions(prev => ({...prev, [matchId]: teamId}))
              }}
              loading={bracketPredictions.loading}
              disabled={bracketSaved}
            />

            <BracketLeaderboard
              leaderboard={bracketPredictions.leaderboard}
              stats={bracketPredictions.stats}
              loading={bracketPredictions.loading}
            />

            <BracketResults />
          </section>
        )}

        {page === 'ranking' && (
          <section className="page">
            <div className="section-header">
              <div>
                <h3>Ranking</h3>
                <p>Classificação {rankingView === 'geral' ? 'geral' : 'mata-mata'} dos participantes.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setRankingView('geral')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: rankingView === 'geral' ? '#007bff' : '#f0f0f0',
                  color: rankingView === 'geral' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Ranking Geral
              </button>
              <button
                onClick={() => setRankingView('knockout')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: rankingView === 'knockout' ? '#007bff' : '#f0f0f0',
                  color: rankingView === 'knockout' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🥊 Mata-Mata
              </button>
            </div>

            <div className="podium">
              {rankingOrdenado.slice(0, 3).map((item, index) => (
                <div className={`podium-card podium-${index + 1}`} key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '32px', minHeight: '220px' }}>
                  {item.photo && <MediaComponent src={item.photo} alt={item.name} style={{ width: '200px', height: '300px', borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }} />}
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
                        {item.photo && <MediaComponent src={item.photo} alt={item.name} style={{ width: '100px', height: '150px', borderRadius: '8px', objectFit: 'contain' }} />}
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
  if (page === 'palpites-knockout') return 'Palpites Mata-Mata'
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
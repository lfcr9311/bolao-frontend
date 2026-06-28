import { useState, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export type BracketMatch = {
  id: string
  round: string
  status: string
  match_date: string
  match_number?: number
  home_team_id: string
  home_team_name: string
  home_team_code: string
  away_team_id: string
  away_team_name: string
  away_team_code: string
  advance_team_id: string | null
  predicted_team_id?: string
  predicted_team_name?: string
  predicted_team_code?: string
  points?: number
  is_correct?: boolean
}

export type BracketStats = {
  id: string
  name: string
  total_points: string | number
  correct_predictions: string | number
  total_predictions: string | number
  accuracy_percentage: string | number
}

export type BracketLeaderboard = {
  id: string
  name: string
  email: string
  total_points: string | number | null
  correct_predictions: string | number
  total_predictions: string | number
}

export function useBracketPredictions() {
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [predictions, setPredictions] = useState<BracketMatch[]>([])
  const [stats, setStats] = useState<BracketStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<BracketLeaderboard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('palpite_token') || ''}`
    }
  })

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/knockout-matches')
      setMatches(response.data || [])
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar jogos')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPredictions = useCallback(async () => {
    try {
      const response = await api.get('/bracket-predictions/my-predictions')
      setPredictions(response.data || [])
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar palpites')
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get('/bracket-predictions/stats')
      setStats(response.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar estatísticas')
    }
  }, [])

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await api.get('/bracket-predictions/leaderboard')
      setLeaderboard(response.data || [])
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar leaderboard')
    }
  }, [])

  const makePrediction = useCallback(
    async (matchId: string, predictedTeamId: string) => {
      try {
        setError('')
        await api.post('/bracket-predictions', {
          matchId,
          predictedTeamId
        })
        await loadPredictions()
        return true
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao fazer palpite')
        return false
      }
    },
    [loadPredictions]
  )

  const calculatePoints = useCallback(async (matchId: string) => {
    try {
      setError('')
      const response = await api.post(`/bracket-predictions/calculate-points/${matchId}`)
      return response.data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao calcular pontos')
      return null
    }
  }, [])

  return {
    matches,
    predictions,
    stats,
    leaderboard,
    loading,
    error,
    loadMatches,
    loadPredictions,
    loadStats,
    loadLeaderboard,
    makePrediction,
    calculatePoints,
    setError
  }
}

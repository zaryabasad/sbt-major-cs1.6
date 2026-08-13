import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

const PlayersContext = createContext(null)

const STORAGE_KEY = 'sbt-major-players'

function mapSupabasePlayer(player) {
  return {
    ...player,
    realName: player.real_name || '',
    nickname: player.nickname || '',
    age: player.age ?? '',
    country: player.country || '',
    photo: player.photo || '',
    status: player.status === 'Sold' ? 'Sold' : 'Unsold',
    teamId: player.team_id || '',
  }
}

function readLocalPlayers() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    )

    if (!Array.isArray(stored)) return []

    return stored.map((player) => ({
      ...player,
      realName: player.realName || player.real_name || '',
      nickname: player.nickname || '',
      age: player.age ?? '',
      country: player.country || '',
      photo: player.photo || '',
      status: player.status === 'Sold' ? 'Sold' : 'Unsold',
      teamId: player.teamId || player.team_id || '',
    }))
  } catch {
    return []
  }
}

export function PlayersProvider({ children }) {
  const [players, setPlayers] = useState(readLocalPlayers)
  const [loading, setLoading] = useState(true)

  // ================================
  // LOAD PLAYERS FROM SUPABASE
  // ================================
  useEffect(() => {
    let cancelled = false

    async function loadPlayers() {
      console.log('==============================')
      console.log('LOADING PLAYERS FROM SUPABASE...')

      setLoading(true)

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: true })

      console.log('SUPABASE PLAYERS RESULT:', { data, error })

      if (cancelled) return

      if (error) {
        console.error('PLAYERS LOAD ERROR:', error)
        setLoading(false)
        return
      }

      if (data) {
        setPlayers(data.map(mapSupabasePlayer))
      }

      setLoading(false)

      console.log('PLAYERS LOADED:', data?.length || 0)
    }

    loadPlayers()

    return () => {
      cancelled = true
    }
  }, [])

  // ================================
  // LOCAL STORAGE BACKUP
  // ================================
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(players)
    )
  }, [players])

  // ================================
  // ADD PLAYER
  // ================================
  const addPlayer = async (player) => {
    console.log('==============================')
    console.log('ADD PLAYER STARTED')
    console.log('PLAYER RECEIVED:', player)

    const newPlayer = {
      real_name: player.realName || '',
      nickname: player.nickname || '',
      age:
        player.age === '' ||
        player.age === null ||
        player.age === undefined
          ? null
          : Number(player.age),
      country: player.country || '',
      photo: player.photo || '',
      status: player.status === 'Sold' ? 'Sold' : 'Unsold',
      team_id: player.teamId || null,
    }

    console.log('INSERTING PLAYER:', newPlayer)

    const { data, error } = await supabase
      .from('players')
      .insert(newPlayer)
      .select()
      .single()

    console.log('SUPABASE INSERT PLAYER RESULT:', {
      data,
      error,
    })

    if (error) {
      console.error('PLAYER INSERT ERROR:', error)
      throw error
    }

    const mappedPlayer = mapSupabasePlayer(data)

    setPlayers((current) => [
      ...current,
      mappedPlayer,
    ])

    console.log('PLAYER SAVED SUCCESSFULLY:', mappedPlayer)

    return mappedPlayer
  }

  // ================================
  // UPDATE PLAYER
  // ================================
  const updatePlayer = async (player) => {
    console.log('==============================')
    console.log('UPDATE PLAYER STARTED')
    console.log('PLAYER:', player)

    const updatedPlayer = {
      real_name: player.realName || '',
      nickname: player.nickname || '',
      age:
        player.age === '' ||
        player.age === null ||
        player.age === undefined
          ? null
          : Number(player.age),
      country: player.country || '',
      photo: player.photo || '',
      status: player.status === 'Sold' ? 'Sold' : 'Unsold',
      team_id: player.teamId || null,
    }

    const { data, error } = await supabase
      .from('players')
      .update(updatedPlayer)
      .eq('id', player.id)
      .select()
      .single()

    console.log('SUPABASE UPDATE PLAYER RESULT:', {
      data,
      error,
    })

    if (error) {
      console.error('PLAYER UPDATE ERROR:', error)
      throw error
    }

    const mappedPlayer = mapSupabasePlayer(data)

    setPlayers((current) =>
      current.map((item) =>
        item.id === player.id
          ? mappedPlayer
          : item
      )
    )

    return mappedPlayer
  }

  // ================================
  // DELETE PLAYER
  // ================================
  const deletePlayer = async (id) => {
    console.log('==============================')
    console.log('DELETE PLAYER STARTED:', id)

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)

    console.log('SUPABASE DELETE PLAYER RESULT:', {
      error,
    })

    if (error) {
      console.error('PLAYER DELETE ERROR:', error)
      throw error
    }

    setPlayers((current) =>
      current.filter(
        (player) => player.id !== id
      )
    )

    console.log('PLAYER DELETED SUCCESSFULLY')
  }

  const value = useMemo(
    () => ({
      players,
      loading,
      addPlayer,
      updatePlayer,
      deletePlayer,
    }),
    [players, loading]
  )

  return (
    <PlayersContext.Provider value={value}>
      {children}
    </PlayersContext.Provider>
  )
}

export function usePlayers() {
  return useContext(PlayersContext)
}
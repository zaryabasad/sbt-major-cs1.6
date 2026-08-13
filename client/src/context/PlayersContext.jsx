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

function readLocalPlayers() {
  try {
    const storedPlayers = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    )

    if (!Array.isArray(storedPlayers)) {
      return []
    }

    return storedPlayers.map((player) => ({
      ...player,

      realName:
        player.realName ??
        player.real_name ??
        player.playerName ??
        '',

      nickname:
        player.nickname ??
        player.playerName ??
        '',

      age: player.age ?? '',

      country: player.country ?? '',

      photo:
        player.photo ??
        player.image ??
        '',

      status:
        player.status === 'Sold'
          ? 'Sold'
          : 'Unsold',

      teamId:
        player.teamId ??
        player.team_id ??
        '',
    }))
  } catch (error) {
    console.error(
      'LOCAL PLAYERS READ ERROR:',
      error
    )

    return []
  }
}

function mapSupabasePlayer(player) {
  return {
    ...player,

    realName:
      player.real_name ?? '',

    nickname:
      player.nickname ?? '',

    age:
      player.age ?? '',

    country:
      player.country ?? '',

    photo:
      player.photo ?? '',

    status:
      player.status === 'Sold'
        ? 'Sold'
        : 'Unsold',

    teamId:
      player.team_id ?? '',
  }
}

export function PlayersProvider({ children }) {
  const [players, setPlayers] = useState(
    readLocalPlayers
  )

  const [loading, setLoading] = useState(true)

  // LOAD PLAYERS FROM SUPABASE
  useEffect(() => {
    let cancelled = false

    async function loadPlayers() {
      console.log(
        '🔥 LOADING PLAYERS FROM SUPABASE...'
      )

      setLoading(true)

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', {
          ascending: true,
        })

      console.log(
        '🔥 SUPABASE PLAYERS RESULT:',
        {
          data,
          error,
        }
      )

      if (cancelled) return

      if (error) {
        console.error(
          '❌ SUPABASE PLAYERS LOAD ERROR:',
          error
        )

        setLoading(false)
        return
      }

      if (data) {
        setPlayers(
          data.map(mapSupabasePlayer)
        )
      }

      setLoading(false)
    }

    loadPlayers()

    return () => {
      cancelled = true
    }
  }, [])

  // LOCAL STORAGE BACKUP
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(players)
    )
  }, [players])

  // ADD PLAYER
  const addPlayer = async (player) => {
    const newPlayer = {
      real_name:
        player.realName ??
        player.playerName ??
        '',

      nickname:
        player.nickname ??
        player.playerName ??
        '',

      age:
        player.age
          ? Number(player.age)
          : null,

      country:
        player.country ?? '',

      photo:
        player.photo ??
        player.image ??
        '',

      status:
        player.status === 'Sold'
          ? 'Sold'
          : 'Unsold',

      team_id:
        player.teamId || null,
    }

    console.log(
      '🔥 INSERTING PLAYER:',
      newPlayer
    )

    const {
      data,
      error,
    } = await supabase
      .from('players')
      .insert(newPlayer)
      .select()
      .single()

    console.log(
      '🔥 SUPABASE PLAYER INSERT RESULT:',
      {
        data,
        error,
      }
    )

    if (error) {
      console.error(
        '❌ PLAYER INSERT ERROR:',
        error
      )

      throw error
    }

    const mappedPlayer =
      mapSupabasePlayer(data)

    setPlayers((current) => [
      ...current,
      mappedPlayer,
    ])

    return mappedPlayer
  }

  // UPDATE PLAYER
  const updatePlayer = async (player) => {
    const updatedPlayer = {
      real_name:
        player.realName ??
        player.playerName ??
        '',

      nickname:
        player.nickname ??
        player.playerName ??
        '',

      age:
        player.age
          ? Number(player.age)
          : null,

      country:
        player.country ?? '',

      photo:
        player.photo ??
        player.image ??
        '',

      status:
        player.status === 'Sold'
          ? 'Sold'
          : 'Unsold',

      team_id:
        player.teamId || null,
    }

    console.log(
      '🔥 UPDATING PLAYER:',
      player.id,
      updatedPlayer
    )

    const {
      data,
      error,
    } = await supabase
      .from('players')
      .update(updatedPlayer)
      .eq('id', player.id)
      .select()
      .single()

    console.log(
      '🔥 SUPABASE PLAYER UPDATE RESULT:',
      {
        data,
        error,
      }
    )

    if (error) {
      console.error(
        '❌ PLAYER UPDATE ERROR:',
        error
      )

      throw error
    }

    const mappedPlayer =
      mapSupabasePlayer(data)

    setPlayers((current) =>
      current.map((item) =>
        item.id === player.id
          ? mappedPlayer
          : item
      )
    )

    return mappedPlayer
  }

  // DELETE PLAYER
  const deletePlayer = async (id) => {
    console.log(
      '🔥 DELETING PLAYER:',
      id
    )

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)

    console.log(
      '🔥 SUPABASE PLAYER DELETE RESULT:',
      error
    )

    if (error) {
      console.error(
        '❌ PLAYER DELETE ERROR:',
        error
      )

      throw error
    }

    setPlayers((current) =>
      current.filter(
        (player) => player.id !== id
      )
    )
  }

  const value = useMemo(
    () => ({
      players,
      loading,
      addPlayer,
      updatePlayer,
      deletePlayer,
    }),
    [
      players,
      loading,
    ]
  )

  return (
    <PlayersContext.Provider
      value={value}
    >
      {children}
    </PlayersContext.Provider>
  )
}

export function usePlayers() {
  return useContext(PlayersContext)
}
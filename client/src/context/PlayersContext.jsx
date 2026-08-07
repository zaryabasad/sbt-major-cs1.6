import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const PlayersContext = createContext(null)
const STORAGE_KEY = 'sbt-major-players'

function readPlayers() {
  try {
    const storedPlayers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(storedPlayers)) return []

    return storedPlayers.map((player) => ({
      ...player,
      realName: player.realName || player.playerName || '',
      nickname: player.nickname || player.playerName || '',
      age: player.age || '',
      country: player.country || '',
      photo: player.photo || player.image || '',
      status: player.status === 'Sold' ? 'Sold' : 'Unsold',
      teamId: player.teamId || '',
    }))
  } catch {
    return []
  }
}

export function PlayersProvider({ children }) {
  const [players, setPlayers] = useState(readPlayers)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  }, [players])

  const addPlayer = (player) => setPlayers((current) => [...current, { ...player, id: crypto.randomUUID() }])
  const updatePlayer = (player) => setPlayers((current) => current.map((item) => item.id === player.id ? player : item))
  const deletePlayer = (id) => setPlayers((current) => current.filter((player) => player.id !== id))
  const value = useMemo(() => ({ players, addPlayer, updatePlayer, deletePlayer }), [players])

  return <PlayersContext.Provider value={value}>{children}</PlayersContext.Provider>
}

export function usePlayers() {
  return useContext(PlayersContext)
}

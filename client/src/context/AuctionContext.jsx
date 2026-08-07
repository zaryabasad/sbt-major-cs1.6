import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuctionContext = createContext(null)
const STORAGE_KEY = 'sbt-major-auction'
const initialAuction = {
  currentPlayerId: '',
  highestBid: 0,
  highestTeamId: '',
  timeRemaining: 300, // 5 minutes
  history: [],
}

function readAuction() {
  try {
    const storedAuction = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return storedAuction ? { ...initialAuction, ...storedAuction, history: Array.isArray(storedAuction.history) ? storedAuction.history : [] } : initialAuction
  } catch {
    return initialAuction
  }
}

export function AuctionProvider({ children }) {
  const [auction, setAuction] = useState(readAuction)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auction))
  }, [auction])

  useEffect(() => {
    if (!auction.currentPlayerId || auction.timeRemaining <= 0) return undefined
    const timer = window.setInterval(() => setAuction((current) => current.timeRemaining > 0 ? { ...current, timeRemaining: current.timeRemaining - 1 } : current), 1000)
    return () => window.clearInterval(timer)
  }, [auction.currentPlayerId, auction.timeRemaining])

  const selectPlayer = (player) => setAuction((current) => ({ ...current, currentPlayerId: player.id, highestBid: Number(player.basePrice), highestTeamId: '', timeRemaining: 300 }))
  const registerBid = (teamId, amount) => setAuction((current) => ({ ...current, highestTeamId: teamId, highestBid: amount, history: [{ id: crypto.randomUUID(), type: 'bid', playerId: current.currentPlayerId, teamId, amount, createdAt: new Date().toISOString() }, ...current.history] }))
  const recordSale = (teamId, amount) => setAuction((current) => ({ ...current, currentPlayerId: '', highestBid: 0, highestTeamId: '', timeRemaining: 300, history: [{ id: crypto.randomUUID(), type: 'sale', playerId: current.currentPlayerId, teamId, amount, createdAt: new Date().toISOString() }, ...current.history] }))
  const value = useMemo(() => ({ auction, selectPlayer, registerBid, recordSale }), [auction])

  return <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
}

export function useAuction() {
  return useContext(AuctionContext)
}

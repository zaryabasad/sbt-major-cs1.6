import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

const AuctionContext = createContext(null)
const STORAGE_KEY = 'sbt-major-auction'

const initialAuction = {
  currentPlayerId: '',
  highestBid: 0,
  highestTeamId: '',
  timeRemaining: 0,
  history: [],
}

function readAuction() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!stored) return initialAuction
    return {
      ...initialAuction,
      ...stored,
      history: Array.isArray(stored.history) ? stored.history : [],
    }
  } catch {
    return initialAuction
  }
}

function mapHistory(row) {
  return {
    id: row.id,
    playerId: row.player_id,
    teamId: row.team_id,
    amount: Number(row.amount || 0),
    type: row.type || 'bid',
    createdAt: row.created_at,
  }
}

export function AuctionProvider({ children }) {
  const [auction, setAuction] = useState(readAuction)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      const { data, error } = await supabase.rpc('get_auction_history')
      if (cancelled) return

      if (error) {
        console.error('AUCTION HISTORY LOAD ERROR:', error)
        setHistoryLoading(false)
        return
      }

      // History is durable history only. Do not let an old bid replace
      // the currently selected player after a refresh.
      const mappedHistory = (data || []).map(mapHistory)
      setAuction((current) => ({
        ...current,
        history: mappedHistory,
      }))
      setHistoryLoading(false)
    }

    void loadHistory()

    const realtimeChannel = supabase
      .channel('sbt-major-auction-live')
      .on('broadcast', { event: 'auction_changed' }, () => {
        void loadHistory()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(realtimeChannel)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAuctionData() {
      const [historyResult, stateResult] = await Promise.all([
        supabase.rpc('get_auction_history'),
        supabase
          .from('auction_state')
          .select('current_player_id, highest_bid, time_remaining')
          .eq('id', 1)
          .maybeSingle(),
      ])

      if (cancelled) return

      const { data: historyData, error: historyError } = historyResult
      const { data: stateData, error: stateError } = stateResult

      if (historyError) console.error('AUCTION HISTORY LOAD ERROR:', historyError)
      if (stateError) console.error('AUCTION STATE LOAD ERROR:', stateError)

      const mappedHistory = (historyData || []).map(mapHistory)
      const statePlayerId = stateData?.current_player_id || ''
      const stateBid = Number(stateData?.highest_bid || 0)

      const playerHistory = statePlayerId
        ? mappedHistory.filter(
            (item) => String(item.playerId) === String(statePlayerId)
          )
        : []

      const latestBid =
        playerHistory.find((item) => item.type === 'bid') || null
      const latestSale =
        playerHistory.find((item) => item.type === 'sale') || null

      setAuction((current) => {
        const next = {
          ...current,
          history: mappedHistory,
        }

        if (!statePlayerId) {
          next.currentPlayerId = ''
          next.highestBid = 0
          next.highestTeamId = ''
          next.timeRemaining = Number(stateData?.time_remaining ?? 0)
          return next
        }

        // auction_state is the source of truth for the active player and
        // therefore preserves the selected player's base price on refresh.
        next.currentPlayerId = statePlayerId
        next.highestBid = stateBid
        next.highestTeamId = latestBid?.teamId || ''
        next.timeRemaining = Number(stateData?.time_remaining ?? 0)

        if (latestSale) {
          next.currentPlayerId = ''
          next.highestBid = 0
          next.highestTeamId = ''
          next.timeRemaining = 0
        }

        return next
      })

      setHistoryLoading(false)
    }

    void loadAuctionData()

    const realtimeChannel = supabase
      .channel('sbt-major-auction-sync')
      .on('broadcast', { event: 'auction_changed' }, () => {
        void loadAuctionData()
      })
      .on('broadcast', { event: 'auction_state_changed' }, () => {
        void loadAuctionData()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(realtimeChannel)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auction))
  }, [auction])

  useEffect(() => {
    if (!auction.currentPlayerId || auction.timeRemaining <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setAuction((current) => {
        if (current.timeRemaining <= 0) return current
        return {
          ...current,
          timeRemaining: current.timeRemaining - 1,
        }
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [auction.currentPlayerId, auction.timeRemaining])

  const selectPlayer = async (player) => {
    if (!player?.id) {
      return { success: false, error: 'Invalid player.' }
    }

    const basePrice = Number(player.basePrice ?? player.base_price ?? 0)

    const { error } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id: String(player.id),
        highest_bid: basePrice,
        time_remaining: 0,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('AUCTION PLAYER SELECT ERROR:', error)
      return {
        success: false,
        error: error.message || 'Could not start the auction player.',
      }
    }

    setAuction((current) => ({
      ...current,
      currentPlayerId: player.id,
      highestBid: basePrice,
      highestTeamId: '',
      timeRemaining: 0,
    }))

    return { success: true }
  }

  const registerBid = async (teamId, amount) => {
    const numericAmount = Number(amount)

    if (!auction.currentPlayerId) {
      return { success: false, error: 'Cannot place bid: no player selected.' }
    }
    if (!teamId) {
      return { success: false, error: 'Cannot place bid: no team selected.' }
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { success: false, error: 'Cannot place bid: invalid amount.' }
    }

    const { data, error } = await supabase
      .from('auction_history')
      .insert({
        player_id: auction.currentPlayerId,
        team_id: teamId,
        amount: numericAmount,
        type: 'bid',
      })
      .select()
      .single()

    if (error) {
      console.error('SUPABASE BID ERROR:', error)
      return {
        success: false,
        error: error.message || 'This bid is not permitted.',
      }
    }

    const historyItem = mapHistory(data)

    const { error: stateError } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id: String(auction.currentPlayerId),
        highest_bid: numericAmount,
        time_remaining: 0,
        updated_at: new Date().toISOString(),
      })

    if (stateError) console.error('AUCTION STATE BID SYNC ERROR:', stateError)

    setAuction((current) => ({
      ...current,
      highestTeamId: teamId,
      highestBid: numericAmount,
      history: [historyItem, ...current.history],
    }))

    return { success: true, historyItem }
  }

  const recordSale = async (teamId, amount) => {
    const playerId = auction.currentPlayerId
    const numericAmount = Number(amount)

    if (!playerId) {
      return { success: false, error: 'Cannot record sale: no player selected.' }
    }
    if (!teamId) {
      return { success: false, error: 'Cannot record sale: no team selected.' }
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { success: false, error: 'Cannot record sale: invalid amount.' }
    }

    const { data, error } = await supabase
      .from('auction_history')
      .insert({
        player_id: playerId,
        team_id: teamId,
        amount: numericAmount,
        type: 'sale',
      })
      .select()
      .single()

    if (error) {
      console.error('SUPABASE SALE ERROR:', error)
      return {
        success: false,
        error: error.message || 'Only the Super Admin can finalize a sale.',
      }
    }

    const historyItem = mapHistory(data)

    const { error: stateError } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id: null,
        highest_bid: 0,
        time_remaining: 300,
        updated_at: new Date().toISOString(),
      })

    if (stateError) console.error('AUCTION STATE SALE SYNC ERROR:', stateError)

    setAuction((current) => ({
      ...current,
      currentPlayerId: '',
      highestBid: 0,
      highestTeamId: '',
      timeRemaining: 0,
      history: [historyItem, ...current.history],
    }))

    return { success: true, historyItem }
  }

  const resetAuction = async () => {
    const { error } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id: null,
        highest_bid: 0,
        time_remaining: 300,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('AUCTION RESET STATE ERROR:', error)
      return
    }

    setAuction((current) => ({
      ...current,
      currentPlayerId: '',
      highestBid: 0,
      highestTeamId: '',
      timeRemaining: 0,
    }))
  }

  const value = useMemo(
    () => ({
      auction,
      historyLoading,
      selectPlayer,
      registerBid,
      recordSale,
      resetAuction,
    }),
    [auction, historyLoading]
  )

  return (
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  )
}

export function useAuction() {
  return useContext(AuctionContext)
}

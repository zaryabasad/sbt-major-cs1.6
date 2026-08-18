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
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || 'null'
    )

    if (!stored) {
      return initialAuction
    }

    return {
      ...initialAuction,
      ...stored,
      history: Array.isArray(stored.history)
        ? stored.history
        : [],
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
  const [auction, setAuction] = useState(
    readAuction
  )

  const [historyLoading, setHistoryLoading] =
    useState(true)

  // ==========================================
  // LOAD AUCTION HISTORY
  // Anonymous for non-Super-Admins via RPC.
  // ==========================================

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      const {
        data,
        error,
      } = await supabase.rpc(
        'get_auction_history'
      )

      if (cancelled) {
        return
      }

      if (error) {
        console.error(
          'AUCTION HISTORY LOAD ERROR:',
          error
        )

        setHistoryLoading(false)
        return
      }

      const mappedHistory =
        (data || []).map(mapHistory)

      setAuction((current) => {
        const latest =
          mappedHistory[0]

        const next = {
          ...current,
          history: mappedHistory,
        }

        if (
          latest?.type === 'bid'
        ) {
          next.currentPlayerId =
            latest.playerId

          next.highestBid =
            latest.amount

          next.highestTeamId =
            latest.teamId || ''
        }

        if (
          latest?.type === 'sale'
        ) {
          next.currentPlayerId = ''
          next.highestBid = 0
          next.highestTeamId = ''
        }

        return next
      })

      setHistoryLoading(false)
    }

    loadHistory()

    // ----------------------------------------
    // REALTIME AUCTION SYNC
    //
    // The broadcast is only used as a signal.
    // We NEVER trust its payload for bidder data.
    // After every event we reload through the
    // masked get_auction_history RPC.
    // ----------------------------------------

    const realtimeChannel =
      supabase
        .channel(
          'sbt-major-auction-live'
        )
        .on(
          'broadcast',
          {
            event:
              'auction_changed',
          },
          () => {
            loadHistory()
          }
        )
        .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(
        realtimeChannel
      )
    }
  }, [])

  // ==========================================
  // LOAD / RECONCILE SHARED AUCTION STATE
  //
  // auction_history is the durable bid history.
  // auction_state is the live snapshot.
  // On refresh, the newest history entry for the
  // active player wins over an older snapshot.
  // ==========================================

  useEffect(() => {
    let cancelled = false

    async function loadAuctionData() {
      const [
        historyResult,
        stateResult,
      ] = await Promise.all([
        supabase.rpc(
          'get_auction_history'
        ),
        supabase
          .from('auction_state')
          .select(
            'current_player_id, highest_bid, time_remaining'
          )
          .eq('id', 1)
          .maybeSingle(),
      ])

      if (cancelled) {
        return
      }

      const {
        data: historyData,
        error: historyError,
      } = historyResult

      const {
        data: stateData,
        error: stateError,
      } = stateResult

      if (historyError) {
        console.error(
          'AUCTION HISTORY LOAD ERROR:',
          historyError
        )
      }

      if (stateError) {
        console.error(
          'AUCTION STATE LOAD ERROR:',
          stateError
        )
      }

      const mappedHistory =
        (historyData || []).map(
          mapHistory
        )

      const latestBid =
        mappedHistory.find(
          (item) =>
            item.type === 'bid'
        ) || null

      const latestSale =
        mappedHistory.find(
          (item) =>
            item.type === 'sale'
        ) || null

      setAuction((current) => {
        const next = {
          ...current,
          history: mappedHistory,
        }

        const statePlayerId =
          stateData?.current_player_id || ''

        const stateBid = Number(
          stateData?.highest_bid || 0
        )

        // If auction_state is missing but history has a bid,
        // reconstruct the live auction from history.
        if (
          !statePlayerId &&
          latestBid
        ) {
          next.currentPlayerId =
            latestBid.playerId
          next.highestBid =
            latestBid.amount
          next.highestTeamId =
            latestBid.teamId || ''
          next.timeRemaining = 0

          return next
        }

        // Prefer the state snapshot when it points to an active player,
        // but never allow an older snapshot to overwrite a newer bid.
        if (statePlayerId) {
          next.currentPlayerId =
            statePlayerId

          next.highestBid =
            stateBid

          next.timeRemaining =
            Number(
              stateData?.time_remaining ??
                0
            )

          if (
            latestBid &&
            String(
              latestBid.playerId
            ) === String(
              statePlayerId
            ) &&
            latestBid.amount >
              stateBid
          ) {
            next.highestBid =
              latestBid.amount

            next.highestTeamId =
              latestBid.teamId || ''
          }
        } else if (latestBid) {
          next.currentPlayerId =
            latestBid.playerId

          next.highestBid =
            latestBid.amount

          next.highestTeamId =
            latestBid.teamId || ''
        }

        // A recorded sale means no player is currently active.
        if (
          latestSale &&
          (
            !latestBid ||
            new Date(
              latestSale.createdAt
            ) >= new Date(
              latestBid.createdAt
            )
          )
        ) {
          next.currentPlayerId = ''
          next.highestBid = 0
          next.highestTeamId = ''
          next.timeRemaining = 0
        }

        return next
      })

      setHistoryLoading(false)
    }

    loadAuctionData()

    const realtimeChannel =
      supabase
        .channel(
          'sbt-major-auction-sync'
        )
        .on(
          'broadcast',
          {
            event:
              'auction_changed',
          },
          () => {
            loadAuctionData()
          }
        )
        .on(
          'broadcast',
          {
            event:
              'auction_state_changed',
          },
          () => {
            loadAuctionData()
          }
        )
        .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(
        realtimeChannel
      )
    }
  }, [])

  // ==========================================
  // LOCAL STORAGE BACKUP
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(auction)
    )
  }, [auction])

  // ==========================================
  // AUCTION TIMER
  // ==========================================

  useEffect(() => {
    if (
      !auction.currentPlayerId ||
      auction.timeRemaining <= 0
    ) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setAuction((current) => {
        if (current.timeRemaining <= 0) {
          return current
        }

        return {
          ...current,
          timeRemaining:
            current.timeRemaining - 1,
        }
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    auction.currentPlayerId,
    auction.timeRemaining,
  ])

  // ==========================================
  // SELECT PLAYER
  // Super Admin controls this from Auction.jsx.
  // ==========================================

  const selectPlayer = async (
    player
  ) => {
    if (!player?.id) {
      return {
        success: false,
        error: 'Invalid player.',
      }
    }

    const basePrice = Number(
      player.basePrice ??
        player.base_price ??
        0
    )

    const {
      error,
    } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id:
          String(player.id),
        highest_bid:
          basePrice,
        time_remaining: 0,
        updated_at:
          new Date().toISOString(),
      })

    if (error) {
      console.error(
        'AUCTION PLAYER SELECT ERROR:',
        error
      )

      return {
        success: false,
        error:
          error.message ||
          'Could not start the auction player.',
      }
    }

    setAuction((current) => ({
      ...current,
      currentPlayerId: player.id,
      highestBid: basePrice,
      highestTeamId: '',
      timeRemaining: 0,
    }))

    return {
      success: true,
    }
  }

  // ==========================================
  // REGISTER BID
  // ==========================================

  const registerBid = async (
    teamId,
    amount
  ) => {
    const numericAmount = Number(amount)

    if (!auction.currentPlayerId) {
      return {
        success: false,
        error:
          'Cannot place bid: no player selected.',
      }
    }

    if (!teamId) {
      return {
        success: false,
        error:
          'Cannot place bid: no team selected.',
      }
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return {
        success: false,
        error:
          'Cannot place bid: invalid amount.',
      }
    }

    const historyRow = {
      player_id:
        auction.currentPlayerId,
      team_id: teamId,
      amount: numericAmount,
      type: 'bid',
    }

    const {
      data,
      error,
    } = await supabase
      .from('auction_history')
      .insert(historyRow)
      .select()
      .single()

    if (error) {
      console.error(
        'SUPABASE BID ERROR:',
        error
      )

      return {
        success: false,
        error:
          error.message ||
          'This bid is not permitted.',
      }
    }

    const historyItem =
      mapHistory(data)

    const {
      error: stateError,
    } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id:
          String(
            auction.currentPlayerId
          ),
        highest_bid:
          numericAmount,
        time_remaining: 0,
        updated_at:
          new Date().toISOString(),
      })

    if (stateError) {
      console.error(
        'AUCTION STATE BID SYNC ERROR:',
        stateError
      )
    }

    setAuction((current) => ({
      ...current,
      highestTeamId: teamId,
      highestBid: numericAmount,
      history: [
        historyItem,
        ...current.history,
      ],
    }))

    return {
      success: true,
      historyItem,
    }
  }

  // ==========================================
  // RECORD SALE
  // Super Admin only from Auction.jsx + RLS.
  // ==========================================

  const recordSale = async (
    teamId,
    amount
  ) => {
    const playerId =
      auction.currentPlayerId

    const numericAmount = Number(amount)

    if (!playerId) {
      return {
        success: false,
        error:
          'Cannot record sale: no player selected.',
      }
    }

    if (!teamId) {
      return {
        success: false,
        error:
          'Cannot record sale: no team selected.',
      }
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return {
        success: false,
        error:
          'Cannot record sale: invalid amount.',
      }
    }

    const historyRow = {
      player_id: playerId,
      team_id: teamId,
      amount: numericAmount,
      type: 'sale',
    }

    const {
      data,
      error,
    } = await supabase
      .from('auction_history')
      .insert(historyRow)
      .select()
      .single()

    if (error) {
      console.error(
        'SUPABASE SALE ERROR:',
        error
      )

      return {
        success: false,
        error:
          error.message ||
          'Only the Super Admin can finalize a sale.',
      }
    }

    const historyItem =
      mapHistory(data)

    const {
      error: stateError,
    } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id: null,
        highest_bid: 0,
        time_remaining: 300,
        updated_at:
          new Date().toISOString(),
      })

    if (stateError) {
      console.error(
        'AUCTION STATE SALE SYNC ERROR:',
        stateError
      )
    }

    setAuction((current) => ({
      ...current,
      currentPlayerId: '',
      highestBid: 0,
      highestTeamId: '',
      timeRemaining: 0,
      history: [
        historyItem,
        ...current.history,
      ],
    }))

    return {
      success: true,
      historyItem,
    }
  }

  // ==========================================
  // RESET CURRENT AUCTION
  // ==========================================

  const resetAuction = async () => {
    const { error } = await supabase
      .from('auction_state')
      .upsert({
        id: 1,
        current_player_id: null,
        highest_bid: 0,
        time_remaining: 300,
        updated_at:
          new Date().toISOString(),
      })

    if (error) {
      console.error(
        'AUCTION RESET STATE ERROR:',
        error
      )
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

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      auction,
      historyLoading,
      selectPlayer,
      registerBid,
      recordSale,
      resetAuction,
    }),
    [
      auction,
      historyLoading,
    ]
  )

  return (
    <AuctionContext.Provider
      value={value}
    >
      {children}
    </AuctionContext.Provider>
  )
}

export function useAuction() {
  return useContext(AuctionContext)
}
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
  timeRemaining: 300,
  history: [],
}

function readAuction() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || 'null'
    )

    if (!stored) return initialAuction

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
  const [auction, setAuction] = useState(readAuction)
  const [historyLoading, setHistoryLoading] = useState(true)

  // --------------------------------------------------
  // LOAD AUCTION HISTORY FROM SUPABASE
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      console.log('LOADING AUCTION HISTORY FROM SUPABASE...')

      const { data, error } = await supabase
        .from('auction_history')
        .select('*')
        .order('created_at', {
          ascending: false,
        })

      console.log('AUCTION HISTORY RESULT:', {
        data,
        error,
      })

      if (cancelled) return

      if (error) {
        console.error(
          'AUCTION HISTORY LOAD ERROR:',
          error
        )

        setHistoryLoading(false)
        return
      }

      setAuction((current) => ({
        ...current,
        history: (data || []).map(mapHistory),
      }))

      setHistoryLoading(false)
    }

    loadHistory()

    return () => {
      cancelled = true
    }
  }, [])

  // --------------------------------------------------
  // LOCAL STORAGE BACKUP
  // --------------------------------------------------

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(auction)
    )
  }, [auction])

  // --------------------------------------------------
  // AUCTION TIMER
  // --------------------------------------------------

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

  // --------------------------------------------------
  // SELECT PLAYER
  // --------------------------------------------------

  const selectPlayer = (player) => {
    console.log('AUCTION PLAYER SELECTED:', player)

    setAuction((current) => ({
      ...current,

      currentPlayerId: player.id,

      highestBid: Number(
        player.basePrice ??
        player.base_price ??
        0
      ),

      highestTeamId: '',

      timeRemaining: 300,
    }))
  }

  // --------------------------------------------------
  // REGISTER BID
  // --------------------------------------------------

  const registerBid = async (teamId, amount) => {
    const numericAmount = Number(amount)

    if (!auction.currentPlayerId) {
      console.error(
        'Cannot place bid: no player selected'
      )

      return
    }

    if (!teamId) {
      console.error(
        'Cannot place bid: no team selected'
      )

      return
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      console.error(
        'Cannot place bid: invalid amount'
      )

      return
    }

    console.log('REGISTERING BID:', {
      playerId: auction.currentPlayerId,
      teamId,
      amount: numericAmount,
    })

    const historyRow = {
      player_id: auction.currentPlayerId,
      team_id: teamId,
      amount: numericAmount,
      type: 'bid',
    }

    const { data, error } = await supabase
      .from('auction_history')
      .insert(historyRow)
      .select()
      .single()

    console.log('SUPABASE BID RESULT:', {
      data,
      error,
    })

    if (error) {
      console.error(
        'SUPABASE BID ERROR:',
        error
      )

      alert(error.message)

      return
    }

    const historyItem = mapHistory(data)

    setAuction((current) => ({
      ...current,

      highestTeamId: teamId,

      highestBid: numericAmount,

      history: [
        historyItem,
        ...current.history,
      ],
    }))
  }

  // --------------------------------------------------
  // RECORD SALE
  // --------------------------------------------------

  const recordSale = async (teamId, amount) => {
    const playerId = auction.currentPlayerId
    const numericAmount = Number(amount)

    if (!playerId) {
      console.error(
        'Cannot record sale: no player selected'
      )

      return
    }

    if (!teamId) {
      console.error(
        'Cannot record sale: no team selected'
      )

      return
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      console.error(
        'Cannot record sale: invalid amount'
      )

      return
    }

    console.log('RECORDING SALE:', {
      playerId,
      teamId,
      amount: numericAmount,
    })

    const historyRow = {
      player_id: playerId,
      team_id: teamId,
      amount: numericAmount,
      type: 'sale',
    }

    const { data, error } = await supabase
      .from('auction_history')
      .insert(historyRow)
      .select()
      .single()

    console.log('SUPABASE SALE RESULT:', {
      data,
      error,
    })

    if (error) {
      console.error(
        'SUPABASE SALE ERROR:',
        error
      )

      alert(error.message)

      return
    }

    const historyItem = mapHistory(data)

    setAuction((current) => ({
      ...current,

      currentPlayerId: '',

      highestBid: 0,

      highestTeamId: '',

      timeRemaining: 300,

      history: [
        historyItem,
        ...current.history,
      ],
    }))

    console.log(
      'PLAYER SOLD SUCCESSFULLY:',
      playerId
    )
  }

  // --------------------------------------------------
  // RESET CURRENT AUCTION
  // --------------------------------------------------

  const resetAuction = () => {
    setAuction((current) => ({
      ...current,

      currentPlayerId: '',

      highestBid: 0,

      highestTeamId: '',

      timeRemaining: 300,
    }))
  }

  // --------------------------------------------------
  // VALUE
  // --------------------------------------------------

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
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  )
}

export function useAuction() {
  return useContext(AuctionContext)
}
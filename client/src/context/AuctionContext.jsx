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

export function AuctionProvider({ children }) {
  const [auction, setAuction] = useState(readAuction)
  const [loading, setLoading] = useState(true)

  // ==========================================
  // LOAD AUCTION HISTORY FROM SUPABASE
  // ==========================================

  useEffect(() => {
    let cancelled = false

    async function loadAuctionHistory() {
      console.log('==============================')
      console.log('LOADING AUCTION HISTORY...')

      setLoading(true)

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

        setLoading(false)
        return
      }

      setAuction((current) => ({
        ...current,
        history: data || [],
      }))

      setLoading(false)

      console.log(
        'AUCTION HISTORY LOADED:',
        data?.length || 0
      )
    }

    loadAuctionHistory()

    return () => {
      cancelled = true
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
        if (current.timeRemaining <= 1) {
          window.clearInterval(timer)

          return {
            ...current,
            timeRemaining: 0,
          }
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
  // ==========================================

  const selectPlayer = (player) => {
    console.log('==============================')
    console.log('SELECT PLAYER FOR AUCTION:', player)

    const basePrice = Number(
      player.basePrice ??
        player.base_price ??
        0
    )

    setAuction((current) => ({
      ...current,
      currentPlayerId: player.id,
      highestBid: basePrice,
      highestTeamId: '',
      timeRemaining: 300,
    }))
  }

  // ==========================================
  // REGISTER BID
  // ==========================================

  const registerBid = async (teamId, amount) => {
    console.log('==============================')
    console.log('REGISTER BID')
    console.log('PLAYER:', auction.currentPlayerId)
    console.log('TEAM:', teamId)
    console.log('AMOUNT:', amount)

    if (!auction.currentPlayerId) {
      console.error('NO CURRENT PLAYER SELECTED')
      return
    }

    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount)) {
      console.error('INVALID BID AMOUNT')
      return
    }

    if (numericAmount < Number(auction.highestBid)) {
      console.error('BID IS LOWER THAN CURRENT BID')
      return
    }

    const bid = {
      player_id: auction.currentPlayerId,
      team_id: teamId,
      amount: numericAmount,
    }

    console.log('INSERTING BID:', bid)

    const { data, error } = await supabase
      .from('auction_history')
      .insert(bid)
      .select()
      .single()

    console.log('SUPABASE BID RESULT:', {
      data,
      error,
    })

    if (error) {
      console.error('BID INSERT ERROR:', error)
      throw error
    }

    setAuction((current) => ({
      ...current,
      highestTeamId: teamId,
      highestBid: numericAmount,
      history: [
        data,
        ...current.history,
      ],
    }))

    console.log('BID SAVED SUCCESSFULLY')

    return data
  }

  // ==========================================
  // RECORD SALE
  // ==========================================

  const recordSale = async (
    teamId,
    amount
  ) => {
    console.log('==============================')
    console.log('RECORD SALE STARTED')

    const playerId =
      auction.currentPlayerId

    if (!playerId) {
      console.error('NO CURRENT PLAYER SELECTED')
      return
    }

    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount)) {
      console.error('INVALID SALE AMOUNT')
      return
    }

    if (!teamId) {
      console.error('NO TEAM SELECTED FOR SALE')
      return
    }

    console.log('PLAYER ID:', playerId)
    console.log('TEAM ID:', teamId)
    console.log('SALE AMOUNT:', numericAmount)

    // ------------------------------------------
    // 1. UPDATE PLAYER
    // ------------------------------------------

    const { data: updatedPlayer, error: playerError } =
      await supabase
        .from('players')
        .update({
          status: 'Sold',
          team_id: teamId,
          sold_price: numericAmount,
          sold_at: new Date().toISOString(),
        })
        .eq('id', playerId)
        .select()
        .single()

    console.log('PLAYER SALE UPDATE RESULT:', {
      updatedPlayer,
      playerError,
    })

    if (playerError) {
      console.error(
        'PLAYER SALE UPDATE ERROR:',
        playerError
      )

      throw playerError
    }

    // ------------------------------------------
    // 2. SAVE SALE IN AUCTION HISTORY
    // ------------------------------------------

    const saleRecord = {
      player_id: playerId,
      team_id: teamId,
      amount: numericAmount,
    }

    console.log(
      'INSERTING SALE HISTORY:',
      saleRecord
    )

    const {
      data: saleData,
      error: saleError,
    } = await supabase
      .from('auction_history')
      .insert(saleRecord)
      .select()
      .single()

    console.log('SUPABASE SALE RESULT:', {
      saleData,
      saleError,
    })

    if (saleError) {
      console.error(
        'SALE HISTORY INSERT ERROR:',
        saleError
      )

      throw saleError
    }

    // ------------------------------------------
    // 3. RESET CURRENT AUCTION
    // ------------------------------------------

    setAuction((current) => ({
      ...current,

      currentPlayerId: '',

      highestBid: 0,

      highestTeamId: '',

      timeRemaining: 300,

      history: [
        saleData,
        ...current.history,
      ],
    }))

    console.log('==============================')
    console.log('PLAYER SOLD SUCCESSFULLY')
    console.log('==============================')

    return updatedPlayer
  }

  // ==========================================
  // RESET AUCTION
  // ==========================================

  const resetAuction = () => {
    console.log('RESETTING AUCTION')

    setAuction({
      ...initialAuction,
      history: auction.history,
    })
  }

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      auction,
      loading,
      selectPlayer,
      registerBid,
      recordSale,
      resetAuction,
    }),
    [auction, loading]
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
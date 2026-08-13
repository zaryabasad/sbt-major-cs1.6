import { useMemo, useState } from 'react'
import {
  FaGavel,
  FaPlay,
  FaTrophy,
  FaUserNinja,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import { useAuction } from '../context/AuctionContext'
import { useAuth } from '../context/AuthContext'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'

import { formatCurrency } from '../utils/formatCurrency'

const BID_INCREMENT = 1000

function Auction() {
  const { user } = useAuth()
  const isAdmin = Boolean(user)

  const {
    players,
    updatePlayer,
  } = usePlayers()

  const { teams } = useTeams()

  const {
    auction,
    selectPlayer,
    registerBid,
    recordSale,
  } = useAuction()

  const [selectedTeamId, setSelectedTeamId] =
    useState('')

  // ==========================================
  // SAFE NUMBER
  // ==========================================

  const safeNumber = (value, fallback = 0) => {
    const number = Number(value)

    return Number.isFinite(number)
      ? number
      : fallback
  }

  // ==========================================
  // UNSOLD PLAYERS
  // ==========================================

  const unsoldPlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          player.status !== 'Sold'
      ),
    [players]
  )

  // ==========================================
  // CURRENT PLAYER
  // ==========================================

  const currentPlayer = players.find(
    (player) =>
      String(player.id) ===
      String(auction.currentPlayerId)
  )

  // ==========================================
  // CURRENT LEADING TEAM
  // ==========================================

  const currentTeam = teams.find(
    (team) =>
      String(team.id) ===
      String(auction.highestTeamId)
  )

  // ==========================================
  // TEAM REMAINING BUDGET
  // ==========================================

  const getTeamRemainingBudget = (team) => {
    const startingBudget = safeNumber(
      team.startingBudget ??
        team.starting_budget ??
        team.budget ??
        100000,
      100000
    )

    const spent = players
      .filter((player) => {
        const playerTeamId =
          player.teamId ??
          player.team_id ??
          ''

        return (
          player.status === 'Sold' &&
          String(playerTeamId) ===
            String(team.id)
        )
      })
      .reduce((total, player) => {
        const soldPrice = safeNumber(
          player.soldPrice ??
            player.sold_price ??
            0
        )

        return total + soldPrice
      }, 0)

    return Math.max(
      0,
      startingBudget - spent
    )
  }

  // ==========================================
  // SELECTED TEAM
  // ==========================================

  const selectedTeam = teams.find(
    (team) =>
      String(team.id) ===
      String(selectedTeamId)
  )

  // ==========================================
  // CURRENT BID
  // ==========================================

  const currentBid = safeNumber(
    auction.highestBid,
    0
  )

  const nextBid =
    currentBid + BID_INCREMENT

  // ==========================================
  // SELECT PLAYER
  // ==========================================

  const handleSelectPlayer = (player) => {
    if (!isAdmin) return

    const basePrice = safeNumber(
      player.basePrice ??
        player.base_price ??
        0,
      0
    )

    selectPlayer({
      ...player,
      basePrice,
    })

    setSelectedTeamId(
      teams.length > 0
        ? teams[0].id
        : ''
    )

    toast.success(
      `${player.nickname || 'Player'} is now on the block`
    )
  }

  // ==========================================
  // BID
  // ==========================================

  const handleBid = () => {
    if (!isAdmin) return

    if (!currentPlayer) {
      toast.error(
        'Select an unsold player first'
      )
      return
    }

    if (!selectedTeam) {
      toast.error(
        'Select a bidding team'
      )
      return
    }

    const remainingBudget =
      getTeamRemainingBudget(
        selectedTeam
      )

    if (remainingBudget < nextBid) {
      toast.error(
        `${selectedTeam.name} does not have enough budget`
      )
      return
    }

    console.log(
      '=============================='
    )
    console.log(
      'REGISTERING BID'
    )
    console.log(
      'PLAYER:',
      currentPlayer
    )
    console.log(
      'TEAM:',
      selectedTeam
    )
    console.log(
      'BID:',
      nextBid
    )

    registerBid(
      selectedTeam.id,
      nextBid
    )

    toast.success(
      `${selectedTeam.name} bid ${formatCurrency(nextBid)}`
    )
  }

  // ==========================================
  // SELL PLAYER
  // ==========================================

  const handleSale = async () => {
    if (!isAdmin) return

    if (!currentPlayer) {
      toast.error(
        'Select a player first'
      )
      return
    }

    if (!currentTeam) {
      toast.error(
        'A valid highest bid is required'
      )
      return
    }

    const salePrice = safeNumber(
      auction.highestBid,
      0
    )

    if (salePrice <= 0) {
      toast.error(
        'Please place a valid bid first'
      )
      return
    }

    const teamBudget =
      getTeamRemainingBudget(
        currentTeam
      )

    if (salePrice > teamBudget) {
      toast.error(
        `${currentTeam.name} does not have enough budget`
      )
      return
    }

    console.log(
      '=============================='
    )

    console.log(
      'SELLING PLAYER'
    )

    console.log(
      'PLAYER:',
      currentPlayer
    )

    console.log(
      'TEAM:',
      currentTeam
    )

    console.log(
      'SALE PRICE:',
      salePrice
    )

    // ========================================
    // UPDATE PLAYER
    // ========================================

    const updatedPlayer = {
      ...currentPlayer,

      status: 'Sold',

      teamId: currentTeam.id,

      team_id: currentTeam.id,

      soldPrice: salePrice,

      sold_price: salePrice,

      basePrice: safeNumber(
        currentPlayer.basePrice ??
          currentPlayer.base_price ??
          0
      ),

      base_price: safeNumber(
        currentPlayer.basePrice ??
          currentPlayer.base_price ??
          0
      ),
    }

    console.log(
      'UPDATING PLAYER WITH SALE:',
      updatedPlayer
    )

    try {
      // IMPORTANT:
      // Supabase update complete hone ka wait
      await updatePlayer(
        updatedPlayer
      )

      console.log(
        'PLAYER SUCCESSFULLY SAVED'
      )

      // ======================================
      // RECORD SALE
      // ======================================

      recordSale(
        currentTeam.id,
        salePrice
      )

      setSelectedTeamId('')

      toast.success(
        `${currentPlayer.nickname || 'Player'} sold to ${currentTeam.name} for ${formatCurrency(salePrice)}`
      )

      console.log(
        'SALE COMPLETED SUCCESSFULLY'
      )
    } catch (error) {
      console.error(
        'SALE ERROR:',
        error
      )

      toast.error(
        error?.message ||
          'Failed to sell player'
      )
    }
  }

  // ==========================================
  // HISTORY
  // ==========================================

  const history =
    auction.history?.slice(0, 12) || []

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            SBT MAJOR · LIVE CONTROL ROOM
          </p>

          <h1>
            Live Auction
          </h1>

          <p>
            Nominate players, accept bids,
            and finalize auction sales in
            real time.
          </p>
        </div>

        <div
          className={`auction-timer ${
            auction.timeRemaining <= 10
              ? 'timer-warning'
              : ''
          }`}
        >
          <span>
            TIME REMAINING
          </span>

          <strong>
            {String(
              Math.floor(
                auction.timeRemaining / 60
              )
            ).padStart(2, '0')}
            :
            {String(
              auction.timeRemaining % 60
            ).padStart(2, '0')}
          </strong>
        </div>
      </div>

      {/* VIEWER NOTICE */}

      {!isAdmin && (
        <section className="glass-card auction-viewer-notice">
          <FaUserNinja />

          <div>
            <strong>
              Viewer Mode
            </strong>

            <span>
              Auction controls are available
              to tournament administrators only.
            </span>
          </div>
        </section>
      )}

      <section className="auction-layout">

        {/* ================================= */}
        {/* LEFT SIDE */}
        {/* ================================= */}

        <div className="auction-main">

          {/* AVAILABLE PLAYERS */}

          <section className="glass-card auction-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  AVAILABLE PLAYERS
                </span>

                <h2>
                  Unsold Players
                </h2>
              </div>

              <span className="counter">
                {unsoldPlayers.length}{' '}
                available
              </span>
            </div>

            <div className="auction-player-list">

              {unsoldPlayers.length > 0 ? (

                unsoldPlayers.map(
                  (player) => {
                    const basePrice =
                      safeNumber(
                        player.basePrice ??
                          player.base_price ??
                          0
                      )

                    return (
                      <button
                        className={
                          currentPlayer?.id ===
                          player.id
                            ? 'auction-player active'
                            : 'auction-player'
                        }
                        type="button"
                        onClick={() =>
                          handleSelectPlayer(
                            player
                          )
                        }
                        disabled={!isAdmin}
                        key={player.id}
                      >

                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={
                              player.nickname ||
                              'Player'
                            }
                          />
                        ) : (
                          <span className="auction-player-icon">
                            <FaUserNinja />
                          </span>
                        )}

                        <span>
                          <strong>
                            {player.nickname ||
                              player.realName ||
                              'Player'}
                          </strong>

                          <small>
                            {player.role ||
                              'Player'}{' '}
                            ·{' '}
                            {formatCurrency(
                              basePrice
                            )}
                          </small>
                        </span>

                      </button>
                    )
                  }
                )

              ) : (

                <p className="empty-state-text">
                  Every player has been sold.
                </p>

              )}

            </div>
          </section>

          {/* ================================= */}
          {/* CURRENT PLAYER */}
          {/* ================================= */}

          {currentPlayer ? (

            <section className="glass-card auction-current">

              <div className="current-player">

                {currentPlayer.photo ? (
                  <img
                    src={currentPlayer.photo}
                    alt={
                      currentPlayer.nickname ||
                      'Player'
                    }
                  />
                ) : (
                  <div className="current-player-placeholder">
                    <FaUserNinja />
                  </div>
                )}

                <div>
                  <span className="eyebrow">
                    CURRENT PLAYER
                  </span>

                  <h2>
                    {currentPlayer.nickname ||
                      currentPlayer.realName ||
                      'Player'}
                  </h2>

                  <p>
                    {currentPlayer.realName ||
                      'Unknown'}{' '}
                    ·{' '}
                    {currentPlayer.role ||
                      'Player'}
                  </p>
                </div>

              </div>

              {/* BID DISPLAY */}

              <div className="auction-bid-display">

                <span>
                  CURRENT HIGHEST BID
                </span>

                <strong>
                  {formatCurrency(
                    currentBid
                  )}
                </strong>

                <small>
                  {currentTeam
                    ? `Leading: ${currentTeam.name}`
                    : 'Awaiting opening bid'}
                </small>

              </div>

              {/* ADMIN CONTROLS */}

              {isAdmin && (
                <div className="auction-controls">

                  <label>
                    Bid for team

                    <select
                      value={
                        selectedTeamId
                      }
                      onChange={(event) =>
                        setSelectedTeamId(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select a team
                      </option>

                      {teams.map(
                        (team) => (
                          <option
                            key={team.id}
                            value={team.id}
                          >
                            {team.name} ·{' '}
                            {formatCurrency(
                              getTeamRemainingBudget(
                                team
                              )
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <div className="auction-control-actions">

                    <button
                      className="button button-primary"
                      type="button"
                      onClick={handleBid}
                    >
                      <FaGavel />

                      Increase Bid +{' '}
                      {formatCurrency(
                        BID_INCREMENT
                      )}
                    </button>

                    <button
                      className="button button-primary"
                      type="button"
                      onClick={handleSale}
                    >
                      <FaTrophy />

                      Sell Player
                    </button>

                  </div>

                </div>
              )}

            </section>

          ) : (

            <section className="glass-card auction-current auction-empty">

              <FaPlay />

              <h2>
                Select a player
              </h2>

              <p>
                {isAdmin
                  ? 'Choose an unsold player to begin the auction.'
                  : 'The next auction player will appear here when the administrator starts the auction.'}
              </p>

            </section>

          )}

        </div>

        {/* ================================= */}
        {/* HISTORY */}
        {/* ================================= */}

        <aside className="glass-card auction-history">

          <div className="section-heading">

            <div>
              <span className="eyebrow">
                LIVE HISTORY
              </span>

              <h2>
                Latest Activity
              </h2>
            </div>

          </div>

          <div className="history-list">

            {history.length > 0 ? (

              history.map((entry) => {

                const player =
                  players.find(
                    (item) =>
                      String(item.id) ===
                      String(
                        entry.playerId
                      )
                  )

                const team =
                  teams.find(
                    (item) =>
                      String(item.id) ===
                      String(
                        entry.teamId
                      )
                  )

                const amount =
                  safeNumber(
                    entry.amount,
                    0
                  )

                return (
                  <div
                    className="history-entry"
                    key={entry.id}
                  >

                    <span
                      className={
                        entry.type ===
                        'sale'
                          ? 'history-icon sale'
                          : 'history-icon'
                      }
                    >
                      {entry.type ===
                      'sale'
                        ? 'Sold'
                        : 'Bid'}
                    </span>

                    <div>
                      <strong>
                        {player?.nickname ||
                          'Player'}
                      </strong>

                      <span>
                        {entry.type ===
                        'sale'
                          ? 'sold to'
                          : 'bid by'}{' '}
                        {team?.name ||
                          'Team'}
                      </span>
                    </div>

                    <strong>
                      {formatCurrency(
                        amount
                      )}
                    </strong>

                  </div>
                )
              })

            ) : (

              <p className="empty-state-text">
                No bids have been recorded.
              </p>

            )}

          </div>

        </aside>

      </section>
    </main>
  )
}

export default Auction
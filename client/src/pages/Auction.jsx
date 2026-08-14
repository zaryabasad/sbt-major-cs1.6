import { useMemo, useState } from 'react'
import {
  FaGavel,
  FaPlay,
  FaTrophy,
  FaUserNinja,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import { supabase } from '../lib/supabase'
import { useAuction } from '../context/AuctionContext'
import { useAuth } from '../context/AuthContext'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { formatCurrency } from '../utils/formatCurrency'

const BID_INCREMENT = 1000

function Auction() {
  const { user } = useAuth()
  const isAdmin = Boolean(user)

  const { players, updatePlayer } = usePlayers()
  const { teams } = useTeams()

  const {
    auction,
    selectPlayer,
    registerBid,
    recordSale,
  } = useAuction()

  const [selectedTeamId, setSelectedTeamId] = useState('')

  const unsoldPlayers = useMemo(
    () =>
      players.filter(
        (player) => player.status !== 'Sold'
      ),
    [players]
  )

  const currentPlayer = players.find(
    (player) =>
      player.id === auction.currentPlayerId
  )

  const currentTeam = teams.find(
    (team) =>
      team.id === auction.highestTeamId
  )

  // ==========================================
  // TEAM REMAINING BUDGET
  // ==========================================

  const getTeamRemainingBudget = (team) => {
    const startingBudget = Number(
      team.startingBudget ??
        team.budget ??
        100000
    )

    const spent = players
      .filter(
        (player) =>
          player.status === 'Sold' &&
          String(player.teamId || '') ===
            String(team.id)
      )
      .reduce(
        (total, player) => {
          const price = Number(
            player.soldPrice ??
              player.sold_price ??
              0
          )

          return total + (Number.isFinite(price) ? price : 0)
        },
        0
      )

    return Math.max(
      0,
      startingBudget - spent
    )
  }

  const selectedTeam = teams.find(
    (team) =>
      String(team.id) ===
      String(selectedTeamId)
  )

  const nextBid =
    Number(auction.highestBid || 0) +
    BID_INCREMENT

  // ==========================================
  // SELECT PLAYER
  // ==========================================

  const handleSelectPlayer = (player) => {
    if (!isAdmin) return

    selectPlayer(player)

    setSelectedTeamId(
      teams.length > 0
        ? teams[0].id
        : ''
    )

    toast.success(
      `${player.nickname} is now on the block`
    )
  }

  // ==========================================
  // BID
  // ==========================================

  const handleBid = async () => {
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

    try {
      await registerBid(
        selectedTeam.id,
        nextBid
      )

      toast.success(
        `${selectedTeam.name} bid ${formatCurrency(nextBid)}`
      )
    } catch (error) {
      console.error(
        'BID ERROR:',
        error
      )

      toast.error(
        error?.message ||
          'Failed to register bid'
      )
    }
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

    const finalPrice = Number(
      auction.highestBid || 0
    )

    if (
      !Number.isFinite(finalPrice) ||
      finalPrice <= 0
    ) {
      toast.error(
        'Invalid sale amount'
      )
      return
    }

    try {
      console.log(
        '================================'
      )

      console.log(
        'SELLING PLAYER:'
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
        'FINAL PRICE:',
        finalPrice
      )

      // ======================================
      // SAVE SALE DIRECTLY TO SUPABASE
      // ======================================

      const playerUpdate = {
        status: 'Sold',
        team_id: currentTeam.id,
        sold_price: finalPrice,
        sold_at: new Date().toISOString(),
      }

      console.log(
        'UPDATING PLAYER IN SUPABASE:',
        playerUpdate
      )

      const {
        data: updatedData,
        error: updateError,
      } = await supabase
        .from('players')
        .update(playerUpdate)
        .eq('id', currentPlayer.id)
        .select()
        .single()

      console.log(
        'SUPABASE SALE UPDATE RESULT:',
        {
          data: updatedData,
          error: updateError,
        }
      )

      if (updateError) {
        throw updateError
      }

      // ======================================
      // UPDATE FRONTEND PLAYER STATE
      // ======================================

      await updatePlayer({
        ...currentPlayer,
        status: 'Sold',
        teamId: currentTeam.id,
        soldPrice: finalPrice,
        sold_price: finalPrice,
        soldAt:
          updatedData?.sold_at ||
          new Date().toISOString(),
      })

      // ======================================
      // SAVE SALE TO AUCTION HISTORY
      // ======================================

      const {
        data: historyData,
        error: historyError,
      } = await supabase
        .from('auction_history')
        .insert({
          player_id: currentPlayer.id,
          team_id: currentTeam.id,
          amount: finalPrice,
          type: 'sale',
        })
        .select()
        .single()

      console.log(
        'SUPABASE SALE HISTORY RESULT:',
        {
          data: historyData,
          error: historyError,
        }
      )

      if (historyError) {
        console.warn(
          'AUCTION HISTORY ERROR:',
          historyError
        )

        toast.error(
          'Player sold, but history could not be saved'
        )
      }

      // ======================================
      // RESET AUCTION
      // ======================================

      recordSale(
        currentTeam.id,
        finalPrice
      )

      setSelectedTeamId('')

      toast.success(
        `${currentPlayer.nickname} sold to ${currentTeam.name} for ${formatCurrency(finalPrice)}`
      )

      console.log(
        'PLAYER SALE COMPLETED SUCCESSFULLY'
      )

      console.log(
        '================================'
      )
    } catch (error) {
      console.error(
        'PLAYER SALE ERROR:',
        error
      )

      toast.error(
        error?.message ||
          'Failed to sell player'
      )
    }
  }

  const history =
    auction.history.slice(0, 12)

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="page-shell">

      <header className="page-heading">
        <div>
          <span className="eyebrow">
            SBT MAJOR · LIVE CONTROL ROOM
          </span>

          <h1>Live Auction</h1>

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
          <span>TIME REMAINING</span>

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
      </header>

      {!isAdmin && (
        <section className="glass-card auction-viewer-notice">
          <FaUserNinja />

          <div>
            <strong>
              Viewer Mode
            </strong>

            <span>
              Auction controls are
              available to tournament
              administrators only.
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

              {unsoldPlayers.length ? (

                unsoldPlayers.map(
                  (player) => (

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
                            player.nickname
                          }
                        />

                      ) : (

                        <span className="auction-player-icon">
                          <FaUserNinja />
                        </span>

                      )}

                      <span>

                        <strong>
                          {player.nickname}
                        </strong>

                        <small>
                          {player.role ||
                            'Player'}{' '}
                          ·{' '}
                          {formatCurrency(
                            Number(
                              player.basePrice ||
                                player.base_price ||
                                0
                            )
                          )}
                        </small>

                      </span>

                    </button>

                  )
                )

              ) : (

                <p className="empty-state-text">
                  Every player has been sold.
                </p>

              )}

            </div>

          </section>

          {/* CURRENT PLAYER */}

          {currentPlayer ? (

            <section className="glass-card auction-current">

              <div className="current-player">

                {currentPlayer.photo ? (

                  <img
                    src={currentPlayer.photo}
                    alt={
                      currentPlayer.nickname
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
                    {currentPlayer.nickname}
                  </h2>

                  <p>
                    {currentPlayer.realName ||
                      ''}{' '}
                    ·{' '}
                    {currentPlayer.role ||
                      'Player'}
                  </p>

                </div>

              </div>

              <div className="auction-bid-display">

                <span>
                  CURRENT HIGHEST BID
                </span>

                <strong>
                  {formatCurrency(
                    Number(
                      auction.highestBid ||
                        0
                    )
                  )}
                </strong>

                <small>
                  {currentTeam
                    ? `Leading: ${currentTeam.name}`
                    : 'Awaiting opening bid'}
                </small>

              </div>

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

                      Increase Bid +$
                      {BID_INCREMENT.toLocaleString()}
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

            {history.length ? (

              history.map((entry) => {

                const player =
                  players.find(
                    (item) =>
                      item.id ===
                      entry.playerId
                  )

                const team =
                  teams.find(
                    (item) =>
                      item.id ===
                      entry.teamId
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
                        Number(
                          entry.amount ||
                            0
                        )
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
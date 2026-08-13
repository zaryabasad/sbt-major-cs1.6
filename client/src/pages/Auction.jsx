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

  // --------------------------------------------------
  // UNSOLD PLAYERS
  // --------------------------------------------------

  const unsoldPlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          player.status !== 'Sold'
      ),
    [players]
  )

  // --------------------------------------------------
  // CURRENT PLAYER
  // --------------------------------------------------

  const currentPlayer = players.find(
    (player) =>
      String(player.id) ===
      String(auction.currentPlayerId)
  )

  // --------------------------------------------------
  // CURRENT LEADING TEAM
  // --------------------------------------------------

  const currentTeam = teams.find(
    (team) =>
      String(team.id) ===
      String(auction.highestTeamId)
  )

  // --------------------------------------------------
  // GET BASE PRICE
  // Supports camelCase + Supabase snake_case
  // --------------------------------------------------

  const getBasePrice = (player) => {
    return Number(
      player?.basePrice ??
      player?.base_price ??
      player?.baseprice ??
      0
    )
  }

  // --------------------------------------------------
  // GET SOLD PRICE
  // --------------------------------------------------

  const getSoldPrice = (player) => {
    return Number(
      player?.soldPrice ??
      player?.sold_price ??
      0
    )
  }

  // --------------------------------------------------
  // TEAM REMAINING BUDGET
  // --------------------------------------------------

  const getTeamRemainingBudget = (team) => {
    if (!team) return 0

    const startingBudget = Number(
      team.startingBudget ??
      team.starting_budget ??
      team.budget ??
      100000
    )

    const spent = players
      .filter(
        (player) =>
          player.status === 'Sold' &&
          String(player.teamId ?? player.team_id) ===
            String(team.id)
      )
      .reduce(
        (total, player) =>
          total + getSoldPrice(player),
        0
      )

    return Math.max(
      0,
      startingBudget - spent
    )
  }

  // --------------------------------------------------
  // SELECTED TEAM
  // --------------------------------------------------

  const selectedTeam = teams.find(
    (team) =>
      String(team.id) ===
      String(selectedTeamId)
  )

  // --------------------------------------------------
  // NEXT BID
  // --------------------------------------------------

  const nextBid =
    Number(auction.highestBid || 0) +
    BID_INCREMENT

  // --------------------------------------------------
  // SELECT PLAYER
  // --------------------------------------------------

  const handleSelectPlayer = (player) => {
    if (!isAdmin) return

    console.log(
      'AUCTION PLAYER SELECTED:',
      player
    )

    selectPlayer(player)

    setSelectedTeamId(
      teams.length > 0
        ? teams[0].id
        : ''
    )

    toast.success(
      `${player.nickname || player.nickname || 'Player'} is now on the block`
    )
  }

  // --------------------------------------------------
  // PLACE BID
  // --------------------------------------------------

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

    const budget =
      getTeamRemainingBudget(
        selectedTeam
      )

    if (budget < nextBid) {
      toast.error(
        `${selectedTeam.name} does not have enough budget`
      )
      return
    }

    console.log(
      'PLACING BID:',
      {
        player: currentPlayer,
        team: selectedTeam,
        amount: nextBid,
      }
    )

    await registerBid(
      selectedTeam.id,
      nextBid
    )

    toast.success(
      `${selectedTeam.name} bid ${formatCurrency(nextBid)}`
    )
  }

  // --------------------------------------------------
  // SELL PLAYER
  // --------------------------------------------------

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

    const salePrice = Number(
      auction.highestBid || 0
    )

    if (salePrice <= 0) {
      toast.error(
        'Place a bid before selling the player'
      )
      return
    }

    console.log(
      'SELLING PLAYER:',
      {
        player: currentPlayer,
        team: currentTeam,
        amount: salePrice,
      }
    )

    // ------------------------------------------------
    // UPDATE PLAYER IN SUPABASE
    // ------------------------------------------------

    const { data, error } = await supabase
      .from('players')
      .update({
        status: 'Sold',
        team_id: currentTeam.id,
        sold_price: salePrice,
      })
      .eq('id', currentPlayer.id)
      .select()
      .single()

    console.log(
      'SUPABASE PLAYER SALE RESULT:',
      {
        data,
        error,
      }
    )

    if (error) {
      console.error(
        'PLAYER SALE UPDATE ERROR:',
        error
      )

      toast.error(
        error.message ||
          'Failed to sell player'
      )

      return
    }

    // ------------------------------------------------
    // UPDATE LOCAL PLAYERS STATE
    // ------------------------------------------------

    updatePlayer({
      ...currentPlayer,

      status: 'Sold',

      teamId: currentTeam.id,

      team_id: currentTeam.id,

      soldPrice: salePrice,

      sold_price: salePrice,
    })

    // ------------------------------------------------
    // SAVE SALE TO AUCTION HISTORY
    // ------------------------------------------------

    await recordSale(
      currentTeam.id,
      salePrice
    )

    setSelectedTeamId('')

    toast.success(
      `${currentPlayer.nickname} sold to ${currentTeam.name} for ${formatCurrency(salePrice)}`
    )

    console.log(
      'PLAYER SOLD SUCCESSFULLY'
    )
  }

  // --------------------------------------------------
  // HISTORY
  // --------------------------------------------------

  const history =
    auction.history.slice(0, 12)

  return (
    <main className="page-shell">

      <section className="page-hero">

        <div>
          <span className="eyebrow">
            SBT MAJOR · LIVE CONTROL ROOM
          </span>

          <h1>LIVE AUCTION</h1>

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

      </section>

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

        <div className="auction-main">

          {/* ---------------------------------------- */}
          {/* AVAILABLE PLAYERS */}
          {/* ---------------------------------------- */}

          <section className="glass-card auction-panel">

            <div className="section-heading">

              <div>

                <span className="eyebrow">
                  AVAILABLE PLAYERS
                </span>

                <h2>
                  UNSOLD PLAYERS
                </h2>

              </div>

              <span className="counter">
                {unsoldPlayers.length} available
              </span>

            </div>

            <div className="auction-player-list">

              {unsoldPlayers.length ? (

                unsoldPlayers.map(
                  (player) => {

                    const basePrice =
                      getBasePrice(player)

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
                            {player.nickname ||
                              player.playerName ||
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

          {/* ---------------------------------------- */}
          {/* CURRENT PLAYER */}
          {/* ---------------------------------------- */}

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
                    {currentPlayer.nickname ||
                      currentPlayer.playerName}
                  </h2>

                  <p>
                    {currentPlayer.realName ||
                      currentPlayer.real_name ||
                      ''}

                    {' · '}

                    {currentPlayer.role ||
                      'Player'}
                  </p>

                </div>

              </div>

              {/* -------------------------------- */}
              {/* BID DISPLAY */}
              {/* -------------------------------- */}

              <div className="auction-bid-display">

                <span>
                  CURRENT HIGHEST BID
                </span>

                <strong>
                  {formatCurrency(
                    Number(
                      auction.highestBid || 0
                    )
                  )}
                </strong>

                <small>
                  {currentTeam
                    ? `Leading: ${currentTeam.name}`
                    : `Opening bid: ${formatCurrency(
                        getBasePrice(
                          currentPlayer
                        )
                      )}`}
                </small>

              </div>

              {/* -------------------------------- */}
              {/* ADMIN CONTROLS */}
              {/* -------------------------------- */}

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
                  ? 'Choose an unsold player to begin a 5-minute auction.'
                  : 'The next auction player will appear here when the administrator starts the auction.'}
              </p>

            </section>

          )}

        </div>

        {/* ------------------------------------------ */}
        {/* AUCTION HISTORY */}
        {/* ------------------------------------------ */}

        <aside className="glass-card auction-history">

          <div className="section-heading">

            <div>

              <span className="eyebrow">
                LIVE HISTORY
              </span>

              <h2>
                LATEST ACTIVITY
              </h2>

            </div>

          </div>

          <div className="history-list">

            {history.length ? (

              history.map(
                (entry) => {

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

                  return (
                    <div
                      className="history-entry"
                      key={entry.id}
                    >

                      <span
                        className={
                          entry.type === 'sale'
                            ? 'history-icon sale'
                            : 'history-icon'
                        }
                      >
                        {entry.type === 'sale'
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
                            entry.amount || 0
                          )
                        )}
                      </strong>

                    </div>
                  )
                }
              )

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
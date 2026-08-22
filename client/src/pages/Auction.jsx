import { useMemo, useState } from 'react'
import { FaGavel, FaPlay, FaTrophy, FaUserNinja } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useAuction } from '../context/AuctionContext'
import { useAuth } from '../context/AuthContext'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { formatCurrency } from '../utils/formatCurrency'

const BID_INCREMENT = 1000

function Auction() {
  const {
    isAdmin,
    isSuperAdmin,
    isTeamAdmin,
    teamId: assignedTeamId,
  } = useAuth()
  const { players, updatePlayer } = usePlayers()
  const { teams } = useTeams()
  const { auction, selectPlayer, registerBid, recordSale } = useAuction()
  const [selectedTeamId, setSelectedTeamId] =
    useState('')

  const allowedTeamId = isTeamAdmin
    ? assignedTeamId || ''
    : selectedTeamId

  const unsoldPlayers = useMemo(
    () => players.filter((player) => player.status === 'Unsold'),
    [players]
  )
  const currentPlayer = players.find((player) => player.id === auction.currentPlayerId)
  const currentTeam = teams.find((team) => team.id === auction.highestTeamId)

  const getTeamRemainingBudget = (team) =>
    Math.max(
      0,
      Number(team.startingBudget ?? team.budget ?? 100000) -
        players
          .filter((player) => player.status === 'Sold' && player.teamId === team.id)
          .reduce((total, player) => total + Number(player.soldPrice ?? player.basePrice ?? 0), 0)
    )

  const selectedTeam = teams.find(
    (team) => team.id === allowedTeamId
  )
  const nextBid = Number(auction.highestBid || 0) + BID_INCREMENT

  const handleSelectPlayer = (
    player
  ) => {
    if (!isSuperAdmin) return

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

  const handleBid = async () => {
    if (!isAdmin) return

    if (!currentPlayer) {
      return toast.error(
        'Select an unsold player first'
      )
    }

    if (
      isTeamAdmin &&
      !assignedTeamId
    ) {
      return toast.error(
        'No team is assigned to this admin'
      )
    }

    const biddingTeamId =
      isTeamAdmin
        ? assignedTeamId
        : selectedTeamId

    const biddingTeam = teams.find(
      (team) =>
        team.id === biddingTeamId
    )

    if (!biddingTeam) {
      return toast.error(
        'Select a bidding team'
      )
    }

    if (
      getTeamRemainingBudget(
        biddingTeam
      ) < nextBid
    ) {
      return toast.error(
        `${biddingTeam.name} does not have enough budget`
      )
    }

    const result =
      await registerBid(
        biddingTeam.id,
        nextBid
      )

    if (!result?.success) {
      return toast.error(
        result?.error ||
          'Bid could not be placed.'
      )
    }

    toast.success(
      isSuperAdmin
        ? `${biddingTeam.name} bid ${formatCurrency(nextBid)}`
        : `Bid placed · ${formatCurrency(nextBid)}`
    )
  }

  const handleSale = async () => {
    if (!isSuperAdmin) {
      return toast.error(
        'Only the Super Admin can sell players'
      )
    }

    if (
      !currentPlayer ||
      !currentTeam
    ) {
      return toast.error(
        'A valid highest bid is required to sell a player'
      )
    }

    const result =
      await recordSale(
        currentTeam.id,
        auction.highestBid
      )

    if (!result?.success) {
      return toast.error(
        result?.error ||
          'Sale could not be recorded.'
      )
    }

    await updatePlayer({
      ...currentPlayer,
      status: 'Sold',
      teamId: currentTeam.id,
      soldPrice:
        auction.highestBid,
    })

    setSelectedTeamId('')

    toast.success(
      `${currentPlayer.nickname} sold to ${currentTeam.name}`
    )
  }

  const history = auction.history.slice(0, 12)

  return (
    <main className="auction-page auction-final">
      <style>{`
        .auction-page.auction-final {
          --gold: #f3c747;
          --gold-bright: #ffd965;
          --navy-1: #101f39;
          --navy-2: #07101f;
          --line: rgba(150,175,220,.16);
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 28px 0 70px;
          color: #f7f4e9;
        }

        .auction-page.auction-final .auction-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 28px;
          padding: 10px 0 26px;
          margin-bottom: 22px;
          border-bottom: 1px solid var(--line);
        }

        .auction-page.auction-final .auction-heading h1 {
          margin: 0 0 8px;
          font: 800 clamp(4rem, 7vw, 6.5rem)/.82 'Barlow Condensed', sans-serif;
          letter-spacing: -.025em;
          text-transform: uppercase;
          color: #f7f4e9;
          text-shadow: 0 12px 32px rgba(0,0,0,.4);
        }

        .auction-page.auction-final .auction-heading p:not(.eyebrow) {
          margin: 0;
          color: #9ca9bf;
        }


        /* Critical: flatten the wrapper so all three auction sections become grid items. */
        .auction-page.auction-final .auction-layout > .auction-main {
          display: contents !important;
        }

        .auction-page.auction-final .auction-privacy-notice {
          display:flex;
          align-items:center;
          gap:10px;
          margin-top:14px;
          padding:10px 13px;
          border:1px solid rgba(112,157,235,.16);
          border-radius:8px;
          background:rgba(65,105,180,.05);
          color:#9cb5e6;
        }

        .auction-page.auction-final .auction-privacy-notice strong,
        .auction-page.auction-final .auction-privacy-notice span {
          display:block;
        }

        .auction-page.auction-final .auction-privacy-notice strong {
          color:#dce7ff;
          font-size:.68rem;
        }

        .auction-page.auction-final .auction-privacy-notice span {
          margin-top:2px;
          color:#7f91ae;
          font-size:.58rem;
        }

        .auction-page.auction-final .assigned-team-card {
          display:grid;
          gap:5px;
          width:100%;
          box-sizing:border-box;
          padding:13px 14px;
          margin-bottom:12px;
          border:1px solid rgba(243,199,71,.24);
          border-radius:8px;
          background:rgba(243,199,71,.05);
          text-align:left;
        }

        .auction-page.auction-final .assigned-team-card span {
          color:#8d9ab1;
          font-size:.58rem;
          font-weight:900;
          letter-spacing:.09em;
        }

        .auction-page.auction-final .assigned-team-card strong {
          color:#fff;
          font:800 1.5rem/1 'Barlow Condensed',sans-serif;
          text-transform:uppercase;
        }

        .auction-page.auction-final .assigned-team-card small {
          color:#98a5bc;
          font-size:.65rem;
        }

        .auction-page.auction-final .auction-layout {
          display:grid !important;
          grid-template-columns:minmax(250px,.82fr) minmax(440px,1.48fr) minmax(280px,.86fr) !important;
          gap:18px !important;
          align-items:stretch !important;
          width:100%;
          margin-top:22px;
        }

        .auction-page.auction-final .auction-layout > .auction-main > .auction-panel,
        .auction-page.auction-final .auction-layout > .auction-main > .auction-current,
        .auction-page.auction-final .auction-layout > .auction-history {
          min-width:0 !important;
          box-sizing:border-box;
          margin:0 !important;
          border-radius:12px !important;
        }

        /* LEFT */
        .auction-page.auction-final .auction-panel {
          min-height:620px;
          overflow:hidden;
          border:1px solid var(--line);
          background:
            linear-gradient(145deg, rgba(16,30,54,.98), rgba(5,11,22,.99));
          box-shadow:0 18px 50px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.03);
        }

        .auction-page.auction-final .auction-panel .section-heading,
        .auction-page.auction-final .auction-history .section-heading {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          padding:18px 18px 16px;
          border-bottom:1px solid rgba(165,185,220,.10);
          background:rgba(255,255,255,.015);
        }

        .auction-page.auction-final .auction-panel .section-heading h2,
        .auction-page.auction-final .auction-history .section-heading h2 {
          margin:3px 0 0;
          font:800 1.4rem/1 'Barlow Condensed', sans-serif;
          text-transform:uppercase;
          letter-spacing:.025em;
        }

        .auction-page.auction-final .counter {
          color:#8492aa;
          font-size:.68rem;
          padding-top:4px;
        }

        .auction-page.auction-final .auction-player-list {
          max-height:540px;
          overflow:auto;
          padding:10px;
        }

        .auction-page.auction-final .auction-player {
          width:100%;
          min-height:66px;
          display:flex;
          align-items:center;
          gap:11px;
          margin-bottom:6px;
          padding:10px;
          color:#e7edf8;
          border:1px solid transparent;
          border-radius:9px;
          background:transparent;
          cursor:pointer;
          text-align:left;
          transition:.18s ease;
        }

        .auction-page.auction-final .auction-player:hover,
        .auction-page.auction-final .auction-player.active {
          transform:translateX(2px);
          border-color:rgba(243,199,71,.36);
          background:linear-gradient(90deg,rgba(243,199,71,.10),rgba(243,199,71,.015));
        }

        .auction-page.auction-final .auction-player > img,
        .auction-page.auction-final .auction-player-icon {
          width:45px;
          height:45px;
          flex:0 0 45px;
          display:grid;
          place-items:center;
          overflow:hidden;
          border-radius:8px;
          color:var(--gold);
          background:#102343;
        }

        .auction-page.auction-final .auction-player > img { object-fit:cover; }

        .auction-page.auction-final .auction-player strong {
          display:block;
          color:#f4f7fb;
          font-size:.84rem;
        }

        .auction-page.auction-final .auction-player small {
          display:block;
          margin-top:3px;
          color:#8d9ab0;
          font-size:.67rem;
        }

        .auction-page.auction-final .empty-state-text {
          margin:0;
          padding:28px 18px;
          color:#8997ae;
          line-height:1.6;
          font-size:.82rem;
        }

        /* CENTER */
        .auction-page.auction-final .auction-current {
          position:relative;
          min-height:620px !important;
          height:100% !important;
          display:flex !important;
          flex-direction:column !important;
          align-items:center !important;
          justify-content:center !important;
          padding:34px 30px !important;
          overflow:hidden;
          text-align:center !important;
          border:1px solid rgba(243,199,71,.26);
          background:
            radial-gradient(circle at 50% 0, rgba(46,110,218,.24), transparent 40%),
            radial-gradient(circle at 50% 85%, rgba(243,199,71,.08), transparent 35%),
            linear-gradient(145deg,#12243f,#050b16 84%);
          box-shadow:0 24px 65px rgba(0,0,0,.32), inset 0 1px rgba(255,255,255,.04);
        }

        .auction-page.auction-final .auction-current::before {
          content:"";
          position:absolute;
          width:360px;
          height:360px;
          top:-125px;
          left:50%;
          transform:translateX(-50%);
          border-radius:50%;
          background:rgba(38,108,224,.11);
          filter:blur(38px);
          pointer-events:none;
        }

        .auction-page.auction-final .auction-current.auction-empty {
          gap:4px;
        }

        .auction-page.auction-final .auction-current.auction-empty::after {
          content:"WAITING FOR NEXT LOT";
          position:relative;
          order:-1;
          margin-bottom:18px;
          padding:5px 10px;
          color:#161208;
          background:var(--gold);
          border-radius:5px;
          font-size:9px;
          font-weight:950;
          letter-spacing:.15em;
        }

        .auction-page.auction-final .auction-current.auction-empty > svg {
          position:relative;
          z-index:1;
          width:78px;
          height:78px;
          margin:0 0 14px;
          padding:22px;
          box-sizing:border-box;
          color:var(--gold);
          border:1px solid rgba(243,199,71,.25);
          border-radius:50%;
          background:rgba(243,199,71,.07);
        }

        .auction-page.auction-final .auction-current.auction-empty h2 {
          position:relative;
          z-index:1;
          margin:0 0 8px;
          color:#f7f4e9;
          font:800 clamp(2.5rem,4.5vw,4.2rem)/.9 'Barlow Condensed',sans-serif;
          text-transform:uppercase;
        }

        .auction-page.auction-final .auction-current.auction-empty p {
          position:relative;
          z-index:1;
          max-width:360px;
          margin:0;
          color:#8f9cb2;
          line-height:1.6;
        }

        .auction-page.auction-final .current-player {
          position:relative;
          z-index:2;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:8px;
        }

        .auction-page.auction-final .current-player > img,
        .auction-page.auction-final .current-player-placeholder {
          width:165px !important;
          height:165px !important;
          flex:0 0 165px;
          display:grid;
          place-items:center;
          overflow:hidden;
          border:2px solid rgba(243,199,71,.7);
          border-radius:50%;
          color:var(--gold);
          background:#10264a;
          box-shadow:
            0 0 0 7px rgba(243,199,71,.045),
            0 0 0 14px rgba(243,199,71,.018),
            0 0 55px rgba(38,110,224,.30);
        }

        .auction-page.auction-final .current-player > img { object-fit:cover; }

        .auction-page.auction-final .current-player-placeholder { font-size:3.8rem; }

        .auction-page.auction-final .current-player .eyebrow {
          margin-top:16px;
          margin-bottom:1px;
        }

        .auction-page.auction-final .current-player h2 {
          margin:0;
          color:#fff;
          font:800 clamp(3.5rem,6vw,5.4rem)/.86 'Barlow Condensed',sans-serif;
          text-transform:uppercase;
          text-shadow:0 10px 30px rgba(0,0,0,.4);
        }

        .auction-page.auction-final .current-player p {
          margin:7px 0 0;
          color:#9da9bd;
        }

        .auction-page.auction-final .auction-bid-display {
          position:relative;
          z-index:2;
          width:min(100%,410px) !important;
          margin:24px auto 18px !important;
          padding:19px 22px 18px !important;
          border:1px solid rgba(243,199,71,.31);
          border-radius:10px;
          background:linear-gradient(145deg,rgba(243,199,71,.085),rgba(0,0,0,.23));
          box-shadow:0 15px 35px rgba(0,0,0,.20);
        }

        .auction-page.auction-final .auction-bid-display span {
          display:block;
          color:#8d9ab1;
          font-size:.67rem;
          font-weight:800;
          letter-spacing:.10em;
        }

        .auction-page.auction-final .auction-bid-display strong {
          display:block;
          margin:6px 0;
          color:var(--gold-bright);
          font:800 clamp(3rem,5vw,4.5rem)/.9 'Barlow Condensed',sans-serif;
          text-shadow:0 0 26px rgba(243,199,71,.18);
        }

        .auction-page.auction-final .auction-bid-display small {
          color:#91a0b7;
        }

        .auction-page.auction-final .auction-controls {
          position:relative;
          z-index:2;
          width:min(100%,410px) !important;
        }

        .auction-page.auction-final .auction-controls label {
          text-align:left;
        }

        .auction-page.auction-final .auction-controls select {
          width:100%;
          min-height:46px;
          color:#f7f4e9;
          background:#071120;
          border:1px solid rgba(165,185,220,.22);
          border-radius:7px;
        }

        .auction-page.auction-final .auction-control-actions {
          display:grid;
          grid-template-columns:1.2fr .8fr;
          gap:10px;
          margin-top:12px;
        }

        .auction-page.auction-final .auction-control-actions .button {
          min-height:51px;
          border-radius:8px;
        }

        .auction-page.auction-final .auction-control-actions .button:first-child {
          background:linear-gradient(135deg,#ffe27b,#c48a21);
        }

        .auction-page.auction-final .auction-control-actions .button:last-child {
          background:linear-gradient(135deg,#ffed99,#d39a28);
        }

        /* RIGHT */
        .auction-page.auction-final .auction-history {
          min-height:620px !important;
          height:100% !important;
          overflow:hidden;
          border:1px solid var(--line);
          background:linear-gradient(145deg,rgba(16,30,54,.98),rgba(5,11,22,.99));
          box-shadow:0 18px 50px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.03);
        }

        .auction-page.auction-final .auction-history .history-list {
          height:544px !important;
          max-height:544px !important;
          overflow:auto;
          padding:10px 12px 14px;
        }

        .auction-page.auction-final .auction-history .history-entry {
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          gap:9px;
          align-items:start;
          padding:11px 7px;
          border-bottom:1px solid rgba(165,185,220,.07);
        }

        .auction-page.auction-final .auction-history .history-icon {
          padding:4px 6px;
          border-radius:4px;
          font-size:8px;
          font-weight:900;
        }

        .auction-page.auction-final .auction-history .history-entry div {
          min-width:0;
        }

        .auction-page.auction-final .auction-history .history-entry div strong,
        .auction-page.auction-final .auction-history .history-entry div span {
          display:block;
        }

        .auction-page.auction-final .auction-history .history-entry div strong {
          color:#eef2f8;
          font-size:.79rem;
        }

        .auction-page.auction-final .auction-history .history-entry div span {
          margin-top:2px;
          color:#8d9ab1;
          font-size:.68rem;
        }

        .auction-page.auction-final .auction-history .history-entry > strong:last-child {
          color:var(--gold);
          white-space:nowrap;
          font-size:.79rem;
        }

        @media (max-width:1080px) {
          .auction-page.auction-final .auction-layout {
            grid-template-columns:1fr 1fr !important;
          }

          .auction-page.auction-final .auction-layout > .auction-history {
            grid-column:1 / -1;
            min-height:420px !important;
          }

          .auction-page.auction-final .auction-history .history-list {
            height:330px !important;
            max-height:330px !important;
          }
        }

        @media (max-width:640px) {
          .auction-page.auction-final {
            padding-top:18px;
          }

          .auction-page.auction-final .auction-heading {
            align-items:stretch;
            flex-direction:column;
          }

          .auction-page.auction-final .auction-timer {
            width:100%;
          }

          .auction-page.auction-final .auction-layout {
            grid-template-columns:1fr !important;
          }

          .auction-page.auction-final .auction-layout > .auction-history {
            grid-column:auto;
          }

          .auction-page.auction-final .auction-panel,
          .auction-page.auction-final .auction-current,
          .auction-page.auction-final .auction-history,
          .auction-page.auction-final .auction-current.auction-empty {
            min-height:auto !important;
          }

          .auction-page.auction-final .auction-current {
            padding:34px 18px !important;
          }

          .auction-page.auction-final .current-player > img,
          .auction-page.auction-final .current-player-placeholder {
            width:130px !important;
            height:130px !important;
            flex-basis:130px;
          }

          .auction-page.auction-final .current-player h2 {
            font-size:3.5rem;
          }

          .auction-page.auction-final .auction-control-actions {
            grid-template-columns:1fr;
          }
        }
`}</style>

      <header className="auction-heading">
        <div>
          <p className="eyebrow">SBT Major · Live Control Room</p>
          <h1>Live Auction</h1>
          <p>Nominate players, accept bids, and finalize auction sales in real time.</p>
        </div>
      </header>

      {!isAdmin && (
        <section className="glass-card auction-viewer-notice">
          <FaUserNinja />
          <div>
            <strong>Viewer Mode</strong>
            <span>Auction controls are available to tournament administrators only.</span>
          </div>
        </section>
      )}

      <section className="glass-card auction-privacy-notice">
        <FaUserNinja />
        <div>
          <strong>Anonymous Bidding</strong>
          <span>
            Other teams cannot see who is bidding. Only the Super Admin can
            see the bidding team.
          </span>
        </div>
      </section>

      <section className="auction-layout">
        <div className="auction-main">
          <section className="glass-card auction-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">AVAILABLE PLAYERS</span>
                <h2>Unsold Players</h2>
              </div>
              <span className="counter">{unsoldPlayers.length} available</span>
            </div>

            <div className="auction-player-list">
              {unsoldPlayers.length ? (
                unsoldPlayers.map((player) => (
                  <button
                    className={currentPlayer?.id === player.id ? 'auction-player active' : 'auction-player'}
                    type="button"
                    onClick={() => handleSelectPlayer(player)}
                    disabled={!isAdmin}
                    key={player.id}
                  >
                    {player.photo ? (
                      <img src={player.photo} alt={player.nickname} />
                    ) : (
                      <span className="auction-player-icon"><FaUserNinja /></span>
                    )}
                    <span>
                      <strong>{player.nickname}</strong>
                      <small>{player.role} · {formatCurrency(player.basePrice)}</small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="empty-state-text">Every player has been sold.</p>
              )}
            </div>
          </section>

          {currentPlayer ? (
            <section className="glass-card auction-current">
              <div className="current-player">
                {currentPlayer.photo ? (
                  <img src={currentPlayer.photo} alt={currentPlayer.nickname} />
                ) : (
                  <div className="current-player-placeholder"><FaUserNinja /></div>
                )}
                <div>
                  <span className="eyebrow">CURRENT PLAYER</span>
                  <h2>{currentPlayer.nickname}</h2>
                  <p>{currentPlayer.realName} · {currentPlayer.role}</p>
                </div>
              </div>

              <div className="auction-bid-display">
                <span>CURRENT HIGHEST BID</span>
                <strong>{formatCurrency(auction.highestBid)}</strong>
                <small>{currentTeam ? `Leading: ${currentTeam.name}` : 'Awaiting opening bid'}</small>
              </div>

              {isAdmin && (
                <div className="auction-controls">
                  {isTeamAdmin ? (
                    <div className="assigned-team-card">
                      <span>YOUR TEAM</span>
                      <strong>
                        {selectedTeam?.name ||
                          'No team assigned'}
                      </strong>
                      <small>
                        {selectedTeam
                          ? `Remaining Budget · ${formatCurrency(
                              getTeamRemainingBudget(
                                selectedTeam
                              )
                            )}`
                          : 'Contact Super Admin for a team assignment'}
                      </small>
                    </div>
                  ) : (
                    <label>
                      Bid for team
                      <select
                        value={selectedTeamId}
                        onChange={(event) =>
                          setSelectedTeamId(
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Select a team
                        </option>

                        {teams.map((team) => (
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
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="auction-control-actions">
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={handleBid}
                      disabled={
                        isTeamAdmin &&
                        !selectedTeam
                      }
                    >
                      <FaGavel />
                      Increase Bid +
                      {formatCurrency(
                        BID_INCREMENT
                      )}
                    </button>

                    {isSuperAdmin && (
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={handleSale}
                      >
                        <FaTrophy />
                        Sell Player
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="glass-card auction-current auction-empty">
              <FaPlay />
              <h2>Select a player</h2>
              <p>
                {isAdmin
                  ? 'Choose an unsold player to begin a 30-second auction.'
                  : 'The next auction player will appear here when the administrator starts the auction.'}
              </p>
            </section>
          )}
        </div>

        <aside className="glass-card auction-history">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LIVE HISTORY</span>
              <h2>Latest Activity</h2>
            </div>
          </div>

          <div className="history-list">
            {history.length ? (
              history.map((entry) => {
                const player = players.find((item) => item.id === entry.playerId)
                const team = teams.find((item) => item.id === entry.teamId)
                return (
                  <div className="history-entry" key={entry.id}>
                    <span className={entry.type === 'sale' ? 'history-icon sale' : 'history-icon'}>
                      {entry.type === 'sale' ? 'Sold' : 'Bid'}
                    </span>
                    <div>
                      <strong>{player?.nickname || 'Player'}</strong>
                      <span>
                        {entry.type === 'sale'
                          ? 'sold to'
                          : 'bid by'}{' '}
                        {isSuperAdmin
                          ? team?.name || 'Team'
                          : 'Anonymous Team'}
                      </span>
                    </div>
                    <strong>{formatCurrency(entry.amount)}</strong>
                  </div>
                )
              })
            ) : (
              <p className="empty-state-text">No bids have been recorded.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default Auction
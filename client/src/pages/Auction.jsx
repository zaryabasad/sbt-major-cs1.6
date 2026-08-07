import { useMemo, useState } from 'react'
import { FaGavel, FaPlay, FaTrophy, FaUserNinja } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useAuction } from '../context/AuctionContext'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { formatCurrency } from '../utils/formatCurrency'

const BID_INCREMENT = 1000

function Auction() {
  const { players, updatePlayer } = usePlayers()
  const { teams } = useTeams()
  const { auction, selectPlayer, registerBid, recordSale } = useAuction()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const unsoldPlayers = useMemo(() => players.filter((player) => player.status === 'Unsold'), [players])
  const currentPlayer = players.find((player) => player.id === auction.currentPlayerId)
  const currentTeam = teams.find((team) => team.id === auction.highestTeamId)
  const getTeamRemainingBudget = (team) => Math.max(0, Number(team.startingBudget ?? team.budget ?? 100000) - players.filter((player) => player.status === 'Sold' && player.teamId === team.id).reduce((total, player) => total + Number(player.soldPrice ?? player.basePrice ?? 0), 0))
  const selectedTeam = teams.find((team) => team.id === selectedTeamId)
  const nextBid = auction.highestBid + BID_INCREMENT

  const handleSelectPlayer = (player) => {
  selectPlayer(player)

  if (teams.length > 0) {
    setSelectedTeamId(teams[0].id)
  } else {
    setSelectedTeamId('')
  }

  toast.success(`${player.nickname} is now on the block`)

  }
  const handleBid = () => {
    if (!currentPlayer) return toast.error('Select an unsold player first')
    if (!selectedTeam) return toast.error('Select a bidding team')
    if (getTeamRemainingBudget(selectedTeam) < nextBid) return toast.error(`${selectedTeam.name} does not have enough budget`)
    registerBid(selectedTeam.id, nextBid)
    toast.success(`${selectedTeam.name} bid ${formatCurrency(nextBid)}`)
  }
  const handleSale = () => {
    if (!currentPlayer || !currentTeam) return toast.error('A valid highest bid is required to sell a player')
    updatePlayer({ ...currentPlayer, status: 'Sold', teamId: currentTeam.id, soldPrice: auction.highestBid })
    recordSale(currentTeam.id, auction.highestBid)
    setSelectedTeamId('')
    toast.success(`${currentPlayer.nickname} sold to ${currentTeam.name}`)
  }
  const history = auction.history.slice(0, 12)

  return <section className="auction-page"><header className="auction-heading"><div><p className="eyebrow">SBT Major · Live Control Room</p><h1>Live Auction</h1><p>Nominate players, accept bids, and finalize auction sales in real time.</p></div><div className={`auction-timer ${auction.timeRemaining <= 10 ? 'timer-warning' : ''}`}><span>Time Remaining</span><strong>
  {String(Math.floor(auction.timeRemaining / 60)).padStart(2, '0')}:
  {String(auction.timeRemaining % 60).padStart(2, '0')}
</strong></div></header><div className="auction-layout"><section className="auction-panel player-pool glass-card"><div className="panel-title"><FaUserNinja /><div><h2>Unsold Players</h2><span>{unsoldPlayers.length} available</span></div></div><div className="auction-player-list">{unsoldPlayers.length ? unsoldPlayers.map((player) => <button className={currentPlayer?.id === player.id ? 'auction-player active' : 'auction-player'} type="button" onClick={() => handleSelectPlayer(player)} key={player.id}><span className="auction-player-avatar">{player.photo ? <img src={player.photo} alt="" /> : <FaUserNinja />}</span><span><strong>{player.nickname}</strong><small>{player.role} · {formatCurrency(player.basePrice)}</small></span><FaPlay /></button>) : <p className="auction-empty">Every player has been sold.</p>}</div></section><section className="auction-panel current-lot glass-card">{currentPlayer ? <><div className="current-player-photo">{currentPlayer.photo ? <img src={currentPlayer.photo} alt={currentPlayer.realName} /> : <FaUserNinja />}</div><p className="eyebrow">Current Player</p><h2>{currentPlayer.nickname}</h2><p className="current-real-name">{currentPlayer.realName} · {currentPlayer.role}</p><div className="bid-display"><span>Current Highest Bid</span><strong>{formatCurrency(auction.highestBid)}</strong><small>{currentTeam ? `Leading: ${currentTeam.name}` : 'Awaiting opening bid'}</small></div><div className="auction-actions"><label>Bid for team<select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}><option value="">Select a team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {formatCurrency(getTeamRemainingBudget(team))}</option>)}</select></label><button className="button button-primary" type="button" onClick={handleBid}><FaGavel /> Increase Bid +{formatCurrency(BID_INCREMENT)}</button><button className="button auction-sell-button" type="button" onClick={handleSale}><FaTrophy /> Sell Player</button></div></> : <div className="auction-empty-current"><FaGavel /><h2>Select a player</h2><p>Choose an unsold player to begin a 30-second auction.</p></div>}</section><aside className="auction-panel auction-history glass-card"><div className="panel-title"><FaTrophy /><div><h2>Live History</h2><span>Latest activity</span></div></div>{history.length ? <ol>{history.map((entry) => { const player = players.find((item) => item.id === entry.playerId); const team = teams.find((item) => item.id === entry.teamId); return <li key={entry.id}><span className={entry.type === 'sale' ? 'history-icon sale' : 'history-icon'}>{entry.type === 'sale' ? 'Sold' : 'Bid'}</span><p><strong>{player?.nickname || 'Player'}</strong> {entry.type === 'sale' ? 'sold to' : 'bid by'} <strong>{team?.name || 'Team'}</strong><small>{formatCurrency(entry.amount)}</small></p></li>})}</ol> : <p className="auction-empty">No bids have been recorded.</p>}</aside></div></section>
}

export default Auction

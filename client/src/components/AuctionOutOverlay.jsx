import { useEffect, useRef, useState } from 'react'
import { FaBan, FaGavel } from 'react-icons/fa'
import toast from 'react-hot-toast'

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAuction } from '../context/AuctionContext'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'

function AuctionOutOverlay() {
  const { user, isTeamAdmin, isSuperAdmin, teamId } = useAuth()
  const { auction, recordSale } = useAuction()
  const { players, updatePlayer } = usePlayers()
  const { teams } = useTeams()
  const [outTeamIds, setOutTeamIds] = useState([])
  const [busy, setBusy] = useState(false)
  const autoSaleBusyRef = useRef(false)

  const playerId = auction.currentPlayerId || ''
  const currentPlayer = players.find(
    (player) => String(player.id) === String(playerId)
  )

  useEffect(() => {
    let cancelled = false

    const loadOutTeams = async () => {
      if (!playerId) {
        if (!cancelled) setOutTeamIds([])
        return
      }

      const { data, error } = await supabase
        .from('auction_team_out')
        .select('team_id')
        .eq('player_id', playerId)

      if (error) {
        console.error('AUCTION OUT TEAMS LOAD ERROR:', error)
        if (!cancelled) setOutTeamIds([])
        return
      }

      if (!cancelled) {
        setOutTeamIds((data || []).map((row) => String(row.team_id)))
      }
    }

    void loadOutTeams()
    const timer = window.setInterval(loadOutTeams, 1000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [playerId])

  useEffect(() => {
    if (
      !isSuperAdmin ||
      !playerId ||
      !currentPlayer ||
      !auction.highestTeamId ||
      Number(auction.highestBid || 0) <= 0 ||
      teams.length < 2 ||
      autoSaleBusyRef.current
    ) {
      return undefined
    }

    const remainingTeams = teams.filter(
      (team) => !outTeamIds.includes(String(team.id))
    )

    if (remainingTeams.length !== 1) {
      return undefined
    }

    const winningTeam = remainingTeams[0]

    if (
      String(winningTeam.id) !==
      String(auction.highestTeamId)
    ) {
      return undefined
    }

    autoSaleBusyRef.current = true

    const finalizeAutomaticSale = async () => {
      const soldPrice = Number(auction.highestBid || 0)

      try {
        const saleResult = await recordSale(
          winningTeam.id,
          soldPrice
        )

        if (!saleResult?.success) {
          throw new Error(
            saleResult?.error || 'Automatic sale could not be recorded.'
          )
        }

        await updatePlayer({
          ...currentPlayer,
          status: 'Sold',
          teamId: winningTeam.id,
          soldPrice,
        })

        toast.success(
          `${winningTeam.name} wins automatically · ${soldPrice.toLocaleString()}`
        )
      } catch (error) {
        console.error('AUTOMATIC SALE ERROR:', error)
        toast.error(
          error?.message ||
            'Automatic sale could not be completed.'
        )
      } finally {
        autoSaleBusyRef.current = false
      }
    }

    void finalizeAutomaticSale()

    return undefined
  }, [
    isSuperAdmin,
    playerId,
    currentPlayer,
    auction.highestTeamId,
    auction.highestBid,
    outTeamIds,
    teams,
    recordSale,
    updatePlayer,
  ])

  const isOwnTeamOut = Boolean(
    teamId && outTeamIds.includes(String(teamId))
  )

  const isLeadingTeam = Boolean(
    teamId &&
    auction.highestTeamId &&
    String(auction.highestTeamId) === String(teamId)
  )

  const canOut = Boolean(
    user &&
    isTeamAdmin &&
    teamId &&
    playerId &&
    !isOwnTeamOut &&
    !isLeadingTeam
  )

  const outTeams = teams.filter((team) =>
    outTeamIds.includes(String(team.id))
  )

  const handleOut = async () => {
    if (!canOut || busy) return

    setBusy(true)

    try {
      // Always verify the latest bid from Supabase before allowing OUT.
      // This prevents a stale browser from letting the current highest
      // bidder mark itself OUT after another team has bid.
      const { data: latestBid, error: latestBidError } = await supabase
        .from('auction_history')
        .select('team_id, amount, type, created_at')
        .eq('player_id', playerId)
        .eq('type', 'bid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestBidError) {
        throw new Error(
          latestBidError.message ||
            'Could not verify the current highest bid.'
        )
      }

      if (
        latestBid?.team_id &&
        String(latestBid.team_id) === String(teamId)
      ) {
        toast.error('Highest bidder cannot mark itself OUT.')
        return
      }

      const { error } = await supabase
        .from('auction_team_out')
        .insert({
          player_id: playerId,
          team_id: teamId,
        })

      if (error) {
        if (String(error.code) === '23505') {
          setOutTeamIds((current) => [
            ...new Set([...current, String(teamId)]),
          ])
          toast('Your team is already OUT for this player.')
          return
        }

        throw new Error(
          error.message || 'Could not mark your team OUT.'
        )
      }

      setOutTeamIds((current) => [
        ...new Set([...current, String(teamId)]),
      ])
      toast.success('Your team is OUT of this bid.')
    } catch (error) {
      console.error('AUCTION TEAM OUT ERROR:', error)
      toast.error(
        error?.message || 'Could not mark your team OUT.'
      )
    } finally {
      setBusy(false)
    }
  }

  if (!playerId || !user) return null

  return (
    <>
      <style>{`
        .auction-out-overlay {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 1200;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(243,199,71,.24);
          border-radius: 10px;
          background: rgba(5,11,22,.94);
          box-shadow: 0 16px 40px rgba(0,0,0,.38);
          backdrop-filter: blur(10px);
        }

        .auction-out-status span,
        .auction-out-status strong {
          display: block;
        }

        .auction-out-status span {
          color: #8492aa;
          font-size: .5rem;
          font-weight: 900;
          letter-spacing: .09em;
        }

        .auction-out-status strong {
          margin-top: 3px;
          color: #f7f4e9;
          font-size: .72rem;
        }

        .auction-out-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 13px;
          border: 1px solid rgba(255,82,100,.3);
          border-radius: 7px;
          color: #fff;
          background: linear-gradient(135deg,#7d1827,#4b0d18);
          font-size: .6rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .auction-out-button:hover:not(:disabled) {
          border-color: rgba(255,82,100,.55);
          background: linear-gradient(135deg,#9b1f31,#5b0f1c);
        }

        .auction-out-button:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .auction-out-leader {
          color: #f3c747;
          font-size: .57rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .auction-out-done {
          color: #ff7888;
          font-size: .57rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .auction-out-private-status {
          color: #8f9cb2;
          font-size: .56rem;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .auction-out-superadmin {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 220px;
        }

        .auction-out-superadmin-label {
          color: #f3c747;
          font-size: .58rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .auction-out-superadmin-list {
          color: #f7f4e9;
          font-size: .65rem;
          font-weight: 800;
        }

        .auction-out-superadmin-empty {
          color: #8f9cb2;
          font-size: .58rem;
          font-weight: 800;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        @media (max-width: 640px) {
          .auction-out-overlay {
            left: 12px;
            right: 12px;
            bottom: 12px;
            justify-content: space-between;
          }

          .auction-out-button {
            min-width: 112px;
          }

          .auction-out-superadmin {
            min-width: 0;
            flex: 1;
          }
        }
      `}</style>

      <div className="auction-out-overlay">
        {isTeamAdmin && (
          <>
            {isOwnTeamOut ? (
              <span className="auction-out-done">You are OUT</span>
            ) : isLeadingTeam ? (
              <span className="auction-out-leader">Leading bid · OUT blocked</span>
            ) : (
              <button
                className="auction-out-button"
                type="button"
                disabled={!canOut || busy}
                onClick={handleOut}
              >
                <FaBan />
                {busy ? 'Checking…' : 'OUT'}
              </button>
            )}
          </>
        )}

        {isSuperAdmin && (
          <div className="auction-out-superadmin">
            <span className="auction-out-superadmin-label">OUT TEAMS</span>
            {outTeams.length > 0 ? (
              <span className="auction-out-superadmin-list">
                {outTeams.map((team) => team.name).join(' • ')}
              </span>
            ) : (
              <span className="auction-out-superadmin-empty">No teams OUT yet</span>
            )}
          </div>
        )}

        {!isTeamAdmin && !isSuperAdmin && (
          <FaGavel aria-hidden="true" />
        )}
      </div>
    </>
  )
}

export default AuctionOutOverlay

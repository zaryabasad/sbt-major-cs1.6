import { useEffect, useState } from 'react'
import { FaBan, FaGavel } from 'react-icons/fa'
import toast from 'react-hot-toast'

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAuction } from '../context/AuctionContext'
import { useTeams } from '../context/TeamsContext'

function AuctionOutOverlay() {
  const { user, isTeamAdmin, isSuperAdmin, teamId } = useAuth()
  const { auction } = useAuction()
  const { teams } = useTeams()

  const [outTeamIds, setOutTeamIds] = useState([])
  const [busy, setBusy] = useState(false)

  const playerId = auction.currentPlayerId || ''

  const loadOutStatus = async () => {
    if (!playerId) {
      setOutTeamIds([])
      return
    }

    const { data, error } = await supabase
      .from('auction_team_out')
      .select('team_id')
      .eq('player_id', playerId)

    if (error) {
      console.error('AUCTION OUT STATUS LOAD ERROR:', error)
      return
    }

    setOutTeamIds(
      (data || []).map((row) => String(row.team_id))
    )
  }

  useEffect(() => {
    void loadOutStatus()

    if (!playerId) return undefined

    const timer = window.setInterval(
      loadOutStatus,
      1000
    )

    return () => {
      window.clearInterval(timer)
    }
  }, [playerId])

  const isOwnTeamOut = Boolean(
    teamId &&
    outTeamIds.includes(String(teamId))
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

    const { error } = await supabase
      .from('auction_team_out')
      .insert({
        player_id: playerId,
        team_id: teamId,
      })

    setBusy(false)

    if (error) {
      if (String(error.code) === '23505') {
        setOutTeamIds((current) =>
          current.includes(String(teamId))
            ? current
            : [...current, String(teamId)]
        )

        toast('Your team is already OUT for this player.')
        return
      }

      console.error('AUCTION TEAM OUT ERROR:', error)
      toast.error(
        error.message ||
          'Could not mark your team OUT.'
      )
      return
    }

    setOutTeamIds((current) =>
      current.includes(String(teamId))
        ? current
        : [...current, String(teamId)]
    )

    toast.success('Your team is OUT of this bid.')
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
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(243,199,71,.24);
          border-radius: 10px;
          background: rgba(5,11,22,.96);
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
          color: #f3c747;
          font-size: .58rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .auction-out-teams {
          max-width: 360px;
        }

        .auction-out-teams-label {
          display: block;
          margin-bottom: 4px;
          color: #8492aa;
          font-size: .5rem;
          font-weight: 900;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .auction-out-teams-list {
          color: #ff7888;
          font-size: .68rem;
          font-weight: 900;
        }

        .auction-out-none {
          color: #8f9cb2;
          font-size: .62rem;
          font-weight: 800;
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

          .auction-out-teams {
            max-width: 220px;
          }
        }
      `}</style>

      <div className="auction-out-overlay">
        {isSuperAdmin && (
          <>
            <div className="auction-out-teams">
              <span className="auction-out-teams-label">
                OUT TEAMS
              </span>

              {outTeams.length > 0 ? (
                <div className="auction-out-teams-list">
                  {outTeams
                    .map((team) => team.name)
                    .join(' • ')}
                </div>
              ) : (
                <div className="auction-out-none">
                  No teams OUT yet
                </div>
              )}
            </div>
          </>
        )}

        {isTeamAdmin && (
          <>
            {isOwnTeamOut ? (
              <span className="auction-out-done">
                You are OUT
              </span>
            ) : isLeadingTeam ? (
              <span className="auction-out-leader">
                Leading bid
              </span>
            ) : (
              <button
                className="auction-out-button"
                type="button"
                disabled={!canOut || busy}
                onClick={handleOut}
              >
                <FaBan />
                {busy ? 'Marking OUT…' : 'OUT'}
              </button>
            )}
          </>
        )}

        {!isTeamAdmin && !isSuperAdmin && (
          <FaGavel aria-hidden="true" />
        )}
      </div>
    </>
  )
}

export default AuctionOutOverlay

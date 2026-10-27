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
        return
      }

      if (!cancelled) {
        setOutTeamIds(
          (data || []).map((row) => String(row.team_id))
        )
      }
    }

    void loadOutTeams()

    const timer = window.setInterval(
      loadOutTeams,
      1000
    )

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [playerId])

  const isOwnTeamOut =
    Boolean(teamId) &&
    outTeamIds.includes(String(teamId))

  const isLeadingTeam =
    Boolean(teamId) &&
    Boolean(auction.highestTeamId) &&
    String(auction.highestTeamId) === String(teamId)

  const canOut =
    Boolean(user) &&
    isTeamAdmin &&
    Boolean(teamId) &&
    Boolean(playerId) &&
    !isOwnTeamOut &&
    !isLeadingTeam

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
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        border: '1px solid rgba(243,199,71,.25)',
        borderRadius: 10,
        background: 'rgba(5,11,22,.97)',
        boxShadow: '0 16px 40px rgba(0,0,0,.4)',
      }}
    >
      {isSuperAdmin && (
        <div>
          <div
            style={{
              color: '#8492aa',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.09em',
            }}
          >
            OUT TEAMS
          </div>

          <div
            style={{
              marginTop: 4,
              color: outTeams.length
                ? '#ff7888'
                : '#8f9cb2',
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {outTeams.length
              ? outTeams
                  .map((team) => team.name)
                  .join(' • ')
              : 'No teams OUT yet'}
          </div>
        </div>
      )}

      {isTeamAdmin && (
        <>
          {isOwnTeamOut ? (
            <span
              style={{
                color: '#ff7888',
                fontSize: 10,
                fontWeight: 900,
              }}
            >
              YOU ARE OUT
            </span>
          ) : isLeadingTeam ? (
            <span
              style={{
                color: '#f3c747',
                fontSize: 10,
                fontWeight: 900,
              }}
            >
              LEADING BID
            </span>
          ) : (
            <button
              type="button"
              disabled={!canOut || busy}
              onClick={handleOut}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                minHeight: 40,
                padding: '0 14px',
                border: '1px solid rgba(255,82,100,.3)',
                borderRadius: 7,
                color: '#fff',
                background:
                  'linear-gradient(135deg,#7d1827,#4b0d18)',
                fontSize: 10,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              <FaBan />
              {busy ? 'MARKING OUT...' : 'OUT'}
            </button>
          )}
        </>
      )}

      {!isTeamAdmin && !isSuperAdmin && (
        <FaGavel />
      )}
    </div>
  )
}

export default AuctionOutOverlay

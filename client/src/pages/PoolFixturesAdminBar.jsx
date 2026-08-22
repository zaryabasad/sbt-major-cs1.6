import { useState } from 'react'
import { FaRandom, FaTrash } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useFixtures } from '../context/FixturesContext'
import PoolFixtures from './PoolFixtures'

function PoolFixturesAdminBar() {
  const { fixtures, replaceFixtures } = useFixtures()
  const { isSuperAdmin } = useAuth()
  const [clearingPool, setClearingPool] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  const poolFixtures = fixtures.filter(
    (fixture) => String(fixture.pool || '').trim() === 'A-B',
  )

  const clearPool = async () => {
    if (!isSuperAdmin || clearingPool) return

    if (poolFixtures.length === 0) {
      toast.error('There are no pool fixtures to clear')
      return
    }

    const confirmed = window.confirm(
      `Clear all ${poolFixtures.length} pool fixtures?`,
    )

    if (!confirmed) return

    setClearingPool(true)

    try {
      const remaining = fixtures.filter(
        (fixture) => String(fixture.pool || '').trim() !== 'A-B',
      )

      await replaceFixtures(remaining)
      toast.success('Pool fixtures cleared')
    } catch (error) {
      toast.error(error?.message || 'Failed to clear pool fixtures')
    } finally {
      setClearingPool(false)
    }
  }

  const clearAll = async () => {
    if (!isSuperAdmin || clearingAll) return

    if (fixtures.length === 0) {
      toast.error('There are no fixtures to clear')
      return
    }

    const confirmed = window.confirm(
      `Clear all ${fixtures.length} fixtures?`,
    )

    if (!confirmed) return

    setClearingAll(true)

    try {
      await replaceFixtures([])
      toast.success('All fixtures cleared')
    } catch (error) {
      toast.error(error?.message || 'Failed to clear fixtures')
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <>
      {isSuperAdmin && (
        <div
          style={{
            position: 'sticky',
            top: 10,
            zIndex: 30,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 12,
            padding: '8px 0',
          }}
        >
          <button
            className="button button-secondary"
            type="button"
            onClick={clearPool}
            disabled={clearingPool}
            title="Clear only Pool A vs Pool B fixtures"
          >
            <FaTrash />
            {clearingPool ? 'Clearing Pool…' : 'Clear Pool'}
          </button>

          <button
            className="button button-secondary"
            type="button"
            onClick={clearAll}
            disabled={clearingAll}
            title="Clear every fixture"
          >
            <FaTrash />
            {clearingAll ? 'Clearing…' : 'Clear Fixtures'}
          </button>

          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            title="Pool stage controls are above"
          >
            <FaRandom />
            Pool Controls
          </button>
        </div>
      )}

      <PoolFixtures />
    </>
  )
}

export default PoolFixturesAdminBar

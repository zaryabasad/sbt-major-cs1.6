import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const FixturesContext = createContext(null)
const STORAGE_KEY = 'sbt-major-fixtures'

function readFixtures() {
  try {
    const storedFixtures = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(storedFixtures) ? storedFixtures : []
  } catch {
    return []
  }
}

export function FixturesProvider({ children }) {
  const [fixtures, setFixtures] = useState(readFixtures)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures))
  }, [fixtures])

  const replaceFixtures = (nextFixtures) => setFixtures(nextFixtures)
  const updateFixture = (fixture) => setFixtures((current) => current.map((item) => item.id === fixture.id ? fixture : item))
  const value = useMemo(() => ({ fixtures, replaceFixtures, updateFixture }), [fixtures])

  return <FixturesContext.Provider value={value}>{children}</FixturesContext.Provider>
}

export function useFixtures() {
  return useContext(FixturesContext)
}

import { useMemo, useState } from "react";
import {
  calculateLegacyScore,
  getLegendsLeaderboard,
} from "../data/legendsData";

export default function Legends() {
  const [activeTab, setActiveTab] = useState("legends");
  const [search, setSearch] = useState("");
  const [achievementFilter, setAchievementFilter] = useState("all");

  const players = useMemo(() => {
    return getLegendsLeaderboard().filter((player) =>
      player.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const achievementPlayers = useMemo(() => {
    if (achievementFilter === "all") return players;

    return [...players].sort(
      (a, b) =>
        b.achievements[achievementFilter] -
        a.achievements[achievementFilter]
    );
  }, [players, achievementFilter]);

  const renderPlayer = (player, index) => (
    <div
      key={player.id}
      style={{
        background: "#161616",
        border: "1px solid #333",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "12px",
      }}
    >
      <h3 style={{ margin: 0 }}>
        #{index + 1} {player.name}
      </h3>

      <p style={{ color: "#f5c542", fontWeight: "bold" }}>
        👑 Legacy Score: {calculateLegacyScore(player)}
      </p>

      <div style={{ lineHeight: 1.8 }}>
        🏆 {player.achievements.trophies} &nbsp;
        🏅 {player.achievements.medals} &nbsp;
        🥇 {player.achievements.gold} &nbsp;
        🥈 {player.achievements.silver} &nbsp;
        🥉 {player.achievements.bronze}
        <br />
        ⭐ Captain: {player.runnerUp.captain} &nbsp;
        🪙 Player: {player.runnerUp.player} &nbsp;
        ❌ Pool Outs: {player.poolOuts}
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        padding: "30px",
      }}
    >
      <h1>🏆 SBT LEGENDS & RECORDS</h1>

      <p style={{ color: "#aaa" }}>
        Medals • Trophies • Runner-Up Records • Tournament History
      </p>

      <p style={{ color: "#777" }}>
        Last Updated: 24 July 2026
      </p>

      <input
        type="text"
        placeholder="🔍 Search player..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #444",
          marginBottom: "20px",
        }}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("legends")}>
          👑 All-Time Legends
        </button>

        <button onClick={() => setActiveTab("achievements")}>
          🏆 Achievements
        </button>

        <button onClick={() => setActiveTab("runnerups")}>
          ⭐ Runner-Ups
        </button>

        <button onClick={() => setActiveTab("poolouts")}>
          ❌ Pool Outs
        </button>
      </div>

      <hr style={{ borderColor: "#333", margin: "25px 0" }} />

      {activeTab === "legends" && (
        <>
          <h2>👑 All-Time Legends</h2>
          {players.map(renderPlayer)}
        </>
      )}

      {activeTab === "achievements" && (
        <>
          <h2>🏆 Achievements</h2>

          <select
            value={achievementFilter}
            onChange={(e) => setAchievementFilter(e.target.value)}
            style={{
              padding: "10px",
              marginBottom: "20px",
            }}
          >
            <option value="all">All Achievements</option>
            <option value="trophies">🏆 Trophies</option>
            <option value="medals">🏅 Medals</option>
            <option value="gold">🥇 Gold</option>
            <option value="silver">🥈 Silver</option>
            <option value="bronze">🥉 Bronze</option>
          </select>

          {achievementPlayers.map(renderPlayer)}
        </>
      )}

      {activeTab === "runnerups" && (
        <>
          <h2>⭐ Runner-Up Captains</h2>

          {[...players]
            .sort((a, b) => b.runnerUp.captain - a.runnerUp.captain)
            .filter((p) => p.runnerUp.captain > 0)
            .map((player, index) => (
              <div key={player.id}>
                #{index + 1} {player.name} — ⭐ {player.runnerUp.captain}
              </div>
            ))}

          <h2 style={{ marginTop: "30px" }}>🪙 Runner-Up Players</h2>

          {[...players]
            .sort((a, b) => b.runnerUp.player - a.runnerUp.player)
            .filter((p) => p.runnerUp.player > 0)
            .map((player, index) => (
              <div key={player.id}>
                #{index + 1} {player.name} — 🪙 {player.runnerUp.player}
              </div>
            ))}
        </>
      )}

      {activeTab === "poolouts" && (
        <>
          <h2>❌ Tournament Battles — Pool Outs</h2>

          {[...players]
            .sort((a, b) => b.poolOuts - a.poolOuts)
            .filter((p) => p.poolOuts > 0)
            .map((player, index) => (
              <div key={player.id}>
                #{index + 1} {player.name} — ❌ {player.poolOuts}
              </div>
            ))}
        </>
      )}
    </div>
  );
}
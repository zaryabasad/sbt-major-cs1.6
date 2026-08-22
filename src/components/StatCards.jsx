import { motion } from "framer-motion";
import { FaClock, FaCoins, FaGamepad, FaUsers } from "react-icons/fa";

import { useTeams } from "../context/TeamsContext";
import { usePlayers } from "../context/PlayersContext";
import { useAuction } from "../context/AuctionContext";

function StatCards() {
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { auction } = useAuction();

  const soldPlayers = players.filter((p) => p.status === "Sold").length;

  const stats = [
    {
      label: "Teams",
      value: teams.length,
      icon: FaGamepad,
    },
    {
      label: "Players",
      value: players.length,
      icon: FaUsers,
    },
    {
      label: "Sold Players",
      value: soldPlayers,
      icon: FaCoins,
    },
    {
      label: "Auction Timer",
      value: `${auction.timeRemaining}s`,
      icon: FaClock,
    },
  ];

  return (
    <section className="stat-grid">
      {stats.map(({ label, value, icon: Icon }, index) => (
        <motion.article
          key={label}
          className="glass-card stat-card"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
        >
          <Icon />

          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        </motion.article>
      ))}
    </section>
  );
}

export default StatCards;
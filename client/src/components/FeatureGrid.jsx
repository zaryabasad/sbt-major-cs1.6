import { motion } from 'framer-motion'
import { FaChartLine, FaDesktop, FaGavel, FaTrophy, FaCalendarAlt, FaBolt } from 'react-icons/fa'

const features = [{ title: 'Live Auction', icon: FaGavel }, { title: 'Fixtures', icon: FaCalendarAlt }, { title: 'Playoffs', icon: FaTrophy }, { title: 'Statistics', icon: FaChartLine }, { title: 'Real Time Updates', icon: FaBolt }, { title: 'Responsive Design', icon: FaDesktop }]

function FeatureGrid() {
  return <section className="feature-section"><div className="section-heading"><p className="eyebrow">Built to compete</p><h2>Tournament Features</h2></div><div className="feature-grid">{features.map(({ title, icon: Icon }, index) => <motion.article className="glass-card feature-card" key={title} initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }}><Icon /><h3>{title}</h3><p>Everything you need for a seamless Major experience.</p></motion.article>)}</div></section>
}

export default FeatureGrid

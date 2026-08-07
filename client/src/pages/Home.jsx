import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import EsportsIllustration from '../components/EsportsIllustration'
import FeatureGrid from '../components/FeatureGrid'
import Footer from '../components/Footer'
import StatCards from '../components/StatCards'

function Home() {
  return (
    <div className="home-page"><AnimatedBackground /><section className="home-hero"><motion.div className="hero-copy" initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}><p className="eyebrow">Counter-Strike 1.6 Tournament</p><h1>SBT MAJOR <span>CS 1.6</span></h1><p className="page-description">Pakistan's Ultimate Counter Strike 1.6 Auction Tournament</p><div className="hero-actions"><Link className="button button-primary" to="/auction">Enter Auction</Link><Link className="button button-secondary" to="/teams">View Teams</Link></div></motion.div><motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}><EsportsIllustration /></motion.div></section><StatCards /><FeatureGrid /><Footer /></div>
  )
}

export default Home

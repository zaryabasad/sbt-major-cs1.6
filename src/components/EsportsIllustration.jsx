import { FaCrosshairs, FaShieldAlt } from 'react-icons/fa'

function EsportsIllustration() {
  return (
    <div className="esports-illustration" aria-label="SBT Major competitive arena illustration">
      <div className="orb orb-one" /><div className="orb orb-two" />
      <div className="arena-ring ring-one" /><div className="arena-ring ring-two" />
      <div className="player-card card-left"><FaShieldAlt /><span>TEAM</span></div>
      <div className="player-card card-right"><FaCrosshairs /><span>LIVE</span></div>
      <div className="arena-core"><FaCrosshairs /><strong>SBT</strong><small>MAJOR</small></div>
    </div>
  )
}

export default EsportsIllustration

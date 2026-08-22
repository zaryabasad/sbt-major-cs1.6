import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

function AdminModuleCard({ title, description, icon: Icon, index, to }) {
  const content = <><div className="admin-module-icon"><Icon /></div><div><h2>{title}</h2><p>{description}</p></div><span className="module-action">Manage →</span></>
  return <motion.article className="admin-module glass-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>{to ? <Link className="admin-module-link" to={to}>{content}</Link> : content}</motion.article>
}

export default AdminModuleCard

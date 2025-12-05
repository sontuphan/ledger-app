import { NavLink } from 'react-router'
import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Home' }, { name: 'description', content: 'Home' }]
}

export default function Home() {
  return (
    <div className="w-full flex flex-row gap-8 p-16">
      <NavLink className="btn btn-primary" to="/bitcoin">
        Bitcoin App
      </NavLink>
      <NavLink className="btn btn-primary" to="/ethereum">
        Ethereum App
      </NavLink>
    </div>
  )
}

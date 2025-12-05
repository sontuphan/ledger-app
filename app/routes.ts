import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('bitcoin', 'routes/bitcoin/index.tsx'),
  route('ethereum', 'routes/ethereum/index.tsx'),
] satisfies RouteConfig

import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('bitcoin', 'routes/bitcoin/index.tsx'),
  route('ethereum', 'routes/ethereum/index.tsx'),
  route('solana', 'routes/solana/index.tsx'),
] satisfies RouteConfig

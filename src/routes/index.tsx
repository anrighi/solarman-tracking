import { createFileRoute } from '@tanstack/react-router'

import { EnergyDashboard } from '@/features/energy/components/energy-dashboard'
import { getEnergyDashboard } from '@/features/energy/server/get-energy-dashboard'

export const Route = createFileRoute('/')({
  loader: () => getEnergyDashboard(),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <EnergyDashboard data={data} />
    </main>
  )
}

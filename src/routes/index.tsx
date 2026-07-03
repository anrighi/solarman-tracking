import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { EnergyDashboard } from '@/features/energy/components/energy-dashboard'
import type { DashboardSearch } from '@/features/energy/components/time-range-nav'
import { getEnergyDashboard } from '@/features/energy/server/get-energy-dashboard'

const searchSchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional(),
  anchor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    period: search.period,
    anchor: search.anchor,
  }),
  loader: ({ deps }) =>
    getEnergyDashboard({
      data: { period: deps.period, anchor: deps.anchor },
    }),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const period = search.period ?? data.period

  function handleRangeChange(next: DashboardSearch) {
    navigate({
      search: {
        period: next.period,
        anchor: next.anchor,
      },
      replace: true,
    })
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <EnergyDashboard
        data={data}
        period={period}
        anchor={search.anchor}
        onRangeChange={handleRangeChange}
      />
    </main>
  )
}

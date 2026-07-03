import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { EnergyDashboard } from '@/features/energy/components/energy-dashboard'
import type { DashboardSearch } from '@/features/energy/components/time-range-nav'
import { getEnergyDashboard } from '@/features/energy/server/get-energy-dashboard'

const searchSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    days: search.days,
    endDate: search.endDate,
  }),
  loader: ({ deps }) =>
    getEnergyDashboard({
      data: { days: deps.days, endDate: deps.endDate },
    }),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const days = search.days ?? data.days

  function handleRangeChange(next: DashboardSearch) {
    navigate({
      search: {
        days: next.days,
        endDate: next.endDate,
      },
      replace: true,
    })
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <EnergyDashboard
        data={data}
        days={days}
        endDate={search.endDate}
        onRangeChange={handleRangeChange}
      />
    </main>
  )
}

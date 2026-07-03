import { createFileRoute } from '@tanstack/react-router'

import { runBatteryAlerts } from '@/features/alerts/run-battery-alerts'

export const Route = createFileRoute('/api/webhooks/battery')({
  server: {
    handlers: {
      POST: async () => {
        const result = await runBatteryAlerts()
        return Response.json(result)
      },
    },
  },
})

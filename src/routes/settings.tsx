import { createFileRoute } from '@tanstack/react-router'

import { SettingsLayout } from '@/features/settings/components/settings-layout'

export const Route = createFileRoute('/settings')({
  component: SettingsLayoutPage,
})

function SettingsLayoutPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <SettingsLayout />
    </main>
  )
}

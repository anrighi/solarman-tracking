import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'

import type { AppConfig } from '@/lib/config/schema'
import { defaultAppConfig } from '@/lib/config/schema'
import {
  exportAppConfig,
  saveAppConfig,
} from '@/features/settings/server/get-app-config'

export function useSettingsForm(initialConfig: AppConfig) {
  const router = useRouter()
  const [config, setConfig] = useState(initialConfig)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setConfig(initialConfig)
  }, [initialConfig])

  const isDirty = JSON.stringify(config) !== JSON.stringify(initialConfig)

  async function handleSave() {
    setIsSaving(true)
    setMessage(null)

    try {
      await saveAppConfig({ data: config })
      setMessage('Configurazione salvata.')
      await router.invalidate()
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Salvataggio non riuscito'
      setMessage(text)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExport() {
    const json = await exportAppConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'app_config.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    setConfig(defaultAppConfig)
  }

  return {
    config,
    setConfig,
    message,
    isSaving,
    isDirty,
    handleSave,
    handleExport,
    handleReset,
  }
}

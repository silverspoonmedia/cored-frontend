import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, put } from '@/api/client'
import type {
  ApiResponse,
  SettingsGroupsPayload,
  SettingsShowPayload,
  SettingGroup,
} from '@/api/types'

export function useSettings() {
  const { t } = useI18n()
  const groups = ref<string[]>([])
  const currentGroup = ref<string>('')
  const settings = ref<SettingGroup>({})
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchGroups(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<SettingsGroupsPayload>>('admin/settings/groups')
      groups.value = res.data?.groups ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.settings.load_groups_failed')
    } finally {
      loading.value = false
    }
  }

  async function fetchGroup(group: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<SettingsShowPayload>>(`admin/settings/${group}`)
      if (res.data) {
        currentGroup.value = res.data.group
        settings.value = res.data.settings
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.settings.load_failed')
    } finally {
      loading.value = false
    }
  }

  async function saveGroup(group: string, payload: Record<string, unknown>): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      const res = await put<ApiResponse<SettingsShowPayload>>(`admin/settings/${group}`, payload)
      if (res.data) {
        currentGroup.value = res.data.group
        settings.value = res.data.settings
        return true
      }
      return false
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.settings.save_failed')
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    groups,
    currentGroup,
    settings,
    loading,
    saving,
    error,
    fetchGroups,
    fetchGroup,
    saveGroup,
  }
}

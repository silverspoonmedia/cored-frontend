import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { post, put, patch, del } from '@/api/client'
import { ApiError, type ApiResponse } from '@/api/types'

type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export function useForm(action: string, method: Method = 'POST') {
  const { t } = useI18n()
  const submitting = ref(false)
  const errors = ref<Record<string, string[]>>({})
  const error = ref<string | null>(null)

  async function submit<T = unknown>(data?: Record<string, unknown>): Promise<T> {
    submitting.value = true
    errors.value = {}
    error.value = null

    try {
      const res = await sendRequest<T>(action, method, data)
      return res
    } catch (e) {
      if (e instanceof ApiError && e.isValidation) {
        errors.value = e.errors ?? {}
      } else if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = e instanceof Error ? e.message : t('ui.ajax.request_failed')
      }
      throw e
    } finally {
      submitting.value = false
    }
  }

  function resetErrors(): void {
    errors.value = {}
    error.value = null
  }

  function fieldError(field: string): string | null {
    const list = errors.value[field]
    if (list && list.length > 0) {
      const first: string | undefined = list[0]
      return first ?? null
    }
    return null
  }

  return {
    submitting,
    errors,
    error,
    submit,
    resetErrors,
    fieldError,
  }
}

async function sendRequest<T>(
  action: string,
  method: Method,
  data?: Record<string, unknown>,
): Promise<T> {
  let res: ApiResponse<T> | T

  switch (method) {
    case 'POST':
      res = await post<ApiResponse<T>>(action, data ?? {})
      break
    case 'PUT':
      res = await put<ApiResponse<T>>(action, data ?? {})
      break
    case 'PATCH':
      res = await patch<ApiResponse<T>>(action, data ?? {})
      break
    case 'DELETE':
      res = await del<ApiResponse<T>>(action, data)
      break
  }

  if (res && typeof res === 'object' && 'status' in res && 'data' in res) {
    return (res as ApiResponse<T>).data as T
  }

  return res as T
}

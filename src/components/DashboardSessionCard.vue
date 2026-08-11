<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuth } from '@/stores/auth'

const props = defineProps<{
  profile: {
    name: string
    email: string
    roles: string[]
  }
  labels: {
    title: string
    hint: string
    name: string
    email: string
    roles: string
    noRoles: string
    refresh: string
    refreshing: string
    refreshedAt: string
    loadFailed: string
  }
}>()

const { fetchMe } = useAuth()

const liveProfile = ref({ ...props.profile })
const loading = ref(false)
const error = ref('')
const refreshedAt = ref<string | null>(null)

watch(
  () => props.profile,
  (val) => {
    liveProfile.value = { ...val }
  },
)

const displayName = computed(() => liveProfile.value?.name ?? '—')
const email = computed(() => liveProfile.value?.email ?? '—')
const roles = computed(() => {
  const list = liveProfile.value?.roles
  return Array.isArray(list) ? list : []
})

async function refresh(): Promise<void> {
  if (loading.value) return

  loading.value = true
  error.value = ''

  try {
    const user = await fetchMe()
    liveProfile.value = {
      name: user.name,
      email: user.email,
      roles: user.roles,
    }
    refreshedAt.value = new Date().toLocaleString()
  } catch (e) {
    error.value = e instanceof Error ? e.message : props.labels.loadFailed
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card mb-0">
    <div class="card-header">
      <h3 class="card-title mb-0">{{ labels.title }}</h3>
    </div>
    <div class="card-body">
      <p class="text-muted small mb-3">{{ labels.hint }}</p>

      <div
        v-if="error"
        class="alert alert-danger mb-3"
        role="alert"
      >
        {{ error }}
      </div>

      <dl class="row mb-3">
        <dt class="col-sm-4">{{ labels.name }}</dt>
        <dd class="col-sm-8">{{ displayName }}</dd>
        <dt class="col-sm-4">{{ labels.email }}</dt>
        <dd class="col-sm-8">{{ email }}</dd>
        <dt class="col-sm-4">{{ labels.roles }}</dt>
        <dd class="col-sm-8">
          <template v-if="roles.length">
            <span
              v-for="role in roles"
              :key="role"
              class="badge text-bg-primary me-1"
            >{{ role }}</span>
          </template>
          <span v-else class="text-muted">{{ labels.noRoles }}</span>
        </dd>
      </dl>

      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        :disabled="loading"
        @click="refresh"
      >
        <span
          v-if="loading"
          class="spinner-border spinner-border-sm me-1"
          role="status"
          aria-hidden="true"
        />
        {{ loading ? labels.refreshing : labels.refresh }}
      </button>

      <p
        v-if="refreshedAt"
        class="text-muted small mt-2 mb-0"
      >
        {{ labels.refreshedAt }}: {{ refreshedAt }}
      </p>
    </div>
  </div>
</template>

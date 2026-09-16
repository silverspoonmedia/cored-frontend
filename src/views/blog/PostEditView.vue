<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect2 from '@/components/FormSelect2.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import RichTextEditor from '@/components/blog/RichTextEditor.vue'
import FeaturedImagePicker from '@/components/blog/FeaturedImagePicker.vue'
import { usePosts } from '@/composables/blog/usePosts'
import { useCategories } from '@/composables/blog/useCategories'
import { useTags } from '@/composables/blog/useTags'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'
import { ApiError } from '@/api/types'
import type { BlogCategory, BlogMedia, BlogTag } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, create, update } = usePosts()
const { fetchList: fetchCategories } = useCategories()
const { fetchList: fetchTags } = useTags()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const loading = ref(true)
const saving = ref(false)
const publish = ref(false)
const errors = ref<Record<string, string[]>>({})

const categoryOptions = ref<{ value: string; label: string }[]>([])
const tagOptions = ref<{ value: string; label: string }[]>([])
const featuredMedia = ref<BlogMedia | null>(null)

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: null as string | null,
  status: 'draft' as 'draft' | 'published',
  featured_media_id: null as string | null,
  category_ids: [] as string[],
  tag_ids: [] as string[],
})

const slugTouched = ref(false)

function autoSlug(): void {
  if (slugTouched.value) return
  form.slug = form.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

useBreadcrumbTitle(() => (isEdit.value ? form.title : null))

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) return list[0] ?? null
  return null
}

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const post = await fetchOne(route.params.id as string)
    form.title = post.title
    form.slug = post.slug
    slugTouched.value = true
    form.excerpt = post.excerpt ?? ''
    form.content = post.content ?? null
    form.status = post.status
    form.featured_media_id = post.featured_media?.id ?? null
    featuredMedia.value = post.featured_media ?? null
    form.category_ids = post.category_ids ?? []
    form.tag_ids = post.tag_ids ?? []
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.blog.posts.load_failed'))
  } finally {
    loading.value = false
  }
}

async function loadTaxonomies(): Promise<void> {
  try {
    const [categories, tags] = await Promise.all([fetchCategories(), fetchTags()])
    categoryOptions.value = (categories as BlogCategory[]).map((c) => ({ value: c.id, label: c.name }))
    tagOptions.value = (tags as BlogTag[]).map((tag) => ({ value: tag.id, label: tag.name }))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.blog.posts.load_failed'))
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    title: form.title,
    slug: form.slug || undefined,
    excerpt: form.excerpt || null,
    content: form.content,
    featured_media_id: form.featured_media_id,
    category_ids: form.category_ids,
    tag_ids: form.tag_ids,
  }

  if (publish.value) {
    payload.status = 'published'
  } else if (!isEdit.value) {
    payload.status = 'draft'
  }

  try {
    if (isEdit.value) {
      await update(route.params.id as string, payload)
      showSuccess(t('web.blog.posts.updated'))
    } else {
      await create(payload)
      showSuccess(t('web.blog.posts.created'))
    }
    void router.push({ name: 'blog.posts.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.blog.posts.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void Promise.all([load(), loadTaxonomies()])
})

useEchoResync(() => { void load() })
</script>

<template>
  <Card :title="isEdit ? t('web.blog.posts.edit_title') : t('web.blog.posts.create_title')">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'blog.posts.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="row g-3">
        <div class="col-lg-8">
          <div class="card border-0">
            <div class="card-body p-0">
              <FormInput
                name="title"
                :label="t('web.blog.posts.form.title')"
                v-model="form.title"
                :error="fieldError('title')"
                required
                :disabled="saving"
                @update:model-value="autoSlug"
              />
              <FormInput
                name="slug"
                :label="t('web.blog.posts.form.slug')"
                v-model="form.slug"
                :error="fieldError('slug')"
                :disabled="saving"
                @update:model-value="slugTouched = true"
              />
              <FormTextarea
                name="excerpt"
                :label="t('web.blog.posts.form.excerpt')"
                v-model="form.excerpt"
                :error="fieldError('excerpt')"
                :rows="3"
                :disabled="saving"
              />

              <div class="mb-3">
                <label class="form-label">{{ t('web.blog.posts.form.content') }}</label>
                <RichTextEditor v-model="form.content" :disabled="saving" />
                <div v-if="fieldError('content')" class="text-danger small mt-1">{{ fieldError('content') }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card mb-3">
            <div class="card-header">{{ t('web.blog.posts.form.publish_section') }}</div>
            <div class="card-body">
              <p class="mb-2">
                <strong>{{ t('web.blog.posts.form.status') }}:</strong>
                {{ t(`web.blog.posts.status.${form.status}`) }}
              </p>
              <div class="form-check mb-3">
                <input id="blog-publish" v-model="publish" type="checkbox" class="form-check-input" :disabled="saving" />
                <label class="form-check-label" for="blog-publish">{{ t('web.blog.posts.form.publish_now') }}</label>
              </div>
              <SubmitButton :label="t('ui.actions.save')" :loading="saving" variant="primary" />
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-header">{{ t('web.blog.posts.form.featured_section') }}</div>
            <div class="card-body">
              <FeaturedImagePicker v-model="form.featured_media_id" :media="featuredMedia" :disabled="saving" @update:model-value="featuredMedia = $event ? featuredMedia : null" />
              <div v-if="fieldError('featured_media_id')" class="text-danger small mt-1">{{ fieldError('featured_media_id') }}</div>
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-header">{{ t('web.blog.posts.form.taxonomies_section') }}</div>
            <div class="card-body">
              <FormSelect2
                name="category_ids"
                :label="t('web.blog.posts.form.categories')"
                :options="categoryOptions"
                v-model="form.category_ids"
                multiple
                :placeholder="t('web.blog.posts.form.categories_placeholder')"
                :error="fieldError('category_ids')"
                :disabled="saving"
              />
              <FormSelect2
                name="tag_ids"
                :label="t('web.blog.posts.form.tags')"
                :options="tagOptions"
                v-model="form.tag_ids"
                multiple
                :placeholder="t('web.blog.posts.form.tags_placeholder')"
                :error="fieldError('tag_ids')"
                :disabled="saving"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  </Card>
</template>

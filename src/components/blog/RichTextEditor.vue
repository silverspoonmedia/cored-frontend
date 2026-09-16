<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useI18n } from 'vue-i18n'
import { useBlogMedia } from '@/composables/blog/useBlogMedia'

const props = defineProps<{
  modelValue: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const { t } = useI18n()
const { upload, uploading } = useBlogMedia()

const editor = useEditor({
  content: props.modelValue ?? '',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer' },
    }),
    Image.configure({
      HTMLAttributes: { loading: 'lazy' },
    }),
    Placeholder.configure({
      placeholder: t('web.blog.editor.placeholder'),
    }),
  ],
  onUpdate: () => {
    emit('update:modelValue', editor.value?.isEmpty ? null : (editor.value?.getHTML() ?? null))
  },
})

watch(
  () => props.disabled,
  (value) => {
    editor.value?.setEditable(!value)
  },
)

watch(
  () => props.modelValue,
  (value) => {
    if (editor.value === null || editor.value === undefined) return
    const next = value ?? ''
    if (editor.value.getHTML() !== next) {
      editor.value.commands.setContent(next, { emitUpdate: false })
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// --- Toolbar actions ---

function chain() {
  if (!editor.value || props.disabled) return null
  return editor.value.chain().focus()
}

function toggleBold(): void {
  chain()?.toggleBold().run()
}

function toggleItalic(): void {
  chain()?.toggleItalic().run()
}

function toggleStrike(): void {
  chain()?.toggleStrike().run()
}

function setHeading(level: 2 | 3): void {
  chain()?.toggleHeading({ level }).run()
}

function toggleBulletList(): void {
  chain()?.toggleBulletList().run()
}

function toggleOrderedList(): void {
  chain()?.toggleOrderedList().run()
}

function toggleBlockquote(): void {
  chain()?.toggleBlockquote().run()
}

function toggleCodeBlock(): void {
  chain()?.toggleCodeBlock().run()
}

function setLink(): void {
  if (!editor.value || props.disabled) return
  const previous = (editor.value.getAttributes('link').href as string | undefined) ?? ''
  const url = window.prompt(t('web.blog.editor.link_prompt'), previous)
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function unsetLink(): void {
  chain()?.extendMarkRange('link').unsetLink().run()
}

function undo(): void {
  chain()?.undo().run()
}

function redo(): void {
  chain()?.redo().run()
}

function removeImage(): void {
  chain()?.deleteSelection().run()
}

const fileInput = ref<HTMLInputElement | null>(null)

function pickImage(): void {
  fileInput.value?.click()
}

async function onFilePicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const media = await upload(file)
    chain()?.setImage({ src: media.url, alt: media.original_name }).run()
  } catch {
    // useBlogMedia holds the error message; silent here, upload failures are
    // surfaced by the shared alert in the parent edit view when rethrown.
  }
}
</script>

<template>
  <div class="blog-editor border rounded" :class="{ 'opacity-50': disabled }">
    <div class="blog-editor-toolbar d-flex flex-wrap gap-1 border-bottom p-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.undo')" :aria-label="t('web.blog.editor.undo')" @click="undo">
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.redo')" :aria-label="t('web.blog.editor.redo')" @click="redo">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
      <span class="vr mx-1"></span>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.bold')" :aria-label="t('web.blog.editor.bold')" @click="toggleBold">
        <i class="bi bi-type-bold"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.italic')" :aria-label="t('web.blog.editor.italic')" @click="toggleItalic">
        <i class="bi bi-type-italic"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.strike')" :aria-label="t('web.blog.editor.strike')" @click="toggleStrike">
        <i class="bi bi-type-strikethrough"></i>
      </button>
      <span class="vr mx-1"></span>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" title="H2" aria-label="Heading 2" @click="setHeading(2)">
        H2
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" title="H3" aria-label="Heading 3" @click="setHeading(3)">
        H3
      </button>
      <span class="vr mx-1"></span>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.bullet_list')" :aria-label="t('web.blog.editor.bullet_list')" @click="toggleBulletList">
        <i class="bi bi-list-ul"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.ordered_list')" :aria-label="t('web.blog.editor.ordered_list')" @click="toggleOrderedList">
        <i class="bi bi-list-ol"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.blockquote')" :aria-label="t('web.blog.editor.blockquote')" @click="toggleBlockquote">
        <i class="bi bi-quote"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.code_block')" :aria-label="t('web.blog.editor.code_block')" @click="toggleCodeBlock">
        <i class="bi bi-code-slash"></i>
      </button>
      <span class="vr mx-1"></span>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.link')" :aria-label="t('web.blog.editor.link')" @click="setLink">
        <i class="bi bi-link-45deg"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.unlink')" :aria-label="t('web.blog.editor.unlink')" @click="unsetLink">
        <i class="bi bi-eraser"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled || uploading" :title="t('web.blog.editor.image')" :aria-label="t('web.blog.editor.image')" @click="pickImage">
        <i class="bi" :class="uploading ? 'bi-hourglass-split' : 'bi-image'"></i>
      </button>
      <button v-if="editor?.isActive('image')" type="button" class="btn btn-sm btn-outline-secondary" :disabled="disabled" :title="t('web.blog.editor.remove_image')" :aria-label="t('web.blog.editor.remove_image')" @click="removeImage">
        <i class="bi bi-image"></i><i class="bi bi-slash-circle"></i>
      </button>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="d-none" @change="onFilePicked" />
    </div>
    <editor-content :editor="editor" class="blog-editor-content p-2" />
  </div>
</template>

<style scoped>
.blog-editor-content :deep(.ProseMirror) {
  min-height: 320px;
  outline: none;
}

.blog-editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.blog-editor-content :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>

import { ref } from 'vue'

export const FH_ITEMS_MIME = 'application/x-fh-items'

export function canDropOnFolder(folderId: string | null | undefined, keys: string[]): boolean {
  if (folderId !== null && folderId !== undefined && folderId !== '') {
    if (keys.includes(`folder:${folderId}`)) {
      return false
    }
  }
  return true
}

export interface FhDragMoveOptions {
  selected: { value: Set<string> }
  clearSelection: () => void
  toggleSelect: (key: string, on?: boolean) => void
  moveItems: (keys: string[], targetFolderId: string | null) => Promise<boolean>
}

export function useFhDragMove(opts: FhDragMoveOptions) {
  const { selected, clearSelection, toggleSelect, moveItems } = opts

  const dragging = ref(false)
  const dropTarget = ref<string | null>(null)

  function isInteractive(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false
    return !!el.closest('input, button, a.fh-table__action-btn, [data-bs-toggle], .fh-file-card__select')
  }

  function isFhDrag(dt: DataTransfer | null): boolean {
    if (!dt?.types) return false
    return Array.from(dt.types).includes(FH_ITEMS_MIME)
  }

  function onRowDragStart(e: DragEvent, entity: string, id: string): void {
    if (entity === 'parent' || !id) {
      e.preventDefault()
      return
    }
    if (isInteractive(e.target)) {
      e.preventDefault()
      return
    }

    const key = `${entity}:${id}`
    if (!selected.value.has(key)) {
      clearSelection()
      toggleSelect(key, true)
    }

    const keys = Array.from(selected.value)
    dragging.value = true
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData(FH_ITEMS_MIME, JSON.stringify(keys))
    e.dataTransfer!.setData('text/plain', keys.join(','))
  }

  function onDragEnd(): void {
    dragging.value = false
    dropTarget.value = null
  }

  function targetKey(folderId: string | null | undefined): string {
    if (folderId === null || folderId === undefined || folderId === '' || folderId === 'root') {
      return 'root'
    }
    return `folder:${folderId}`
  }

  function onDropOver(e: DragEvent, folderId: string | null): void {
    if (!isFhDrag(e.dataTransfer) && !dragging.value) return
    const keys = Array.from(selected.value)
    const target = (folderId === '' || folderId === 'root' || folderId == null) ? null : folderId
    if (!canDropOnFolder(target, keys)) {
      dropTarget.value = null
      return
    }
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'move'
    dropTarget.value = targetKey(folderId)
  }

  function onDropLeave(e: DragEvent, folderId: string | null): void {
    const key = targetKey(folderId)
    if (dropTarget.value !== key) return
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as HTMLElement)?.contains?.(related)) return
    dropTarget.value = null
  }

  async function onDrop(e: DragEvent, folderId: string | null): Promise<void> {
    if (!isFhDrag(e.dataTransfer) && !dragging.value) return

    e.preventDefault()
    e.stopPropagation()

    let keys: string[] = []
    try {
      const raw = e.dataTransfer!.getData(FH_ITEMS_MIME) || e.dataTransfer!.getData('text/plain')
      if (raw && raw.startsWith('[')) {
        keys = JSON.parse(raw) as string[]
      } else if (raw) {
        keys = raw.split(',').filter(Boolean)
      }
    } catch {
      keys = Array.from(selected.value)
    }
    if (!keys.length) {
      keys = Array.from(selected.value)
    }

    const target = (folderId === '' || folderId === 'root' || folderId == null) ? null : folderId
    dropTarget.value = null
    dragging.value = false

    if (!canDropOnFolder(target, keys)) {
      return
    }

    await moveItems(keys, target)
  }

  function isDropTarget(folderId: string | null): boolean {
    return dropTarget.value === targetKey(folderId)
  }

  function isDraggingSource(entity: string, id: string): boolean {
    return dragging.value && selected.value.has(`${entity}:${id}`)
  }

  return {
    dragging,
    dropTarget,
    onRowDragStart,
    onDragEnd,
    onDropOver,
    onDropLeave,
    onDrop,
    isDropTarget,
    isDraggingSource,
  }
}

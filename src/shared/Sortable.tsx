import type { ReactNode } from 'react'
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props<T extends { id: string }> {
  items: T[]
  onChange: (items: T[]) => void
  className?: string
  /** `handle` props go on the element the user drags (the whole card, or a grip). */
  render: (item: T, index: number, handle: Record<string, unknown>) => ReactNode
}

/** Drag-to-reorder container for lists and grids. Works with mouse, touch and keyboard. */
export function Sortable<T extends { id: string }>({ items, onChange, className, render }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = items.findIndex((i) => i.id === e.active.id)
    const to = items.findIndex((i) => i.id === e.over!.id)
    onChange(arrayMove(items, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((item, i) => (
            <Item key={item.id} id={item.id}>{(handle) => render(item, i, handle)}</Item>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function Item({ id, children }: { id: string; children: (handle: Record<string, unknown>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.8 : 1 }}
    >
      {children({ ...attributes, ...listeners, style: { touchAction: 'none', cursor: 'grab' } })}
    </div>
  )
}

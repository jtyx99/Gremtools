import type { IconName } from '../../shared/Icon'

/** Names and descriptions of the image tools. registry.ts adds the lazy-loaded components. */
export const IMAGE_TOOLS: { id: string; name: string; description: string; icon: IconName; keywords?: string }[] = [
  {
    id: 'remove-background',
    name: 'Remove background',
    description: 'Cut the subject out of a photo, then keep it transparent or swap the background.',
    icon: 'cutout',
    keywords: 'bg remover transparent png cut out cutout erase background replace blur',
  },
]

export function imageTool(id: string) {
  const tool = IMAGE_TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Unknown image tool: ${id}`)
  return tool
}

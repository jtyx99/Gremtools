import type { IconName } from '../../shared/Icon'

/**
 * Names and descriptions of the PDF tools. Kept apart from registry.ts (which
 * adds the lazy-loaded components) so tool pages can read their own text
 * without importing each other.
 */
export const PDF_TOOLS: { id: string; name: string; description: string; icon: IconName; keywords?: string }[] = [
  { id: 'merge', name: 'Merge PDFs', description: 'Combine several PDFs into one, in the order you choose.', icon: 'merge', keywords: 'combine join' },
  { id: 'split', name: 'Split PDF', description: 'Pull out pages or break a PDF into smaller files.', icon: 'split', keywords: 'extract separate ranges' },
  { id: 'organise', name: 'Organise pages', description: 'Reorder, rotate and delete pages.', icon: 'organise', keywords: 'organize rearrange rotate delete remove reorder' },
  { id: 'compress', name: 'Compress PDF', description: 'Make a PDF smaller, mainly by shrinking its images.', icon: 'compress', keywords: 'reduce size shrink optimise optimize' },
  { id: 'images-to-pdf', name: 'Images to PDF', description: 'Turn JPG, PNG or WebP images into a PDF.', icon: 'toPdf', keywords: 'jpg jpeg png webp photo convert' },
  { id: 'pdf-to-images', name: 'PDF to images', description: 'Save every page as a PNG or JPG image.', icon: 'toImage', keywords: 'jpg jpeg png convert export' },
  { id: 'watermark', name: 'Watermark', description: 'Stamp text or an image over every page.', icon: 'watermark', keywords: 'stamp draft confidential logo' },
  { id: 'page-numbers', name: 'Page numbers', description: 'Add page numbers where you want them.', icon: 'numbers', keywords: 'numbering paginate' },
]

export function pdfTool(id: string) {
  const tool = PDF_TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Unknown PDF tool: ${id}`)
  return tool
}

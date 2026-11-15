/** Small stroke icons, 24x24. Add a path here, then use its key as an IconName. */
const PATHS = {
  pdf: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 1 0 0-.01',
  colour: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-.5-1.5-.5-2.5S14.5 15 16 15h2a3 3 0 0 0 3-3c0-5-4-9-9-9zM7.5 12h.01M9.5 8h.01M14.5 7.5h.01',
  merge: 'M5 4h6v6H5zM13 4h6v6h-6zM8 10v3a3 3 0 0 0 3 3h1m4-6v3a3 3 0 0 1-3 3h-1m0 0v5m-3-3 3 3 3-3',
  split: 'M12 3v6m0 0-5 5v7m5-12 5 5v7M4 18l3 3 3-3m4 0 3 3 3-3',
  organise: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  compress: 'M12 3v7m0 0-3-3m3 3 3-3M12 21v-7m0 0-3 3m3-3 3 3M4 12h16',
  toPdf: 'M4 5h10v8H4zM4 11l3-3 3 3 2-2 2 2M17 9h3v11H9v-4m5 0h3m-1.5-1.5L17 16l-1.5 1.5',
  toImage: 'M6 3h8l4 4v6M14 3v4h4M6 3v10M4 15h16v6H4zM4 19l4-3 3 2 4-3 5 4',
  watermark: 'M7 3h7l5 5v13H7zM14 3v5h5M9.5 17l2.5-6 2.5 6m-4-2h3',
  numbers: 'M7 3h7l5 5v13H7zM14 3v5h5M11 17h4m-2 0v-5l-1.5 1',
  cutout: 'M4 7V4h3M10.5 4h3M17 4h3v3M20 10.5v3M20 17v3h-3M13.5 20h-3M7 20H4v-3M4 13.5v-3M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 16.5c.6-2 2-3 4-3s3.4 1 4 3',
  upload: 'M12 16V5m0 0-4 4m4-4 4 4M5 19h14',
  download: 'M12 5v11m0 0-4-4m4 4 4-4M5 19h14',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v5M14 11v5',
  rotate: 'M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4',
  rotateLeft: 'M5 12a7 7 0 1 0 2.05-4.95M5 4v4h4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'grip' ? 2.6 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

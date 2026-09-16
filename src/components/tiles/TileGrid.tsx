import type { ReactNode } from 'react'
import styles from './TileGrid.module.css'

interface TileGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
}

/** Responsive grid following Apple's 1068 / 833 / 734px breakpoints. */
export function TileGrid({ children, columns = 3 }: TileGridProps) {
  return (
    <div className={styles.grid} data-columns={columns}>
      {children}
    </div>
  )
}

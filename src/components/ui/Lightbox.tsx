'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef } from 'react'
import { assetPath } from '@/lib/asset-path'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { directionFor } from '@/lib/i18n/config'
import styles from './Lightbox.module.css'

/** Focusable children of the dialog, in DOM order, for the focus trap. */
function focusablesIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button:not([disabled])')]
}

export function Lightbox({
  images,
  index,
  alt,
  onIndexChange,
  onClose,
}: {
  images: readonly string[]
  index: number
  alt: string
  onIndexChange: (next: number) => void
  onClose: () => void
}) {
  const { locale, t } = useLocale()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // Whatever was focused when the viewer opened, so it can be handed back.
  const openerRef = useRef<HTMLElement | null>(null)

  const count = images.length
  const step = useCallback(
    (delta: number) => onIndexChange((index + delta + count) % count),
    [count, index, onIndexChange],
  )

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const opener = openerRef.current
    return () => opener?.focus()
  }, [])

  // A viewer that leaves the page scrolling underneath it reads as an overlay
  // rather than a place you have gone.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'Tab') {
        const items = dialogRef.current ? focusablesIn(dialogRef.current) : []
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }

      if (count < 2) return
      // Arrows follow what the reader sees, so they mean opposite things in
      // Hebrew and Arabic from what they mean in English.
      const forward = directionFor(locale) === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const back = forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight'
      if (event.key === forward) step(1)
      if (event.key === back) step(-1)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [count, locale, onClose, step])

  return (
    <div
      className={styles.backdrop}
      // A click that starts on the image and ends on the backdrop is a drag,
      // not a dismissal, so only a press that both starts and ends here counts.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('lb_title')}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          aria-label={t('lb_close')}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className={styles.stage}>
          <Image
            src={assetPath(images[index])}
            alt={alt}
            width={1400}
            height={1400}
            className={styles.image}
            priority
          />
        </div>

        {count > 1 && (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.nav}
              aria-label={t('lb_prev')}
              onClick={() => step(-1)}
            >
              <Chevron back />
            </button>
            {/* A position counter is not prose: "1 / 2" must not mirror into
                "2 / 1" just because the surrounding language reads right to
                left. */}
            <span className={styles.counter} dir="ltr" aria-live="polite">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              className={styles.nav}
              aria-label={t('lb_next')}
              onClick={() => step(1)}
            >
              <Chevron />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Points along the reading direction, so it flips with the locale. */
function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      className={back ? styles.chevronBack : styles.chevron}
    >
      <path
        d="M9 4l8 8-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

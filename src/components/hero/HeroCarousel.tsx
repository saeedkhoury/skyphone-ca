'use client'

import Link from 'next/link'
import Image from 'next/image'
import { assetPath } from '@/lib/asset-path'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { directionFor } from '@/lib/i18n/config'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { whatsappLink } from '@/lib/shop'
import type { Product } from '@/lib/catalog/types'
import { Button } from '../ui/Button'
import { PauseIcon, PlayIcon } from '../nav/NavIcons'
import styles from './HeroCarousel.module.css'

const ROTATE_MS = 7000

export interface HeroCta {
  /** Translation key for the button label. */
  labelKey: string
  variant: 'primary' | 'secondary'
  /** Either an internal route or a WhatsApp message key, never both. */
  href?: string
  whatsappKey?: string
}

export interface HeroSlide {
  id: string
  /** Translation key for the badge above the title. */
  badgeKey: string
  title: string
  /** Translation key for the headline strap. */
  tagKey: string
  /** Translation key for the supporting line. */
  noteKey?: string
  image: string
  alt: string
  /** Live price line, for slides tied to a real product. */
  product?: Product
  ctas: readonly HeroCta[]
}

function primaryCta(slide: HeroSlide): HeroCta | undefined {
  return slide.ctas[0]
}

function secondaryCta(slide: HeroSlide): HeroCta | undefined {
  return slide.ctas[1]
}

export function HeroCarousel({ slides }: { slides: readonly HeroSlide[] }) {
  const { locale, t } = useLocale()
  const [isStopped, setIsStopped] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  // Reposition the actual cards continuously instead of scrolling to a clone
  // and jumping back. Both drag directions now have an unlimited runway.
  const [viewportRef, carousel] = useEmblaCarousel(
    {
      loop: slides.length > 1,
      align: 'center',
      direction: directionFor(locale),
      duration: prefersReducedMotion ? 0 : 20,
    },
    [WheelGesturesPlugin({ forceWheelAxis: 'x' })],
  )
  const timer = useRef<number | undefined>(undefined)
  const isDragging = useRef(false)

  const subscribe = useCallback((notify: () => void) => {
    if (!carousel) return () => {}
    carousel.on('select', notify).on('reInit', notify)
    return () => { carousel.off('select', notify).off('reInit', notify) }
  }, [carousel])
  const index = useSyncExternalStore(
    subscribe,
    () => carousel?.selectedScrollSnap() ?? 0,
    () => 0,
  )

  /** A CTA is either an internal route or a prefilled WhatsApp message. */
  const ctaHref = (cta: HeroCta) =>
    cta.whatsappKey ? whatsappLink(t(cta.whatsappKey)) : (cta.href ?? '#')

  const clearRotation = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  const scheduleRotation = useCallback(function scheduleNext() {
    clearRotation()
    if (!carousel || isStopped || isDragging.current || document.hidden || slides.length < 2) return
    timer.current = window.setTimeout(() => {
      carousel.scrollNext(prefersReducedMotion)
      // Instant transitions do not emit a later animation-settle event.
      if (prefersReducedMotion) scheduleNext()
    }, ROTATE_MS)
  }, [carousel, clearRotation, isStopped, prefersReducedMotion, slides.length])

  useEffect(() => {
    if (!carousel) return
    const startDrag = () => {
      isDragging.current = true
      clearRotation()
    }
    const endDrag = () => {
      isDragging.current = false
      scheduleRotation()
    }
    // Start a fresh seven-second hold after the card has finished moving.
    // Hovering, swiping, and dot navigation do not turn playback off. Only
    // the explicit pause control does. Hidden tabs do not build a backlog.
    carousel
      .on('scroll', clearRotation)
      .on('settle', scheduleRotation)
      .on('pointerDown', startDrag)
      .on('pointerUp', endDrag)
      .on('reInit', scheduleRotation)
    document.addEventListener('visibilitychange', scheduleRotation)
    scheduleRotation()
    return () => {
      clearRotation()
      isDragging.current = false
      carousel
        .off('scroll', clearRotation)
        .off('settle', scheduleRotation)
        .off('pointerDown', startDrag)
        .off('pointerUp', endDrag)
        .off('reInit', scheduleRotation)
      document.removeEventListener('visibilitychange', scheduleRotation)
    }
  }, [carousel, clearRotation, scheduleRotation])

  if (slides.length === 0) return null

  const slide = slides[index]

  function showSlide(next: number) {
    carousel?.scrollTo(next, prefersReducedMotion)
    scheduleRotation()
  }

  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label={t('fy_brands_l')}
      data-carousel-ready={Boolean(carousel)}
    >
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.track}>
          {slides.map((entry, sourceIndex) => {
            const isActive = sourceIndex === index

            return (
              <div key={entry.id} className={styles.slideFrame}>
                <article
                  className={styles.slide}
                  data-active={isActive}
                  data-hero-active={isActive}
                  aria-hidden={!isActive}
                  aria-roledescription="slide"
                  aria-label={`${sourceIndex + 1} / ${slides.length}`}
                  inert={!isActive || undefined}
                >
                  <div className={styles.art}>
                    <div className={styles.artFrame}>
                      {/* A fill image is bounded by the visible art frame. This keeps
                          portrait assets, such as the PS5, fully visible rather than
                          letting their intrinsic height overflow the frame. */}
                      <Image
                        src={assetPath(entry.image)}
                        alt={entry.alt}
                        fill
                        sizes="(max-width: 833px) calc(100vw - 64px), 60vw"
                        className={styles.artImage}
                        preload={sourceIndex === 0}
                      />
                    </div>
                    {entry.badgeKey && (
                      <span className={styles.badge}>{t(entry.badgeKey)}</span>
                    )}
                  </div>

                  {/* Apple's caption is one line under the artwork: the call to
                      action, the headline in bold, then the supporting sentence
                      after a separator dot. */}
                  <div className={styles.caption}>
                    {primaryCta(entry) && (
                      <Button
                        href={ctaHref(primaryCta(entry)!)}
                        variant="quiet"
                        className={styles.captionCta}
                      >
                        {t(primaryCta(entry)!.labelKey)}
                      </Button>
                    )}

                    <div className={styles.captionText}>
                      {/* h2, not h1: this heading changes on a timer. */}
                      <h2 className={styles.title}>{entry.title}</h2>
                      <span className={styles.separator} aria-hidden="true">
                        •
                      </span>
                      <span className={styles.tag}>{t(entry.tagKey)}</span>
                    </div>

                    {secondaryCta(entry) && (
                      <Link
                        className={styles.captionLink}
                        href={ctaHref(secondaryCta(entry)!)}
                      >
                        {t(secondaryCta(entry)!.labelKey)}
                      </Link>
                    )}
                  </div>

                </article>
              </div>
            )
          })}
        </div>
      </div>

      <p className="visually-hidden" aria-live={isStopped ? 'polite' : 'off'}>
        {`${index + 1} / ${slides.length} — ${slide.title}`}
      </p>

      <div className={styles.controls}>
        <div className={styles.dots}>
          {slides.map((entry, dotIndex) => (
            <button
              key={entry.id}
              type="button"
              className={styles.dot}
              aria-current={dotIndex === index}
              aria-label={entry.title}
              onClick={() => showSlide(dotIndex)}
            />
          ))}
        </div>
        {slides.length > 1 && (
          <button
            type="button"
            className={styles.playPause}
            aria-pressed={isStopped}
            aria-label={isStopped ? t('hero_play') : t('hero_pause')}
            onClick={() => setIsStopped((stopped) => !stopped)}
          >
            {isStopped ? <PlayIcon /> : <PauseIcon />}
          </button>
        )}
      </div>
    </section>
  )
}

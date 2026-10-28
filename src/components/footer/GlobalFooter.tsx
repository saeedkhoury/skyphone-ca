'use client'

import Link from 'next/link'
import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { categories } from '@/lib/catalog/categories'
import { repairServices } from '@/lib/repairs/repairs'
import { useTheme, type Theme } from '@/lib/theme/ThemeContext'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { SHOP, mapsLink, telLink, whatsappLink } from '@/lib/shop'
import { ChevronIcon } from '../nav/NavIcons'
import styles from './GlobalFooter.module.css'

const THEME_OPTIONS: readonly { value: Theme; labelKey: string }[] = [
  { value: 'light', labelKey: 'theme_light' },
  { value: 'dark', labelKey: 'theme_dark' },
  { value: 'auto', labelKey: 'theme_auto' },
]

export function GlobalFooter() {
  const { theme, setTheme } = useTheme()
  const { locale, t } = useLocale()
  const [openColumn, setOpenColumn] = useState<string | null>(null)

  /** Light/Dark/Auto is one choice among three: a radio group, not three toggles. */
  function onThemeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
    if (!keys.includes(event.key)) return

    event.preventDefault()
    const current = THEME_OPTIONS.findIndex((option) => option.value === theme)
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    const next = (current + step + THEME_OPTIONS.length) % THEME_OPTIONS.length

    setTheme(THEME_OPTIONS[next].value)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  const columns = [
    {
      key: 'products',
      title: t('nav_products'),
      links: categories.map((category) => ({
        label: t(category.labelKey),
        href: `/${locale}/store/${category.id}`,
      })),
    },
    {
      key: 'repairs',
      title: t('nav_repairs'),
      links: repairServices
        .slice(0, 5)
        .map((service) => ({ label: t(service.labelKey), href: `/${locale}/repairs` })),
    },
    {
      key: 'shop',
      title: t('nav_about'),
      links: [
        { label: t('ab_story_h'), href: `/${locale}/about` },
        { label: t('ab_faq_h'), href: `/${locale}/about` },
        { label: t('nav_bag'), href: `/${locale}/cart` },
      ],
    },
  ]

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          {columns.map((column) => {
            const isOpen = openColumn === column.key
            return (
              <div key={column.key} className={styles.column}>
                <h2 className={styles.columnTitle}>{column.title}</h2>

                <button
                  type="button"
                  className={styles.accordionToggle}
                  aria-expanded={isOpen}
                  aria-controls={`footer-${column.key}`}
                  onClick={() => setOpenColumn(isOpen ? null : column.key)}
                >
                  {column.title}
                  <ChevronIcon />
                </button>

                <div className={styles.panel} id={`footer-${column.key}`} data-open={isOpen}>
                  {column.links.map((link) => (
                    <Link key={link.label} href={link.href} className={styles.columnLink}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}

          <div className={styles.column}>
            <h2 className={styles.columnTitle}>{t('ab_contact_h')}</h2>

            <button
              type="button"
              className={styles.accordionToggle}
              aria-expanded={openColumn === 'contact'}
              aria-controls="footer-contact"
              onClick={() => setOpenColumn(openColumn === 'contact' ? null : 'contact')}
            >
              {t('ab_contact_h')}
              <ChevronIcon />
            </button>

            <div
              className={styles.panel}
              id="footer-contact"
              data-open={openColumn === 'contact'}
            >
              <a href={telLink()} className={styles.columnLink}>
                {SHOP.phone}
              </a>
              <a
                href={whatsappLink(t('wa_contact_head'))}
                className={styles.columnLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('ab_wa_l')}
              </a>
              <a
                href={mapsLink()}
                className={styles.columnLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('ab_addr_v')}
              </a>
              <a
                href={SHOP.instagram}
                className={styles.columnLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {SHOP.instagramHandle}
              </a>
              <a
                href={SHOP.facebook}
                className={styles.columnLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('social_facebook')}
              </a>
            </div>
          </div>
        </div>

        <div className={styles.base}>
          <div className={styles.legal}>
            <span>
              © {new Date().getFullYear()} {SHOP.name} · {t('foot_est')}
            </span>
            <Link href={`/${locale}/about`} className={styles.columnLink}>
              {t('foot_privacy')}
            </Link>
          </div>

          <div
            className={styles.themeToggle}
            role="radiogroup"
            aria-label={t('theme_label')}
            onKeyDown={onThemeKeyDown}
          >
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                className={styles.themeOption}
                aria-checked={theme === option.value}
                tabIndex={theme === option.value ? 0 : -1}
                onClick={() => setTheme(option.value)}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.disclaimer}>{t('foot_tag')}</p>

        <p className={styles.credit}>
          <a
            href="https://skova.dev"
            target="_blank"
            rel="noopener"
            dir="ltr"
            lang="en"
            aria-label="Developed by SKOVA (opens in a new tab)"
          >
            Developed by ©SKOVA
          </a>
        </p>
      </div>
    </footer>
  )
}

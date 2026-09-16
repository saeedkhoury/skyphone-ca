import Link from 'next/link'
import Image from 'next/image'
import { assetPath } from '@/lib/asset-path'
import { HeroCarousel, type HeroSlide } from '@/components/hero/HeroCarousel'
import { ProductTile } from '@/components/tiles/ProductTile'
import { TileGrid } from '@/components/tiles/TileGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { RepairStrip } from '@/components/repairs/RepairStrip'
import { ReelsRow } from '@/components/reels/ReelsRow'
import { categories } from '@/lib/catalog/categories'
import { getHighlights, getProductBySlug, getProductsByCategory } from '@/lib/catalog/query'
import { isLocale, translate } from '@/lib/i18n/config'
import { SHOP } from '@/lib/shop'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = (key: string) => translate(locale, key)
  const ps5 = getProductBySlug('playstation-5')
  const allApple = `/${locale}/store/all?brand=apple`

  // The shop's own four hero ads, carried over as-authored.
  const slides: HeroSlide[] = [
    {
      id: 'duo',
      badgeKey: 'soon_badge',
      title: 'iPhone Duo',
      tagKey: 'ad_duo_tag',
      noteKey: 'ad_duo_note',
      image: '/img/iphone-duo.png',
      alt: 'iPhone Duo',
      ctas: [
        { labelKey: 'ad_duo_cta', variant: 'primary', whatsappKey: 'wa_duo' },
        { labelKey: 'ad_i18_cta2', variant: 'secondary', href: allApple },
      ],
    },
    {
      id: 'iphone18',
      badgeKey: 'soon_badge',
      title: 'iPhone 18 Pro',
      tagKey: 'ad_i18_tag',
      noteKey: 'ad_i18_note',
      image: '/img/iphone18-pro.png',
      alt: 'iPhone 18 Pro',
      ctas: [
        { labelKey: 'ad_i18_cta', variant: 'primary', whatsappKey: 'wa_i18' },
        { labelKey: 'ad_i18_cta2', variant: 'secondary', href: allApple },
      ],
    },
    ...(ps5
      ? [
          {
            id: 'ps5',
            badgeKey: 'instock_badge',
            title: ps5.name,
            tagKey: 'ps5_tag',
            image: '/img/ps5-2.png',
            alt: ps5.name,
            product: ps5,
            ctas: [
              {
                labelKey: 'ps5_cta1',
                variant: 'primary' as const,
                href: `/${locale}/product/${ps5.slug}`,
              },
              { labelKey: 'ask_wa', variant: 'secondary' as const, whatsappKey: 'wa_ps5' },
            ],
          },
        ]
      : []),
    {
      id: 'repairs',
      badgeKey: 'sameday_badge',
      title: t('rp_title'),
      tagKey: 'rp_hero_tag',
      image: '/img/repair-collage.png',
      alt: t('rp_title'),
      ctas: [
        { labelKey: 'fy_cta2', variant: 'primary', href: `/${locale}/repairs` },
        { labelKey: 'fy_cta1', variant: 'secondary', href: `/${locale}/store/all` },
      ],
    },
  ]

  const appleHighlights = getHighlights('apple', 3)
  const samsungHighlights = getHighlights('samsung', 3)
  const gamingHighlights = getHighlights('sony', 2)

  return (
    <>
      <h1 className="visually-hidden">
        {SHOP.name} — {t('ab_lead')}
      </h1>

      <HeroCarousel slides={slides} />

      <section className="container section">
        <SectionHeader title={t('nav_products')} subtitle={t('pr_sub')} />
        <TileGrid columns={6}>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${locale}/store/${category.id}`}
              className={styles.categoryTile}
            >
              <span className={styles.categoryArt}>
                <Image
                  src={assetPath(getProductsByCategory(category.id)[0]?.image ?? '/img/charger.webp')}
                  alt=""
                  width={180}
                  height={180}
                  className={styles.categoryPhoto}
                  sizes="180px"
                />
              </span>
              <h3 className={styles.categoryName}>{t(category.labelKey)}</h3>
            </Link>
          ))}
        </TileGrid>
      </section>

      <section className="container section">
        <SectionHeader
          title={t('apple_head')}
          subtitle={t('apple_sub')}
          action={{ href: allApple, label: t('filter_all') }}
        />
        <TileGrid columns={3}>
          {appleHighlights.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </TileGrid>
      </section>

      <section className="container section">
        <SectionHeader
          title={t('samsung_head')}
          subtitle={t('samsung_sub')}
          action={{ href: `/${locale}/store/all?brand=samsung`, label: t('filter_all') }}
        />
        <TileGrid columns={3}>
          {samsungHighlights.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </TileGrid>
      </section>

      <section className="container section">
        <SectionHeader
          title={t('fy_game_head')}
          subtitle={t('fy_game_sub')}
          action={{ href: `/${locale}/store/gaming`, label: t('filter_all') }}
        />
        <TileGrid columns={2}>
          {gamingHighlights.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </TileGrid>
      </section>

      <RepairStrip locale={locale} />

      <ReelsRow locale={locale} />

      <section className="container section">
        <div className={styles.trust}>
          <div className={styles.trustItem}>
            <span className={styles.trustNumber}>{t('trust_years_n')}</span>
            <span className={styles.trustLabel}>{t('trust_years_l')}</span>
          </div>
          <div className={styles.trustItem}>
            <span className={styles.trustNumber}>{t('trust_ig_n')}</span>
            <span className={styles.trustLabel}>{t('trust_ig_l')}</span>
          </div>
          <div className={styles.trustItem}>
            <span className={styles.trustNumber}>{t('trust_lang_n')}</span>
            <span className={styles.trustLabel}>{t('trust_lang_l')}</span>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className={styles.banner}>
          <h2 className={styles.bannerTitle}>{t('fy_acc_head')}</h2>
          <p className={styles.bannerCopy}>{t('fy_acc_sub')}</p>
          <Button href={`/${locale}/store/accessories`} large>
            {t('fy_cta1')}
          </Button>
        </div>
      </section>
    </>
  )
}

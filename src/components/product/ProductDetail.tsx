'use client'

import Image from 'next/image'
import { assetPath } from '@/lib/asset-path'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Lightbox } from '@/components/ui/Lightbox'
import { useCart } from '@/lib/cart/CartContext'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { formatPriceFor } from '@/lib/format/currency'
import { priceForVariant } from '@/lib/catalog/query'
import type { Product } from '@/lib/catalog/types'
import styles from './ProductDetail.module.css'

export function ProductDetail({ product }: { product: Product }) {
  const { locale, t } = useLocale()
  const { addItem } = useCart()

  const [colourName, setColourName] = useState(product.colors?.[0]?.name)
  const [storageLabel, setStorageLabel] = useState(product.storage?.[0]?.label)
  const [imageIndex, setImageIndex] = useState(0)
  const [justAdded, setJustAdded] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)

  const colour = product.colors?.find((entry) => entry.name === colourName)
  // A colour with its own photography leads the gallery, followed by the
  // product's other angles — picking a colour should not lose the extra shots.
  const gallery = colour?.images?.length
    ? [...new Set([...colour.images, ...product.images])]
    : product.images
  const activeImage = gallery[Math.min(imageIndex, gallery.length - 1)]
  const price = priceForVariant(product, storageLabel)
  const variantName = [colourName, storageLabel].filter(Boolean).join(' · ')

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        variantId: variantName || 'default',
        name: product.name,
        variantName: variantName || product.name,
        unitPrice: price,
        slug: product.slug,
      },
      1,
    )
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 2600)
  }

  return (
    <div className={`container ${styles.layout}`}>
      <div className={styles.gallery}>
        {/* The whole stage is the control: on a phone the image is the thing
            people press, not a separate zoom affordance beside it. */}
        <button
          type="button"
          className={styles.stage}
          aria-label={t('lb_hint')}
          onClick={() => setIsZoomed(true)}
        >
          <Image
            src={assetPath(activeImage)}
            alt={product.name}
            width={640}
            height={640}
            className={styles.stageImage}
            priority
            sizes="(max-width: 833px) 90vw, 520px"
          />
          <span className={styles.zoomHint} aria-hidden="true">
            {t('lb_hint')}
          </span>
        </button>

        {gallery.length > 1 && (
          <ul className={styles.thumbs}>
            {gallery.map((src, index) => (
              <li key={src}>
                <button
                  type="button"
                  className={styles.thumb}
                  aria-current={index === imageIndex}
                  aria-label={`${product.name} ${index + 1}`}
                  onClick={() => setImageIndex(index)}
                >
                  <Image src={assetPath(src)} alt="" width={72} height={72} className={styles.thumbImage} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {product.badge && (
          <p className={styles.badge}>{t(product.badge === 'new' ? 'new' : 'instock_badge')}</p>
        )}
        <h1 className={styles.title}>{product.name}</h1>
        <p className={styles.description}>{product.description[locale]}</p>

        {product.colors && product.colors.length > 0 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{t('pdp_color')}</legend>
            <div className={styles.swatches}>
              {product.colors.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={styles.swatch}
                  aria-pressed={entry.name === colourName}
                  aria-label={entry.name}
                  title={entry.name}
                  onClick={() => {
                    setColourName(entry.name)
                    setImageIndex(0)
                  }}
                >
                  <span className={styles.swatchDot} style={{ backgroundColor: entry.hex }} />
                </button>
              ))}
            </div>
            <p className={styles.swatchName}>{colourName}</p>
          </fieldset>
        )}

        {product.storage && product.storage.length > 0 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              {product.variant2Label ?? t('pdp_storage')}
            </legend>
            <div className={styles.options}>
              {product.storage.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  className={styles.option}
                  aria-pressed={entry.label === storageLabel}
                  onClick={() => setStorageLabel(entry.label)}
                >
                  <span>{entry.label}</span>
                  <span className={styles.optionPrice}>
                    {formatPriceFor(locale, product.price + entry.delta)}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className={styles.buyRow}>
          <span className={styles.price}>{formatPriceFor(locale, price)}</span>
          <Button onClick={handleAdd} large>
            {t('pdp_add')}
          </Button>
          {justAdded && (
            <span className={styles.added} role="status">
              {t('added')}
            </span>
          )}
        </div>

        <p className={styles.note}>{t('pdp_warranty_body')}</p>
      </div>

      {isZoomed && (
        <Lightbox
          images={gallery}
          index={Math.min(imageIndex, gallery.length - 1)}
          alt={product.name}
          onIndexChange={setImageIndex}
          onClose={() => setIsZoomed(false)}
        />
      )}
    </div>
  )
}

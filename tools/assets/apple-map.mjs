/**
 * Apple image keys, curated per product and colour.
 *
 * Apple's CDN key naming differs by product family and launch year, and the
 * colour pickers are built in JavaScript, so there is no single rule to derive
 * these. Each entry lists candidates in preference order; the downloader takes
 * the first that resolves, which keeps the map resilient when Apple rotates a
 * suffix.
 */
export const APPLE = {
  'iphone-15-pro': {
    colours: {
      'Natural Titanium': ['iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium'],
      'Blue Titanium': ['iphone-15-pro-finish-select-202309-6-1inch-bluetitanium'],
      'White Titanium': ['iphone-15-pro-finish-select-202309-6-1inch-whitetitanium'],
      'Black Titanium': ['iphone-15-pro-finish-select-202309-6-1inch-blacktitanium'],
    },
  },
  'iphone-14': {
    colours: {
      Midnight: ['iphone-14-finish-select-202209-6-1inch-midnight'],
      Starlight: ['iphone-14-finish-select-202209-6-1inch-starlight'],
      Blue: ['iphone-14-finish-select-202209-6-1inch-blue'],
      '(PRODUCT)RED': ['iphone-14-finish-select-202209-6-1inch-product-red'],
    },
  },
  'iphone-17': {
    colours: {
      Lavender: ['iphone-17-finish-select-lavender-202509'],
      Sage: ['iphone-17-finish-select-sage-202509'],
      'Mist Blue': ['iphone-17-finish-select-mistblue-202509'],
      White: ['iphone-17-finish-select-white-202509'],
      Black: ['iphone-17-finish-select-black-202509'],
    },
  },
  'iphone-17-pro': {
    colours: {
      'Cosmic Orange': ['iphone-17-pro-finish-select-202509-6-3inch-cosmicorange'],
      'Deep Blue': ['iphone-17-pro-finish-select-202509-6-3inch-deepblue'],
      Silver: ['iphone-17-pro-finish-select-202509-6-3inch-silver'],
    },
  },
  'iphone-17-pro-max': {
    colours: {
      'Cosmic Orange': ['iphone-17-pro-finish-select-202509-6-9inch-cosmicorange'],
      'Deep Blue': ['iphone-17-pro-finish-select-202509-6-9inch-deepblue'],
      Silver: ['iphone-17-pro-finish-select-202509-6-9inch-silver'],
    },
  },
  // Apple only publishes swatch circles per colour for iPad Air, not device
  // renders, so this takes the official gallery shot as the single image
  // rather than shipping four coloured dots.
  'ipad-air': { main: ['ipad-air-model-unselect-gallery-1-202405'] },
  'macbook-air': {
    colours: {
      Midnight: ['mba13-midnight-select-202503'],
      Starlight: ['mba13-starlight-select-202503', 'mba15-starlight-select-202503'],
      'Sky Blue': ['mba13-skyblue-select-202503'],
      Silver: ['mba13-silver-select-202503'],
    },
  },
  'macbook-pro-14': {
    colours: {
      'Space Black': ['mbp14-spaceblack-select-202410'],
      Silver: ['mbp14-silver-select-202410'],
    },
  },
  'ipad-pro': {
    colours: {
      'Space Black': ['ipad-pro-13-select-wifi-spaceblack-202405'],
      Silver: ['ipad-pro-13-select-wifi-silver-202405'],
    },
  },
  ipad: {
    colours: {
      Blue: ['ipad-10th-gen-finish-blue-2022'],
      Pink: ['ipad-10th-gen-finish-pink-2022'],
      Silver: ['ipad-10th-gen-finish-silver-2022'],
      Yellow: ['ipad-10th-gen-finish-yellow-2022'],
    },
  },
  'apple-watch-ultra-2': {
    colours: {
      'Natural Titanium': ['watch-compare-ultra-4-202609'],
      'Black Titanium': ['watch-compare-ultra-4-202609'],
    },
  },
  'airpods-pro-2': { main: ['airpods-pro-3-hero-select-202509'] },
  'airpods-4': { main: ['airpods-4-select-202409'] },
}

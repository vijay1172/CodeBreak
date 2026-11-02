# The Borrowed Language

## Product context

Shoppers switch the catalogue from English to French, but some product pages keep the English title and description. A different product may appear in the correct language. The problem also seems to depend on which language was used first after the service restarted.

## How to reproduce

1. Open **Travel essentials** in Live Preview and let the initial **Mug** product finish loading in **English**.
2. Change **Language** to **Français**.
3. The mug should show **Tasse de voyage** and its French description; observe whether English text remains.
4. With French still selected, change **Product** to **Bag**, then return to Mug.
5. Repeat with **Español**. Each product must consistently reflect the selected language regardless of earlier requests.

## Expected behavior

- `GET /api/products` returns `200 { products: [...] }`, including product `sku: string` and `priceCents: integer`.
- `GET /api/products/:sku?locale=en|fr|es` returns `200 { sku: string, title: string, summary: string, priceCents: integer, locale: string }`.
- Omitted locale defaults to English. A requested supported language determines both title and summary; switching language must not alter the product identity or price.
- The mug costs 1500 cents and the bag costs 2400 cents.
- Repeated equivalent requests return consistent complete product data. Interleaving products/languages must not mix translations.
- Unsupported locales return `422`. Missing products return `404`. Errors contain `error: string` and `requestId: string`.
- This is a read-only catalogue without a separate login/ownership model; BrokenRepo controls sandbox access.

## Constraints

Preserve the existing language choices, product prices, routes, response fields, and bounded server-side caching behavior. Do not remove translations, force every request into one language, or introduce a new dependency. Tests do not prescribe a particular cache representation or database call count.

## Success criteria

1. A first lookup returns the complete requested translation with the correct product and price.
2. Repeated equivalent requests return consistent complete responses.
3. Interleaved requests keep translations independent across products and languages.
4. Unsupported locales produce meaningful `422` responses without corrupting later valid responses.
5. Missing products consistently return `404` without interfering with known-product lookups.

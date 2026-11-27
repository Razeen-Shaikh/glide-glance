# API reference

Responses use `{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message", "fields?" } }`.

Mutations require a same-origin `Origin` header. Admin routes re-read the user role from the database. Customer routes that take an id check ownership.

## Authentication

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| GET, POST | `/api/auth/[...nextauth]` | Auth.js handlers |
| POST | `/api/auth/logout` | Session |
| POST | `/api/auth/forgot-password` | Public |
| POST | `/api/auth/reset-password` | Public |

## Catalog

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/products` | Public. Query: `q`, `category`, `brand`, `minPrice`, `maxPrice`, `rating`, `availability`, `sort`, `page`, `limit`, `ids` |
| POST | `/api/products` | Admin |
| GET | `/api/products/:id` | Public. `:id` may be a product id or slug |
| PATCH, DELETE | `/api/products/:id` | Admin. Delete archives products that have orders |
| GET, POST | `/api/products/:id/reviews` | Post requires a customer |
| GET, POST | `/api/categories` | Post requires admin |
| PATCH, DELETE | `/api/categories/:id` | Admin |
| GET, POST | `/api/brands` | Post requires admin |
| PATCH, DELETE | `/api/brands/:id` | Admin |

`sort` is `newest`, `popularity`, `price_asc`, or `price_desc`.

## Cart and wishlist

Guest identity is the `gg_guest` cookie. Signed-in carts use the user id. `POST /api/cart/merge` copies the guest cart and wishlist onto the user.

| Method | Path |
| --- | --- |
| GET | `/api/cart` |
| POST | `/api/cart/items` |
| PATCH, DELETE | `/api/cart/items/:id` |
| POST, DELETE | `/api/cart/coupon` |
| POST | `/api/cart/merge` |
| GET, POST | `/api/wishlist` |
| DELETE | `/api/wishlist/:id` |
| POST | `/api/wishlist/:id/move` |

## Orders and payments

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/orders` | Places the order from the current cart |
| GET | `/api/orders` | Signed-in customer |
| GET | `/api/orders/:orderNumber` | Owner or the browser that placed it |
| PATCH | `/api/orders/:orderNumber/cancel` | Customer, before shipment |
| POST | `/api/orders/:orderNumber/returns` | Customer, within 7 days of delivery |
| GET | `/api/orders/track` | `orderNumber` and `email` |
| POST | `/api/payments/create-order` | Retries Razorpay for a pending order |
| POST | `/api/payments/verify` | Verifies signature and fetches the payment |
| POST | `/api/payments/webhook` | Razorpay signature on the raw body |

## Account

| Method | Path |
| --- | --- |
| GET, PATCH | `/api/account` |
| GET, POST | `/api/account/addresses` |
| PATCH, DELETE | `/api/account/addresses/:id` |
| POST | `/api/newsletter` |

## Admin

| Method | Path |
| --- | --- |
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/analytics` |
| GET | `/api/admin/products` |
| GET | `/api/admin/products/:id` |
| GET | `/api/admin/orders` |
| GET, PATCH | `/api/admin/orders/:orderNumber` |
| POST | `/api/admin/orders/:orderNumber/return` |
| GET | `/api/admin/customers` |
| GET, PATCH | `/api/admin/customers/:id` |
| GET, POST | `/api/admin/coupons` |
| PATCH, DELETE | `/api/admin/coupons/:id` |
| GET, POST | `/api/admin/inventory` |
| POST | `/api/admin/uploads` |

## Maintenance

`POST /api/cron/release-reservations` with `Authorization: Bearer <CRON_SECRET>` cancels prepaid orders that are still unpaid after 30 minutes and returns their reserved stock.

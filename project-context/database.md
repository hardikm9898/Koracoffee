# Database

MongoDB via Mongoose 8. Connection: `backend/src/config/db.js`, reads `MONGODB_URI`.
All models use `{ timestamps: true }` (adds `createdAt`/`updatedAt`) unless noted.
No model file imports another — relationships are Mongoose `ref` strings or,
in several important cases, **loose string/number matching instead of a real ref**
(flagged below).

## User (`models/User.js`)

| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `phoneNumber` | String | required, **unique**, indexed — the login identity |
| `isVerified` | Boolean | default `false` |
| `otpCode` | String | default `null` |
| `otpExpiresAt` | Date | default `null` |
| `lastLoginAt` | Date | default `null` |
| `addresses` | [embedded address] | default `[]` — **legacy**, see below |

No `isAdmin`/`role` field exists. Admin status is computed at request time from
an env allowlist — see [authentication.md](authentication.md).

`addresses` is an embedded sub-document array (legacy path). The **canonical**
address store is the standalone `Address` collection. `addressService.migrateEmbeddedAddresses`
lazily copies embedded addresses into `Address` on first read, but nothing ever
clears the embedded array afterward — it becomes stale/duplicate data. Never
write new address logic against `User.addresses`; use `Address`.

## Address (`models/Address.js`) — canonical address store

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId ref `User` | required, indexed |
| `label` | String | default `"Home"` |
| `name`, `phone`, `address`, `city`, `state`, `country` | String | required |
| `apartment`, `company` | String | default `""` |
| `zip` | String | required |
| `isDefault` | Boolean | default `false` |

## Product (`models/Product.js`)

| Field | Type | Notes |
|---|---|---|
| `productId` | Number | required, **unique**, indexed — business-facing ID, distinct from `_id`, used everywhere else (Order, Review) instead of ObjectId |
| `name` | String | required |
| `category` | ObjectId ref `Category` | required |
| `basePrice` | Number | required, min 0 |
| `originalPrice` | Number | default `null` |
| `inStock` | Boolean | default `true` — recomputed by order controller from variant stock |
| `rating` | Number | default 4.5, 0–5 |
| `notes`, `description`, `origin` | String | required |
| `altitude`, `process` | String | default `""` |
| `image` | String | default `null`, legacy single image |
| `images` | [String] | multi-image array (primary display source) |
| `featured` | Boolean | default `false` |
| `stats` | embedded `{ acidity, body, sweetness, complexity, finish }` | each Number 1–5, default 3 |
| `serve` | embedded `{ vessel, grind, temp, time }` | each String, default `""` |
| `variantAttribute` | String | default `"Variant"` (e.g. "Grind"/"Size" label) |
| `variants` | [`{ label, price, discountPrice, stock }`] | default `[]` — real stock tracking lives here |

## Category (`models/Category.js`)

| Field | Type | Notes |
|---|---|---|
| `name` | String | required, **unique** |
| `image` | String | default `""` |
| `active` | Boolean | default `true` |

No cascade protection: deleting a Category does not check/block existing
`Product.category` references — orphaned refs are possible.

## Cart (`models/Cart.js`)

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId ref `User` | default `null`, indexed |
| `sessionId` | String | default `null`, indexed — guest cart key |
| `items` | [`{ productId, name, basePrice, price, quantity, variant, image }`] | `productId` is the numeric Product ID |

No unique index on `user`/`sessionId` — duplicate carts are theoretically
possible under race conditions; prevented only by find-or-create logic in
`cartService`, not a DB constraint.

## Order (`models/Order.js`)

| Field | Type | Notes |
|---|---|---|
| `orderId` | Number | required, unique, indexed |
| `orderCode` | String | required, unique — format `AURA-<year>-<orderId padded to 4>` |
| `status` | String enum | `Received, Roasting, Packaging, Shipped, Delivered, Cancelled, Refunded` — default `Received` |
| `paymentMethod` | String | default `"Card"` |
| `cancelReason`, `refundReason` | String | default `""` |
| `items` | [`{ productId, name, variant, quantity, price, image }`] | required, non-empty (custom validator) |
| `itemStatus` | [per-item status sub-schema] | **defined but never read/written anywhere in controllers — dead field** |
| `shipping` | embedded `{ name, email, phone, address, city, state, country, apartment, company, zip }` | required. **No `user` ObjectId field at all** |
| `subtotal`, `shippingFee`, `tax`, `total` | Number | required, min 0 |
| `eta` | String | default `"Preparing your roast"` |
| `couponCode` | String | default `""` |
| `discountAmount` | Number | default 0 |
| `discountLabel` | String | default `""` |
| `notes` | String | default `""` |

**Important**: Orders are linked to a `User` only indirectly, by string-matching
`shipping.phone` against `User.phoneNumber` in `adminUserController.getUserOrderHistory`.
There is no `Order.user` ref. See [known-limitations.md](known-limitations.md) —
this breaks if a customer orders with a different contact phone than their
account phone.

## Review (`models/Review.js`)

| Field | Type | Notes |
|---|---|---|
| `productId` | Number | required, indexed — matches `Product.productId`, not an ObjectId ref |
| `user` | ObjectId ref `User` | default `null` — optional, since review creation isn't behind auth middleware, `req.user` is effectively always undefined in practice |
| `name` | String | required |
| `phoneNumber` | String | default `""` |
| `rating` | Number | required, 1–5, indexed |
| `content` | String | required, max 2000 chars |
| `images` | [String] | default `[]` |
| `status` | String enum `pending`/`approved` | default `"pending"` — **no "rejected" state; moderation is binary approve-or-delete** |

Compound index: `{ productId: 1, status: 1, createdAt: -1 }` — optimized for
"approved reviews for product X, newest first".

## Cross-model relationship summary

```
Category ←── Product.category (ObjectId ref)
User     ←── Address.user (ObjectId ref)
User     ←── Cart.user (ObjectId ref, optional)
User     ←── Review.user (ObjectId ref, optional, effectively unused)
Product.productId (Number) ←── loosely referenced by:
    Cart.items[].productId
    Order.items[].productId
    Review.productId
User.phoneNumber (String) ←── loosely matched against Order.shipping.phone
    (no real FK — this is the only way to compute "a user's orders")
```

No model uses a real foreign key to `Product` except `Category` (the reverse
direction). Everything downstream of `Product` (`Cart`, `Order`, `Review`)
snapshots data by numeric `productId` rather than `populate()`-ing a live
reference — intentional for order/review history stability, but means product
name/price changes never retroactively affect past carts/orders/reviews
(carts do get stale prices until re-added, though — see [cart-flow.md](feature-flows/cart-flow.md)).

## Coupons are not a database table

There is no `Coupon` model. Valid codes (`AURA20`, `FREESHIP`, `WELCOME50`) are
hardcoded in `orderController.js` (backend) and separately hardcoded again in
the checkout/profile frontend pages. See [checkout-order-flow.md](feature-flows/checkout-order-flow.md).

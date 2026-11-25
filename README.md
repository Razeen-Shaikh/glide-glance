# Glide Glance

Glide Glance is a full-stack store for apparel, footwear, home, and accessories. The storefront, admin dashboard, and REST API run in one Next.js app. PostgreSQL is the system of record. Prices are INR and include GST.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Prisma and PostgreSQL
- Auth.js with email/password and optional Google sign-in
- Razorpay for UPI, cards, net banking, and wallets
- Cash on delivery handled by the store
- Cloudinary for product images when configured
- Resend for order and password emails when configured

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Start PostgreSQL.

```bash
docker compose up -d
```

3. Copy the environment file and set secrets.

```bash
copy .env.example .env
```

Generate `AUTH_SECRET`, `ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD`, and `CRON_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

4. Apply the schema and load the sample catalog.

```bash
npx prisma migrate dev
npx prisma db seed
```

The database is published on port 5434 so it does not collide with another Postgres already on this machine. The seed creates an admin and a customer from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_CUSTOMER_EMAIL`, and `SEED_CUSTOMER_PASSWORD`.

5. Start the app.

```bash
npm run dev
```

Open http://localhost:3000. The admin dashboard is at http://localhost:3000/admin.

## Payments

Prepaid checkout creates a Razorpay order on the server and confirms it only after:

- the checkout signature matches `RAZORPAY_KEY_SECRET`, and
- Razorpay’s payment API reports the same order id and amount.

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID`. Point the Razorpay webhook to `POST /api/payments/webhook`.

Cash on delivery does not call Razorpay. The order is confirmed in the same database transaction that decrements stock.

Unpaid prepaid orders release their stock reservation after 30 minutes when something calls:

```bash
curl -X POST http://localhost:3000/api/cron/release-reservations -H "Authorization: Bearer %CRON_SECRET%"
```

## Images and email

With Cloudinary credentials, admin uploads go to Cloudinary. Without them, uploads are stored in `public/uploads`.

With `RESEND_API_KEY` and `EMAIL_FROM`, order and password emails are sent through Resend. In local development without a key, the message is printed in the server log.

## Google sign-in

Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Set `NEXT_PUBLIC_GOOGLE_ENABLED=true` to show the Google button. The redirect URI is `http://localhost:3000/api/auth/callback/google`.

## Tests

```bash
npm test
npm run test:e2e
```

Unit tests cover money, coupons, shipping, GST, the order state machine, and Razorpay signatures. Playwright covers browsing and adding a seeded product to the cart. Install browsers once with `npx playwright install chromium`.

## Deployment

- Run the app as a Node server (`npm run build` then `npm start`) or on a host that supports the Next.js Node runtime. Cache Components require the Node.js runtime.
- Provide `DATABASE_URL` for PostgreSQL and run `npx prisma migrate deploy` before serving traffic.
- Set every secret from `.env.example` in the host’s environment. Do not commit `.env`.
- Serve the app over HTTPS so the auth cookie can be marked secure.
- Schedule `POST /api/cron/release-reservations` with the `CRON_SECRET` bearer token.
- Register the Razorpay webhook against the public `/api/payments/webhook` URL.

The API reference is in [docs/API.md](docs/API.md).

# E-Commerce

A database-backed React e-commerce portfolio demo, extended from the original React/Bootstrap storefront template. The original visual direction and template attribution are retained.

**Live demo:** https://ecommerce-nada.vercel.app/

## Working shopping flow

- PostgreSQL product catalog with product details, search, maximum-price filter and sorting
- Registration and sign-in with scrypt password hashing and revocable HttpOnly sessions
- Database-persisted guest and account carts, including guest-cart merge on sign-in
- Quantity updates, removal and totals calculated from server-side product prices
- Signed-in demo checkout and per-account order history
- Transactional, idempotent order submission to prevent duplicate orders on retries
- Responsive catalog, cart, account and checkout pages

## Demo limits

This is a **portfolio demo, not a real shop**. No payment is taken, no shipment is made, and all four products/prices are sample data. Use fictional account and address details only. Never enter real customer or card data.

Email verification, password recovery, stock management, fulfillment, payment processing and admin tools are not implemented. Some homepage, footer and secondary pages remain static examples from the original template. The app is not ready for commercial use without further security, accessibility and operations work.

## Tech stack

- React 18 and React Router 6, built with Create React App
- Bootstrap 5, bootstrap-icons and Font Awesome
- Node.js API deployed as a Vercel function
- Neon PostgreSQL through `@neondatabase/serverless`
- The repository retains some Redux/template code used by secondary pages; the connected shopping flow uses `src/shop.js`.

## Development

```bash
npm install
npm start
npm run build
```

`npm start` starts the frontend only. To run the connected API locally, use a Vercel development environment with a private `DATABASE_URL`. The API lives at `/api/index?action=products` and also supports account, cart and order actions. The API creates its dedicated tables and seeds the four sample products on first use.

Never prefix `DATABASE_URL` with `REACT_APP_`, put it in client code, or commit it. Set it privately in the Vercel server environment.

## Deployment

Vercel hosts both the frontend and API. `vercel.json` contains the build, API routing and SPA fallback configuration. Deploy the repository with `DATABASE_URL` configured for the required environments.

The former static-only Surge address cannot run the API. A manual GitHub Actions workflow is prepared to publish a redirect after `SURGE_LOGIN` and `SURGE_TOKEN` repository secrets are configured. The redirect has not been published: the legacy Surge address still serves the old frontend. Use the Vercel link above for the working connected app.

## Template attribution

This project extends the existing React-E-Commerce template. The original template's footer attribution is retained. The backend, authentication, persistent cart and demo-order flow are additions; the project does not claim the original template design as new work.

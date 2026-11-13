# E-Commerce

A front-end e-commerce storefront built with React 18 and Redux. It covers the full shopping flow: home, catalog browsing with filters, product details, cart, checkout, and account pages.

**Live demo:** https://e-commerce-template.surge.sh

## Features

- Home page with banner carousel, featured products, and deals-of-the-day countdown timers
- Product catalog with grid/list views, search, paging, and filters (category, price, color, size, rating, tags)
- Product detail pages with ratings & reviews, Q&A, size chart, and shipping & returns sections
- Cart with coupon code form, checkout flow, and invoice view
- Account pages: sign in, sign up, forgot password, profile, orders, wishlist, notifications, and settings
- Blog with list and article pages
- Contact us and support pages, plus custom 404/500 error pages
- Product data served from local mock data (`src/data/index.js`), so no backend is required

## Tech Stack

- React 18 (Create React App / react-scripts 5)
- Redux + redux-form for state management and forms
- React Router 6 with lazy-loaded routes
- Bootstrap 5, bootstrap-icons, and Font Awesome for the UI
- react-countdown for deal timers

## Getting Started

```bash
npm install
npm start
```

The app runs at http://localhost:3000.

To create a production build:

```bash
npm run build
```

## Deployment

Pushes to `main` deploy automatically to Surge via GitHub Actions (`.github/workflows/deploy-surge.yml`), using the `SURGE_LOGIN` and `SURGE_TOKEN` repository secrets.

## Database-backed portfolio demo

The original React/Bootstrap e-commerce template UI is retained as the starting point. The connected shopping flow now uses a dedicated PostgreSQL database and a server-side API on Vercel:

- Database product catalog, product details, search and price sorting/filtering
- Registration and sign-in with scrypt password hashing and revocable HttpOnly sessions
- Server-persisted guest and account carts, with guest-cart merge on sign-in
- Quantity updates, removal and totals calculated from server-side product prices
- Signed-in demo checkout and per-account order history, with idempotent order submission

This is a **portfolio demo, not a real shop**. No payment is taken, no shipment is made, and all products/prices are sample data. Use test account and address details only. Email verification, password recovery, stock management, fulfillment, payment processing and admin tools are not implemented. Some secondary pages remain static examples from the original template. Do not use real customer or card data.

### Vercel setup

Set `DATABASE_URL` privately in the project's server environment. Never prefix it with `REACT_APP_` or commit it. The API seeds four sample products and creates its dedicated tables on first use. Run `npm install` and `npm run build`. The old Surge static-only deployment cannot run the new API; use the Vercel deployment for the connected version.

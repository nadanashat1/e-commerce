const { Pool, neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = require('ws');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let ready;
async function init() {
 if (!ready) ready = (async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS shop_users(id uuid PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS shop_sessions(token_hash text PRIMARY KEY, user_id uuid REFERENCES shop_users(id), expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS shop_products(id integer PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS shop_cart(owner_key text NOT NULL, product_id integer REFERENCES shop_products(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(owner_key,product_id));
CREATE TABLE IF NOT EXISTS shop_orders(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES shop_users(id),items jsonb NOT NULL,total_cents integer NOT NULL,shipping jsonb NOT NULL,status text NOT NULL DEFAULT 'demo_confirmed',created_at timestamptz DEFAULT now(),request_key text,UNIQUE(user_id,request_key));
CREATE TABLE IF NOT EXISTS shop_rate_limits(key text PRIMARY KEY,hits integer NOT NULL,until_at timestamptz NOT NULL);`);
  for (const p of require('./products.json')) await pool.query('INSERT INTO shop_products(id,data) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[p.id,p]);
 })().catch(e=>{ready=null;throw e;});
 return ready;
}
module.exports={pool,init};

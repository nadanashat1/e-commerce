const crypto=require('crypto');
const {promisify}=require('util');
const scrypt=promisify(crypto.scrypt);
const {pool,init}=require('../server/db');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const secure=process.env.NODE_ENV==='production'||process.env.VERCEL;
const cookie=(res,token,maxAge=2592000)=>res.setHeader('Set-Cookie',`shop_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`);
const fail=(status,message)=>Object.assign(new Error(message),{status});
async function session(req){
 const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('shop_session='))?.slice(13);
 if(!token||!/^[a-f0-9]{64}$/.test(token)) return null;
 const r=await pool.query('SELECT s.token_hash,s.user_id,u.name,u.email FROM shop_sessions s LEFT JOIN shop_users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now()',[hash(token)]);
 return r.rows[0]||null;
}
async function newSession(res,userId){
 const token=crypto.randomBytes(32).toString('hex');
 await pool.query("INSERT INTO shop_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[hash(token),userId||null]);
 cookie(res,token);return {token_hash:hash(token),user_id:userId||null};
}
const owner=s=>s.user_id?'u:'+s.user_id:'g:'+s.token_hash;
async function cart(s){
 if(!s)return {items:[],total:0,count:0};
 const r=await pool.query('SELECT p.data,c.quantity FROM shop_cart c JOIN shop_products p ON p.id=c.product_id WHERE owner_key=$1 ORDER BY product_id',[owner(s)]);
 const items=r.rows.map(r=>({...r.data,quantity:r.quantity}));
 return {items,total:items.reduce((n,p)=>n+Math.round(p.price*100)*p.quantity,0)/100,count:items.reduce((n,p)=>n+p.quantity,0)};
}
async function rateLimit(req,action){
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
 const key=hash(ip+':'+action);
 const r=await pool.query("INSERT INTO shop_rate_limits(key,hits,until_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN shop_rate_limits.until_at<now() THEN 1 ELSE shop_rate_limits.hits+1 END,until_at=CASE WHEN shop_rate_limits.until_at<now() THEN now()+interval '15 minutes' ELSE shop_rate_limits.until_at END RETURNING hits",[key]);
 if(r.rows[0].hits>30)throw fail(429,'Too many attempts. Please try again in 15 minutes.');
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
  if(!['GET','POST','PUT','DELETE'].includes(req.method))throw fail(405,'Method not allowed');
  const url=new URL(req.url,'http://localhost'); const action=url.searchParams.get('action')||'products';
  if(req.method!=='GET'){
   const origin=req.headers.origin, host=req.headers['x-forwarded-host']||req.headers.host;
   if(origin&&new URL(origin).host!==host)throw fail(403,'Request origin not allowed');
   if(!String(req.headers['content-type']||'').includes('application/json'))throw fail(415,'JSON required');
  }
  if(!process.env.DATABASE_URL)throw fail(503,'Store backend is not configured');
  await init(); let s=await session(req); let body=req.body||{};
  if(typeof body==='string')body=JSON.parse(body);
  let result;
  if(action==='products'&&req.method==='GET'){
   const r=await pool.query('SELECT data FROM shop_products ORDER BY id');result={products:r.rows.map(r=>r.data)};
  }else if(action==='me'&&req.method==='GET')result={user:s?.user_id?{id:s.user_id,name:s.name,email:s.email}:null};
  else if(['register','login'].includes(action)&&req.method==='POST'){
   await rateLimit(req,action); const email=String(body.email||'').trim().toLowerCase();const password=String(body.password||'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128)throw fail(400,'Enter a valid email and a password of 10 to 128 characters.');
   let u;
   if(action==='register'){
    const name=String(body.name||'').trim();if(name.length<2||name.length>80)throw fail(400,'Name must be 2 to 80 characters.');
    const salt=crypto.randomBytes(16).toString('hex');const derived=await scrypt(password,salt,64);const id=crypto.randomUUID();
    try{const r=await pool.query('INSERT INTO shop_users(id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email',[id,name,email,salt+':'+derived.toString('hex')]);u=r.rows[0];}catch(e){if(e.code==='23505')throw fail(409,'This email is already registered. Please sign in.');throw e;}
   }else{
    const r=await pool.query('SELECT * FROM shop_users WHERE email=$1',[email]);u=r.rows[0];
    const salt=u?.password_hash.split(':')[0]||'0'.repeat(32);const derived=await scrypt(password,salt,64);const expected=Buffer.from(u?.password_hash.split(':')[1]||'0'.repeat(128),'hex');
    if(!u||!crypto.timingSafeEqual(derived,expected))throw fail(401,'Incorrect email or password.');
   }
   const previous=s;s=await newSession(res,u.id);
   if(previous&&!previous.user_id){
    await pool.query('INSERT INTO shop_cart(owner_key,product_id,quantity) SELECT $1,product_id,quantity FROM shop_cart WHERE owner_key=$2 ON CONFLICT(owner_key,product_id) DO UPDATE SET quantity=LEAST(99,shop_cart.quantity+EXCLUDED.quantity)',[owner(s),owner(previous)]);
    await pool.query('DELETE FROM shop_cart WHERE owner_key=$1',[owner(previous)]);
   }
   if(previous)await pool.query('DELETE FROM shop_sessions WHERE token_hash=$1',[previous.token_hash]);
   result={user:{id:u.id,name:u.name,email:u.email},cart:await cart(s)};
  }else if(action==='logout'&&req.method==='POST'){
   if(s)await pool.query('DELETE FROM shop_sessions WHERE token_hash=$1',[s.token_hash]);cookie(res,'',0);result={ok:true};
  }else if(action==='cart'){
   if(req.method==='GET')result=await cart(s);
   else{
    if(!s)s=await newSession(res,null);
    const id=Number(body.id);if(!Number.isInteger(id))throw fail(400,'Invalid product');
    if(req.method==='DELETE')await pool.query('DELETE FROM shop_cart WHERE owner_key=$1 AND product_id=$2',[owner(s),id]);
    else if(['POST','PUT'].includes(req.method)){
     const qty=Number(body.quantity??1);if(!Number.isInteger(qty)||qty<1||qty>99)throw fail(400,'Quantity must be between 1 and 99.');
     const p=await pool.query('SELECT id FROM shop_products WHERE id=$1',[id]);if(!p.rowCount)throw fail(404,'Product unavailable');
     if(req.method==='POST')await pool.query('INSERT INTO shop_cart(owner_key,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(owner_key,product_id) DO UPDATE SET quantity=LEAST(99,shop_cart.quantity+EXCLUDED.quantity)',[owner(s),id,qty]);
     else await pool.query('INSERT INTO shop_cart(owner_key,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(owner_key,product_id) DO UPDATE SET quantity=EXCLUDED.quantity',[owner(s),id,qty]);
    }else throw fail(405,'Method not allowed');result=await cart(s);
   }
  }else if(action==='orders'){
   if(!s?.user_id)throw fail(401,'Please sign in to view or place demo orders.');
   if(req.method==='GET'){
    const r=await pool.query('SELECT id,items,total_cents,shipping,status,created_at FROM shop_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[s.user_id]);result={orders:r.rows};
   }else if(req.method==='POST'){
    await rateLimit(req,'order');
    const shipping={};for(const [key,min,max] of [['name',2,80],['address',5,240],['city',2,80],['postalCode',2,24]]){const val=String(body.shipping?.[key]||'').trim();if(val.length<min||val.length>max)throw fail(400,'Please complete the shipping address.');shipping[key]=val;}
    const requestKey=String(body.requestKey||'');if(!/^[a-zA-Z0-9-]{16,64}$/.test(requestKey))throw fail(400,'Invalid order request. Refresh and try again.');
    const client=await pool.connect();
    try{
     await client.query('BEGIN');await client.query('SELECT id FROM shop_users WHERE id=$1 FOR UPDATE',[s.user_id]);
     const exists=await client.query('SELECT id,total_cents,status FROM shop_orders WHERE user_id=$1 AND request_key=$2',[s.user_id,requestKey]);
     if(exists.rowCount){result={order:exists.rows[0]};}
     else{
      const rows=await client.query('SELECT p.data,c.quantity FROM shop_cart c JOIN shop_products p ON p.id=c.product_id WHERE owner_key=$1 FOR UPDATE OF c',[owner(s)]);
      if(!rows.rowCount)throw fail(400,'Your cart is empty.');
      const items=rows.rows.map(r=>({id:r.data.id,name:r.data.name,img:r.data.img,price:r.data.price,quantity:r.quantity}));const total=items.reduce((n,p)=>n+Math.round(p.price*100)*p.quantity,0);const id=crypto.randomUUID();
      await client.query('INSERT INTO shop_orders(id,user_id,items,total_cents,shipping,request_key) VALUES($1,$2,$3,$4,$5,$6)',[id,s.user_id,JSON.stringify(items),total,JSON.stringify(shipping),requestKey]);
      await client.query('DELETE FROM shop_cart WHERE owner_key=$1',[owner(s)]);result={order:{id,total_cents:total,status:'demo_confirmed'}};
     }await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
   }else throw fail(405,'Method not allowed');
  }else throw fail(404,'Endpoint not found');
  res.statusCode=200;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(e){const status=e.status||500;console.error(status===500?'Store API error: '+(e.code||e.name):'Request rejected: '+status);res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:status===500?'Something went wrong. Please try again.':e.message}));}
};

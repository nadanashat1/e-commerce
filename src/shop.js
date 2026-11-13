import React,{createContext,useContext,useEffect,useState} from 'react';
export async function api(action,method='GET',body){
 const res=await fetch('/api/index?action='+action,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed');return data;
}
const Context=createContext();
export function ShopProvider({children}){
 const [user,setUser]=useState(null),[cart,setCart]=useState({items:[],total:0,count:0}),[products,setProducts]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
 const refreshCart=async()=>{const c=await api('cart');setCart(c);return c;};
 useEffect(()=>{Promise.all([api('me'),api('cart'),api('products')]).then(([m,c,p])=>{setUser(m.user);setCart(c);setProducts(p.products);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function updateCart(id,quantity,method='POST'){setError('');try{const c=await api('cart',method,{id,quantity});setCart(c);if(method==='POST')setNotice('Added to cart.');}catch(e){setError(e.message);throw e;}}
 async function auth(action,values){const r=await api(action,'POST',values);setUser(r.user);setCart(r.cart);return r;}
 async function logout(){await api('logout','POST',{});setUser(null);setCart({items:[],total:0,count:0});setNotice('Signed out.');}
 return <Context.Provider value={{user,cart,products,loading,error,setError,notice,setNotice,updateCart,refreshCart,auth,logout}}>{children}</Context.Provider>;
}
export const useShop=()=>useContext(Context);
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0);
export function ShopStatus(){const s=useShop();return <div className="container my-2"><div className="alert alert-info py-2 small mb-2">Portfolio demo. No real payments, shipments or purchases. Use test details only.</div>{s.error&&<div role="alert" className="alert alert-danger">{s.error}<button className="btn-close float-end" aria-label="Dismiss error" onClick={()=>s.setError('')}/></div>}{s.notice&&<div role="status" className="alert alert-success py-2">{s.notice}<button className="btn-close float-end" aria-label="Dismiss message" onClick={()=>s.setNotice('')}/></div>}</div>;}

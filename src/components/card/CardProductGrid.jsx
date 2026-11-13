import {Link} from 'react-router-dom';
import {useState} from 'react';
import {useShop,money} from '../../shop';
export default function CardProductGrid({data:p}){const {updateCart}=useShop();const [busy,setBusy]=useState(false);return <article className="card h-100"><Link to={'/product/detail?id='+p.id}><img src={p.img} className="card-img-top" style={{height:220,objectFit:'contain'}} alt={p.name}/></Link><div className="card-body d-flex flex-column"><h2 className="h6"><Link to={'/product/detail?id='+p.id}>{p.name}</Link></h2><p className="fw-bold">{money(p.price)}</p><button className="btn btn-primary mt-auto" disabled={busy} onClick={async()=>{setBusy(true);try{await updateCart(p.id,1);}catch{}finally{setBusy(false);}}}>{busy?'Adding...':'Add to cart'}</button></div></article>}

import { cloneDemoSeed } from "./demoData";

const KEY="ets_demo_database_v1";
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||cloneDemoSeed()}catch{return cloneDemoSeed()}};
const save=(db)=>localStorage.setItem(KEY,JSON.stringify(db));
const norm=v=>String(v??"").toLocaleLowerCase("tr-TR");

class Query{
 constructor(table,mode="select",payload=null){this.table=table;this.mode=mode;this.payload=payload;this.filters=[];this._limit=null;this._range=null;this._order=null;this._single=false;this._maybe=false;this._count=null}
 select(cols="*",opts={}){this._count=opts?.count||null;return this}
 insert(payload){this.mode="insert";this.payload=Array.isArray(payload)?payload:[payload];return this}
 update(payload){this.mode="update";this.payload=payload;return this}
 delete(){this.mode="delete";return this}
 upsert(payload){this.mode="upsert";this.payload=Array.isArray(payload)?payload:[payload];return this}
 eq(k,v){this.filters.push(r=>String(r?.[k])===String(v));return this}
 neq(k,v){this.filters.push(r=>String(r?.[k])!==String(v));return this}
 gt(k,v){this.filters.push(r=>r?.[k]>v);return this}
 gte(k,v){this.filters.push(r=>r?.[k]>=v);return this}
 lt(k,v){this.filters.push(r=>r?.[k]<v);return this}
 lte(k,v){this.filters.push(r=>r?.[k]<=v);return this}
 is(k,v){this.filters.push(r=>r?.[k]===v);return this}
 in(k,vals){this.filters.push(r=>(vals||[]).map(String).includes(String(r?.[k])));return this}
 match(obj){Object.entries(obj||{}).forEach(([k,v])=>this.eq(k,v));return this}
 contains(k,vals){this.filters.push(r=>Array.isArray(r?.[k])&&(vals||[]).every(v=>r[k].includes(v)));return this}
 ilike(k,p){const q=norm(String(p).replace(/%/g,""));this.filters.push(r=>norm(r?.[k]).includes(q));return this}
 or(expr){const parts=String(expr||"").split(",");this.filters.push(r=>parts.some(part=>{const [k,op,...rest]=part.split(".");const val=rest.join(".").replace(/^%|%$/g,"");if(op==="ilike")return norm(r?.[k]).includes(norm(val));if(op==="is")return val==="null"?r?.[k]==null:String(r?.[k])===val;if(op==="eq")return String(r?.[k]??"")===val;if(op==="lte")return r?.[k]<=val;if(op==="gte")return r?.[k]>=val;return false}));return this}
 order(k,{ascending=true}={}){this._order={k,ascending};return this}
 limit(n){this._limit=n;return this}
 range(a,b){this._range=[a,b];return this}
 single(){this._single=true;return this}
 maybeSingle(){this._maybe=true;return this}
 async exec(){const db=load();db[this.table]??=[];let rows=db[this.table];const match=r=>this.filters.every(f=>f(r));
   if(this.mode==="insert"){const inserted=this.payload.map((x,i)=>({...x,id:x.id??`${this.table}-demo-${Date.now()}-${i}`,created_at:x.created_at??new Date().toISOString()}));db[this.table].push(...inserted);save(db);rows=inserted}
   else if(this.mode==="update"){const out=[];db[this.table]=db[this.table].map(r=>match(r)?(out.push({...r,...this.payload}),{...r,...this.payload}):r);save(db);rows=out}
   else if(this.mode==="delete"){const removed=db[this.table].filter(match);db[this.table]=db[this.table].filter(r=>!match(r));save(db);rows=removed}
   else if(this.mode==="upsert"){const out=[];for(const x of this.payload){const keys=["username","task_key","id"];const key=keys.find(k=>x[k]!=null);const idx=key?db[this.table].findIndex(r=>String(r[key])===String(x[key])):-1;if(idx>=0){db[this.table][idx]={...db[this.table][idx],...x};out.push(db[this.table][idx])}else{const row={...x,id:x.id??`${this.table}-demo-${Date.now()}-${out.length}`};db[this.table].push(row);out.push(row)}}save(db);rows=out}
   else {rows=rows.filter(match)}
   if(this.table==="evraklar") rows=rows.map(r=>({...r,evrakseferler:db.evrakseferler.filter(x=>String(x.evrakid)===String(r.id)),evrakproje:db.evrakproje.filter(x=>String(x.evrakid)===String(r.id))}));
   if(this._order){const {k,ascending}=this._order;rows=[...rows].sort((a,b)=>String(a?.[k]??"").localeCompare(String(b?.[k]??""))*(ascending?1:-1))}
   const count=rows.length;if(this._range)rows=rows.slice(this._range[0],this._range[1]+1);if(this._limit!=null)rows=rows.slice(0,this._limit);
   const data=this._single?(rows[0]??null):this._maybe?(rows[0]??null):rows;return {data,error:null,count:this._count?count:null}}
 then(res,rej){return this.exec().then(res,rej)}
}
export const resetDemoDatabase=()=>localStorage.removeItem(KEY);
export const demoSupabase={
 from:(t)=>new Query(t),
 channel:()=>({on(){return this},subscribe(){return this}}),
 removeChannel:()=>{},
 storage:{from:()=>({upload:async(path,file)=>({data:{path},error:null}),getPublicUrl:(path)=>({data:{publicUrl:`https://demo.local/${path}`}}),remove:async()=>({error:null})})}
};

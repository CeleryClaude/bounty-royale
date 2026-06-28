const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.send('ok'));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const DEV = process.env.DEV === '1';
const CAP_HUMANS = 16;

const BND = 52, EVOLVE_AT = 22;
const CLASSES = {
  juggernaut:{ n:'Juggernaut', hp:1.7, dmg:1.3, spd:0.86, grow:1.08, hide:1.3,  steal:1.0, reach:1.0, col:'#D85A30', cd:7000, ab:'Shockwave', tier:0 },
  scout:     { n:'Scout',      hp:0.8,dmg:0.95, spd:1.4,  grow:0.88, hide:2.25, steal:1.0, reach:1.0, col:'#1D9E75', cd:3200, ab:'Dash',      tier:0 },
  rogue:     { n:'Rogue',      hp:1.05,dmg:1.1,  spd:1.1,  grow:1.0,  hide:1.7,  steal:1.6, reach:1.0, col:'#7F77DD', cd:7500, ab:'Vanish',    tier:0 },
  skirmisher:{ n:'Skirmisher', hp:0.9, dmg:1.0,  spd:1.25, grow:0.95, hide:1.9,  steal:1.2, reach:1.3, col:'#5DCAA5', cd:2600, ab:'Dart',      tier:1 },
  charger:   { n:'Charger',    hp:1.4, dmg:1.2,  spd:1.15, grow:1.05, hide:1.4,  steal:1.0, reach:1.05,col:'#EF9F27', cd:6000, ab:'Charge',    tier:1 },
  reaper:    { n:'Reaper',     hp:1.25, dmg:1.45, spd:0.95, grow:1.05, hide:1.5,  steal:1.7, reach:1.1, col:'#993556', cd:8000, ab:'Execute',   tier:1 }
};
const UPGRADES = { rogue:['skirmisher','reaper'], scout:['skirmisher','charger'], juggernaut:['charger','reaper'] };
const baseKeys = ['juggernaut','scout','rogue'];
const botCols = ['#7F77DD','#D85A30','#378ADD','#EF9F27','#D4537E','#639922'];
const botNames = ['Vex','Mox','Zee','Pip','Bru','Kax','Rok','Tig','Nyx','Dax'];
const igloos = [ {x:24,z:18,r:3.0,cap:1.30},{x:-28,z:14,r:5.8,cap:2.70},{x:6,z:-30,r:4.4,cap:1.95},{x:-20,z:-22,r:3.4,cap:1.45} ];
const COSMETICS = [
  {id:'col_emerald',type:'color',name:'Emerald',price:0,rarity:'free',val:'#1D9E75'},
  {id:'col_violet',type:'color',name:'Violet',price:0,rarity:'free',val:'#7F77DD'},
  {id:'col_ember',type:'color',name:'Ember',price:0,rarity:'free',val:'#D85A30'},
  {id:'col_sky',type:'color',name:'Sky',price:0,rarity:'free',val:'#378ADD'},
  {id:'col_rose',type:'color',name:'Rose',price:0,rarity:'free',val:'#D4537E'},
  {id:'col_slate',type:'color',name:'Slate',price:0,rarity:'free',val:'#8A93A6'},
  {id:'col_crimson',type:'color',name:'Crimson',price:300,rarity:'rare',val:'#E02B3A'},
  {id:'col_cyan',type:'color',name:'Neon Cyan',price:550,rarity:'epic',val:'#23E8D0'},
  {id:'col_gold',type:'color',name:'Royal Gold',premium:true,usd:199,rarity:'rare',val:'#E8B339'},
  {id:'col_void',type:'color',name:'Void Black',premium:true,usd:299,rarity:'epic',val:'#1B1B24'},
  {id:'fin_matte',type:'finish',name:'Matte',price:0,rarity:'free',val:'matte'},
  {id:'fin_glossy',type:'finish',name:'Glossy',price:0,rarity:'free',val:'glossy'},
  {id:'fin_chrome',type:'finish',name:'Chrome',premium:true,usd:299,rarity:'rare',val:'chrome'},
  {id:'fin_neon',type:'finish',name:'Neon Glow',premium:true,usd:399,rarity:'epic',val:'neon'},
  {id:'fin_holo',type:'finish',name:'Holographic',premium:true,usd:499,rarity:'legend',val:'holo'},
  {id:'hat_none',type:'hat',name:'No hat',price:0,rarity:'free',val:'none'},
  {id:'hat_cap',type:'hat',name:'Cap',price:90,rarity:'free',val:'cap'},
  {id:'hat_band',type:'hat',name:'Headband',price:150,rarity:'free',val:'band'},
  {id:'hat_cone',type:'hat',name:'Party Cone',price:400,rarity:'rare',val:'cone'},
  {id:'hat_horns',type:'hat',name:'Demon Horns',price:800,rarity:'epic',val:'horns'},
  {id:'hat_top',type:'hat',name:'Top Hat',premium:true,usd:299,rarity:'rare',val:'top'},
  {id:'hat_crown',type:'hat',name:'Gold Crown',premium:true,usd:399,rarity:'epic',val:'crown'},
  {id:'hat_halo',type:'hat',name:'Halo',premium:true,usd:399,rarity:'epic',val:'halo'},
  {id:'hat_flame',type:'hat',name:'Flame Crown',premium:true,usd:699,rarity:'legend',val:'flame'}
];
const BUNDLE_USD = 999;
const cosmeticById = id => COSMETICS.find(c=>c.id===id);
const FREE_IDS = COSMETICS.filter(c=>c.price===0).map(c=>c.id);

const DATA_DIR = path.join(__dirname,'data');
const PROF_FILE = path.join(DATA_DIR,'profiles.json');
let profiles = {};
try { fs.mkdirSync(DATA_DIR,{recursive:true}); profiles = JSON.parse(fs.readFileSync(PROF_FILE,'utf8')); } catch(_){ profiles = {}; }
let saveTimer=null;
function saveProfiles(){ if(saveTimer)return; saveTimer=setTimeout(()=>{ saveTimer=null; try{ fs.writeFileSync(PROF_FILE, JSON.stringify(profiles)); }catch(_){} }, 1500); }
function newProfile(){ return { coins:0, xp:0, level:1, best:0, owned:[...FREE_IDS], equip:{ color:null, finish:'fin_matte', hat:'hat_none' } }; }
function pubProfile(p){ return { coins:p.coins, xp:p.xp, level:p.level, best:p.best, owned:p.owned, equip:p.equip }; }
function xpNext(l){ return 60 + l*40; }
function gainRewards(prof, coins, xp){ if(!prof)return; prof.coins+=coins; prof.xp+=xp; while(prof.xp>=xpNext(prof.level)){ prof.xp-=xpNext(prof.level); prof.level++; } saveProfiles(); }
function topLeaders(){ return Object.values(profiles).map(p=>({best:p.best||0})).sort((a,b)=>b.best-a.best).slice(0,10); }
function grantCosmetic(token,id){ const p=profiles[token]; const it=cosmeticById(id); if(p&&it&&!p.owned.includes(id)){ p.owned.push(id); saveProfiles(); return true; } return false; }
function grantAllPremium(token){ const p=profiles[token]; if(!p)return 0; let n=0; for(const it of COSMETICS){ if(it.premium&&!p.owned.includes(it.id)){ p.owned.push(it.id); n++; } } if(n)saveProfiles(); return n; }

const rand = (a,b) => a + Math.random()*(b-a);
const scaleOf = (p,cl) => Math.min(3.4, 1 + Math.sqrt(Math.max(0,p))*0.13*cl.grow);
const radOf = e => scaleOf(e.points, e.cls)*0.95;
const reachRad = e => radOf(e)*(e.cls.reach||1);
const maxHp = e => 100*e.cls.hp*(1 + (scaleOf(e.points,e.cls)-1)*0.8);
const dist = (a,b) => Math.hypot(a.x-b.x, a.z-b.z);
const fits = (e,g) => scaleOf(e.points,e.cls) <= g.cap*(e.cls.hide/1.7);
const clampPos = e => { e.x=Math.max(-BND,Math.min(BND,e.x)); e.z=Math.max(-BND,Math.min(BND,e.z)); };
const interiorPoint = m => { const a=Math.random()*Math.PI*2,r=rand(8,m); return {x:Math.cos(a)*r,z:Math.sin(a)*r}; };

let nowMs = Date.now();
let rooms = [];
let roomSeq = 1;
function makeRoom(){ const R={ id:roomSeq++, ents:new Map(), orbs:[], projs:[], events:[], nextId:1 }; for(let i=0;i<26;i++) addOrb(R); return R; }
function humansIn(R){ let h=0; for(const e of R.ents.values()) if(!e.bot)h++; return h; }
function assignRoom(){ for(const r of rooms){ if(humansIn(r)<CAP_HUMANS) return r; } const r=makeRoom(); rooms.push(r); return r; }
function addOrb(R,x,z){ R.orbs.push({ x:x===undefined?rand(-BND,BND):x, z:z===undefined?rand(-BND,BND):z }); }

function applyCosmetic(e){ if(!e.prof){ e.cosColor=null; e.hatVal='none'; e.finishVal='matte'; e.trailVal=0; return; } const eq=e.prof.equip||{}; const c=cosmeticById(eq.color); e.cosColor=c?c.val:null; const h=cosmeticById(eq.hat); e.hatVal=h?h.val:'none'; const f=cosmeticById(eq.finish); e.finishVal=f?f.val:'matte'; e.trailVal=0; }
function spawnEnt(R,o){
  const id = R.nextId++;
  const baseKey = o.clsKey || baseKeys[Math.floor(Math.random()*3)];
  const cls = CLASSES[baseKey];
  const e = { id, room:R, bot:!!o.bot, ws:o.ws||null, prof:o.prof||null, name:(o.name||('P'+id)).slice(0,12),
    baseKey, clsKey:baseKey, cls, tier:0, color:o.color||cls.col, cosColor:null, hatVal:0, trailVal:0,
    points:o.points||0, x:rand(-30,30), z:rand(-30,30), a:0, tx:0, tz:0, hp:1,
    safe:nowMs+1500, lastHit:0, hidden:false, moving:0, hx:0, hz:0, wt:0,
    lastX:0, lastZ:0, stuckT:0, panicUntil:0, px:0, pz:0,
    abilAt:0, dashUntil:0, vanishUntil:0, chargeUntil:0, evoWait:nowMs+rand(2000,9000) };
  e.tx=e.x; e.tz=e.z; e.lastX=e.x; e.lastZ=e.z; e.hp=maxHp(e);
  applyCosmetic(e);
  if(e.bot && Math.random()<0.4) e.hatVal=['cap','horns','band'][Math.floor(Math.random()*3)];
  R.ents.set(id, e);
  return e;
}
function ensureBots(R){
  let bots=0,hum=0; for(const e of R.ents.values()) e.bot?bots++:hum++;
  const target=Math.max(7,Math.min(28,hum+5)); let total=bots+hum;
  while(total<target){ spawnEnt(R,{bot:true,points:Math.floor(rand(0,8)),name:botNames[Math.floor(rand(0,botNames.length))],color:botCols[Math.floor(rand(0,botCols.length))]}); total++; }
  if(total>target){ let rm=total-target; for(const e of [...R.ents.values()]){ if(rm<=0)break; if(e.bot){R.ents.delete(e.id);rm--;} } }
}
function evolve(e,to){ if(e.tier!==0||e.points<EVOLVE_AT)return; if(!UPGRADES[e.baseKey]||!UPGRADES[e.baseKey].includes(to))return; e.clsKey=to; e.cls=CLASSES[to]; e.tier=1; e.abilAt=nowMs; if(!e.cosColor)e.color=e.cls.col; if(e.hp>maxHp(e))e.hp=maxHp(e); e.room.events.push({k:'evo',who:e.name,cls:e.cls.n}); }
function useAbility(e){
  if(nowMs<e.abilAt)return; e.abilAt=nowMs+e.cls.cd; const k=e.clsKey, R=e.room;
  if(k==='scout') e.dashUntil=nowMs+320;
  else if(k==='rogue') e.vanishUntil=nowMs+1900;
  else if(k==='charger'){ e.dashUntil=nowMs+550; e.chargeUntil=nowMs+550; }
  else if(k==='juggernaut'){ const Rr=8+scaleOf(e.points,e.cls)*2; for(const o of R.ents.values()){ if(o===e)continue; const dx=o.x-e.x,dz=o.z-e.z,d=Math.hypot(dx,dz); if(d<Rr&&d>0){ const push=(Rr-d)/Rr*6; o.x+=dx/d*push;o.z+=dz/d*push;clampPos(o); if(o.vanishUntil<nowMs&&o.safe<nowMs){o.hp-=18*e.cls.dmg;o.lastHit=nowMs;if(o.hp<=0)kill(e,o);} } } }
  else if(k==='skirmisher'){ const sp=38; R.projs.push({x:e.x+Math.sin(e.a)*1.5,z:e.z+Math.cos(e.a)*1.5,vx:Math.sin(e.a)*sp,vz:Math.cos(e.a)*sp,own:e.id,life:0.55,dmg:16*e.cls.dmg+6}); }
  else if(k==='reaper'){ let best=null,bd=1e9; const Rr=reachRad(e)+3.5; for(const o of R.ents.values()){ if(o===e||o.safe>nowMs||o.vanishUntil>nowMs)continue; const d=dist(e,o); if(d<Rr&&d<bd){bd=d;best=o;} } if(best){ const dmg=32*e.cls.dmg; best.hp-=dmg;best.lastHit=nowMs; const dx=best.x-e.x,dz=best.z-e.z,dd=Math.hypot(dx,dz)||1; best.x+=dx/dd*3;best.z+=dz/dd*3;clampPos(best); e.hp=Math.min(maxHp(e),e.hp+dmg*0.4); if(best.hp<=0)kill(e,best); } }
  R.events.push({k:'ab',who:e.name,ab:e.cls.ab,x:Math.round(e.x),z:Math.round(e.z)});
}
function botAI(b){
  const R=b.room;
  if(b.tier===0&&b.points>=EVOLVE_AT&&nowMs>b.evoWait){ const o=UPGRADES[b.baseKey]; evolve(b,o[Math.floor(Math.random()*o.length)]); }
  if(b.panicUntil>nowMs){ b.tx=b.px; b.tz=b.pz; return; }
  const br=scaleOf(b.points,b.cls); let prey=null,pd=1e9,th=null,td=1e9;
  for(const o of R.ents.values()){ if(o===b)continue; const orr=scaleOf(o.points,o.cls),d=dist(b,o),hid=o.hidden||o.safe>nowMs||o.vanishUntil>nowMs; if(orr<=br*1.05&&d<34&&d<pd&&!hid){prey=o;pd=d;} if(orr>=br*1.18&&d<26&&d<td){th=o;td=d;} }
  if(th){ b.tx=b.x+(b.x-th.x)*0.9; b.tz=b.z+(b.z-th.z)*0.9; }
  else if(prey){ b.tx=prey.x; b.tz=prey.z; }
  else { let bo=null,bd=1e9; for(const o of R.orbs){const d=Math.hypot(b.x-o.x,b.z-o.z);if(d<bd){bd=d;bo=o;}} if(bo&&bd<46){b.tx=bo.x;b.tz=bo.z;} else { b.wt--; if(b.wt<=0){const p=interiorPoint(BND*0.7);b.hx=p.x;b.hz=p.z;b.wt=60+rand(0,70);} b.tx=b.hx;b.tz=b.hz; } }
  const tm=Math.hypot(b.tx,b.tz); if(tm>BND*0.85){b.tx*=BND*0.85/tm;b.tz*=BND*0.85/tm;}
  if(nowMs>=b.abilAt){ const k=b.clsKey; if((k==='scout'||k==='charger')&&(th||(prey&&pd<14)))useAbility(b); else if(k==='skirmisher'&&prey&&pd<20)useAbility(b); else if(k==='rogue'&&b.hp<maxHp(b)*0.4)useAbility(b); else if(k==='juggernaut'||k==='reaper'){for(const o of R.ents.values()){if(o!==b&&dist(o,b)<6.5){useAbility(b);break;}}} }
}
function step(e,dt){ const dx=e.tx-e.x,dz=e.tz-e.z,d=Math.hypot(dx,dz); let base=(e.bot?12:15)*e.cls.spd; if(e.dashUntil>nowMs)base*=2.7; const v=base*dt; if(d>0.5){e.x+=dx/d*v;e.z+=dz/d*v;e.a=Math.atan2(dx,dz);e.moving=1;}else e.moving=0; clampPos(e); }
function iglooRules(e){ let hid=false; for(const g of igloos){const dx=e.x-g.x,dz=e.z-g.z,d=Math.hypot(dx,dz); if(fits(e,g)){if(d<g.r*0.92)hid=true;}else{const m=g.r+radOf(e)*0.5;if(d<m&&d>0){e.x=g.x+dx/d*m;e.z=g.z+dz/d*m;}}} e.hidden=hid; }
function separate(arr){ for(let i=0;i<arr.length;i++){const A=arr[i];if(A.safe>nowMs)continue;for(let j=i+1;j<arr.length;j++){const B=arr[j];if(B.safe>nowMs)continue;const dx=B.x-A.x,dz=B.z-A.z;let d=Math.hypot(dx,dz);const mn=radOf(A)+radOf(B);if(d<mn&&d>0.001){const p=(mn-d)*0.34,nx=dx/d,nz=dz/d;A.x-=nx*p;A.z-=nz*p;B.x+=nx*p;B.z+=nz*p;clampPos(A);clampPos(B);}}} }
function kill(a,t){
  const stolen=Math.floor(t.points*0.4*(a.cls.steal||1))+2; a.points+=stolen;
  if(a.prof) gainRewards(a.prof,3+Math.floor(stolen*0.5),3+Math.floor(stolen*0.5));
  if(t.prof) gainRewards(t.prof,1,Math.floor(t.points*0.3)+1);
  a.room.events.push({k:'kill',by:a.name,who:t.name,amt:stolen});
  const drops=Math.min(18,3+Math.floor(t.points*0.5));for(let k=0;k<drops&&a.room.orbs.length<90;k++)addOrb(a.room,t.x+rand(-3,3),t.z+rand(-3,3));
  t.points=0; t.tier=0; t.clsKey=t.baseKey; t.cls=CLASSES[t.baseKey]; if(!t.cosColor)t.color=t.cls.col;
  const p=interiorPoint(34); t.x=p.x;t.z=p.z;t.tx=t.x;t.tz=t.z; t.hp=maxHp(t); t.safe=nowMs+1500; t.vanishUntil=0;t.dashUntil=0;t.chargeUntil=0; t.evoWait=nowMs+rand(3000,9000);
}
function simRoom(R,dt){
  ensureBots(R);
  for(const e of R.ents.values()) if(e.bot) botAI(e);
  for(const e of R.ents.values()){ step(e,dt); if(e.bot){const moved=Math.hypot(e.x-e.lastX,e.z-e.lastZ),trying=Math.hypot(e.tx-e.x,e.tz-e.z)>1; if(trying&&moved<0.05)e.stuckT+=dt;else e.stuckT=0; if(e.stuckT>0.5){const p=interiorPoint(BND*0.55);e.px=p.x;e.pz=p.z;e.panicUntil=nowMs+800+Math.random()*500;e.stuckT=0;}} e.lastX=e.x;e.lastZ=e.z; }
  for(let i=R.projs.length-1;i>=0;i--){ const p=R.projs[i]; p.x+=p.vx*dt;p.z+=p.vz*dt;p.life-=dt; let hit=false; for(const o of R.ents.values()){ if(o.id===p.own||o.safe>nowMs||o.vanishUntil>nowMs||o.hidden)continue; if(Math.hypot(o.x-p.x,o.z-p.z)<radOf(o)+0.6){ o.hp-=p.dmg;o.lastHit=nowMs; const dx=o.x-p.x,dz=o.z-p.z,dd=Math.hypot(dx,dz)||1;o.x+=dx/dd*0.8;o.z+=dz/dd*0.8;clampPos(o); const owner=R.ents.get(p.own); if(o.hp<=0&&owner)kill(owner,o); hit=true;break; } } if(hit||p.life<=0||Math.abs(p.x)>BND||Math.abs(p.z)>BND)R.projs.splice(i,1); }
  for(const e of R.ents.values()){ const fr=radOf(e); for(let i=R.orbs.length-1;i>=0;i--){const o=R.orbs[i];if(Math.hypot(e.x-o.x,e.z-o.z)<fr+0.5){e.points+=1;R.orbs.splice(i,1);}} }
  for(const e of R.ents.values()){ iglooRules(e); if(e.prof && e.points>e.prof.best){ e.prof.best=e.points; saveProfiles(); } }
  const arr=[...R.ents.values()]; separate(arr);
  for(const a of arr){ if(a.safe>nowMs)continue; const ar=reachRad(a); for(const t of arr){ if(a===t)continue; if(t.safe>nowMs||t.hidden||t.vanishUntil>nowMs)continue; if(dist(a,t)<(ar+radOf(t))*1.12){ let dmg=20*a.cls.dmg*(0.7+scaleOf(a.points,a.cls)*0.3)*dt,kbm=1; if(a.chargeUntil>nowMs){dmg*=1.5;kbm=3;} t.hp-=dmg;t.lastHit=nowMs; const dx=t.x-a.x,dz=t.z-a.z,dd=Math.hypot(dx,dz)||1,kb=0.12*a.cls.dmg/(0.6+scaleOf(t.points,t.cls)*0.3)*kbm; t.x+=dx/dd*kb;t.z+=dz/dd*kb;clampPos(t); if(t.hp<=0)kill(a,t); } } }
  for(const e of R.ents.values()){ const mh=maxHp(e); if(e.hp>mh)e.hp=mh; if(nowMs-e.lastHit>2000)e.hp=Math.min(mh,e.hp+16*dt); }
  while(R.orbs.length<24)addOrb(R);
}
function snapshot(R){
  const es=[];
  for(const e of R.ents.values()){ const cr=Math.max(0,Math.min(1,(e.abilAt-nowMs)/e.cls.cd));
    es.push({ i:e.id,x:Math.round(e.x*100)/100,z:Math.round(e.z*100)/100,a:Math.round(e.a*100)/100, s:Math.round(scaleOf(e.points,e.cls)*1000)/1000, p:e.points, hp:Math.round(e.hp), mh:Math.round(maxHp(e)), hd:e.hidden?1:0, sf:e.safe>nowMs?1:0, vn:e.vanishUntil>nowMs?1:0, ds:e.dashUntil>nowMs?1:0, tr:e.tier, ce:(e.tier===0&&e.points>=EVOLVE_AT)?1:0, cr:Math.round(cr*100)/100, n:e.name, co:e.cosColor||e.color, ht:e.hatVal||'none', fn:e.finishVal||'matte', tl:0, c:e.clsKey }); }
  return { t:'s', e:es, o:R.orbs.map(o=>[Math.round(o.x*10)/10,Math.round(o.z*10)/10]), pr:R.projs.map(p=>[Math.round(p.x*10)/10,Math.round(p.z*10)/10]), ev:R.events };
}
function broadcast(R){ const s=JSON.stringify(snapshot(R)); for(const e of R.ents.values()){ if(e.ws&&e.ws.readyState===1){try{e.ws.send(s);}catch(_){}} } }
let last=Date.now();
function tick(){
  nowMs=Date.now(); let dt=(nowMs-last)/1000; last=nowMs; if(dt>0.1)dt=0.1;
  for(const R of rooms){ simRoom(R,dt); broadcast(R); R.events=[]; }
  rooms = rooms.filter(R => humansIn(R)>0);
}
setInterval(tick,50);

wss.on('connection',(ws)=>{
  let ent=null, token=null, prof=null;
  ws.on('message',(buf)=>{ let m; try{m=JSON.parse(buf);}catch(_){return;}
    if(m.t==='join'&&!ent){
      token=(typeof m.token==='string'&&/^[A-Za-z0-9-]{6,40}$/.test(m.token))?m.token:crypto.randomUUID();
      if(!profiles[token]) profiles[token]=newProfile(); prof=profiles[token];
      const k=baseKeys.includes(m.cls)?m.cls:'rogue'; const R=assignRoom();
      ent=spawnEnt(R,{ws,clsKey:k,name:m.name,prof});
      ws.send(JSON.stringify({t:'w',id:ent.id,bnd:BND,igloos,upgrades:UPGRADES,classes:CLASSES,evolveAt:EVOLVE_AT,token,profile:pubProfile(prof),cosmetics:COSMETICS,bundleUsd:BUNDLE_USD,top:topLeaders(),room:R.id}));
    } else if(m.t==='input'&&ent){ ent.tx=Math.max(-BND,Math.min(BND,+m.x||0)); ent.tz=Math.max(-BND,Math.min(BND,+m.z||0)); }
    else if(m.t==='ability'&&ent){ nowMs=Date.now(); useAbility(ent); }
    else if(m.t==='evolve'&&ent){ nowMs=Date.now(); evolve(ent,m.to); }
    else if(m.t==='buy'&&prof){ const it=cosmeticById(m.id); if(it&&!prof.owned.includes(it.id)){ if(it.premium){ ws.send(JSON.stringify({t:'buy_no',id:it.id,reason:'premium'})); } else if(prof.coins>=it.price){ prof.coins-=it.price; prof.owned.push(it.id); saveProfiles(); ws.send(JSON.stringify({t:'buy_ok',id:it.id,coins:prof.coins})); } else ws.send(JSON.stringify({t:'buy_no',id:it.id,reason:'coins'})); } }
    else if(m.t==='equip'&&prof&&ent){ const it=cosmeticById(m.id); if(it&&it.type===m.type&&(prof.owned.includes(it.id)||it.price===0)){ prof.equip[m.type]=it.id; saveProfiles(); applyCosmetic(ent); if(!ent.cosColor)ent.color=ent.cls.col; ws.send(JSON.stringify({t:'equip_ok',equip:prof.equip})); } }
    else if(m.t==='dev_points'&&ent&&DEV){ ent.points=+m.n||0; }
    else if(m.t==='dev_coins'&&prof&&DEV){ prof.coins=+m.n||0; saveProfiles(); ws.send(JSON.stringify({t:'prof',profile:pubProfile(prof)})); }
  });
  ws.on('close',()=>{ if(ent&&ent.room)ent.room.ents.delete(ent.id); });
  ws.on('error',()=>{ if(ent&&ent.room)ent.room.ents.delete(ent.id); });
});

if(DEV){ app.get('/debug',(_,res)=>res.json({rooms:rooms.map(r=>({id:r.id,humans:humansIn(r),total:r.ents.size}))})); }

// ---- Stripe (real-money premium cosmetics) - gated by env, optional ----
let stripe=null;
if(process.env.STRIPE_SECRET_KEY){ try{ stripe=require('stripe')(process.env.STRIPE_SECRET_KEY); }catch(e){ console.log('stripe module not installed; run: npm i stripe'); } }
app.post('/create-checkout-session', express.json(), async (req,res)=>{
  if(!stripe) return res.status(503).json({error:'payments_not_configured'});
  try{ const {token,cosmeticId}=req.body||{};
    if(!token||!profiles[token]) return res.status(400).json({error:'bad_token'});
    const origin=req.headers.origin||('http://localhost:'+PORT);
    if(cosmeticId==='founder_pack'){
      const session=await stripe.checkout.sessions.create({ mode:'payment', line_items:[{price_data:{currency:'usd',unit_amount:BUNDLE_USD,product_data:{name:"Bounty Royale - Founder's Pack (all premium cosmetics)"}},quantity:1}], success_url:origin+'/?bought=founder_pack', cancel_url:origin+'/', metadata:{token,bundle:'founder'} });
      return res.json({url:session.url});
    }
    const it=cosmeticById(cosmeticId);
    if(!it||!it.premium||!it.usd) return res.status(400).json({error:'bad_item'});
    const session=await stripe.checkout.sessions.create({ mode:'payment', line_items:[{price_data:{currency:'usd',unit_amount:it.usd,product_data:{name:'Bounty Royale - '+it.name}},quantity:1}], success_url:origin+'/?bought='+cosmeticId, cancel_url:origin+'/', metadata:{token,cosmeticId} });
    res.json({url:session.url});
  }catch(e){ res.status(500).json({error:'stripe_error'}); }
});
app.post('/webhook', express.raw({type:'application/json'}), (req,res)=>{
  if(!stripe) return res.status(503).end();
  let event=req.body;
  try{ if(process.env.STRIPE_WEBHOOK_SECRET){ event=stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); } else { event=JSON.parse(req.body.toString()); } }catch(e){ return res.status(400).send('bad sig'); }
  if(event.type==='checkout.session.completed'){ const s=event.data.object; const md=s.metadata||{}; if(md.token){ if(md.bundle==='founder') grantAllPremium(md.token); else if(md.cosmeticId) grantCosmetic(md.token, md.cosmeticId); } }
  res.json({received:true});
});

server.listen(PORT,()=>console.log('Bounty Royale running on port '+PORT));

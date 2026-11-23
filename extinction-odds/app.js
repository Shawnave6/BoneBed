// Tunables 
const DECK_SIZE=8, HAND=5, DISCARDS=3, REROLLS=2, PLAYS=2, FINAL_PLAYS=3, REWARD_REROLLS=1;
const ACTS=[[['The Watering Hole',45],['The Ridge',70],['The Tar Pits',100],['The Apex Predator',190]],
 [['The Canyon',150],['The Swamp',230],['The Volcano Rim',330],['The Extinction Event',670]]];
const BLINDS=ACTS.flatMap((a,ai)=>a.map(([n,t],i)=>({n,t,a:ai+1,i:i+1,final:i==3})));
const plays=()=>BLINDS[S.b].final?FINAL_PLAYS:PLAYS;
 
// Card set 
const nb=(r,i)=>[r[i-1],r[i+1]].filter(Boolean);
const near=(r,i,k)=>r.filter((c,j)=>j!=i&&Math.abs(j-i)<=k);
const opp=(a,b)=>(a=='C'&&b=='H')||(a=='H'&&b=='C'), same=(a,b)=>a==b&&(a=='C'||a=='H'); 
const n=(r,f)=>r.filter(f).length, isC=c=>c.d=='C', isH=c=>c.d=='H';
const RULE_LIST=[
['Tyrannosaurus Rex','L',10,'+1 mult for every Carnivore on the board, including itself.',(r)=>[0,n(r,isC)]],
['Velociraptor','L',9,'+1 mult for each card within 2 cards on either side with the opposite Diet.',(r,i)=>[0,near(r,i,2).filter(c=>opp(c.d,r[i].d)).length]],
['Triceratops','L',10,'+1 mult for every Herbivore on the board, including itself.',(r)=>[0,n(r,isH)]],
['Stegosaurus','R',7,'+4 score for each Carnivore on the board.',(r)=>[4*n(r,isC),0]],
['Brachiosaurus','R',8,'All 5 cards are Herbivores: +2 mult.',(r)=>[0,r.every(isH)?2:0]],
['Ankylosaurus','R',7,'+5 score for each neighbor with the opposite Diet.',(r,i)=>[5*nb(r,i).filter(c=>opp(c.d,r[i].d)).length,0]],
['Allosaurus','R',7,'Both sides share my Diet: +2 mult.',(r,i)=>[0,nb(r,i).length==2&&nb(r,i).every(c=>same(c.d,r[i].d))?2:0]],
['Spinosaurus','R',7,'each Sides are one Carnivore and one Herbivore: +2 mult.',(r,i)=>{const b=nb(r,i);return [0,b.length==2&&n(b,isC)==1&&n(b,isH)==1?2:0]}],
['Diplodocus','U',5,'Both sides share my Diet: +8 score.',(r,i)=>[nb(r,i).length==2&&nb(r,i).every(c=>same(c.d,r[i].d))?8:0,0]],
['Parasaurolophus','U',5,'+2 score for each Herbivore within 2 cards on either side.',(r,i)=>[2*n(near(r,i,2),isH),0]],
['Pachycephalosaurus','U',6,'+2 score for each side that is a Carnivore or Herbivore.',(r,i)=>[2*n(nb(r,i),c=>c.d=='C'||c.d=='H'),0]],
['Carnotaurus','U',6,'Left side has the opposite Diet: +1 mult.',(r,i)=>[0,i>0&&opp(r[i-1].d,r[i].d)?1:0]],
['Dilophosaurus','U',5,'Right side has the opposite Diet: +8 score.',(r,i)=>[i<r.length-1&&opp(r[i+1].d,r[i].d)?8:0,0]],
['Giganotosaurus','U',6,'+2 score for every other Carnivore on the board.',(r)=>[2*(n(r,isC)-1),0]],
['Compsognathus','C',3,'Left side is a Carnivore: +3 score.',(r,i)=>[i>0&&r[i-1].d=='C'?3:0,0]],
['Iguanodon','C',4,'Right side is a Herbivore: +3 score.',(r,i)=>[i<r.length-1&&r[i+1].d=='H'?3:0,0]],
['Apatosaurus','C',4,'Placed last: +5 score.',(r,i)=>[i==r.length-1?5:0,0]],
['Deinonychus','C',4,'Placed first: +5 score.',(r,i)=>[i==0?5:0,0]],
['Styracosaurus','C',4,'Either side shares my Diet: +4 score.',(r,i)=>[nb(r,i).some(c=>same(c.d,r[i].d))?4:0,0]],
['Baryonyx','C',3,'Next card is a Carnivore or Herbivore: +3 score. If it is Amphibious: +8 instead.',(r,i)=>{const x=r[i+1];return [x&&(x.d=='C'||x.d=='H')?(x.h=='A'?8:3):0,0]}]
];
const RULES=Object.fromEntries(RULE_LIST.map(([name,rar,sc,txt,fn])=>[name,{rar,sc,txt,fn}]));
let SET=[],OFFER_POOL=[]; // filled from the API
const RN={L:'Legendary',R:'Rare',U:'Uncommon',C:'Common'},HN={T:'Terrestrial',A:'Amphibious',Q:'Aquatic',E:'Aerial',F:'Fossorial',B:'Arboreal'},DN={C:'Carnivore',H:'Herbivore',O:'Omnivore',P:'Piscivore',I:'Insectivore',Y:'Filter Feeder'};
const calc=r=>{let s=0,m=0,per=r.map((c,i)=>{const[a,b]=c.fn(r,i);s+=c.sc+a;m+=b;return[a,b]});return{s,m,total:s*(1+m),per}};
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=()=>Array.from({length:12},()=>OFFER_POOL[Math.random()*OFFER_POOL.length|0]);
 
//  DinoBase API 
const API_BASE='https://nave-dinobase-api-9a4p.vercel.app';   
const API_KEY='nave-api-card-101707';      
const HC={Terrestrial:'T',Amphibious:'A',Aquatic:'Q',Aerial:'E',Fossorial:'F',Arboreal:'B'};
const DC={Carnivore:'C',Herbivore:'H',Omnivore:'O',Piscivore:'P',Insectivore:'I','Filter Feeder':'Y'};
const NO_RULE={rar:'C',sc:3,txt:'No effect yet.',fn:()=>[0,0]}; 
let API={s:'loading',m:'Connecting to DinoBase...'};

// Saved copy
const SNAP_KEY='extinction-odds-snapshot';
const saveSnap=l=>{try{localStorage.setItem(SNAP_KEY,JSON.stringify({savedAt:new Date().toISOString(),dinosaurs:l}))}catch(_){}};
const loadSnap=()=>{try{const s=JSON.parse(localStorage.getItem(SNAP_KEY));return s&&Array.isArray(s.dinosaurs)?s.dinosaurs:null}catch(_){return null}};
async function fetchDinos(){
 try{
  const r=await fetch(API_BASE+'/api/v1/dinosaurs',{headers:{'x-api-key':API_KEY}});
  if(!r.ok)throw new Error(r.status==401?'API key rejected (401)':'HTTP '+r.status);
  const j=await r.json();
  saveSnap(j.dinosaurs);
  return {list:j.dinosaurs,offline:false};
 }catch(e){
  const snap=loadSnap();if(snap)return {list:snap,offline:true};
  throw e;
 }
}
async function loadCards(){API={s:'loading',m:'Connecting to DinoBase...'};render();
 try{const {list,offline}=await fetchDinos();
  SET=list.filter(d=>HC[d.habitat]&&DC[d.diet]).map(d=>({name:d.name,h:HC[d.habitat],d:DC[d.diet],...(RULES[d.name]||NO_RULE)}));
  OFFER_POOL=SET.filter(c=>c.rar=='C'||c.rar=='U');
  if(SET.length<HAND||!OFFER_POOL.length)throw new Error('not enough creatures returned');
  API={s:'ok',m:`${offline?'Offline mode':'DinoBase API connected'} · ${SET.length} creatures`};
 }catch(e){API={s:'err',m:`Could not load cards from ${API_BASE}: ${e.message}`}}
 render()}
 
 // State 
let S={scr:'menu',rr:REROLLS,offer:[],picked:[],deck:[],hand:[],pile:[],order:[],dis:DISCARDS,dm:false,sel:[],play:1,total:0,b:0,res:null,rw:null,view:null,done:false};
const el=id=>document.getElementById(id);
const card=(c,cls='',badge='',extra='',tag='button',attrs='')=>`<${tag} class="card ${c.rar} ${cls}" ${attrs}>${badge?`<span class="badge">${badge}</span>`:''}<span class="r">${RN[c.rar]}</span><span class="n">${c.name}</span><span><span class="tag ${c.h}">${HN[c.h]}</span><span class="tag ${c.d}">${DN[c.d]}</span></span><span class="t">${c.txt}</span><span class="s">${c.sc}</span>${extra}</${tag}>`;
const deal=()=>{const d=shuf(S.deck);S.hand=d.slice(0,HAND);S.pile=d.slice(HAND);S.order=[];S.sel=[];S.dm=false};
const go=s=>{S.scr=s;if(s=='deck'){S.rr=REROLLS;S.offer=pick();S.picked=[]}render()};
const start=()=>{S.deck=S.picked.map(i=>S.offer[i]);S.b=0;S.rw=null;S.done=false;S.view=null;S.dis=DISCARDS;S.play=1;S.total=0;S.res=null;deal();S.scr='play';render()};
const tog=(arr,i,max)=>{const k=arr.indexOf(i);if(k>=0)arr.splice(k,1);else if(arr.length<max)arr.push(i)};
window.A={go,start,
 askQuit(v){S.quitAsk=v;render()},
 quit(){Object.assign(S,{quitAsk:false,rw:null,res:null,done:false,view:null,dm:false,b:0,deck:[],hand:[],pile:[],order:[],sel:[],total:0,scr:'menu'});render()},reload:()=>loadCards(),
 reroll(){if(S.rr>0){S.rr--;S.offer=pick();S.picked=[];render()}},
 pk(i){tog(S.picked,i,DECK_SIZE);render()},
 hand(i){if(S.res)return;if(S.dm)tog(S.sel,i,S.pile.length);else tog(S.order,i,HAND);render()},
 dmode(){S.dm=!S.dm;S.sel=[];render()},
 confirm(){const k=S.sel.length;S.hand=S.hand.map((c,i)=>S.sel.includes(i)?S.pile.shift():c);S.dis--;S.dm=false;S.sel=[];S.order=[];render()},
 playHand(){const r=S.order.map(i=>S.hand[i]),v=calc(r);S.total+=v.total;
  if(S.play<plays()){S.play++;deal()}else{S.res=S.total>=BLINDS[S.b].t?'win':'lose';if(S.res=='win'){const f=BLINDS[S.b].final;S.rw={opts:rewardOffer(f?5:3,f),pick:[],need:f?3:1,rr:REWARD_REROLLS}}}render()},
 next(){S.b++;S.dis=DISCARDS;S.play=1;S.total=0;S.res=null;deal();render()},
 retry(){S.dis=DISCARDS;S.play=1;S.total=0;S.res=null;deal();render()},
 rp(i){tog(S.rw.pick,i,S.rw.need);render()},
 claim(){S.rw.pick.forEach(i=>S.deck.push(S.rw.opts[i]));S.rw=null;if(S.b<BLINDS.length-1)A.next();else{S.done=true;render()}},
 vw(v){S.view=v;render()},
 rrw(){const w=S.rw;if(w.rr>0){w.rr--;w.opts=rewardOffer(w.opts.length,BLINDS[S.b].final);w.pick=[];render()}}};
const WT={C:50,U:30,R:15,L:5},WTF={C:0,U:50,R:35,L:15};
const wpick=f=>{const W=f?WTF:WT;let r=Math.random()*100;for(const c of shuf(SET)){r-=W[c.rar]/SET.filter(x=>x.rar==c.rar).length;if(r<=0&&W[c.rar]>0)return c}return SET.filter(c=>W[c.rar]>0).pop()};
const rewardOffer=(k,f)=>Array.from({length:k},()=>wpick(f));
const rewardPanel=()=>{const w=S.rw,f=BLINDS[S.b].final;return `<div class="result" style="display:block"><div class="serif" style="font-size:18px">Reward: pick ${w.need} of ${w.opts.length}${f?' (final blind)':''}</div><div class="row rw ${w.opts.length==5?'five':''}" style="margin:16px 0 8px;padding-top:10px">${w.opts.map((c,i)=>card(c,w.pick.includes(i)?'on':'',w.pick.includes(i)?'✓':'','','button',`onclick="A.rp(${i})" aria-pressed="${w.pick.includes(i)}"`)).join('')}</div><div class="dim" style="margin-bottom:10px">${w.pick.length} of ${w.need} chosen. Picked cards are added to your deck.</div><div style="display:flex;gap:12px;flex-wrap:wrap"><button class="pri" onclick="A.claim()" ${w.pick.length==w.need?'':'disabled'}>Add to deck</button><button onclick="A.rrw()" ${w.rr?'':'disabled'}>Reroll (${w.rr} left)</button></div></div>`};
const show=id=>document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!=id);
const put=(id,h)=>{el(id).innerHTML=h},hid=(id,b)=>{el(id).hidden=b},dis=(id,b)=>{el(id).disabled=b};
function render(){
 show(S.scr);const ok=API.s=='ok';
 el('apiDot').className='dot '+API.s;el('apiText').textContent=API.m;hid('retryBtn',API.s!='err');dis('newRunBtn',!ok);dis('collectionBtn',!ok);
 if(S.scr=='menu')put('menuFan',SET.slice().sort((a,b)=>'LRUC'.indexOf(a.rar)-'LRUC'.indexOf(b.rar)).slice(0,5).map(c=>card(c,'','','','div')).join(''));
 if(S.scr=='deck')renderDeck();
 if(S.scr=='col')renderCol();
 if(S.scr=='play')renderPlay();
 renderModal();hid('quitModal',!S.quitAsk);
}
function renderDeck(){const cnt=S.picked.length,names={};S.picked.forEach(i=>{const k=S.offer[i].name;names[k]=(names[k]||0)+1});
 put('offerList',S.offer.map((c,i)=>card(c,S.picked.includes(i)?'on':'',S.picked.includes(i)?'✓':'','','button',`onclick="A.pk(${i})" aria-pressed="${S.picked.includes(i)}"`)).join(''));
 el('rerollBtn').textContent=`Reroll (${S.rr} left)`;dis('rerollBtn',!S.rr);
 el('pickedCount').textContent=cnt+' / '+DECK_SIZE;
 put('pickedChips',Object.entries(names).map(([k,v])=>`<span>${k}${v>1?' ×'+v:''}</span>`).join(''));
 dis('startBtn',cnt!=DECK_SIZE)}
function renderCol(){el('colTotal').textContent=SET.length;
 for(const k of 'LRUC'){const l=SET.filter(c=>c.rar==k);el('colCount'+k).textContent=l.length;put('col'+k,l.map(c=>card(c,'','','','div')).join(''))}}
function renderPlay(){
 const bl=BLINDS[S.b],ord=S.order,full=ord.length==HAND,v=full?calc(ord.map(i=>S.hand[i])):null,P=plays();
 el('playKicker').textContent=S.dm?'Discard mode':`Act ${bl.a} · ${bl.final?'Final blind':`Blind ${bl.i} of 3`} · Play ${Math.min(S.play,P)} of ${P}`;
 el('playKicker').classList.toggle('red',S.dm);
 el('blindName').textContent=bl.n;el('target').textContent=bl.t;el('yourScore').textContent=S.total;
 put('slots',Array.from({length:HAND},(_,k)=>{const i=ord[k];if(i==null)return `<div class="slot ${k==ord.length?'next':''}">${k+1}</div>`;
  const c=S.hand[i];return `<div class="slot" style="border-style:solid;border-color:transparent">${card(c,'','',v?`<span class="dim" style="font-size:11px">+${v.per[k][0]} score${v.per[k][1]?' · +'+v.per[k][1]+' mult':''}</span>`:'','div')}</div>`}).join(''));
 put('preview',S.res?'':(v?`<b>${v.s}</b> score × (1 + <b>${v.m}</b> mult) = <b class="gold">${v.total}</b>`:`Place ${HAND-ord.length} more card${HAND-ord.length==1?'':'s'} to see the row score`));
 el('handLabel').textContent=S.dm?`Tap up to ${S.pile.length} card${S.pile.length==1?'':'s'} to discard (${S.pile.length} left in deck to draw).`:'Your hand: tap cards in the order you want them placed, left to right.';
 el('handLabel').classList.toggle('red',S.dm);
 put('hand',S.hand.map((c,i)=>{const o=ord.indexOf(i),s=S.sel.indexOf(i);return card(c,S.dm?(s>=0?'off':''):(o>=0?'on':''),S.dm?(s>=0?'✕':''):(o>=0?o+1:''),'','button',`onclick="A.hand(${i})"`)}).join(''));
 hid('resultBox',!S.res);
 if(S.res){el('resultText').textContent=S.res=='win'?`Blind cleared: ${S.total} vs ${bl.t}.`:`Short by ${bl.t-S.total}: ${S.total} vs ${bl.t}.`;hid('retryBlindBtn',S.res=='win');hid('quitLostBtn',S.res=='win')}
 const rw=S.res=='win'&&S.rw;hid('rewardBox',!rw);if(rw)put('rewardBox',rewardPanel());
 hid('doneBox',!S.done);
 el('deckInfo').textContent=`Deck: ${S.pile.length} to draw · ${S.deck.length} total · tap the stack to view`;
 el('discardsLeft').textContent='Discards: '+S.dis;
 hid('normalBtns',S.dm);hid('discardBtns',!S.dm);
 dis('discardBtn',!(S.dis&&S.pile.length&&!S.res));dis('playBtn',!(full&&!S.res));
 el('confirmBtn').textContent=`Confirm discard (${S.sel.length}) → draw ${S.sel.length}`;dis('confirmBtn',!S.sel.length)}
function renderModal(){hid('deckModal',!S.view);if(!S.view)return;
 const src=S.view=='draw'?S.pile:S.deck,g={};src.forEach(c=>{(g[c.name]=g[c.name]||{c,n:0}).n++});
 const list=Object.values(g).sort((a,b)=>'LRUC'.indexOf(a.c.rar)-'LRUC'.indexOf(b.c.rar)||a.c.name.localeCompare(b.c.name));
 el('modalTitle').textContent=S.view=='draw'?'Cards left to draw':'Full deck';
 el('tabDraw').textContent=`Left to draw (${S.pile.length})`;el('tabFull').textContent=`Full deck (${S.deck.length})`;
 el('tabDraw').classList.toggle('pri',S.view=='draw');el('tabFull').classList.toggle('pri',S.view=='full');
 put('modalCards',list.length?list.map(x=>card(x.c,'',x.n>1?'×'+x.n:'','','div')).join(''):'<p class="dim">No cards left. The deck is reshuffled after each play.</p>')}
 
 
const CONSTS={HAND,PLAYS,FINAL_PLAYS,DISCARDS,REWARD_REROLLS,DECK_SIZE};
document.querySelectorAll('[data-c]').forEach(e=>{e.textContent=CONSTS[e.dataset.c]});
loadCards(); 

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
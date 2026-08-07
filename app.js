
const places=window.PLACES||[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const categoryOrder=["Architecture & photo","Quartiers & ambiances","Manger & boire","Cafés","Culture & musées","Marchés & brocantes","Auto & insolite"];
const categoryEmoji={"Architecture & photo":"📷","Quartiers & ambiances":"◉","Manger & boire":"🍴","Cafés":"☕","Culture & musées":"◫","Marchés & brocantes":"♢","Auto & insolite":"◈"};
const quarterOrder=["Centre","HafenCity & Speicherstadt","St. Pauli","Altona & Fischmarkt","Schanze & Eimsbüttel","Barmbek & City Nord","Hammerbrook","Est du port","Port & Köhlbrand","Harburg"];
let map, mapMode="category", activeFilter="", markers=new Map(), coords={};

function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function googleUrl(p){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.name+" "+p.address)}
function appleUrl(p){return "https://maps.apple.com/?q="+encodeURIComponent(p.name)+"&address="+encodeURIComponent(p.address)}
function showPlace(p){
 $("#sheetContent").innerHTML=`<h2>${esc(p.name)}</h2>
 <span class="badge">${esc(p.category)}</span>
 <p><strong>${esc(p.quarter)}</strong><br>${esc(p.address)}</p>
 <p>${esc(p.detail)}</p>
 <div class="actions"><a href="${googleUrl(p)}" target="_blank">Ouvrir dans Google Maps</a><a class="secondary" href="${appleUrl(p)}" target="_blank">Ouvrir dans Plans</a></div>`;
 $("#sheet").classList.remove("hidden");
}
$("#closeSheet").onclick=()=>$("#sheet").classList.add("hidden");
$("#sheet").addEventListener("click",e=>{if(e.target.id==="sheet")$("#sheet").classList.add("hidden")});

$$(".tabs button").forEach(b=>b.addEventListener("click",()=>{
 $$(".tabs button").forEach(x=>x.classList.toggle("active",x===b));
 $$(".tab").forEach(x=>x.classList.remove("active"));
 $("#tab-"+b.dataset.tab).classList.add("active");
 if(b.dataset.tab==="map"&&map)setTimeout(()=>map.invalidateSize(),80);
}));

function groupRender(containerId, key, order, searchId, secondaryKey){
 const input=$("#"+searchId), container=$("#"+containerId);
 function draw(){
  const q=input.value.trim().toLowerCase();
  let source=places.filter(p=>!q||[p.name,p.address,p.category,p.quarter,p.detail].join(" ").toLowerCase().includes(q));
  const values=[...new Set(source.map(p=>p[key]))];
  values.sort((a,b)=>{
   const ia=order.indexOf(a), ib=order.indexOf(b);
   return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b);
  });
  container.innerHTML=values.map(v=>{
   const arr=source.filter(p=>p[key]===v);
   return `<section class="group"><div class="group-head"><h2>${esc(v)}</h2><span class="count">${arr.length} lieu${arr.length>1?"x":""}</span></div>
   <div class="place-list">${arr.map(p=>`<article class="place" data-id="${p.id}"><h3>${esc(p.name)}</h3><div class="meta">${esc(p[secondaryKey])}</div><span class="badge">${esc(key==="category"?p.quarter:p.category)}</span></article>`).join("")}</div></section>`;
  }).join("");
  container.querySelectorAll(".place").forEach(el=>el.onclick=()=>showPlace(places.find(p=>p.id==el.dataset.id)));
 }
 input.oninput=draw; draw();
}
groupRender("categoryGroups","category",categoryOrder,"categorySearch","quarter");
groupRender("quarterGroups","quarter",quarterOrder,"quarterSearch","address");

function modeValues(){
 return mapMode==="category"?categoryOrder:quarterOrder.filter(q=>places.some(p=>p.quarter===q));
}
function renderFilters(){
 const vals=modeValues();
 $("#mapFilters").innerHTML=`<button class="chip ${activeFilter===""?"active":""}" data-filter="">Tous</button>`+
 vals.map(v=>`<button class="chip ${activeFilter===v?"active":""}" data-filter="${esc(v)}">${mapMode==="category"?(categoryEmoji[v]||"•")+" ":""}${esc(v)}</button>`).join("");
 $("#mapFilters").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;renderFilters();refreshMarkers();});
}
$$("[data-mapmode]").forEach(b=>b.onclick=()=>{
 mapMode=b.dataset.mapmode; activeFilter="";
 $$("[data-mapmode]").forEach(x=>x.classList.toggle("active",x===b));
 renderFilters();refreshMarkers();
});
function markerIndex(p){
 const arr=mapMode==="category"?categoryOrder:quarterOrder;
 let i=arr.indexOf(mapMode==="category"?p.category:p.quarter);
 return i<0?5:i%7;
}
function iconFor(p){
 const emoji=mapMode==="category"?(categoryEmoji[p.category]||"•"):"";
 return L.divIcon({className:"",html:`<div class="marker c${markerIndex(p)}"><span>${emoji}</span></div>`,iconSize:[28,28],iconAnchor:[14,28]});
}
function visible(p){return !activeFilter||((mapMode==="category"?p.category:p.quarter)===activeFilter)}
function refreshMarkers(){
 markers.forEach((m,id)=>{
  const p=places.find(x=>x.id===id);
  if(!p)return;
  m.setIcon(iconFor(p));
  if(visible(p)){if(!map.hasLayer(m))m.addTo(map)}else if(map.hasLayer(m))map.removeLayer(m);
 });
 const visibleCoords=places.filter(p=>visible(p)&&coords[p.id]).map(p=>coords[p.id]);
 if(activeFilter&&visibleCoords.length) map.fitBounds(visibleCoords,{padding:[28,28],maxZoom:14});
}
function initMap(){
 map=L.map("map",{zoomControl:true}).setView([53.5511,9.9937],11);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
 renderFilters(); geocodeAll();
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function geocodeAll(){
 let cache={};try{cache=JSON.parse(localStorage.getItem("hambourg-v2-geocodes")||"{}")}catch(e){}
 let ok=0,fail=0;
 for(const p of places){
  let ll=cache[p.address];
  if(!ll){
   try{
    const q=(p.address.includes("Germany")?p.address:p.address+", Hamburg, Germany");
    const u="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q="+encodeURIComponent(q);
    const r=await fetch(u,{headers:{"Accept-Language":"fr"}});
    const j=await r.json();
    if(j&&j[0]){ll=[+j[0].lat,+j[0].lon];cache[p.address]=ll;localStorage.setItem("hambourg-v2-geocodes",JSON.stringify(cache))}
    else fail++;
   }catch(e){fail++}
   await sleep(1050);
  }
  if(ll){
   coords[p.id]=ll;
   const m=L.marker(ll,{icon:iconFor(p)}).bindTooltip(p.name,{direction:"top"});
   m.on("click",()=>showPlace(p)); markers.set(p.id,m); if(visible(p))m.addTo(map); ok++;
  }
  $("#mapStatus").textContent=`Carte : ${ok}/${places.length} lieux positionnés${fail?` · ${fail} à vérifier`:""}`;
 }
 if(ok>0){const all=Object.values(coords);map.fitBounds(all,{padding:[22,22]});}
 if(fail===0)setTimeout(()=>$("#mapStatus").classList.add("hidden"),2200);
}
initMap();


const places=window.PLACES||[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

const cats=[
 ["Hébergement","🏠","hotel"],
 ["Architecture & photo","📷","photo"],
 ["Ambiances & quartiers","◉","amb"],
 ["Manger & boire","🍴","food"],
 ["Cafés","☕","cafe"],
 ["Culture & musées","🏛","culture"],
 ["Marchés","🛍","market"],
 ["Auto & insolite","🚗","auto"],
 ["Adresses pratiques","🧺","practical"]
];
const quarters=["Centre","HafenCity & Speicherstadt","St. Pauli","Altona & Fischmarkt","Schanze & Eimsbüttel","Barmbek & City Nord","Hammerbrook","Est du port","Port & Köhlbrand","Harburg","Autres"];
const catInfo=Object.fromEntries(cats.map(x=>[x[0],{icon:x[1],key:x[2]}]));
let map,markers=new Map(),coords={},activeCategory="",quickMode="",searchText="";

function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function googleUrl(p){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.name+" "+p.address)}
function appleUrl(p){return "https://maps.apple.com/?q="+encodeURIComponent(p.name)+"&address="+encodeURIComponent(p.address)}
function info(p){return catInfo[p.category]||{icon:"•",key:"amb"}}

function showPlace(p){
 const i=info(p);
 const media=p.image
   ? `<div class="place-image-wrap"><img class="place-image" src="${p.image}" alt="${esc(p.name)}"></div>`
   : `<div class="place-hero-placeholder" aria-label="Pas de photo disponible">${i.icon}</div>`;
 $("#sheetContent").innerHTML=`${media}
 <h2>${esc(p.name)}</h2>
 <div class="place-line"><strong>${esc(p.category)}</strong><br>${esc(p.quarter)}<br>${esc(p.address)}</div>
 <div class="place-badges"><span class="badge">${esc(p.detail)}</span></div>
 ${p.imageCredit?`<div class="image-credit">${p.imageSource?`<a href="${p.imageSource}" target="_blank" rel="noopener">${esc(p.imageCredit)}</a>`:esc(p.imageCredit)}</div>`:""}
 <div class="actions"><a href="${googleUrl(p)}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a><a class="secondary" href="${appleUrl(p)}" target="_blank" rel="noopener">Ouvrir dans Plans</a></div>`;
 $(".sheet-card").classList.toggle("has-image",!!p.image);
 $("#sheet").classList.remove("hidden");
}
$("#closeSheet").onclick=()=>{$("#sheet").classList.add("hidden");$(".sheet-card").classList.remove("has-image")};
$("#sheet").addEventListener("click",e=>{if(e.target.id==="sheet"){$("#sheet").classList.add("hidden");$(".sheet-card").classList.remove("has-image")}});

$$(".main-tabs button").forEach(b=>b.onclick=()=>{
 document.body.classList.toggle("home-mode",b.dataset.tab==="home");
 $$(".main-tabs button").forEach(x=>x.classList.toggle("active",x===b));
 $$(".tab").forEach(x=>x.classList.remove("active"));
 $("#tab-"+b.dataset.tab).classList.add("active");
 if(b.dataset.tab==="map"&&map)setTimeout(()=>map.invalidateSize(),100);
});

function setTab(tab){
 const button=$(`.main-tabs button[data-tab="${tab}"]`);
 if(button)button.click();
 window.scrollTo({top:0,behavior:"smooth"});
}

function featuredCard(p){
 const i=info(p);
 return `<article class="featured-card" data-id="${p.id}">${p.image?`<img src="${p.image}" alt="${esc(p.name)}" loading="lazy">`:`<div class="featured-placeholder">${i.icon}</div>`}<div><small>${esc(p.category)}</small><h3>${esc(p.name)}</h3><p>${esc(p.quarter)}</p></div></article>`;
}

function renderHome(){
 const ids=[63,59,5];
 const selected=ids.map(id=>places.find(p=>p.id===id)).filter(Boolean);
 $("#featuredPlaces").innerHTML=selected.map(featuredCard).join("");
 $("#featuredPlaces").querySelectorAll("[data-id]").forEach(el=>el.onclick=()=>showPlace(places.find(p=>p.id==el.dataset.id)));
 $$("[data-home-tab]").forEach(b=>b.onclick=()=>setTab(b.dataset.homeTab));
 $$("[data-place-id]").forEach(b=>b.onclick=()=>showPlace(places.find(p=>p.id==b.dataset.placeId)));
}

function initPlanning(){
 $$('[data-plan-id]').forEach(button=>button.onclick=()=>showPlace(places.find(p=>p.id===Number(button.dataset.planId))));
 $$('[data-plan-name]').forEach(button=>button.onclick=()=>{
   const wanted=button.dataset.planName.toLowerCase();
   const place=places.find(p=>p.name.toLowerCase()===wanted)||places.find(p=>p.name.toLowerCase().includes(wanted.split(' ')[0]));
   if(place)showPlace(place);
 });
 initDayMaps();
}

const dayRoutes=[
 {numbers:["1","1 → 2","3","4","5"],stops:[["Hamburg Hbf",53.5526,10.0067,"s"],["Hébergement",53.4597,9.9838,"s",65],["Centre de Harburg",53.4605,9.9820,"walk"],["Binnenhafen",53.4693,9.9828,"walk",17],["Özlem Köfte",53.4558,9.9850,"walk",68]]},
 {numbers:["1 → 2","2","3","3 → 4","4 – 5","5 → 6","6 – 7","6 → 1"],stops:[["Harburg Rathaus",53.4605,9.9820,"s"],["Flohschanze",53.5578,9.9672,"s",36],["Schanze & Eimsbüttel",53.5624,9.9640,"walk"],["Ottensen",53.5529,9.9267,"s"],["Altona",53.5527,9.9355,"walk"],["Reeperbahn",53.5495,9.9570,"s"],["Indra Club",53.551911,9.958011,"walk",66]]},
 {numbers:["1 → 2","2","3 → 4","4 → 5","5 → 6","6","7","7 → 1"],stops:[["Harburg Rathaus",53.4605,9.9820,"s"],["Fischmarkt",53.5450,9.9512,"s",41],["Landungsbrücken",53.5462,9.9661,"walk"],["Finkenwerder",53.5352,9.8794,"ferry"],["Dockland",53.5434,9.9348,"ferry",62],["Alter Elbtunnel",53.5456,9.9666,"bus"],["Park Fiction",53.5471,9.9579,"walk",18]]},
 {numbers:["1 → 2","3","4","5","6","7","7 → 1"],stops:[["Harburg Rathaus",53.4605,9.9820,"s"],["Baumwall",53.5442,9.9818,"s"],["Elbphilharmonie",53.5413,9.9841,"walk",63],["Speicherstadt",53.5436,9.9888,"walk"],["Oberhafen-Kantine",53.5451,10.0170,"walk",57],["PHOXXI & Deichtorhallen",53.5476,10.0065,"walk",64],["Miniatur Wunderland",53.5439,9.9881,"walk",27]]},
 {numbers:["1 → 2","2","3 – 4","2 → 5","5 – 6","5 → 6","6 → 7","7","7 → 1"],stops:[["Harburg Rathaus",53.4605,9.9820,"s"],["Isemarkt",53.5817,9.9765,"s",6],["Isebekkanal",53.5830,9.9797,"walk"],["Eppendorfer Baum",53.5838,9.9855,"walk"],["HafenCity Universität",53.5404,10.0077,"u"],["Elbbrücken",53.5347,10.0244,"u"],["Oldtimer Tankstelle",53.53985,10.02719,"bus",5]]},
 {numbers:["1","2 – 3","1","4 → 5"],stops:[["Hébergement",53.4597,9.9838,"walk",65],["Marché du Sand",53.4608,9.9812,"walk"],["Bloomest",53.4588,9.9790,"walk",67],["Harburg Rathaus",53.4605,9.9820,"walk"],["Hamburg Hbf (si nécessaire)",53.5526,10.0067,"s"]]}
];
const routeMode={walk:{label:"À pied",color:"#b37a45",dash:"4 7"},s:{label:"S-Bahn",color:"#2f7464"},u:{label:"U-Bahn",color:"#386ea8"},bus:{label:"Bus",color:"#9a5a85",dash:"9 6"},ferry:{label:"Ferry",color:"#248ba0",dash:"3 7"}};
const dayMapInstances=new Map();
function routePin(number){return L.divIcon({className:"",html:`<div class="route-pin"><span>${number}</span></div>`,iconSize:[28,28],iconAnchor:[14,28]})}
function initDayMaps(){
 $$(".day-card").forEach((card,index)=>{
  const route=dayRoutes[index];if(!route)return;
  card.querySelectorAll(".timeline>div").forEach((step,stepIndex)=>{if(!route.numbers[stepIndex])return;const badge=document.createElement("span");badge.className="planning-route-number";badge.textContent=route.numbers[stepIndex];step.querySelector("section").prepend(badge)});
  const button=document.createElement("button");button.className="day-map-toggle";button.type="button";button.innerHTML="<span>🗺</span><b>Voir le plan du jour</b>";
  card.querySelector("header").insertAdjacentElement("afterend",button);
  const panel=document.createElement("div");panel.className="day-map-panel hidden";
  panel.innerHTML=`<div class="day-map" id="dayMap${index}"></div><div class="day-map-key"><span><i class="key-walk"></i>À pied</span><span><i class="key-rail"></i>S/U-Bahn</span><span><i class="key-bus"></i>Bus</span><span><i class="key-ferry"></i>Ferry</span></div><p>Tracé général pour visualiser l’ordre des étapes. Les lignes exactes sont détaillées dans le planning ci-dessous.</p>`;
  button.insertAdjacentElement("afterend",panel);
  button.onclick=()=>{
   const opening=panel.classList.contains("hidden");panel.classList.toggle("hidden");button.classList.toggle("open",opening);button.querySelector("b").textContent=opening?"Masquer le plan":"Voir le plan du jour";
   if(!opening)return;
   if(!dayMapInstances.has(index)){
    const dayMap=L.map(`dayMap${index}`,{zoomControl:true,scrollWheelZoom:false});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(dayMap);
    route.stops.forEach((stop,i)=>{const marker=L.marker([stop[1],stop[2]],{icon:routePin(i+1)}).addTo(dayMap);const place=stop[4]?places.find(p=>p.id===stop[4]):null;if(place)marker.bindPopup(`<div class="route-popup"><b>${i+1}. ${esc(place.name)}</b><button type="button" data-route-place="${place.id}">Voir la fiche</button></div>`);else marker.bindPopup(`<b>${i+1}. ${esc(stop[0])}</b>`)});
    for(let i=1;i<route.stops.length;i++){const mode=routeMode[route.stops[i][3]]||routeMode.walk;L.polyline([[route.stops[i-1][1],route.stops[i-1][2]],[route.stops[i][1],route.stops[i][2]]],{color:mode.color,weight:4,opacity:.82,dashArray:mode.dash||null}).bindTooltip(mode.label).addTo(dayMap)}
    dayMap.fitBounds(route.stops.map(s=>[s[1],s[2]]),{padding:[24,24],maxZoom:14});dayMapInstances.set(index,dayMap);
   }
   setTimeout(()=>dayMapInstances.get(index).invalidateSize(),80);
  };
 });
}
document.addEventListener("click",event=>{const button=event.target.closest("[data-route-place]");if(!button)return;const place=places.find(p=>p.id===Number(button.dataset.routePlace));if(place)showPlace(place)});

function quickMatch(p){
 if(!quickMode)return true;
 if(quickMode==="photo")return ["Architecture & photo","Ambiances & quartiers","Auto & insolite"].includes(p.category);
 if(quickMode==="food")return ["Manger & boire","Cafés"].includes(p.category);
 if(quickMode==="culture")return p.category==="Culture & musées";
 if(quickMode==="markets")return p.category==="Marchés";
 return true;
}
function visible(p){
 const q=searchText.trim().toLowerCase();
 return (!activeCategory||p.category===activeCategory)&&quickMatch(p)&&(!q||[p.name,p.address,p.quarter,p.category,p.detail].join(" ").toLowerCase().includes(q));
}
function renderChips(){
 $("#categoryChips").innerHTML=`<button class="chip ${activeCategory===""?"active":""}" data-cat="">Toutes les catégories</button>`+
 cats.map(c=>`<button class="chip ${activeCategory===c[0]?"active":""}" data-cat="${esc(c[0])}">${c[1]} ${esc(c[0])}</button>`).join("");
 $("#categoryChips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderChips();refreshMarkers(true)});
}
$$(".mode").forEach(b=>b.onclick=()=>{
 quickMode=b.dataset.mode;
 $$(".mode").forEach(x=>x.classList.toggle("active",x===b));
 activeCategory="";
 renderChips();refreshMarkers(true);
});
$("#mapSearch").oninput=e=>{searchText=e.target.value;refreshMarkers(false)};

function markerIcon(p){
 const i=info(p);
 return L.divIcon({className:"",html:`<div class="pin p-${i.key}"><span>${i.icon}</span></div>`,iconSize:[31,31],iconAnchor:[15,31]});
}
function refreshMarkers(zoom){
 markers.forEach((m,id)=>{
   const p=places.find(x=>x.id===id);
   if(visible(p)){if(!map.hasLayer(m))m.addTo(map)}else if(map.hasLayer(m))map.removeLayer(m);
 });
 const pts=places.filter(p=>visible(p)&&coords[p.id]).map(p=>coords[p.id]);
 if(zoom&&pts.length)map.fitBounds(pts,{padding:[28,28],maxZoom:14});
}
$("#mapHome").onclick=()=>map&&map.setView([53.5511,9.9937],11.2);

function renderCategoryList(){
 const input=$("#categorySearch"),root=$("#categoryGroups");
 const draw=()=>{
  const q=input.value.toLowerCase().trim();
  root.innerHTML=cats.map(([cat,icon])=>{
   const arr=places.filter(p=>p.category===cat&&(!q||[p.name,p.address,p.quarter,p.detail].join(" ").toLowerCase().includes(q)));
   if(!arr.length)return "";
   return `<section class="group"><div class="group-header"><div class="group-title"><span class="big-icon">${icon}</span><h3>${cat}</h3></div><span class="count">${arr.length}</span></div>
   <div class="grid">${arr.map(p=>`<article class="place" data-id="${p.id}">${p.image?`<img class="place-thumb" src="${p.image}" alt="" loading="lazy">`:`<div class="place-placeholder">${info(p).icon}</div>`}<div class="place-copy"><div class="place-name">${esc(p.name)}</div><div class="place-sub">${esc(p.quarter)}</div><div class="place-badges"><span class="badge">${esc(p.detail)}</span></div></div></article>`).join("")}</div></section>`;
  }).join("");
  root.querySelectorAll(".place").forEach(el=>el.onclick=()=>showPlace(places.find(p=>p.id==el.dataset.id)));
 };
 input.oninput=draw;draw();
}

function renderQuarterList(){
 const input=$("#quarterSearch"),root=$("#quarterGroups");
 const draw=()=>{
  const q=input.value.toLowerCase().trim();
  root.innerHTML=quarters.map(qu=>{
    const arr=places.filter(p=>p.quarter===qu&&(!q||[p.name,p.address,p.category,p.detail,qu].join(" ").toLowerCase().includes(q)));
    if(!arr.length)return "";
    return `<section class="quarter-card"><div class="qtop"><div><h3>⌂ ${esc(qu)}</h3><p>${arr.length} lieu${arr.length>1?"x":""}</p></div><button data-quarter="${esc(qu)}">Voir sur la carte</button></div>
    <div class="quarter-places">${arr.map(p=>`<article class="place" data-id="${p.id}">${p.image?`<img class="place-thumb" src="${p.image}" alt="" loading="lazy">`:`<div class="place-placeholder">${info(p).icon}</div>`}<div class="place-copy"><div class="place-name">${esc(p.name)}</div><div class="place-sub">${esc(p.category)}</div></div></article>`).join("")}</div></section>`;
  }).join("");
  root.querySelectorAll(".place").forEach(el=>el.onclick=()=>showPlace(places.find(p=>p.id==el.dataset.id)));
  root.querySelectorAll("[data-quarter]").forEach(b=>b.onclick=()=>{
    const qu=b.dataset.quarter;
    $$(".main-tabs button").forEach(x=>x.classList.toggle("active",x.dataset.tab==="map"));
    $$(".tab").forEach(x=>x.classList.remove("active"));$("#tab-map").classList.add("active");
    activeCategory="";quickMode="";searchText="";
    $$(".mode").forEach(x=>x.classList.toggle("active",x.dataset.mode===""));
    $("#mapSearch").value="";renderChips();
    setTimeout(()=>{map.invalidateSize();const pts=places.filter(p=>p.quarter===qu&&coords[p.id]).map(p=>coords[p.id]);if(pts.length)map.fitBounds(pts,{padding:[32,32],maxZoom:14});},120);
  });
 };
 input.oninput=draw;draw();
}

function initMap(){
 map=L.map("map",{zoomControl:true}).setView([53.5511,9.9937],11.2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
 renderChips();geocodeAll();
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function geocodeAll(){
 let cache={};try{cache=JSON.parse(localStorage.getItem("hambourg-v3-geocodes")||"{}")}catch(e){}
 let ok=0,fail=0;
 const queue=[...places].sort((a,b)=>Number(Boolean(b.lat))-Number(Boolean(a.lat))||([65,67,68,63].includes(a.id)?-1:0));
 for(const p of queue){
   let ll=(Number.isFinite(p.lat)&&Number.isFinite(p.lng))?[p.lat,p.lng]:cache[p.address];
   if(!ll){
     try{
       const q=(p.address.includes("Germany")?p.address:p.address+", Hamburg, Germany");
       const u="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q="+encodeURIComponent(q);
       const r=await fetch(u,{headers:{"Accept-Language":"fr"}});
       const j=await r.json();
       if(j&&j[0]){ll=[+j[0].lat,+j[0].lon];cache[p.address]=ll;localStorage.setItem("hambourg-v3-geocodes",JSON.stringify(cache))}
       else fail++;
     }catch(e){fail++}
     await sleep(1050);
   }
   if(ll){
     coords[p.id]=ll;
     const m=L.marker(ll,{icon:markerIcon(p)}).bindTooltip(p.name,{direction:"top",offset:[0,-27]});
     m.on("click",()=>showPlace(p));markers.set(p.id,m);if(visible(p))m.addTo(map);ok++;
   }
   $("#mapStatus").textContent=`${ok}/${places.length} lieux chargés${fail?` · ${fail} à vérifier`:""}`;
 }
 if(ok)map.setView([53.5511,9.9937],11.2);
 if(fail===0)setTimeout(()=>$("#mapStatus").classList.add("hidden"),1800);
}
document.addEventListener("error",event=>{
 const img=event.target;
 if(!(img instanceof HTMLImageElement))return;
 const p=places.find(place=>place.name===img.alt);
 const fallback=document.createElement("div");
 fallback.className=img.closest(".featured-card")?"featured-placeholder":img.classList.contains("place-image")?"place-hero-placeholder":"place-placeholder";
 fallback.textContent=info(p||{}).icon;
 if(img.classList.contains("place-image"))img.closest(".place-image-wrap")?.replaceWith(fallback);else img.replaceWith(fallback);
},{capture:true});

renderCategoryList();renderQuarterList();renderHome();initPlanning();
if(typeof L!=="undefined"){
 try{initMap()}catch(error){$("#mapStatus").textContent="La carte est momentanément indisponible. Les catégories et quartiers restent accessibles."}
}else{
 $("#mapStatus").textContent="La carte nécessite une connexion. Les catégories et quartiers restent accessibles hors connexion.";
}
let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").hidden=true};
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").then(r=>r.update()).catch(()=>{});

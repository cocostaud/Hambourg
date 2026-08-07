
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
 ["Auto & insolite","🚗","auto"]
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
 $$(".main-tabs button").forEach(x=>x.classList.toggle("active",x===b));
 $$(".tab").forEach(x=>x.classList.remove("active"));
 $("#tab-"+b.dataset.tab).classList.add("active");
 if(b.dataset.tab==="map"&&map)setTimeout(()=>map.invalidateSize(),100);
});

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
$("#mapHome").onclick=()=>map.setView([53.5511,9.9937],11.2);

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
 for(const p of places){
   let ll=cache[p.address];
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
renderCategoryList();renderQuarterList();initMap();

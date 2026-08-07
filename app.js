
const places = window.PLACES || [];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let map, deferredPrompt;
const markers = new Map();

function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function mapsUrl(p){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.name+" "+p.address)}
function appleUrl(p){return "https://maps.apple.com/?q="+encodeURIComponent(p.name)+"&address="+encodeURIComponent(p.address)}
function showPlace(p){
  const sheet=$("#sheet"); const body=sheet.querySelector(".sheet-body");
  body.innerHTML=`<h2>${esc(p.name)}</h2>
  <div class="tag">${esc(p.category)}</div>
  <p><strong>${esc(p.address)}</strong></p>
  ${p.zone?`<p>${esc(p.date)} · ${esc(p.zone)}</p>`:""}
  ${p.note?`<p>${esc(p.note)}</p>`:""}
  <div class="actions">
    <a href="${mapsUrl(p)}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a>
    <a class="secondary" href="${appleUrl(p)}" target="_blank" rel="noopener">Ouvrir dans Plans</a>
  </div>`;
  sheet.classList.remove("hidden");
}
$(".sheet-close").onclick=()=>$("#sheet").classList.add("hidden");
$("#sheet").addEventListener("click",e=>{if(e.target.id==="sheet") $("#sheet").classList.add("hidden")});

$$(".tabs button").forEach(btn=>btn.onclick=()=>{
  $$(".tabs button").forEach(b=>b.classList.toggle("active",b===btn));
  $$(".tab").forEach(t=>t.classList.remove("active"));
  $("#tab-"+btn.dataset.tab).classList.add("active");
  if(btn.dataset.tab==="map" && map) setTimeout(()=>map.invalidateSize(),100);
});

function renderPlaces(){
  const cats=[...new Set(places.map(p=>p.category).filter(Boolean))].sort();
  $("#category").innerHTML='<option value="">Toutes les catégories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
  const run=()=>{
    const q=$("#search").value.toLowerCase().trim(), c=$("#category").value;
    const arr=places.filter(p=>(!c||p.category===c)&&(!q||[p.name,p.address,p.category,p.zone].join(" ").toLowerCase().includes(q)));
    $("#placesList").innerHTML=arr.map(p=>`<article class="card" data-id="${p.id}">
      <h3>${esc(p.name)}</h3><div class="meta">${esc(p.address)}</div>
      <div class="tag">${esc(p.category)}</div></article>`).join("") || '<div class="meta">Aucun résultat.</div>';
    $$("#placesList .card").forEach(el=>el.onclick=()=>showPlace(places.find(p=>p.id==el.dataset.id)));
  };
  $("#search").oninput=run; $("#category").onchange=run; run();
}

function renderDays(){
  const groups={};
  places.filter(p=>p.date).sort((a,b)=>a.date.localeCompare(b.date)||a.order-b.order).forEach(p=>{
    const k=p.date+"|"+p.zone; (groups[k]??=[]).push(p);
  });
  $("#daysList").innerHTML=Object.entries(groups).map(([k,arr])=>{
    const [date,zone]=k.split("|");
    return `<section class="day"><h2>${esc(date)}</h2><div class="zone">${esc(zone)}</div>
      ${arr.map(p=>`<div class="day-place" data-id="${p.id}"><div class="num">${p.order}</div><div><strong>${esc(p.name)}</strong><div class="meta">${esc(p.category)}</div></div></div>`).join("")}
      </section>`;
  }).join("");
  $$(".day-place").forEach(el=>el.onclick=()=>showPlace(places.find(p=>p.id==el.dataset.id)));
}

function initMap(){
  map=L.map("map",{zoomControl:true}).setView([53.5511,9.9937],11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
  geocodeAll();
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function geocodeAll(){
  let cache={}; try{cache=JSON.parse(localStorage.getItem("hamburgGeocodes")||"{}")}catch(e){}
  let done=0, failed=0;
  for(const p of places){
    let ll=cache[p.address];
    if(!ll){
      try{
        const u="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q="+encodeURIComponent(p.address+", Hamburg");
        const r=await fetch(u,{headers:{"Accept-Language":"fr"}});
        const j=await r.json();
        if(j&&j[0]){ll=[+j[0].lat,+j[0].lon];cache[p.address]=ll;localStorage.setItem("hamburgGeocodes",JSON.stringify(cache))}
        else failed++;
      }catch(e){failed++}
      await sleep(1050);
    }
    if(ll){
      const m=L.marker(ll).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.category)}`);
      m.on("click",()=>setTimeout(()=>showPlace(p),120));
      markers.set(p.id,m); done++;
    }
    $("#mapNote").textContent=`Carte : ${done}/${places.length} lieux positionnés${failed?` · ${failed} à vérifier`:""}. Les positions sont mémorisées sur cet appareil.`;
  }
  if(done && done===places.length) setTimeout(()=>$("#mapNote").classList.add("hidden"),2200);
}

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$("#installBtn").classList.add("hidden")}};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
renderPlaces(); renderDays(); initMap();

const DAYS = {
  lunes:{label:'Lunes',code:'D1',exs:[
    {name:'Sentadilla con barra',sets:4,tag:'4×6-10'},
    {name:'Press banca con barra',sets:4,tag:'4×6-10'},
    {name:'Jalón al pecho / Dominadas',sets:3,tag:'3×8-12'},
    {name:'Remo con barra',sets:3,tag:'3×8-12'},
    {name:'Elevaciones laterales',sets:3,tag:'3×12-15'},
    {name:'Curl de bíceps',sets:2,tag:'2×10-12'},
  ]},
  miercoles:{label:'Miércoles',code:'D2',exs:[
    {name:'Prensa de piernas',sets:4,tag:'4×8-12'},
    {name:'Press inclinado mancuernas',sets:3,tag:'3×8-12'},
    {name:'Hip thrust',sets:3,tag:'3×8-12'},
    {name:'Remo en polea baja',sets:3,tag:'3×10-12'},
    {name:'Fondos en paralelas',sets:3,tag:'3×6-10'},
    {name:'Face pulls / Rear delt',sets:2,tag:'2×15-20'},
    {name:'Gemelos',sets:3,tag:'3×15-20'},
  ]},
  viernes:{label:'Viernes',code:'D3',exs:[
    {name:'Peso muerto rumano',sets:3,tag:'3×8-10'},
    {name:'Press banca / Fondos',sets:3,tag:'3×6-10'},
    {name:'Jalón al pecho',sets:3,tag:'3×8-12'},
    {name:'Remo con barra / T-Bar',sets:3,tag:'3×8-12'},
    {name:'Elevaciones laterales',sets:3,tag:'3×12-15'},
    {name:'Curl martillo',sets:2,tag:'2×10-12'},
    {name:'Face pulls / Rear delt',sets:2,tag:'2×15-20'},
  ]}
};

const ALL_EX = [...new Set(Object.values(DAYS).flatMap(d=>d.exs.map(e=>e.name)))];

let currentDay = null;
let sessionData = {}; // {dayKey: [{name, sets:[{kg,reps,rir}]}]}
let sessions = [];
let openCards = {};

try { sessions = JSON.parse(localStorage.getItem('gymSessions_v3')||'[]'); } catch(e){}

function save(){ try{ localStorage.setItem('gymSessions_v3',JSON.stringify(sessions)); }catch(e){} }

function getWeek(){
  const d=new Date(),j=new Date(d.getFullYear(),0,4);
  return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);
}
function todayStr(){
  return new Date().toLocaleDateString('es-UY',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ── PAGE NAV ──────────────────────────────────────────────────────
function showPage(name, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  btn.classList.add('active');
  document.getElementById('saveBar').classList.toggle('show', name==='train' && currentDay!==null);
  if(name==='progress') initProgress();
  if(name==='history') renderHistory();
}

// ── DAY GRID ──────────────────────────────────────────────────────
function renderDayGrid(){
  document.getElementById('weekTag').textContent='Sem '+getWeek();
  const g=document.getElementById('dayGrid');
  g.innerHTML='';
  const w=getWeek();
  Object.keys(DAYS).forEach(key=>{
    const d=DAYS[key];
    const done=sessions.some(s=>s.day===key&&s.week===w);
    const active=currentDay===key;
    const btn=document.createElement('button');
    btn.className='day-btn'+(active?' active':'')+(done?' done':'');
    btn.innerHTML=`<div class="day-dot"></div><div class="dname">${d.label}</div><div class="dcode">${d.code}</div>`;
    btn.onclick=()=>selectDay(key);
    g.appendChild(btn);
  });
}

// ── SELECT DAY ────────────────────────────────────────────────────
function selectDay(key){
  currentDay=key;
  openCards={};
  if(!sessionData[key]){
    sessionData[key]=DAYS[key].exs.map(ex=>({
      name:ex.name,
      sets:Array.from({length:ex.sets},()=>({kg:'',reps:'',rir:''}))
    }));
  }
  renderDayGrid();
  renderSession();
  document.getElementById('saveBar').classList.add('show');
}

// ── SESSION ───────────────────────────────────────────────────────
function renderSession(){
  const wrap=document.getElementById('sessionWrap');
  if(!currentDay||!sessionData[currentDay]){ wrap.innerHTML='<div class="no-day">Elegí el día para empezar</div>'; return; }
  const d=DAYS[currentDay];
  let html=`
    <div class="sess-hdr">
      <div><div class="sess-title">${d.label}</div><div class="sess-date">${todayStr()}</div></div>
      <button class="btn-sm" onclick="closeDay()">Cerrar</button>
    </div>
    <div class="rir-hint">RIR = reps en reserva · objetivo: 1–2</div>`;

  sessionData[currentDay].forEach((ex,ei)=>{
    const exDef=d.exs[ei];
    const filled=ex.sets.filter(s=>s.kg&&s.reps).length;
    const prev=getPrevBest(ex.name);
    const isOpen=!!openCards[ei];

    let setsHtml='';
    ex.sets.forEach((s,si)=>{
      setsHtml+=`<div class="set-row">
        <span class="set-idx">${si+1}</span>
        <input class="set-inp" type="number" step="0.5" min="0" placeholder="kg" value="${s.kg}" oninput="updSet(${ei},${si},'kg',this.value)" inputmode="decimal">
        <input class="set-inp" type="number" min="0" max="50" placeholder="rep" value="${s.reps}" oninput="updSet(${ei},${si},'reps',this.value)" inputmode="numeric">
        <input class="set-inp rir" type="number" min="0" max="5" placeholder="RIR" value="${s.rir}" oninput="updSet(${ei},${si},'rir',this.value)" inputmode="numeric">
        ${ex.sets.length>1?`<button class="del-btn" onclick="delSet(${ei},${si})">×</button>`:'<span style="width:28px"></span>'}
      </div>`;
    });

    html+=`<div class="ex-card${isOpen?' open':''}" id="exc-${ei}">
      <div class="ex-hdr" onclick="toggleCard(${ei})">
        <span class="ex-num">${String(ei+1).padStart(2,'0')}</span>
        <span class="ex-name">${ex.name}</span>
        ${filled>0?`<span class="ex-badge cnt">${filled}/${ex.sets.length}</span>`:''}
        <span class="ex-badge tag">${exDef.tag}</span>
        ${prev&&!isOpen?`<span class="ex-badge prev">${prev}</span>`:''}
        <span class="ex-chev">›</span>
      </div>
      <div class="set-area">
        <div class="set-cols">
          <div class="set-col-lbl">kg</div>
          <div class="set-col-lbl">reps</div>
          <div class="set-col-lbl rir-lbl">RIR</div>
        </div>
        ${setsHtml}
        <button class="add-set-btn" onclick="addSet(${ei})">+ serie</button>
        ${prev?`<div class="prev-hint"><b>Anterior:</b> ${prev}</div>`:''}
      </div>
    </div>`;
  });

  wrap.innerHTML=html;
}

function closeDay(){
  currentDay=null;
  document.getElementById('saveBar').classList.remove('show');
  renderDayGrid();
  document.getElementById('sessionWrap').innerHTML='<div class="no-day">Elegí el día para empezar</div>';
}

function toggleCard(ei){
  openCards[ei]=!openCards[ei];
  const card=document.getElementById('exc-'+ei);
  if(!card) return;
  card.classList.toggle('open',!!openCards[ei]);
  const prevBadge=card.querySelector('.ex-badge.prev');
  if(prevBadge) prevBadge.style.display=openCards[ei]?'none':'';
}

function updSet(ei,si,field,val){
  sessionData[currentDay][ei].sets[si][field]=val;
}

function addSet(ei){
  flushInputs();
  sessionData[currentDay][ei].sets.push({kg:'',reps:'',rir:''});
  openCards[ei]=true;
  renderSession();
}

function delSet(ei,si){
  if(sessionData[currentDay][ei].sets.length<=1) return;
  flushInputs();
  sessionData[currentDay][ei].sets.splice(si,1);
  openCards[ei]=true;
  renderSession();
}

function flushInputs(){
  if(!currentDay||!sessionData[currentDay]) return;
  sessionData[currentDay].forEach((ex,ei)=>{
    ex.sets.forEach((s,si)=>{
      const card=document.getElementById('exc-'+ei);
      if(!card) return;
      const inputs=card.querySelectorAll('.set-area .set-row');
      if(!inputs[si]) return;
      const inps=inputs[si].querySelectorAll('input');
      if(inps[0]) s.kg=inps[0].value;
      if(inps[1]) s.reps=inps[1].value;
      if(inps[2]) s.rir=inps[2].value;
    });
  });
}

function saveSession(){
  flushInputs();
  const exs=(sessionData[currentDay]||[])
    .map(ex=>({...ex,sets:ex.sets.filter(s=>s.kg||s.reps)}))
    .filter(ex=>ex.sets.length);
  if(!exs.length){ showToast('No hay datos para guardar'); return; }
  sessions.unshift({
    day:currentDay,dayLabel:DAYS[currentDay].label,
    date:todayStr(),week:getWeek(),
    savedAt:new Date().toISOString(),exercises:exs
  });
  save();
  delete sessionData[currentDay];
  currentDay=null;
  openCards={};
  document.getElementById('saveBar').classList.remove('show');
  renderDayGrid();
  document.getElementById('sessionWrap').innerHTML='<div class="no-day">Sesión guardada ✓ — elegí el próximo día</div>';
  showToast('Sesión guardada ✓');
}

function getPrevBest(exName){
  const rel=sessions.filter(s=>s.exercises?.some(e=>e.name===exName))
    .sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));
  if(!rel.length) return null;
  const ex=rel[0].exercises.find(e=>e.name===exName);
  const best=[...(ex?.sets||[])].filter(s=>s.kg&&s.reps).sort((a,b)=>parseFloat(b.kg)-parseFloat(a.kg))[0];
  return best?`${best.kg}kg×${best.reps}`:null;
}

// ── PROGRESS ─────────────────────────────────────────────────────
function initProgress(){
  const sel=document.getElementById('exSelect');
  sel.innerHTML='';
  ALL_EX.forEach(n=>{
    const o=document.createElement('option');
    o.value=n;o.textContent=n;sel.appendChild(o);
  });
  renderChart();
}

function renderChart(){
  const name=document.getElementById('exSelect').value;
  const area=document.getElementById('chartArea');
  const data=sessions
    .filter(s=>s.exercises?.some(e=>e.name===name))
    .map(s=>{
      const ex=s.exercises.find(e=>e.name===name);
      const best=[...(ex?.sets||[])].filter(x=>x.kg&&x.reps).sort((a,b)=>parseFloat(b.kg)-parseFloat(a.kg))[0];
      return{date:s.date,kg:best?parseFloat(best.kg):0,reps:best?parseInt(best.reps):0};
    }).filter(d=>d.kg>0).reverse();

  if(!data.length){
    area.innerHTML=`<div class="chart-box"><div class="chart-name">${name}</div><div class="empty" style="padding:24px 0">Sin datos aún — guardá sesiones primero</div></div>`;
    return;
  }

  const last=data[data.length-1].kg, first=data[0].kg;
  const delta=(last-first).toFixed(1);
  const dcolor=parseFloat(delta)>=0?'#a3e635':'#f87171';
  const dstr=(parseFloat(delta)>=0?'+':'')+delta+' kg';

  let svgHtml='';
  if(data.length>=2){
    const W=360,H=80,pad=8;
    const vals=data.map(d=>d.kg);
    const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
    const pts=vals.map((v,i)=>({
      x:pad+(i/(vals.length-1))*(W-pad*2),
      y:H-pad-((v-mn)/rng)*(H-pad*2),
      d:data[i]
    }));
    const path='M'+pts.map(p=>`${p.x},${p.y}`).join(' L');
    const area2=`M${pts[0].x},${H} L${pts.map(p=>`${p.x},${p.y}`).join(' L')} L${pts[pts.length-1].x},${H} Z`;
    const dots=pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#a3e635" stroke="#161616" stroke-width="1.5"><title>${p.d.date}: ${p.d.kg}kg×${p.d.reps}</title></circle>`).join('');
    const labels=pts.map((p,i)=>{
      if(data.length>5&&i%Math.ceil(data.length/4)!==0&&i!==data.length-1) return '';
      return `<text x="${p.x}" y="${H+14}" text-anchor="middle" fill="#444" font-size="9" font-family="monospace">${p.d.date.slice(0,5)}</text>`;
    }).join('');
    svgHtml=`<svg class="chart-svg" viewBox="0 0 ${W} ${H+18}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a3e635" stop-opacity=".12"/><stop offset="100%" stop-color="#a3e635" stop-opacity="0"/></linearGradient></defs>
      <path d="${area2}" fill="url(#g)"/>
      <path d="${path}" fill="none" stroke="#6a9d20" stroke-width="1.5" stroke-linejoin="round"/>
      ${dots}${labels}
    </svg>`;
  }

  const recent=data.slice(-5).reverse();
  const bestKg=Math.max(...recent.map(r=>r.kg));
  const pillsHtml=recent.map(r=>`
    <div class="r-pill ${r.kg===bestKg?'best-pill':''}">
      <div class="rp-date">${r.date.slice(0,5)}</div>
      <div class="rp-kg">${r.kg}kg×${r.reps}</div>
    </div>`).join('');

  area.innerHTML=`<div class="chart-box">
    <div class="chart-top">
      <div><div class="chart-name">${name}</div><div class="chart-sub">${data.length} sesión${data.length!==1?'es':''}</div></div>
      <div><div class="chart-val">${last} kg</div><div class="chart-delta" style="color:${dcolor}">${dstr}</div></div>
    </div>
    ${svgHtml}
    <div class="recent-pills">${pillsHtml}</div>
  </div>`;
}

// ── HISTORY ───────────────────────────────────────────────────────
function renderHistory(){
  const list=document.getElementById('histList');
  if(!sessions.length){ list.innerHTML='<div class="empty">No hay sesiones guardadas aún</div>'; return; }
  list.innerHTML=sessions.slice(0,50).map((s,si)=>{
    const exHtml=s.exercises.map(ex=>{
      const bestIdx=ex.sets.reduce((bi,ss,idx)=>parseFloat(ss.kg)>parseFloat(ex.sets[bi]?.kg||0)?idx:bi,0);
      const pills=ex.sets.map((set,i)=>`<span class="h-pill${i===bestIdx?' best':''}">${set.kg}kg×${set.reps}${set.rir?` r${set.rir}`:''}</span>`).join('');
      return `<div class="hist-ex"><div class="hist-ex-name">${ex.name}</div><div class="hist-sets">${pills}</div></div>`;
    }).join('');
    return `<div class="hist-sess">
      <div class="hist-hdr">
        <span class="hist-label">${s.dayLabel} — ${s.date}</span>
        <div class="hist-line"></div>
        <button class="hist-del" onclick="delSession(${si})">borrar</button>
      </div>
      ${exHtml}
    </div>`;
  }).join('');
}

function delSession(idx){
  if(!confirm('¿Borrar esta sesión?')) return;
  sessions.splice(idx,1);
  save();
  renderHistory();
  renderDayGrid();
}

// ── INIT ─────────────────────────────────────────────────────────
renderDayGrid();
document.getElementById('sessionWrap').innerHTML='<div class="no-day">Elegí el día para empezar</div>';

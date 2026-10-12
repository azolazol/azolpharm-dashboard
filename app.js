'use strict';
const $=id=>document.getElementById(id);
let data=null,origin='domestic',requestPending=false;
const text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
const fmt=v=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:1});
const calendarDate=v=>{if(!v)return '수집 대기';if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
const historySlot=v=>{if(!/Z$/.test(String(v)))return String(v).replace('T',' ');const d=new Date(v);return Number.isNaN(d.getTime())?String(v):calendarDate(v)+' '+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);};
const date=v=>v?new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'수집 대기';
function link(title,url){const a=text('a',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function render(){
 const trends=[...(data.trends||[])].sort((a,b)=>b.score-a.score);$('keyword-count').textContent=trends.length;$('top-keyword').textContent=trends[0]?.name||'수집 대기';$('through').textContent=calendarDate(data.through);
 $('status').textContent='네이버 수집 '+date(data.naverAt)+' · 영상 수집 '+date(data.youtubeAt);
 const errors=[...(data.errors||[])];if(data.naverAt&&Date.now()-Date.parse(data.naverAt)>36*3600000)errors.push('네이버 갱신이 지연되고 있습니다.');$('error').hidden=!errors.length;$('error').textContent=errors.join(' · ');
 const previous=$('video-keyword').value;$('video-keyword').replaceChildren(new Option('상위 10개 모두',''));trends.slice(0,10).forEach((t,i)=>$('video-keyword').add(new Option((i+1)+'위 · '+t.name,t.name)));$('video-keyword').value=trends.slice(0,10).some(t=>t.name===previous)?previous:'';
 renderRanks();renderVideos();renderHistory();const c=data.visitors;$('visitors').textContent=c?'오늘 방문자 '+fmt(c.today)+'명 · 총 방문자 '+fmt(c.total)+'명':'방문자 집계 대기';
}
function renderRanks(){if(!data)return;const rows=$('rankings');rows.replaceChildren();const q=$('query').value.trim().toLowerCase(),kind=$('kind').value;
 [...(data.trends||[])].sort((a,b)=>b.score-a.score).forEach((t,i)=>{if(!t.name.toLowerCase().includes(q)||(kind!=='전체'&&t.kind!==kind))return;const tr=document.createElement('tr');tr.append(text('td',i+1));const cell=document.createElement('td');cell.append(text('strong',t.name),text('small',t.kind+' · '+t.category));tr.append(cell,text('td',fmt(t.score)),text('td',t.change==null?'—':(t.change>0?'+':'')+fmt(t.change)+'%',t.change>0?'up':'muted'));rows.append(tr);});
 if(!rows.children.length){const tr=document.createElement('tr'),td=text('td','표시할 검색어가 없습니다.');td.colSpan=4;tr.append(td);rows.append(tr);}}
function renderVideos(){if(!data)return;const container=$('videos');container.replaceChildren();const top=[...(data.trends||[])].sort((a,b)=>b.score-a.score).slice(0,10),selected=$('video-keyword').value;
 top.forEach((t,i)=>{if(selected&&selected!==t.name)return;const group=text('section','','video-group');group.append(text('h3',(i+1)+'위 · '+t.name));const videos=(data.videos||[]).filter(v=>(v.keywords||[v.keyword]).includes(t.name)&&(v.origin===origin||v.origin==='both')&&Date.parse(v.publishedAt)>=Date.now()-30*86400000).sort((a,b)=>b.views-a.views).slice(0,selected?10:3);
 if(!videos.length)group.append(text('p','현재 수집된 최근 30일 영상이 없습니다.','hint'));
 videos.forEach(v=>{const a=link('', 'https://www.youtube.com/watch?v='+encodeURIComponent(v.id));a.className='video';a.append(text('strong',v.title),text('small',v.channel+' · '+String(v.publishedAt).slice(0,10)),text('span','조회 '+fmt(v.views)+'회'));group.append(a);});group.append(link(t.name+' 유튜브 직접 검색 ↗','https://www.youtube.com/results?search_query='+encodeURIComponent(t.name)));container.append(group);});
 if(!top.length)container.append(text('p','네이버 순위를 먼저 수집해 주세요.','hint'));
}
function renderHistory(){const groups=new Map();(data.history||[]).filter(r=>r.rank<=10).forEach(r=>{if(!groups.has(r.slot))groups.set(r.slot,[]);groups.get(r.slot).push(r);});const box=$('history');box.replaceChildren();[...groups.entries()].sort((a,b)=>b[0].localeCompare(a[0])).forEach(([slot,rows])=>{const col=text('article','','history-day');col.append(text('h3',historySlot(slot)));rows.sort((a,b)=>a.rank-b.rank).forEach(r=>col.append(text('p',r.rank+'. '+r.name)));box.append(col);});if(!box.children.length)box.append(text('p','첫 수집 후 날짜별 기록이 표시됩니다.','hint'));}
async function load(){if(requestPending)return;const base=window.AZOLPHARM_CONFIG?.apiUrl||'';if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(base)){$('status').textContent='설치 대기: config.js에 Apps Script 웹 앱 주소를 입력해 주세요.';return;}
 requestPending=true;$('reload').disabled=true;$('status').textContent='데이터를 불러오는 중입니다…';
 try{let visitor=localStorage.getItem('azolpharm-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('azolpharm-visitor',visitor);}await fetch(base,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'visit',visitor}),signal:AbortSignal.timeout(10000)});}catch(e){/* Blocked storage/visit must not prevent reading trends. */}
 const script=document.createElement('script');let timer;
 const finish=()=>{clearTimeout(timer);script.remove();requestPending=false;$('reload').disabled=false;};
 window.azolpharmReceive=payload=>{finish();if(payload.error){$('status').textContent='데이터를 불러오지 못했습니다: '+payload.error;return;}data=payload;render();};
 script.onerror=()=>{finish();$('status').textContent='연결 실패: 웹 앱 배포 주소와 공개 읽기 설정을 확인하세요.';};timer=setTimeout(()=>{finish();$('status').textContent='응답이 지연됩니다. 잠시 후 다시 시도해 주세요.';},30000);
 script.src=base+'?callback=azolpharmReceive&t='+Date.now();document.head.append(script);
}
$('reload').onclick=load;$('query').oninput=renderRanks;$('kind').onchange=renderRanks;$('video-keyword').onchange=renderVideos;
for(const id of ['domestic','overseas'])$(id).onclick=()=>{origin=id;for(const name of ['domestic','overseas'])$(name).setAttribute('aria-pressed',String(name===id));renderVideos();};
load();setInterval(()=>{if(document.visibilityState==='visible')load();},300000);

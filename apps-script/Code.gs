/* azolpharm — keys belong ONLY in Script Properties. No admin HTTP endpoints. */
const TZ='Asia/Seoul';
const HEADERS={
 KEYWORDS:['keyword','kind','category','enabled','youtube_en'],
 NAVER_CURRENT:['collected_at','through','rank','keyword','kind','category','score','change_pct','points_json'],
 NAVER_HISTORY:['slot','collected_at','through','rank','keyword','kind','category','score','change_pct'],
 YOUTUBE_CURRENT:['collected_at','id','keyword','keywords_json','origin','title','channel','published_at','views'],
 RUN_LOG:['at','slot','naver','youtube','message'],META:['key','value'],
 FEEDBACK:['id','created_at','kind','message','reply_email','visitor_hash','mail_status'],
 VISITORS:['hash','first_seen'],VISITOR_DAYS:['day','hash']
};
function prop_(key,required){const value=PropertiesService.getScriptProperties().getProperty(key);if(required&&!value)throw new Error('MISSING_'+key);return value;}
function db_(){return SpreadsheetApp.openById(prop_('SPREADSHEET_ID',true));}
function rows_(name){const s=db_().getSheetByName(name);if(!s)throw new Error('MISSING_SHEET_'+name);return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,HEADERS[name].length).getValues();}
function safeCell_(v){return typeof v==='string'&&/^[=+@\-]/.test(v)?"'"+v:v;}
function put_(name,rows){const s=db_().getSheetByName(name),width=HEADERS[name].length;const old=s.getLastRow()-1,n=Math.max(old,rows.length);if(n===0)return;
 const data=Array.from({length:n},(_,i)=>Array.from({length:width},(_,j)=>safeCell_(rows[i]?.[j]??'')));
 if(s.getMaxRows()<n+1)s.insertRowsAfter(s.getMaxRows(),n+1-s.getMaxRows());s.getRange(2,1,n,width).setValues(data);}
function meta_(){return Object.fromEntries(rows_('META').filter(r=>r[0]));}
function setMeta_(changes){put_('META',Object.entries(Object.assign(meta_(),changes)));}
function day_(date){return Utilities.formatDate(date||new Date(),TZ,'yyyy-MM-dd');}
function offset_(day,n){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function slot_(hour){const h=hour===undefined?(Number(Utilities.formatDate(new Date(),TZ,'H'))>=20?20:8):hour;return day_()+'T'+String(h).padStart(2,'0')+':00';}
function setup(){
 const book=db_();book.setSpreadsheetTimeZone(TZ);
 Object.entries(HEADERS).forEach(([name,head])=>{let s=book.getSheetByName(name);if(!s)s=book.insertSheet(name);
 if(s.getLastRow()&&s.getRange(1,1,1,head.length).getValues()[0].join('|')!==head.join('|'))throw new Error('HEADER_MISMATCH_'+name);
 s.getRange(1,1,1,head.length).setValues([head]).setBackground('#eeeeee').setFontWeight('bold');s.setFrozenRows(1);
 });
 setMeta_({install_status:'READY_FOR_KEYS'});
 if(!prop_('PUBLIC_READ_ENABLED'))PropertiesService.getScriptProperties().setProperty('PUBLIC_READ_ENABLED','true');
}
function installTriggers(){
 ['NAVER_CLIENT_ID','NAVER_CLIENT_SECRET','YOUTUBE_API_KEY','SPREADSHEET_ID'].forEach(k=>prop_(k,true));
 const names=['refreshMorning','refreshEvening'];ScriptApp.getProjectTriggers().filter(t=>names.includes(t.getHandlerFunction())).forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('refreshMorning').timeBased().atHour(8).nearMinute(0).everyDays(1).inTimezone(TZ).create();
 ScriptApp.newTrigger('refreshEvening').timeBased().atHour(20).nearMinute(0).everyDays(1).inTimezone(TZ).create();
 setMeta_({triggers:'08:00/20:00 ±15분 KST',install_status:'TRIGGERS_INSTALLED'});
}
function refreshMorning(){return collect_(slot_(8),false);}
function refreshEvening(){return collect_(slot_(20),false);}
function refreshNow(){return collect_(slot_(),true);}
function status(){const m=meta_();console.log(JSON.stringify({naverAt:m.naverAt||null,youtubeAt:m.youtubeAt||null,through:m.through||null,triggers:ScriptApp.getProjectTriggers().filter(t=>['refreshMorning','refreshEvening'].includes(t.getHandlerFunction())).map(t=>t.getHandlerFunction()),state:m.install_status}));}
function log_(slot,naver,youtube,message){const data=rows_('RUN_LOG');data.push([new Date().toISOString(),slot,naver,youtube,message]);put_('RUN_LOG',data.slice(-500));}
function request_(url,options,label){
 const response=UrlFetchApp.fetch(url,Object.assign({muteHttpExceptions:true},options||{}));const code=response.getResponseCode();
 // Never log URL (YouTube key is a query parameter), response body or credential-bearing errors.
 if(code<200||code>=300)throw new Error(label+'_HTTP_'+code);
 try{return JSON.parse(response.getContentText());}catch(e){throw new Error(label+'_INVALID_JSON');}
}
function errorCode_(e){const text=String(e&&e.message||'');return /^[A-Z0-9_]+$/.test(text)?text:'REQUEST_FAILED';}
function keywords_(){const all=rows_('KEYWORDS').filter(r=>r[0]&&(r[3]===true||String(r[3]).toUpperCase()==='TRUE')).map(r=>({name:String(r[0]).trim(),kind:String(r[1]),category:String(r[2]),en:String(r[4]||'').trim()}));
 if(!all.length||all.length>80||new Set(all.map(k=>k.name)).size!==all.length)throw new Error('INVALID_KEYWORDS');return all;}
function summarize_(data,end){const map=new Map(data.map(p=>[p.period,Number(p.ratio)]));const points=Array.from({length:28},(_,i)=>({period:offset_(end,-27+i),ratio:map.get(offset_(end,-27+i))||0}));
 const sum=a=>a.reduce((n,p)=>n+p.ratio,0),recent=sum(points.slice(-7)),previous=sum(points.slice(-14,-7));return {points,score:recent,change:previous>0?(recent/previous-1)*100:null};}
function naver_(words,at){
 const end=offset_(day_(),-1),start=offset_(end,-27),others=words.filter(k=>k.name!=='비타민D'),all=[];
 for(let i=0;i<Math.max(1,others.length);i+=4){
  const group=others.slice(i,i+4);const r=request_('https://naverapihub.apigw.ntruss.com/search-trend/v1/search',{method:'post',contentType:'application/json',headers:{'X-NCP-APIGW-API-KEY-ID':prop_('NAVER_CLIENT_ID',true),'X-NCP-APIGW-API-KEY':prop_('NAVER_CLIENT_SECRET',true)},payload:JSON.stringify({startDate:start,endDate:end,timeUnit:'date',keywordGroups:[{groupName:'기준',keywords:['비타민D']},...group.map(k=>({groupName:k.name,keywords:[k.name]}))]})},'NAVER');
  const anchor=(r.results||[]).find(x=>x.title==='기준');const total=(anchor?.data||[]).reduce((s,p)=>s+Number(p.ratio),0);if(!(total>0))throw new Error('NAVER_ANCHOR_EMPTY');
  const list=group.concat(i===0?words.filter(k=>k.name==='비타민D'):[]);
  list.forEach(k=>{const v=r.results.find(x=>x.title===(k.name==='비타민D'?'기준':k.name));if(!v)throw new Error('NAVER_RESULT_MISSING');all.push(Object.assign({},k,summarize_(v.data.map(p=>({period:p.period,ratio:Number(p.ratio)/total})),end)));});
 }
 const max=Math.max(...all.map(k=>k.score));if(!Number.isFinite(max))throw new Error('NAVER_INVALID_VALUE');
 return {through:end,trends:all.map(k=>Object.assign({},k,{score:max?k.score/max*100:0,points:k.points.map(p=>({period:p.period,ratio:max?p.ratio/max*100:0}))})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name))};
}
function saveNaver_(data,at,slot){
 const current=data.trends.map((t,i)=>[at,data.through,i+1,t.name,t.kind,t.category,t.score,t.change,JSON.stringify(t.points)]);
 put_('NAVER_CURRENT',current);setMeta_({naverAt:at,through:data.through});
 const history=rows_('NAVER_HISTORY').filter(r=>r[0]!==slot);current.forEach(r=>history.push([slot,...r.slice(0,8)]));put_('NAVER_HISTORY',history);setMeta_({naverSlot:slot});
}
function youtube_(words,at){
 const key=prop_('YOUTUBE_API_KEY',true);const state=PropertiesService.getScriptProperties();const date=Utilities.formatDate(new Date(),'America/Los_Angeles','yyyy-MM-dd');
 const searches=words.slice(0,10).flatMap(k=>[{keyword:k.name,q:k.name,origin:'domestic'},...(k.en?[{keyword:k.name,q:k.en,origin:'overseas'}]:[])]);
 const budget=JSON.parse(state.getProperty('YT_BUDGET')||'{}');const used=budget.date===date?Number(budget.used)||0:0;
 if(used+searches.length>60)throw new Error('YOUTUBE_DAILY_BUDGET');
 state.setProperty('YT_BUDGET',JSON.stringify({date,used:used+searches.length}));
 const params=p=>Object.entries(p).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
 const url=(path,p)=>'https://www.googleapis.com/youtube/v3/'+path+'?'+params(Object.assign({key},p));
 const found=new Map();
 for(let i=0;i<searches.length;i+=4){
  const batch=searches.slice(i,i+4);const responses=UrlFetchApp.fetchAll(batch.map(s=>({url:url('search',{part:'snippet',type:'video',q:s.q,order:'viewCount',maxResults:10,publishedAfter:new Date(Date.parse(at)-30*86400000).toISOString(),regionCode:s.origin==='domestic'?'KR':'US',relevanceLanguage:s.origin==='domestic'?'ko':'en'}),muteHttpExceptions:true})));
  responses.forEach((response,n)=>{if(response.getResponseCode()!==200)throw new Error('YOUTUBE_HTTP_'+response.getResponseCode());const r=JSON.parse(response.getContentText()),s=batch[n];(r.items||[]).forEach(item=>{const id=item.id.videoId;if(!id)return;const old=found.get(id)||{words:new Set(),origins:new Set()};old.words.add(s.keyword);old.origins.add(s.origin);found.set(id,old);});});
 }
 const ids=[...found.keys()],out=[];
 for(let i=0;i<ids.length;i+=50){const r=request_(url('videos',{part:'snippet,statistics',id:ids.slice(i,i+50).join(',')}),null,'YOUTUBE');
  (r.items||[]).forEach(v=>{const views=Number(v.statistics?.viewCount);if(!Number.isFinite(views))return;const match=found.get(v.id),keywords=[...match.words],lang=v.snippet.defaultAudioLanguage||'',title=v.snippet.title||'';
   const origin=lang.toLowerCase().startsWith('ko')?'domestic':lang?'overseas':(/[가-힣]/.test(title)?'domestic':match.origins.size===1?[...match.origins][0]:'both');
   out.push({id:v.id,keyword:keywords[0],keywords,origin,title,channel:v.snippet.channelTitle,publishedAt:v.snippet.publishedAt,views});});}
 return out.sort((a,b)=>b.views-a.views);
}
function collect_(slot,force){
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return {ok:false,error:'BUSY'};
 const at=new Date().toISOString();let naver='skipped',youtube='skipped';const errors=[];
 try{const words=keywords_();let m=meta_();
  if(force||m.naverSlot!==slot){try{saveNaver_(naver_(words,at),at,slot);naver='ok';}catch(e){naver='failed';errors.push(errorCode_(e));}}
  // Sheet checkpoint already committed; YouTube failures cannot roll back Naver.
  m=meta_();const top=rows_('NAVER_CURRENT').filter(r=>r[3]).sort((a,b)=>Number(a[2])-Number(b[2])).slice(0,10).map(r=>words.find(k=>k.name===r[3])).filter(Boolean);
  if(!top.length){youtube='skipped';errors.push('NAVER_TOP10_REQUIRED');}
  else if(force||m.youtubeSlot!==slot){try{const videos=youtube_(top,at);put_('YOUTUBE_CURRENT',videos.map(v=>[at,v.id,v.keyword,JSON.stringify(v.keywords),v.origin,v.title,v.channel,v.publishedAt,v.views]));setMeta_({youtubeAt:at,youtubeSlot:slot});youtube='ok';}catch(e){youtube='failed';errors.push(errorCode_(e));}}
  // Public data retains only refreshed YouTube records less than 29 days old.
  const cutoff=Date.now()-29*86400000;put_('YOUTUBE_CURRENT',rows_('YOUTUBE_CURRENT').filter(r=>Date.parse(r[0])>=cutoff));
  setMeta_({lastAttempt:at,errors:JSON.stringify(errors),install_status:errors.length?'PARTIAL_ERROR':'READY'});log_(slot,naver,youtube,errors.join(';')||'OK');
  return {ok:errors.length===0,naver,youtube,errors};
 }catch(e){const code=errorCode_(e);log_(slot,naver,youtube,code);return {ok:false,error:code};}finally{lock.releaseLock();}
}
function snapshot_(){const m=meta_();const trends=rows_('NAVER_CURRENT').filter(r=>r[3]).map(r=>({name:r[3],kind:r[4],category:r[5],score:Number(r[6]),change:r[7]===''?null:Number(r[7]),points:JSON.parse(r[8]||'[]')}));
 const cutoff=Date.now()-29*86400000;const videos=rows_('YOUTUBE_CURRENT').filter(r=>r[1]&&Date.parse(r[0])>=cutoff).map(r=>({id:r[1],keyword:r[2],keywords:JSON.parse(r[3]||'[]'),origin:r[4],title:r[5],channel:r[6],publishedAt:r[7],views:Number(r[8])}));
 const today=day_();const history=rows_('NAVER_HISTORY').filter(r=>r[0]&&String(r[0]).slice(0,10)>=offset_(today,-30)).map(r=>({slot:r[0],through:r[2],rank:Number(r[3]),name:r[4],score:Number(r[7])}));
 return {updatedAt:m.lastAttempt||null,through:m.through||null,naverAt:m.naverAt||null,youtubeAt:m.youtubeAt||null,trends,videos,history,errors:JSON.parse(m.errors||'[]'),feedbackEnabled:prop_('FEEDBACK_ENABLED')==='true',visitors:{today:rows_('VISITOR_DAYS').filter(r=>r[0]===today).length,total:rows_('VISITORS').filter(r=>r[0]).length}};
}
function doGet(e){
 if(prop_('PUBLIC_READ_ENABLED')!=='true')return ContentService.createTextOutput('{"error":"NOT_PUBLISHED"}').setMimeType(ContentService.MimeType.JSON);
 let data;try{data=e?.parameter?.action==='feedbackStatus'?feedbackStatus_(e.parameter.id):snapshot_();}catch(err){data={error:'DATA_UNAVAILABLE'};}
 // Fixed callback, no user-provided JavaScript; public, read-only output only.
 const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 if(e?.parameter?.action==='feedbackStatus'&&e?.parameter?.callback==='azolpharmFeedbackReceive')return ContentService.createTextOutput('azolpharmFeedbackReceive('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
 if(e?.parameter?.callback==='azolpharmReceive')return ContentService.createTextOutput('azolpharmReceive('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
 return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e){
 const respond=v=>ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);
 if(prop_('PUBLIC_READ_ENABLED')!=='true')return respond({ok:false});
 const body=e?.postData?.contents||'';if(body.length>6000)return respond({ok:false});let input;try{input=JSON.parse(body);}catch(err){return respond({ok:false});}
 if(input.action==='feedback')return respond(submitFeedback_(input));
 if(body.length>200)return respond({ok:false});
 if(input.action!=='visit'||typeof input.visitor!=='string'||!/^[-a-zA-Z0-9]{20,80}$/.test(input.visitor))return respond({ok:false});
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return respond({ok:false,error:'BUSY'});
 try{const hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,input.visitor).map(b=>(b&255).toString(16).padStart(2,'0')).join(''),day=day_();
 const people=rows_('VISITORS'),days=rows_('VISITOR_DAYS');if(!people.some(r=>r[0]===hash))db_().getSheetByName('VISITORS').appendRow([hash,day]);
 if(!days.some(r=>r[0]===day&&r[1]===hash))db_().getSheetByName('VISITOR_DAYS').appendRow([day,hash]);
 return respond({ok:true});}finally{lock.releaseLock();}
}

// The recipient is private configuration, never returned to the browser.
function setupFeedback(){
 const recipient=prop_('FEEDBACK_TO',true);
 if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient))throw new Error('INVALID_FEEDBACK_TO');
 const book=db_();let sheet=book.getSheetByName('FEEDBACK');
 if(!sheet)sheet=book.insertSheet('FEEDBACK');
 if(sheet.getLastRow()&&sheet.getRange(1,1,1,7).getValues()[0].join('|')!==HEADERS.FEEDBACK.join('|'))throw new Error('HEADER_MISMATCH_FEEDBACK');
 sheet.getRange(1,1,1,7).setValues([HEADERS.FEEDBACK]).setBackground('#eeeeee').setFontWeight('bold');sheet.setFrozenRows(1);
 MailApp.sendEmail({to:recipient,subject:'[azolpharm] 문의 알림 설정 확인',body:'문의 알림 발송 권한이 확인되었습니다. 웹 앱을 새 버전으로 배포하면 문의 접수를 사용할 수 있습니다.',name:'azolpharm'});
 PropertiesService.getScriptProperties().setProperty('FEEDBACK_ENABLED','true');
 console.log('FEEDBACK_READY');
}
function feedbackHash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value).map(b=>(b&255).toString(16).padStart(2,'0')).join('');}
function validFeedbackId_(v){return typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);}
function feedbackStatus_(id){
 if(!validFeedbackId_(id)||prop_('FEEDBACK_ENABLED')!=='true')return {feedback:{state:'unavailable'}};
 const row=rows_('FEEDBACK').find(r=>r[0]===id);
 if(row)return {feedback:{state:'received'}};
 const reason=CacheService.getScriptCache().get('feedback:'+id);
 return {feedback:{state:reason||'pending'}};
}
function submitFeedback_(input){
 if(prop_('FEEDBACK_ENABLED')!=='true'||!validFeedbackId_(input.id))return {ok:false};
 const reject=state=>{CacheService.getScriptCache().put('feedback:'+input.id,state,600);return {ok:false};};
 if(!validFeedbackId_(input.visitor)||input.website||input.consent!==true||!['개선 제안','오류 신고','기타 문의'].includes(input.kind))return reject('invalid');
 if(typeof input.message!=='string'||input.message.trim().length<10||input.message.length>2000||typeof input.email!=='string'||input.email.length>254)return reject('invalid');
 const email=input.email.trim();if(email&&!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email))return reject('invalid');
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return reject('busy');
 try{
 const rows=rows_('FEEDBACK');if(rows.some(r=>r[0]===input.id))return {ok:true};
 const now=new Date(),hash=feedbackHash_(input.visitor),today=day_(now);
 const daily=rows.filter(r=>day_(new Date(r[1]))===today),own=daily.filter(r=>r[5]===hash);
 if(daily.length>=30||own.length>=3||own.some(r=>now-new Date(r[1])<60000))return reject('limited');
 const row=[input.id,now.toISOString(),input.kind,input.message.trim(),email,hash,'PENDING'];
 const sheet=db_().getSheetByName('FEEDBACK');sheet.appendRow(row.map(safeCell_));const n=sheet.getLastRow();
 // Persist first; a failed notification never loses the inquiry.
 sendFeedbackMail_(sheet,n,row);
 return {ok:true};
 }catch(e){return reject('failed');}finally{lock.releaseLock();}
}
function sendFeedbackMail_(sheet,index,row){
 let delivered=false;
 try{
 const recipient=prop_('FEEDBACK_TO',true);if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient))throw new Error('INVALID_RECIPIENT');
 if(MailApp.getRemainingDailyQuota()<1)throw new Error('MAIL_QUOTA');
 sheet.getRange(index,7).setValue('SENDING');
 const message={to:recipient,subject:'[azolpharm] '+row[2]+' 접수',name:'azolpharm',body:'접수번호: '+row[0]+'\n접수시각: '+row[1]+'\n유형: '+row[2]+'\n답변 이메일(작성자 입력, 미인증): '+(row[4]||'없음')+'\n\n'+row[3]+'\n\n문의 내용에 포함된 링크는 확인 후 열어 주세요.'};
 if(row[4])message.replyTo=row[4];
 MailApp.sendEmail(message);delivered=true;sheet.getRange(index,7).setValue('SENT');
 }catch(e){sheet.getRange(index,7).setValue(delivered?'UNKNOWN':'FAILED');}
}
// Owner runs manually only if FEEDBACK contains FAILED / PENDING messages.
function retryFeedbackEmails(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))throw new Error('BUSY');
 try{const sheet=db_().getSheetByName('FEEDBACK');let sent=0;rows_('FEEDBACK').forEach((row,i)=>{if(sent<10&&['PENDING','FAILED'].includes(row[6])){sendFeedbackMail_(sheet,i+2,row);sent++;}});}finally{lock.releaseLock();}
}

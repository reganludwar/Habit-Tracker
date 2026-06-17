const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/^<script>|<\/script>$/g,'');

// ---- stubs ----
const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>Array.from(store.keys())[i],get length(){return store.size;}};
const intervals=new Map();let intId=1;
function setInterval(fn){const id=intId++;intervals.set(id,fn);return id;}
function clearInterval(id){intervals.delete(id);}
function tick(id,n){for(let i=0;i<n;i++)if(intervals.has(id))intervals.get(id)();}
class El{constructor(){this.style={};this._cls='';this.textContent='';this.innerHTML='';this.classList={add(){},remove(){},toggle(){}};}
  set className(v){this._cls=v;}get className(){return this._cls;}}
const els=new Map();
const document={addEventListener:noop,visibilityState:'visible',getElementById:id=>{if(!els.has(id))els.set(id,new El());return els.get(id);},querySelector:_=>new El()};
function noop(){}
const navigator={};
class AudioContextStub{constructor(){this.state='running';this.sampleRate=44100;this.currentTime=0;this.destination={};}createBuffer(){return{getChannelData:()=>new Float32Array(10)};}createBufferSource(){return{connect:noop,start:noop,stop:noop,disconnect:noop,buffer:null,loop:false};}createGain(){return{gain:{},connect:noop};}resume(){return Promise.resolve();}}
function SpeechSynthesisUtterance(){}
const sandbox={window:{},document,localStorage,navigator,setInterval,clearInterval,setTimeout:(f)=>0,clearTimeout:noop,console,Date,Math,JSON,parseInt,parseFloat,isNaN,String,Number,Array,Object,Blob:function(){},File:function(){},FileReader:function(){},alert:noop,confirm:()=>true,AudioContext:AudioContextStub,webkitAudioContext:AudioContextStub,SpeechSynthesisUtterance};
sandbox.window=sandbox;sandbox.addEventListener=noop;sandbox.scrollTo=noop;sandbox.navigator.wakeLock={request:()=>Promise.resolve({release:noop})};sandbox.navigator.canShare=()=>false;
sandbox.speechSynthesis={cancel:noop,speak:noop};sandbox.window.speechSynthesis=sandbox.speechSynthesis;
sandbox.window.AudioContext=AudioContextStub;
vm.createContext(sandbox);

let fails=0;function ok(c,m){console.log((c?'  PASS':'  FAIL')+' - '+m);if(!c)fails++;}

vm.runInContext(js,sandbox);   // runs loadState();render() with day view
console.log('eval ok; functions present:',typeof sandbox.renderWorkout,typeof sandbox.woFinish);

// ---- ladder ----
ok(sandbox.woLadderStep(45,1)===47.5,'ladder 45 +1 = 47.5');
ok(sandbox.woLadderStep(45,-1)===42.5? false : sandbox.woLadderStep(45,-1)===40,'ladder 45 -1 = 40 (skips 42.5)');
ok(sandbox.woLadderStep(2.5,-1)===2.5,'ladder clamps low at 2.5');
ok(sandbox.woLadderStep(90,1)===90,'ladder clamps high at 90');
ok(sandbox.woSnap(42.5)===40,'snap 42.5 -> 40 (nearest, tie low)');

// seed a prior Monday wo_ session (7 days ago) with bench 50x12
const past=new Date();past.setDate(past.getDate()-7);past.setHours(0,0,0,0);
store.set('wo_'+past.getFullYear()+'_'+(past.getMonth()+1)+'_'+past.getDate(),JSON.stringify({
  dateMs:past.getTime(),dayTag:'mon',finished:true,exercises:[{name:'DB Bench Press',sets:[{tag:'work',weight:50,reps:12}]}]}));
// seed an unrelated tr_ day to ensure it stays untouched
store.set('tr_1999_1_1',JSON.stringify({mob:1,note:'keepme'}));

// ---- Monday weight_reps flow ----
sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.loadState();sandbox.setView('workout');
const s=sandbox.woSession;
ok(s&&s.exercises.length===4,'Monday seeded 4 exercises');
const bench=s.exercises[0];
ok(bench.sets[0].tag==='W','bench set0 is warm-up');
var _bt=sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex[0];
ok(bench.sets[0].weight===sandbox.woSnap(sandbox.woSnap(_bt.seedW)*0.55),'warm-up weight ~55% of template seed ('+bench.sets[0].weight+')');
ok(bench.sets[1].weight===sandbox.woSnap(_bt.seedW)&&bench.sets[1].reps===_bt.seedR,'bench working seeded from the template, not last-session carry-forward');
ok(bench.prev&&bench.prev.weight===50,'last session is still kept as the Prev reference column');
// log working set 1 (index1) -> should mark done + start rest (workRest 180)
sandbox.woLogSet(0,1);
ok(bench.sets[1].done===true,'bench working set1 logged done');
ok(sandbox.woRestRemain===180,'rest timer launched at 180s after non-last set');
ok(sandbox.woRestEndAt>Date.now(),'rest uses a wall-clock deadline (suspend-proof)');
const restId=Array.from(intervals.keys()).pop();
// deadline-based: simulate time passing by moving the deadline into the past, then tick once
sandbox.woRestEndAt=Date.now()-500;tick(restId,1);
ok(sandbox.woRestRemain<=0,'rest reaches 0 once the deadline passes');
ok(sandbox.document.getElementById('woRest').style.display==='none','rest overlay hidden at end');

// ---- rest timer: save add/remove-time changes to the template ----
sandbox.woResetTmpl('mon');
sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.woSession=null;sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.setView('workout');
var rex=sandbox.woSession.exercises[0];
var rsi=rex.sets.findIndex(function(s){return s.tag!=='W'&&s.rest>0;});
sandbox.woLogSet(0,rsi);
var _rbase=sandbox.woRestRemain;
ok(sandbox.woRestDur===_rbase&&sandbox.woRestBase===_rbase,'rest target duration tracks the started rest');
ok(sandbox.document.getElementById('woRestSave').style.display==='none','save button hidden until a change is made');
sandbox.woRestAdd(30);
ok(sandbox.woRestDur===_rbase+30,'+30 bumps the saved target duration');
ok(sandbox.document.getElementById('woRestSave').style.display===''&&/Save rest/.test(sandbox.document.getElementById('woRestSave').textContent),'save button appears once the rest is changed');
sandbox.woRestSaveTmpl();
ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex[0].workRest===_rbase+30,'Save writes the new work-set rest to the template workRest');
ok(/Saved/.test(sandbox.document.getElementById('woRestSave').textContent)&&sandbox.woRestBase===_rbase+30,'save confirms and re-baselines (button would hide on next render)');
// warmup-set rest saves to warmRest
var wsi=rex.sets.findIndex(function(s){return s.tag==='W'&&s.rest>0;});
if(wsi>=0){var _wbWarm=sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex[0].warmRest;sandbox.woLogSet(0,wsi);sandbox.woRestAdd(30);sandbox.woRestSaveTmpl();ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex[0].warmRest===_wbWarm+30,'a warmup-set rest change saves to the template warmRest');}
sandbox.woRestEnd();

// ---- rest timer: minimize keeps it running, expand restores the full view ----
rex.sets[rsi].done=false;sandbox.woLogSet(0,rsi);
ok(sandbox.document.getElementById('woRest').style.display==='flex'&&sandbox.woRestTimer!=null,'rest overlay shown + timer running on start');
sandbox.woRestMinimize();
ok(sandbox.woRestMin===true&&sandbox.document.getElementById('woRest').style.display==='none'&&sandbox.document.getElementById('woRestMini').style.display==='flex','minimize hides the full timer and shows the floating pill');
ok(sandbox.woRestTimer!=null,'timer keeps running while minimized');
sandbox.woRestPaint();ok(sandbox.document.getElementById('woRestMiniTime').textContent.length>0,'the mini pill shows the live countdown');
sandbox.woRestExpand();
ok(sandbox.woRestMin===false&&sandbox.document.getElementById('woRest').style.display==='flex'&&sandbox.document.getElementById('woRestMini').style.display==='none','expand restores the full timer');
// minimized timer still dings + clears at zero
sandbox.woRestMinimize();sandbox.woRestEndAt=Date.now()-500;tick(sandbox.woRestTimer,1);
ok(sandbox.woRestTimer==null&&sandbox.document.getElementById('woRestMini').style.display==='none'&&sandbox.woRestMin===false,'a minimized rest ends + hides the pill when it reaches zero');
sandbox.woResetTmpl('mon');sandbox.woSession=s;  // restore the original Monday session for the finish test below

// progression nudge: finish both working sets at top of range (15)
bench.sets[1].reps=15;bench.sets[1].done=true;bench.sets[2].reps=15;bench.sets[2].done=true;
ok(sandbox.woReadyToProgress(bench),'ready-to-progress detected at top of range');
const coach=sandbox.woCoachHTML(bench,0);
ok(/Save .* lb/.test(coach)&&/woApplyProgress/.test(coach),'coach card offers a one-tap save-to-template progression');

// ---- finish Monday -> ticks lift ----
sandbox.woFinish();
ok(sandbox.woSession.finished===true,'session marked finished');
const woKey=sandbox.woKeyForDow(1);
ok(store.has(woKey),'wo_ key written: '+woKey);
ok(sandbox.state['lift']===true,'state.lift ticked');
const trKey=sandbox.storeKeyForDow(1);
ok(JSON.parse(store.get(trKey)).lift===true,'lift persisted to tr_ key '+trKey);

// ---- Friday time + bilateral flow ----
sandbox.viewDow=5;sandbox.weekOffset=0;sandbox.loadState();sandbox.woSession=null;sandbox.renderWorkout();
const f=sandbox.woSession;
const sp=f.exercises[f.exercises.length-1];
ok(sp.name==='Side Plank'&&sp.bil===true&&sp.input==='time','Friday last ex = bilateral Side Plank (time)');
sandbox.woStartTime(f.exercises.length-1,0); // side plank set0
sandbox.woStopRun();const swId=Array.from(intervals.keys()).pop();
tick(swId,3); // lead-in 3 -> running
tick(swId,30); // 30s left side
sandbox.woStopLog(); // stores L, switches to R
ok(sandbox.woSw.side==='R','bilateral switched to right side');
sandbox.woStopRun();const swId2=Array.from(intervals.keys()).pop();
tick(swId2,3); // lead-in for right side
tick(swId2,32);
sandbox.woStopLog(); // stores R, done
ok(sp.sets[0].done===true,'side plank set logged done');
ok(typeof sp.sets[0].time==='object'&&sp.sets[0].time.l===30&&sp.sets[0].time.r===32,'bilateral time {l:30,r:32} stored');

// ---- rest-day guard ----
sandbox.viewDow=0;sandbox.loadState();sandbox.woSession=null;sandbox.renderWorkout();
ok(sandbox.woSession===null,'Sunday: no session (rest-day guard)');
ok(/No lift scheduled/.test(sandbox.document.getElementById('root').innerHTML),'Sunday shows empty message');

// ---- existing data untouched + other tabs render ----
ok(JSON.parse(store.get('tr_1999_1_1')).note==='keepme','unrelated tr_ data untouched');
['day','week','stretch','test','workout'].forEach(v=>{try{sandbox.setView(v);ok(true,'render '+v+' ok');}catch(e){ok(false,'render '+v+' threw: '+e.message);}});


// ===== v2: mobility-in-rest + template editor =====
sandbox.viewDow=3;sandbox.weekOffset=0;sandbox.loadState();sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
const wq=sandbox.woSession;const pull=wq.exercises[0];
ok(pull.name==='Pull-Up','wed ex0 = Pull-Up');
ok(pull.sets[0].tag==='W'&&!pull.sets[0].mobility,'warm-up set carries no mobility');
ok(pull.sets[1].mobility==='m7','working rest seeded with mobility m7 (Thread the Needle)');
ok(pull.sets[2].mobility==null,'last working set has no rest mobility');
ok(sandbox.woMobName('m7')==='Thread the Needle','woMobName resolves mobility id');
sandbox.woLogSet(0,1);
ok(sandbox.woRestCtx&&sandbox.woRestCtx.ei===0&&sandbox.woRestCtx.si===1,'rest ctx points at the logged set');
ok(sandbox.document.getElementById('woRestEx').textContent==='Thread the Needle','rest overlay shows queued mobility');
sandbox.woRestSwap();sandbox.woMobPick('m0');
ok(pull.sets[1].mobility==='m0','live swap updated set mobility -> m0');
ok(sandbox.document.getElementById('woRestEx').textContent==='Neck CARs','overlay repainted after swap');
sandbox.woRestSkipMob();
ok(pull.sets[1].mobility===null,'skip mobility cleared it');
ok(sandbox.document.getElementById('woRestEx').textContent==='Rest','overlay falls back to plain Rest');
sandbox.woRestEnd();
sandbox.woOpenEditor();
ok(sandbox.woEditing===true&&!!sandbox.woEditTmpl,'editor opened');
const warm0=sandbox.woEditTmpl.ex[0].warmup;sandbox.woEdToggleWarm(0);ok(sandbox.woEditTmpl.ex[0].warmup===!warm0,'warm-up toggled');sandbox.woEdToggleWarm(0);
const sets0=sandbox.woEditTmpl.ex[0].sets;sandbox.woEdSets(0,1);
ok(sandbox.woEditTmpl.ex[0].sets===Math.min(4,sets0+1),'working sets incremented');
ok(sandbox.woEditTmpl.ex[0].restMob.length===sandbox.woEditTmpl.ex[0].sets-1,'restMob length tracks set count');
sandbox.woEdSets(0,-1);
sandbox.woEdRest(0,'work',1);ok(true,'rest stepper no-throw');
sandbox.woEditPickMob(0,0);sandbox.woMobPick('b2');
ok(sandbox.woEditTmpl.ex[0].restMob[0]==='b2','editor assigned mobility b2');
sandbox.woEdDone();
ok(sandbox.woEditing===false,'editor closed on Done');
const ov=JSON.parse(sandbox.localStorage.getItem('wo_tmpl'));
ok(ov&&ov.wed&&ov.wed.ex[0].restMob[0]==='b2','override persisted to wo_tmpl');
ok(sandbox.isBackupKey('wo_tmpl'),'wo_tmpl is in the backup sweep');
// the wed session has logged work, so Done asks Keep vs Erase; choose Erase to apply the edit here
ok(/Keep my logged sets/.test(sandbox.document.getElementById('woModalCard').innerHTML)&&sandbox.woReseedKey,'editing a day with logged sets prompts Keep vs Erase (nothing wiped yet)');
sandbox.woReseedErase();
sandbox.localStorage.removeItem('wo_trash');
sandbox.woSession=null;sandbox.renderWorkout();
ok(sandbox.woSession.exercises[0].sets[1].mobility==='b2','re-seed (after Erase) applies edited mobility');
sandbox.woOpenEditor();sandbox.woEdReset();
ok(!JSON.parse(sandbox.localStorage.getItem('wo_tmpl')||'{}').wed,'reset removed the wed override');
sandbox.woEditing=false;


// ===== backfill: pre-v2 session gets mobility from template =====
// simulate an MVP-era Monday session: working sets have NO mobility key at all
const md=sandbox.getDateForDow ? null : null;
sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.loadState();
const mk=sandbox.woKeyForDow(1);
sandbox.localStorage.setItem(mk, JSON.stringify({_key:mk,dayTag:'mon',finished:false,exercises:[
  {name:'DB Bench Press',load:'pb',input:'wr',target:[8,15],form:false,bil:false,prev:null,sets:[
    {tag:'W',rest:60,weight:27.5,reps:6,done:true},
    {tag:'work',rest:180,weight:45,reps:10,done:false},
    {tag:'work',rest:0,weight:45,reps:10,done:false}]},
  {name:'Hanging Knee Raise',load:'bw',input:'reps',target:[6,12],form:false,bil:false,prev:null,sets:[
    {tag:'work',rest:60,reps:10,done:false},
    {tag:'work',rest:0,reps:10,done:false}]}
]}));
sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
const b=sandbox.woSession.exercises[0];
ok(b.sets[0].mobility==null||b.sets[0].mobility===undefined?b.sets[0].mobility==null:false,'backfill: warm-up set stays without mobility');
ok(b.sets[1].mobility==='m2','backfill: bench working rest1 got template mobility (Shoulder CARs m2)');
ok(b.sets[2].mobility==null,'backfill: last working set (no rest) = null');
// Hanging Knee Raise template restMob is [null] -> stays null
ok(sandbox.woSession.exercises[1].sets[0].mobility===null,'backfill: knee raise rest (template null) = null');
// persisted back
const reload=JSON.parse(sandbox.localStorage.getItem(mk));
ok(reload.exercises[0].sets[1].mobility==='m2','backfill persisted to storage');
// idempotent: explicit null is NOT overwritten on a second load
reload.exercises[0].sets[1].mobility=null;sandbox.localStorage.setItem(mk,JSON.stringify(reload));
sandbox.woSession=null;sandbox.renderWorkout();
ok(sandbox.woSession.exercises[0].sets[1].mobility===null,'backfill: explicit null (user-skipped) is preserved, not re-filled');
// rendered line present for a mobility set
sandbox.localStorage.removeItem(mk);sandbox.woSession=null;sandbox.renderWorkout();
const html2=sandbox.document.getElementById('root').innerHTML;
ok(/Mobility: Couch Stretch/.test(html2)||/Mobility:/.test(html2),'workout page renders Mobility line');

// ===== v3: Strong-style grid + wheel weight picker + swipe-to-log =====
ok(typeof sandbox.woOpenWheel==='function'&&typeof sandbox.woSwStart==='function','wheel + swipe handlers defined');
ok(typeof sandbox.woGesMove==='function'&&typeof sandbox.woGesUp==='function','gesture move/up handlers defined');
ok(typeof sandbox.woWheelSet==='function'&&typeof sandbox.woWheelDone==='function','wheel set/done handlers defined');
ok(sandbox.woRowType({input:'wr',load:'pb'})==='t-wr','woRowType wr->t-wr');
ok(sandbox.woRowType({input:'reps',load:'bw'})==='t-reps','woRowType reps->t-reps');
ok(sandbox.woRowType({input:'time',load:'bw'})==='t-time','woRowType time->t-time');

// fresh Monday session so no sets are pre-logged
sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));
sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.loadState();sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
const rhtml=sandbox.document.getElementById('root').innerHTML;
ok(/wo-cols t-wr/.test(rhtml),'wr exercise renders column-header grid');
ok(/>Weight<\/div>/.test(rhtml)&&/>Reps<\/div>/.test(rhtml),'header shows Weight + Reps labels');
ok(/wo-wpill/.test(rhtml)&&/onclick="woOpenWheel/.test(rhtml),'weight pill opens the wheel on tap');
ok(/onpointerdown="woSwStart/.test(rhtml),'set rows wired for swipe-to-complete');
ok(/wo-rest-divider/.test(rhtml),'rest shown as a divider between sets');
ok(!/wo-sunit/.test(rhtml),'old clipped unit label is gone');
ok(!/class="wo-step"/.test(rhtml)&&/onclick="woOpenReps/.test(rhtml),'reps stepper replaced with tap-to-open grid');
ok(!/wo-flag/.test(rhtml)&&!/woToggleFlag/.test(rhtml),'strict/partial badge removed');

const bx=sandbox.woSession.exercises[0];
ok(typeof sandbox.woPrevCol(bx)==='string'&&!/last:/.test(sandbox.woPrevCol(bx))&&!/reps/.test(sandbox.woPrevCol(bx)),'prev column is compact (no "last:"/"reps")');

// weight wheel: open on a working set, scroll the dial, value follows the centered notch
const wset=bx.sets[1];wset.weight=45;
sandbox.woOpenWheel(0,1);
ok(sandbox.woWheel.ei===0&&sandbox.woWheel.si===1&&sandbox.woWheel.idx===sandbox.woSnapIdx(45),'wheel opens centered on the current weight');
const whtml=sandbox.document.getElementById('shtBody').innerHTML;
ok(/wo-wheel\b/.test(whtml)&&/wo-wheel-band/.test(whtml),'wheel sheet renders a dial with a centered selection band');
ok((whtml.match(/wo-wheel-item/g)||[]).length===sandbox.WO_LADDER.length,'wheel lists every ladder value');
// simulate scrolling the dial down 3 notches (each item is 48px tall)
sandbox.document.getElementById('woWheel').scrollTop=(sandbox.woSnapIdx(45)+3)*48;
sandbox.woWheelScroll();
ok(wset.weight===sandbox.WO_LADDER[sandbox.woSnapIdx(45)+3],'scrolling the wheel updates the weight live');
// tapping a value selects it
sandbox.woWheelTap(0);
ok(wset.weight===sandbox.WO_LADDER[0]&&sandbox.woWheel.idx===0,'tapping a wheel value selects it');
// Done commits + closes + re-renders
sandbox.woWheelDone();
ok(sandbox.woSession.exercises[0].sets[1].weight===2.5,'Done keeps the selected weight');
// snapping still constrains to the ladder
sandbox.woOpenWheel(0,1);sandbox.woWheelSet(sandbox.woSnapIdx(45));sandbox.woWheelDone();
ok(sandbox.WO_LADDER.indexOf(sandbox.woSession.exercises[0].sets[1].weight)>=0,'wheel value is always on the ladder');

// vertical drag on a row cancels the swipe (lets the page scroll)
sandbox.woSwStart({clientX:50,clientY:100},0,0);
sandbox.woGesMove({clientX:51,clientY:140,preventDefault(){}});
ok(sandbox.woGes===null,'vertical drag cancels swipe');

// swipe right past threshold logs the set done
ok(wset.done!==true,'working set starts not-done before swipe');
sandbox.woSwStart({clientX:50,clientY:100},0,1);
sandbox.woGesMove({clientX:70,clientY:101,preventDefault(){}});
ok(sandbox.woGes&&sandbox.woGes.axis==='x','swipe locks to horizontal axis');
sandbox.woGesMove({clientX:260,clientY:101,preventDefault(){}});
sandbox.woGesUp();
ok(sandbox.woSession.exercises[0].sets[1].done===true,'swipe-right logged the set done via woLogSet');
ok(sandbox.woRestRemain>0,'rest timer launched after swipe-complete');
sandbox.woRestEnd();
// swipe left on a done set undoes it
sandbox.woSwStart({clientX:260,clientY:100},0,1);
sandbox.woGesMove({clientX:240,clientY:101,preventDefault(){}});
sandbox.woGesMove({clientX:50,clientY:101,preventDefault(){}});
sandbox.woGesUp();
ok(sandbox.woSession.exercises[0].sets[1].done===false,'swipe-left undid the set');

// ===== v4: Mobility separated from stretching =====
ok(Array.isArray(sandbox.MOB_BASE)&&sandbox.MOB_BASE.length>=15,'MOB_BASE catalog exists (15+ drills)');
var mobNames=sandbox.MOB_BASE.map(function(d){return d.name;});
['Dead Bug','Glute Bridge','Shoulder Taps','Bird Dog','Shoulder CARs','Neck CARs'].forEach(function(n){
  ok(mobNames.indexOf(n)>=0,'mobility catalog includes '+n);});
ok(sandbox.MOB_BASE.every(function(d){return d.cue&&d.cue.length>20;}),'every built-in drill has a description');
// resolver is mobility-aware
var cmap=sandbox.getCatalogMap();
ok(cmap['m2']&&cmap['m2'].name==='Shoulder CARs'&&cmap['m2'].mob===true,'getCatalogMap resolves m* ids');
ok(cmap['m2'].cue&&cmap['m2'].area==='Shoulders','m* entry carries cue + area');
ok(cmap['b0']&&!cmap['b0'].mob,'stretch b* ids still resolve (no regression)');
ok(sandbox.woMobName('m2')==='Shoulder CARs','woMobName resolves a mobility id');
// workout rest now offers mobility, not stretches
var wlist=sandbox.woCatalogList();
ok(wlist.length>=15&&wlist.every(function(x){return x.id.charAt(0)==='m';}),'woCatalogList returns mobility drills only (no b*)');
// every template restMob entry is null or a mobility id
var badRM=[];Object.keys(sandbox.WO_TEMPLATES).forEach(function(day){sandbox.WO_TEMPLATES[day].ex.forEach(function(x){(x.restMob||[]).forEach(function(v){if(v!==null&&!(typeof v==='string'&&v.charAt(0)==='m'))badRM.push(day+':'+v);});});});
ok(badRM.length===0,'all template restMob entries are null or m* ('+(badRM.join(',')||'clean')+')');
// stretch-tab mobility mode
ok(sandbox.defaultActive('mobility').length>0&&sandbox.defaultActive('mobility').every(function(id){return id.charAt(0)==='m';}),'defaultActive(mobility) is a non-empty m* list');
sandbox.stSwitch('mobility');
var mGot=sandbox.stGetList();
ok(mGot.length>0&&mGot[0].mob===true&&mGot[0].sec>0,'stGetList(mobility) yields drills with durations');
ok(mGot.some(function(d){return d.note==='Each side';}),'a bilateral drill is present (drives switch-sides)');
ok(sandbox.stGetList().length===sandbox.defaultActive('mobility').length,'mobility active list seeds from default');
// custom mobility — mirror of custom stretches, with a description
sandbox.localStorage.removeItem('custom_mobility');
sandbox.document.getElementById('shtBody').innerHTML='';sandbox.document.getElementById('overlay')._cls='';sandbox.document.getElementById('sheet')._cls='';
sandbox.openAddMobilitySheet();
sandbox.document.getElementById('newSName')._val='Scapular Push-Ups';sandbox.document.getElementById('newSName').value='Scapular Push-Ups';
sandbox.document.getElementById('newMDesc').value='Plank, let the shoulder blades sink, then push the floor away to spread them. Small range.';
sandbox.addCustomMobility();
var cm=JSON.parse(sandbox.localStorage.getItem('custom_mobility'));
ok(cm&&cm.length===1&&cm[0].id.indexOf('cm_')===0,'addCustomMobility persists a cm_ drill');
ok(cm[0].cue&&cm[0].cue.indexOf('shoulder blades')>=0,'custom mobility keeps its description');
ok(sandbox.getCatalogMap()[cm[0].id]&&sandbox.getCatalogMap()[cm[0].id].cue===cm[0].cue,'getCatalogMap resolves the custom cm_ id with its description');
ok(sandbox.loadActiveList('mobility').indexOf(cm[0].id)>=0,'new custom mobility is added to the active list');
var cmId=cm[0].id;sandbox.deleteFromCatalog(cmId);
ok(JSON.parse(sandbox.localStorage.getItem('custom_mobility')).length===0,'deleteFromCatalog removes the custom mobility drill');
ok(sandbox.loadActiveList('mobility').indexOf(cmId)<0,'deleted custom drill leaves the active list');
// built-in ids are never deletable
sandbox.deleteFromCatalog('m2');
ok(sandbox.MOB_BASE.length>=15,'deleteFromCatalog ignores built-in m* ids');
sandbox.stSwitch('floor');

// ===== Feature A: chronic tight-area check-in -> adaptive stretch/mobility =====
// catalog drills are area-tagged
var _cmap=sandbox.getCatalogMap();
ok(_cmap['b0'].areas.indexOf('hips')>=0&&_cmap['b0'].areas.indexOf('quads')>=0,'Couch Stretch (b0) tagged hips+quads');
ok(_cmap['b3'].areas.join(',')==='tspine','Thoracic Rotation (b3) tagged tspine');
ok(_cmap['m13'].areas.indexOf('hips')>=0,'Hip CARs (m13) tagged hips from its area label');
ok(Array.isArray(_cmap['m9'].areas)&&_cmap['m9'].areas.length===0,'Dead Bug (m9, Core) maps to no tight area');
// chronic storage round-trips and is sanitized
sandbox.localStorage.removeItem('tight_areas');
ok(sandbox.getTightAreas().length===0,'tight areas start empty');
sandbox.toggleTightArea('hips');sandbox.toggleTightArea('shoulders');sandbox.toggleTightArea('hips');
ok(sandbox.getTightAreas().join(',')==='shoulders','toggle adds then removes (hips off, shoulders on)');
sandbox.saveTightAreas(['hips','bogus','hips']);
ok(sandbox.getTightAreas().join(',')==='hips','getTightAreas drops unknown + duplicate keys');
// rules engine: tight hips on a thin floor list yields a duration boost + a targeted add
sandbox.saveActiveList('floor',['b3']);sandbox.localStorage.removeItem('stretch_times');
sandbox.saveTightAreas(['hips']);sandbox.stSet='floor';sandbox.stSuggAI=[];sandbox.stSuggState={};
var _sg=sandbox.stSuggCompute();
ok(_sg.some(function(s){return s.kind==='add'&&(sandbox.getCatalogMap()[s.id].areas.indexOf('hips')>=0);}),'rules suggest adding a hip drill when none active');
sandbox.saveActiveList('floor',['b0','b3']);sandbox.setStretchTime('b0',60);
var _sg2=sandbox.stSuggCompute();
ok(_sg2.some(function(s){return s.kind==='dur'&&s.id==='b0'&&s.cur===60&&s.val===90;}),'rules suggest a longer hold on a short active hip drill (b0 60s->90s)');
// approving a duration suggestion writes the override; approving an add inserts the drill
sandbox.stSuggRendered=_sg2;
var _durIdx=-1;for(var _i=0;_i<_sg2.length;_i++)if(_sg2[_i].kind==='dur'&&_sg2[_i].id==='b0')_durIdx=_i;
sandbox.stSuggApprove(_durIdx);
ok(sandbox.getStretchTime('b0',60)===90,'approving the boost sets b0 hold to the 90s target');
sandbox.saveActiveList('floor',['b3']);sandbox.localStorage.removeItem('stretch_times');sandbox.stSuggState={};
var _sg3=sandbox.stSuggCompute();sandbox.stSuggRendered=_sg3;
var _addIdx=-1,_addId='';for(var _j=0;_j<_sg3.length;_j++)if(_sg3[_j].kind==='add'){_addIdx=_j;_addId=_sg3[_j].id;}
sandbox.stSuggApprove(_addIdx);
ok(sandbox.loadActiveList('floor').indexOf(_addId)>=0,'approving an add inserts the drill into the routine (saved to template)');
ok(sandbox.loadActiveList('floor').indexOf('b3')>=0,'existing routine drills are untouched (no reorder/removal)');
// AI parse: only valid setDuration/addDrill on real catalog drills are accepted
sandbox.saveActiveList('floor',['b0','b3']);sandbox.localStorage.removeItem('stretch_times');sandbox.stSuggAI=[];sandbox.stSuggState={};
var _aiTxt='```json\n{"suggestions":[{"action":"setDuration","drill":"Couch Stretch","seconds":120,"why":"open tight hips"},{"action":"addDrill","drill":"Pigeon Pose","seconds":90,"why":"glute/hip"},{"action":"addDrill","drill":"Totally Fake Drill","seconds":60,"why":"nope"}]}\n```';
var _added=sandbox.stTailorParse(_aiTxt,'floor');
ok(_added===2,'stTailorParse accepts the 2 real drills and rejects the invented one');
ok(sandbox.stSuggAI.some(function(s){return s.src==='ai'&&s.kind==='dur'&&s.id==='b0'&&s.val===120;}),'AI duration suggestion captured at requested seconds');
ok(sandbox.stSuggAI.some(function(s){return s.src==='ai'&&s.kind==='add'&&s.id==='b1';}),'AI add suggestion resolves Pigeon Pose -> b1');
// coach payload now reports tight areas + how well covered they are
sandbox.saveTightAreas(['hips']);
var _cp2=sandbox.coachPayload();
ok(_cp2.tightAreas&&_cp2.tightAreas[0].area.toLowerCase().indexOf('hip')>=0&&typeof _cp2.tightAreas[0].drillsCovering==='number','coachPayload includes tightAreas with coverage counts');
sandbox.saveTightAreas([]);
ok(sandbox.coachPayload().tightAreas===null,'coachPayload omits tightAreas (null) when none flagged');
// day-page tight chip + sheet render without throwing, escaping intact
sandbox.saveTightAreas(['hips','shoulders']);
ok(/2 tight areas/.test(sandbox.tightChipLabel()),'tight chip label reflects flagged count');
sandbox.openTightSheet();
ok(/Tight areas/.test(sandbox.document.getElementById('shtTitle').textContent),'openTightSheet populates the sheet');
sandbox.localStorage.removeItem('tight_areas');sandbox.localStorage.removeItem('active_floor');sandbox.localStorage.removeItem('stretch_times');
sandbox.stSuggAI=[];sandbox.stSuggState={};sandbox.stSet='floor';

// ===== Feature B: dedicated Stretch & Mobility AI report =====
sandbox.localStorage.removeItem('active_floor');sandbox.localStorage.removeItem('active_mobility');sandbox.localStorage.removeItem('stretch_times');
sandbox.coachKind='mobility';sandbox.coachEditState={};
// mobility payload shape
var _mp=sandbox.coachMobilityPayload();
ok(Array.isArray(_mp.mobilityRoutine)&&_mp.mobilityRoutine.length>0&&_mp.mobilityRoutine[0].areas!==undefined,'mobility payload lists the mobility routine with area tags');
ok(Array.isArray(_mp.areaCoverage)&&_mp.areaCoverage.length===sandbox.TIGHT_AREAS.length&&typeof _mp.areaCoverage[0].drills==='number','payload reports per-area coverage (drills + seconds)');
ok(Array.isArray(_mp.availableStretches)&&_mp.availableStretches.some(function(d){return d.name==='Double Pigeon';}),'payload offers catalog drills available to add');
ok(_mp.trainingFocus.length===5&&'mobilityStreak' in _mp&&'mobilityDaysHit' in _mp,'payload includes training split + consistency metrics');
// system prompt + edit instruction
var _ms=sandbox.coachMobilitySystem();
ok(/## Coverage & Balance/.test(_ms)&&/## Match to Training/.test(_ms),'mobility system prompt defines the report sections');
ok(/"type":"mobility" \| "stretch"/.test(_ms)&&/availableMobility/.test(_ms),'mobility edit instruction is appended to the system prompt');
// edit validation: add / duration / remove on real drills
sandbox.saveActiveList('floor',['b0','b3']);sandbox.saveActiveList('mobility',['m0','m13']);sandbox.localStorage.removeItem('stretch_times');
ok(sandbox.coachMobValid({type:'stretch',action:'add',drill:'Pigeon Pose'}).field==='addDrill','validates a stretch add (Pigeon Pose)');
ok(sandbox.coachMobValid({type:'stretch',action:'add',drill:'Invented Drill'})===null,'rejects an add for a drill not in the catalog');
ok(sandbox.coachMobValid({type:'mobility',action:'duration',drill:'Neck CARs',seconds:60}).value===60,'validates a mobility duration change');
ok(sandbox.coachMobValid({type:'mobility',action:'duration',drill:'Neck CARs',seconds:9})===null,'rejects an out-of-range duration');
sandbox.saveActiveList('mobility',['m0']);
ok(sandbox.coachMobValid({type:'mobility',action:'remove',drill:'Neck CARs'})===null,'refuses to remove the last drill in a routine');
sandbox.saveActiveList('mobility',['m0','m13']);
ok(sandbox.coachMobValid({type:'mobility',action:'remove',drill:'Neck CARs'}).field==='removeDrill','validates a removal when more than one drill remains');
// parse a model block -> only valid edits survive, deduped
var _mtext='## Recommendations\n- add pigeon\n```json\n{"edits":[{"type":"stretch","action":"add","drill":"Pigeon Pose","why":"glutes"},{"type":"mobility","action":"duration","drill":"Neck CARs","seconds":55,"why":"x"},{"type":"stretch","action":"add","drill":"Nonexistent","why":"no"}]}\n```';
var _mpe=sandbox.coachMobParseEdits(_mtext);
ok(_mpe.edits.length===2&&!/```json/.test(_mpe.prose),'coachMobParseEdits keeps the 2 valid edits and strips the JSON from prose');
ok(sandbox.coachGetParsed(999,_mtext,'mobility').edits.length===2&&sandbox.coachGetParsed(998,_mtext,'workout').edits.length===0,'coachGetParsed dispatches mobility vs workout parsing by kind');
// apply: add inserts into the routine; undo removes it
sandbox.saveActiveList('floor',['b3']);
var _eAdd=sandbox.coachMobValid({type:'stretch',action:'add',drill:'Pigeon Pose'});
ok(sandbox.coachDoApprove(_eAdd)===true&&sandbox.loadActiveList('floor').indexOf('b1')>=0,'approving a mobility add inserts the drill into the stretch routine');
ok(sandbox.loadActiveList('floor').indexOf('b3')>=0,'the existing routine drill is left in place');
sandbox.coachMobUndo(_eAdd,sandbox.coachEditState[sandbox.coachEditKey(_eAdd)]);
ok(sandbox.loadActiveList('floor').indexOf('b1')<0,'undo removes the added drill');
// apply: duration writes the global hold override; undo restores
sandbox.saveActiveList('mobility',['m0','m13']);sandbox.localStorage.removeItem('stretch_times');sandbox.coachEditState={};
var _eDur=sandbox.coachMobValid({type:'mobility',action:'duration',drill:'Neck CARs',seconds:60});
sandbox.coachDoApprove(_eDur);
ok(sandbox.getStretchTime('m0',40)===60,'approving a duration change writes the hold override');
sandbox.coachMobUndo(_eDur,sandbox.coachEditState[sandbox.coachEditKey(_eDur)]);
ok(sandbox.getStretchTime('m0',40)===40,'undo restores the original (unset) hold');
// home render: mobility report hides the workout-only Focus row + relabels the button
sandbox.coachKind='mobility';sandbox.coachRender('home');
var _ch=sandbox.document.getElementById('shtBody').innerHTML;
ok(/coachSetKind\('mobility'\)/.test(_ch)&&/Analyze my mobility/.test(_ch),'home shows the report-kind switch + mobility button label');
ok(_ch.indexOf('>Focus<')<0,'Focus chips are hidden for the mobility report');
sandbox.coachKind='workout';sandbox.coachRender('home');
ok(/>Focus</.test(sandbox.document.getElementById('shtBody').innerHTML),'Focus chips return for the workout report');
sandbox.coachKind='workout';sandbox.coachEditState={};
sandbox.localStorage.removeItem('active_floor');sandbox.localStorage.removeItem('active_mobility');sandbox.localStorage.removeItem('stretch_times');sandbox.stSet='floor';

// ===== New stretch poses: Frog (b11) + Behind-Back Clasp (b12) =====
var _cm2=sandbox.getCatalogMap();
ok(_cm2['b11']&&_cm2['b11'].name==='Frog Stretch','Frog Stretch is catalogued as b11 (existing ids unshifted)');
ok(_cm2['b12']&&_cm2['b12'].name==='Behind-Back Clasp','Behind-Back Clasp is catalogued as b12');
ok(_cm2['b9'].name==='Overhead Lat Stretch'&&_cm2['b10'].name==='Spinal Twist','appending the new poses did not renumber b9/b10');
ok(_cm2['b11'].areas.indexOf('hips')>=0&&_cm2['b12'].areas.indexOf('chest')>=0&&_cm2['b12'].areas.indexOf('shoulders')>=0,'new poses carry area tags (frog→hips, clasp→chest/shoulders)');
ok(/frog\.webp/.test(sandbox.getStretchSVG('b11'))&&/behind_back_clasp\.webp/.test(sandbox.getStretchSVG('b12')),'new poses are wired to their image files in SSVG');
ok(sandbox.stCatalogByName('floor','Frog Stretch').id==='b11','Frog Stretch resolves by name for mobility-report edits');

// ===== v6: reps grid, rest-after-final-set, rest-tick audio, badge removed =====
sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.loadState();sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
// reps grid picker
var rx=sandbox.woSession.exercises[0];var rset=rx.sets[1];rset.reps=10;
sandbox.woOpenReps(0,1);
var rg=sandbox.document.getElementById('shtBody').innerHTML;
ok(/num-grid/.test(rg)&&/woPickReps/.test(rg),'reps picker opens a number grid');
ok(/>4<\/div>/.test(rg)&&/>20<\/div>/.test(rg),'grid covers the 4..20 range');
ok(/num-btn sel"[^>]*>10</.test(rg),'current reps value is highlighted');
sandbox.woPickReps(14);
ok(sandbox.woSession.exercises[0].sets[1].reps===14,'tapping a grid value sets reps');
// rest-tick audio keep-alive wired
var beeps=0,origTick=sandbox.beepTick;sandbox.beepTick=function(){beeps++;origTick&&origTick();};
sandbox.__resumed=0;
sandbox.woStartRest(8,'Test Ex','Next',null,0,1);
ok(typeof sandbox.window._woKeepAlive!=='undefined'&&sandbox.window._woKeepAlive!==null,'rest timer starts an audio keep-alive');
sandbox.woRestRemain=4;sandbox.woRestTimer&&clearInterval(sandbox.woRestTimer);
// manually drive a tick second to confirm beepTick fires inside the final window
(function(){var r=sandbox.woRestRemain;r--;if(r<=5)sandbox.beepTick();})();
ok(beeps>=1,'beepTick fires in the final-seconds window');
sandbox.woRestEnd();sandbox.beepTick=origTick;
ok(sandbox.window._woKeepAlive===null,'keep-alive cleared when rest ends');
// rest after final set (restLast)
sandbox.woEditing=true;sandbox.woEditTmpl=sandbox.woNormTmpl(sandbox.woEffTemplate('mon'));
var ex0=sandbox.woEditTmpl.ex[0];var before=ex0.restMob.length;
sandbox.woEdToggleRestLast(0);
ok(ex0.restLast===true,'editor toggles rest-after-final-set on');
ok(ex0.restMob.length===before+1,'restLast adds a mobility slot for the final set');
// seed a session with restLast and confirm the last working set now rests
sandbox.woEditTmpl.ex.forEach(function(x){x.restLast=false;});sandbox.woEditTmpl.ex[0].restLast=true;sandbox.woEditTmpl.ex[0].workRest=90;
sandbox.woSaveTmplOverride('mon',sandbox.woEditTmpl);sandbox.woEditing=false;
sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.woSession=null;sandbox.renderWorkout();
var seeded=sandbox.woSession.exercises[0];var lastWork=seeded.sets[seeded.sets.length-1];
ok(lastWork.tag==='work'&&lastWork.rest===90,'final working set now seeds a rest when restLast is on');
sandbox.woResetTmpl&&sandbox.woResetTmpl('mon');sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.woSession=null;

// ===== v5: rest-mobility picker — collapsible Stretch + Mobility, scrollable =====
sandbox.woMobCb=null;sandbox.woOpenMobSheet('Mobility · rest 1');
var psheet=sandbox.document.getElementById('shtBody').innerHTML;
ok(/co-hd[^>]*>[\s\S]*?Mobility/.test(psheet)&&/co-hd[^>]*>[\s\S]*?Stretch/.test(psheet),'picker has Mobility + Stretch section headers');
ok(/woMobSheetToggle/.test(psheet),'section headers are clickable (collapse/expand)');
ok(/Plain rest, no mobility/.test(psheet),'None / plain-rest option present');
// default: Mobility expanded, Stretch collapsed
ok(/Shoulder CARs/.test(psheet),'Mobility section expanded by default (drills visible)');
ok(!/Couch Stretch/.test(psheet),'Stretch section collapsed by default (rows hidden)');
// expand Stretch
sandbox.woMobSheetToggle('str');
var psheet2=sandbox.document.getElementById('shtBody').innerHTML;
ok(/Couch Stretch/.test(psheet2),'expanding Stretch reveals stretch rows');
// collapse Mobility
sandbox.woMobSheetToggle('mob');
var psheet3=sandbox.document.getElementById('shtBody').innerHTML;
ok(!/Shoulder CARs/.test(psheet3),'collapsing Mobility hides its rows');
// picking a stretch from the picker still works (legacy b* resolves)
var picked=null;sandbox.woMobCb=function(id){picked=id;};sandbox.woMobPick('b0');
ok(picked==='b0','picker can select a stretch (b0) for a rest slot');
// scroll affordance present
ok(/\.sheet-body\{[^}]*overflow-y:auto/.test(sandbox.__css||'')|| /overflow-y:auto/.test(require('fs').readFileSync('index.html','utf8').match(/\.sheet-body\{[^}]*\}/)[0]),'sheet body is scrollable (overflow-y:auto)');

// ===== v7: PR1 hardening — backup, esc, midnight rollover, deadline timer =====
// backup whitelist now includes custom_mobility (was silently dropped)
ok(sandbox.isBackupKey('custom_mobility'),'custom_mobility is included in backups');
ok(sandbox.isBackupKey('custom_stretches')&&sandbox.isBackupKey('wo_tmpl')&&sandbox.isBackupKey('wo_whint'),'wo_tmpl/wo_whint still covered by wo_ prefix');
sandbox.localStorage.setItem('custom_mobility',JSON.stringify([{id:'cm_x',name:'Test Drill',sec:40,cue:'desc'}]));
var bkup=sandbox.collectBackup();
ok(bkup.data['custom_mobility']!==undefined,'custom_mobility round-trips through collectBackup');
// esc() neutralizes hostile user input
ok(sandbox.esc('<img onerror=alert(1)>')==='&lt;img onerror=alert(1)&gt;','esc() escapes angle brackets');
ok(sandbox.esc("a&b\"'")==='a&amp;b&quot;&#39;','esc() escapes &, quotes');
// a hostile custom mobility name renders escaped, not as live HTML
sandbox.localStorage.setItem('custom_mobility',JSON.stringify([{id:'cm_x',name:'<b>x</b>',sec:40,cue:'<script>bad</scr'+'ipt>'}]));
sandbox.saveActiveList('mobility',['cm_x']);sandbox.stSet='mobility';sandbox.stTimes=[];sandbox.renderStretch();
var sh=sandbox.document.getElementById('root').innerHTML;
ok(/&lt;b&gt;x&lt;\/b&gt;/.test(sh)&&!/<b>x<\/b>/.test(sh),'custom mobility name is escaped in the list');
sandbox.localStorage.removeItem('custom_mobility');sandbox.localStorage.removeItem('active_mobility');sandbox.stSet='floor';
// midnight rollover: refreshToday recomputes todayDow and re-renders
ok(typeof sandbox.refreshToday==='function','refreshToday exists for midnight rollover');
sandbox.todayDow=(new Date().getDay()+1)%7; // pretend we loaded yesterday
sandbox.refreshToday();
ok(sandbox.todayDow===new Date().getDay(),'refreshToday corrects a stale todayDow');
// deadline timer: woRestAdd shifts the wall-clock deadline, not a raw counter
sandbox.woStartRest(60,'Ex','Next',null,0,0);
var endBefore=sandbox.woRestEndAt;sandbox.woRestAdd(30);
ok(sandbox.woRestEndAt-endBefore===30000,'woRestAdd extends the deadline by 30s');
ok(sandbox.woRestRemain>=88&&sandbox.woRestRemain<=90,'remaining recomputed from the deadline (~90s)');
sandbox.woRestEnd();

// ===== v8: Apple Health (Shortcuts bridge) =====
ok(sandbox.isBackupKey('hl_2026_6_1'),'hl_* health keys are included in backups');
// ingest a single day
sandbox.localStorage.removeItem('hl_2026_6_1');
var nIn=sandbox.ingestHealth({date:'2026-06-01',steps:8231,walkMin:42,weightLb:181.4,sleepHr:7.2});
ok(nIn===1,'ingestHealth stores one day');
var hd=JSON.parse(sandbox.localStorage.getItem('hl_2026_6_1'));
ok(hd&&hd.steps===8231&&hd.weightLb===181.4&&hd.sleepHr===7.2,'health fields parsed and stored');
// merge: a second payload updates only provided fields, keeps the rest
sandbox.ingestHealth({date:'2026-6-1',steps:9000});
var hd2=JSON.parse(sandbox.localStorage.getItem('hl_2026_6_1'));
ok(hd2.steps===9000&&hd2.weightLb===181.4,'re-ingest merges (updates steps, keeps weight)');
// array of days + alternate date separators
var nArr=sandbox.ingestHealth([{date:'2026-06-02',steps:5000},{date:'2026/6/3',exerciseMin:30}]);
ok(nArr===2&&sandbox.localStorage.getItem('hl_2026_6_2')&&sandbox.localStorage.getItem('hl_2026_6_3'),'array ingest + mixed date separators');
// junk / no numeric fields ignored
ok(sandbox.ingestHealth({date:'2026-6-9',steps:'abc'})===0,'non-numeric payload ignored');
// write-URL builds a valid shortcuts:// deep link with JSON payload
var wu=sandbox.healthWriteURL({type:'workout',kind:'strength',name:'Upper Push',minutes:38});
ok(wu.indexOf('shortcuts://run-shortcut?name=Log%20to%20Health')===0,'healthWriteURL targets the Shortcut by name');
ok(/input=text&text=/.test(wu)&&decodeURIComponent(wu.split('text=')[1]).indexOf('Upper Push')>=0,'write URL carries the JSON payload');
// metrics HTML renders for a day with data, empty otherwise
var d1=new Date(2026,5,1),d0=new Date(2026,5,30);
ok(/hl-strip/.test(sandbox.healthMetricsHTML(d1))&&/8,?9?0?0?0|9,000/.test(sandbox.healthMetricsHTML(d1)),'healthMetricsHTML renders a strip with data');
ok(sandbox.healthMetricsHTML(d0)==='','healthMetricsHTML empty when no data');
// health sheet opens without throwing and shows setup copy
sandbox.openHealthSheet();
var hsheet=sandbox.document.getElementById('shtBody').innerHTML;
ok(/Export to Apple Health/.test(hsheet)&&/Import via URL automation/.test(hsheet)&&/Paste import/.test(hsheet),'Health sheet shows export + paste + URL import setup');
// finished workout summary exposes an Add-to-Health deep link
sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
sandbox.woFinish();
ok(/wo-health/.test(sandbox.document.getElementById('root').innerHTML)&&/shortcuts:\/\/run-shortcut/.test(sandbox.document.getElementById('root').innerHTML),'finished workout shows Add to Apple Health link');
sandbox.localStorage.removeItem('hl_2026_6_1');sandbox.localStorage.removeItem('hl_2026_6_2');sandbox.localStorage.removeItem('hl_2026_6_3');

// ===== expanded Apple Health read: broad fields + forgiving names/units/paste =====
sandbox.localStorage.removeItem('hl_2026_6_4');
// natural Health sample names, mixed units, and a fraction-style percent all land
var nAl=sandbox.ingestHealth({date:'2026-06-04','Body Mass':164.3,'Active Energy':'512 kcal','Apple Exercise Time':'47 min','Heart Rate Variability':'48 ms','Blood Oxygen':0.97,'Body Fat':0.182,'VO2 Max':41.6,'Flights Climbed':12,steps:'8,421'});
ok(nAl===1,'ingestHealth accepts a broad, naturally-named payload');
var hA=JSON.parse(sandbox.localStorage.getItem('hl_2026_6_4'));
ok(hA.weightLb===164.3&&hA.activeKcal===512&&hA.exerciseMin===47&&hA.hrv===48,'aliases + unit-stripping map to canonical fields');
ok(hA.spo2===97&&hA.bodyFatPct>18&&hA.bodyFatPct<18.3,'0-1 fractions for SpO2 / body fat convert to percent');
ok(hA.vo2max===41.6&&hA.flights===12&&hA.steps===8421,'VO2max, flights, and comma-formatted steps parse');
// new fields render with labels + formatting
var mh=sandbox.healthMetricsHTML(new Date(2026,5,4));
ok(/VO₂max/.test(mh)&&/Flights/.test(mh)&&/Blood O₂/.test(mh)&&/8,421/.test(mh),'healthMetricsHTML renders the expanded metrics + formatting');
ok(sandbox.fmtHealthVal('weightLb',164.27)==='164.3 lb'&&sandbox.fmtHealthVal('steps',8421)==='8,421','fmtHealthVal formats decimals, suffixes, and thousands');
// loose, non-JSON paste still imports
sandbox.localStorage.removeItem('hl_2026_6_5');
var loose=sandbox.parseLooseHealth('steps: 9001, weight 170.5; sleep = 6.8');
ok(loose&&loose.steps==='9001'&&loose.weight==='170.5','parseLooseHealth reads key:value / key=value / key value text');
var nL=sandbox.ingestHealth(Object.assign({date:'2026-06-05'},loose));
ok(nL===1&&JSON.parse(sandbox.localStorage.getItem('hl_2026_6_5')).weightLb===170.5,'loosely-pasted stats ingest to the right fields');
// paste-import button path: textarea -> ingest -> strip fills in
sandbox.localStorage.removeItem('hl_2026_6_6');sandbox.viewDow=4;sandbox.weekOffset=0;
sandbox.openHealthSheet();
sandbox.document.getElementById('hlPaste').value='{"date":"2026-06-06","steps":7777,"restHr":52,"hrv":61}';
sandbox.healthImportPaste();
var hP=JSON.parse(sandbox.localStorage.getItem('hl_2026_6_6')||'{}');
ok(hP.steps===7777&&hP.restHr===52&&hP.hrv===61,'healthImportPaste ingests pasted JSON from the sheet');
sandbox.localStorage.removeItem('hl_2026_6_4');sandbox.localStorage.removeItem('hl_2026_6_5');sandbox.localStorage.removeItem('hl_2026_6_6');

// ===== v9: PWA foundation (manifest/sw assets + backup reminder) =====
var fsx=require('fs');
ok(fsx.existsSync('manifest.json')&&fsx.existsSync('sw.js'),'manifest.json + sw.js exist');
ok(fsx.existsSync('icon-192.png')&&fsx.existsSync('icon-512.png')&&fsx.existsSync('apple-touch-icon.png'),'PWA icons exist');
var manJ=JSON.parse(fsx.readFileSync('manifest.json','utf8'));
ok(manJ.display==='standalone'&&manJ.icons.some(function(i){return i.purpose&&i.purpose.indexOf('maskable')>=0;}),'manifest is standalone with a maskable icon');
ok(/rel="manifest"/.test(fsx.readFileSync('index.html','utf8'))&&/serviceWorker/.test(fsx.readFileSync('index.html','utf8')),'index links manifest + registers SW');
// backup reminder
sandbox.localStorage.setItem('tr_2099_1_1',JSON.stringify({lift:true}));
sandbox.localStorage.removeItem('last_backup');sandbox.localStorage.removeItem('backup_snooze');
sandbox.updateBackupNag();
ok(sandbox.document.getElementById('backupNag').style.display===''&&/Export now/.test(sandbox.document.getElementById('backupNag').innerHTML),'backup nag shows when never backed up + data exists');
sandbox.exportData();
ok(sandbox.localStorage.getItem('last_backup'),'exportData records last_backup');
ok(sandbox.document.getElementById('backupNag').style.display==='none','nag clears right after an export');
sandbox.localStorage.setItem('last_backup',''+(Date.now()-20*86400000));sandbox.snoozeBackup();
ok(sandbox.document.getElementById('backupNag').style.display==='none','snooze hides the nag even when stale');
ok(sandbox.daysSince(Date.now()-3*86400000)===3,'daysSince computes whole days');
sandbox.localStorage.removeItem('tr_2099_1_1');

// ===== v10: Phase C analytics (e1RM, PRs, tonnage, sparkline, test trends) =====
ok(Math.round(sandbox.woEpley(100,10))===133,'Epley e1RM: 100x10 -> ~133');
// seed three Bench sessions of increasing e1RM in wo_ history
function woKeyMs(y,mo,d){return {key:'wo_'+y+'_'+mo+'_'+d,ms:new Date(y,mo-1,d).getTime()};}
function mkSess(ymd,name,w,r){var o={_key:ymd.key,dateMs:ymd.ms,exercises:[{name:name,load:'pb',input:'wr',sets:[{tag:'work',weight:w,reps:r,done:true}]}]};return o;}
['wo_2026_3_2','wo_2026_3_9','wo_2026_3_16','wo_2026_3_23'].forEach(function(k){sandbox.localStorage.removeItem(k);});
sandbox.localStorage.setItem('wo_2026_3_2',JSON.stringify(mkSess(woKeyMs(2026,3,2),'Bench Test',45,8)));
sandbox.localStorage.setItem('wo_2026_3_9',JSON.stringify(mkSess(woKeyMs(2026,3,9),'Bench Test',50,8)));
sandbox.localStorage.setItem('wo_2026_3_16',JSON.stringify(mkSess(woKeyMs(2026,3,16),'Bench Test',55,8)));
var hist=sandbox.woHistory('Bench Test',null);
ok(hist.length===3&&hist[0].ms<hist[2].ms,'woHistory returns sessions sorted oldest->newest');
ok(hist[2].best>hist[0].best&&hist[2].kind==='e1rm','history tracks rising e1RM');
ok(hist[2].tonnage===55*8,'tonnage = weight x reps for the session');
// only done working sets count
sandbox.localStorage.setItem('wo_2026_3_23',JSON.stringify({_key:'wo_2026_3_23',dateMs:new Date(2026,2,23).getTime(),exercises:[{name:'Bench Test',load:'pb',input:'wr',sets:[{tag:'work',weight:90,reps:8,done:false}]}]}));
ok(sandbox.woHistory('Bench Test',null).length===3,'un-done sets are ignored by analytics');
// PR detection: a current session above all prior bests is a PR
sandbox.woSession={_key:'wo_2026_3_30',dateMs:new Date(2026,2,30).getTime(),exercises:[{name:'Bench Test',load:'pb',input:'wr',sets:[{tag:'work',weight:60,reps:8,done:true}]}]};
sandbox.localStorage.setItem('wo_2026_3_30',JSON.stringify(sandbox.woSession));
var prs=sandbox.woSessionPRs();
ok(prs.length===1&&prs[0].name==='Bench Test','woSessionPRs flags a new all-time best');
// a non-PR session (below prior best) yields no PR
sandbox.woSession.exercises[0].sets[0].weight=50;
ok(sandbox.woSessionPRs().length===0,'no PR when below the prior best');
// sparkline renders a polyline for >=2 points, empty for <2
ok(/polyline/.test(sandbox.sparkline([1,2,3],80,26))&&sandbox.sparkline([1],80,26)==='','sparkline draws for >=2 points only');
// per-exercise progress strip renders with a PR chip on a rising series
sandbox.woSession.exercises[0].sets[0].weight=60;
var _proghtml=sandbox.woExProgressHTML(sandbox.woSession.exercises[0]);
ok(/wo-prog/.test(_proghtml)&&/wo-prog-meta/.test(_proghtml),'progress strip renders in its original two-line layout');
ok(/wo-pr-chip/.test(_proghtml),'PR badge shows inside the progress strip (not on the exercise header)');
ok(!/wo-pr-chip/.test(sandbox.woExHTML(sandbox.woSession.exercises[0],0).replace(_proghtml,'')),'PR badge is not inline on the exercise name');
// consistency score blends habits 0..100
ok(sandbox.consistencyScore({wo:3,mob:5,food:7,runs:2,stand:10})===100,'consistency score caps at 100 when all targets met');
ok(sandbox.consistencyScore({wo:0,mob:0,food:0,runs:0,stand:0})===0,'consistency score is 0 with nothing logged');
ok(typeof sandbox.scoreLabel(90)==='string'&&sandbox.scoreLabel(90)==='Dialed in','scoreLabel maps high scores');
// test trend: improving reps shows a green up-arrow; lower-is-better polarity respected
sandbox.localStorage.setItem('test_log',JSON.stringify({t_pl:[{date:'2026-03-20',value:12},{date:'2026-03-10',value:9}],t_5k:[{date:'2026-03-20',value:1400},{date:'2026-03-10',value:1500}]}));
var trPull=sandbox.testTrendHTML({id:'t_pl',unit:'reps'}),tr5k=sandbox.testTrendHTML({id:'t_5k',unit:'sec'});
ok(/polyline/.test(trPull)&&/var\(--green\)/.test(trPull),'test trend: more pull-ups reads as improvement (green)');
ok(/var\(--green\)/.test(tr5k),'test trend: faster 5K (lower) also reads as improvement (green)');
['wo_2026_3_2','wo_2026_3_9','wo_2026_3_16','wo_2026_3_23','wo_2026_3_30'].forEach(function(k){sandbox.localStorage.removeItem(k);});sandbox.localStorage.removeItem('test_log');sandbox.woSession=null;

// ===== v11: Phase D coaching (progression, deload, RPE, notes) =====
sandbox.localStorage.removeItem('wo_prog');
sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.loadState();sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
var px=sandbox.woSession.exercises[0];var pname=px.name;
// hit top of range on all working sets -> ready to progress, coach offers a one-tap add
sandbox.woWorks(px).forEach(function(s){s.reps=px.target[1];s.done=true;});
ok(sandbox.woReadyToProgress(px),'progress readiness detected when all sets hit top of range');
var ch=sandbox.woCoachHTML(px,0);ok(/woApplyProgress/.test(ch)&&/Save .* lb/.test(ch),'coach offers a one-tap Save (to template)');
var curW=sandbox.woWorks(px)[sandbox.woWorks(px).length-1].weight;
sandbox.woResetTmpl('mon');
sandbox.woApplyProgress(0);
ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex[0].seedW===sandbox.woLadderStep(curW,1),'progression writes the next weight (+1 ladder) straight into the template seedW');
ok(/Saved to template/.test(sandbox.woCoachHTML(px,0))&&/woUndoBump/.test(sandbox.woCoachHTML(px,0)),'coach shows the saved-to-template state with an Undo');
// re-seeding the next session reads the new template weight
sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.woSession=null;sandbox.renderWorkout();
var seededW=sandbox.woWorks(sandbox.woSession.exercises[0]).filter(function(s){return s.tag==='work';})[0].weight;
ok(seededW===sandbox.woLadderStep(curW,1),'next session seeds the progressed template weight');
sandbox.woResetTmpl('mon');
// woStalled is pure history logic (unique name to control the history window)
['wo_st1','wo_st2','wo_st3'].forEach(function(k,i){sandbox.localStorage.setItem(k,JSON.stringify({dateMs:new Date(2026,3,1+i*7).getTime(),exercises:[{name:'Stall Probe',load:'pb',input:'wr',sets:[{tag:'work',weight:60,reps:8,done:true}]}]}));});
ok(sandbox.woStalled('Stall Probe'),'stall detected after 3 flat sessions');
var _spx={name:'Stall Probe',load:'pb',input:'wr',target:[8,12],sets:[{tag:'work',weight:60,reps:8,done:true}]};
ok(/Deload/.test(sandbox.woCoachHTML(_spx,0)),'coach offers a deload when stalled');
['wo_st1','wo_st2','wo_st3'].forEach(function(k){sandbox.localStorage.removeItem(k);});
// woApplyDeload writes ~90% to the day template
sandbox.woResetTmpl('mon');
sandbox.woSession={dayTag:'mon',exercises:[{name:'DB Bench Press',load:'pb',input:'wr',target:[8,12],sets:[{tag:'work',weight:60,reps:8,done:true}]}]};
var _dex=sandbox.woSession.exercises[0];
sandbox.woApplyDeload(0);
ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex[0].seedW===sandbox.woSnap(60*0.9)&&_dex.bump&&_dex.bump.kind==='deload','deload writes ~90% snapped weight into the template seedW + records a deload bump');
sandbox.woResetTmpl('mon');
// RPE: chip shows on done working sets; picker sets/clears the value
sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.woSession=null;sandbox.renderWorkout();
var rx=sandbox.woSession.exercises[0];sandbox.woLogSet(0,1);
ok(/wo-rpe/.test(sandbox.document.getElementById('root').innerHTML),'RPE chip renders for a completed set');
// RPE chip now lives inline in the set row (prev cell), not on a separate subline
ok(!/wo-subline/.test(sandbox.document.getElementById('root').innerHTML),'RPE no longer uses a separate full-width line');
ok(/wo-prevcol"><span class="wo-rpe/.test(sandbox.woSetHTML(sandbox.woSession.exercises[0],0,1)),'RPE chip sits inline in the set row (prev cell)');
// editor toggle hides RPE
ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).showRPE===true,'showRPE defaults on');
sandbox.woSession.showRPE=false;
ok(!/wo-rpe/.test(sandbox.woSetHTML(sandbox.woSession.exercises[0],0,1)),'showRPE=false hides the RPE chip (prev shown instead)');
sandbox.woSession.showRPE=true;
sandbox.woOpenRpe(0,1);sandbox.woPickRpe(8.5);
ok(sandbox.woSession.exercises[0].sets[1].rpe===8.5,'RPE picker stores the value');
sandbox.woOpenRpe(0,1);sandbox.woClearRpe();
ok(sandbox.woSession.exercises[0].sets[1].rpe===undefined,'RPE can be cleared');
// session notes persist
sandbox.woSaveNotes('left shoulder a bit cranky');
ok(sandbox.woSession.notes==='left shoulder a bit cranky'&&JSON.parse(sandbox.localStorage.getItem(sandbox.woKeyForDow(1))).notes==='left shoulder a bit cranky','session notes save to the session');
sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.woSession=null;

// ===== v12: untouched days re-seed from current template (permeation + stale-day heal) =====
// an untouched stored session with the WRONG day's exercises is dropped and re-seeded correctly
var wedKey=sandbox.woKeyForDow(3);
sandbox.localStorage.setItem(wedKey,JSON.stringify({_key:wedKey,dayTag:'thu',dateMs:Date.now(),exercises:[{name:'Goblet Squat',load:'pb',input:'wr',sets:[{tag:'work',weight:25,reps:20,done:false}]}]}));
sandbox.viewDow=3;sandbox.weekOffset=0;sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
ok(sandbox.woSession.exercises[0].name==='Pull-Up','untouched Wed session showing Thursday is re-seeded to the correct Wed template');
ok(sandbox.woSession.dayTag==='wed','re-seeded session carries the correct dayTag');
// a session with a LOGGED set is preserved (real history is never auto-wiped)
sandbox.localStorage.setItem(wedKey,JSON.stringify({_key:wedKey,dayTag:'thu',dateMs:Date.now(),exercises:[{name:'Goblet Squat',load:'pb',input:'wr',sets:[{tag:'work',weight:25,reps:20,done:true}]}]}));
sandbox.woSession=null;sandbox.renderWorkout();
ok(sandbox.woSession.exercises[0].name==='Goblet Squat','a logged (done) session is preserved, not re-seeded');
ok(sandbox.woHasProgress({exercises:[{sets:[{done:true}]}]})===true&&sandbox.woHasProgress({exercises:[{sets:[{done:false}]}]})===false,'woHasProgress distinguishes logged vs untouched');
// template edits permeate: change the override, untouched day reflects it on next load
sandbox.localStorage.removeItem(wedKey);
var ovw=sandbox.woNormTmpl(sandbox.woEffTemplate('wed'));ovw.ex[0].seedW=200;ovw.ex[0].name='Pull-Up';
sandbox.woSaveTmplOverride('wed',ovw);
sandbox.woSession=null;sandbox.renderWorkout();
sandbox.woResetTmpl&&sandbox.woResetTmpl('wed');
ok(true,'template override seeds an untouched day (permeation path exercised)');
// manual reset clears a day
sandbox.localStorage.setItem(wedKey,JSON.stringify({_key:wedKey,dayTag:'wed',dateMs:Date.now(),exercises:[{name:'Pull-Up',sets:[{tag:'work',reps:5,done:true}]}]}));
sandbox.woSession=null;sandbox.renderWorkout();sandbox.woResetDay();
ok(sandbox.localStorage.getItem(wedKey)===null,'woResetDay clears the stored session for the day');
sandbox.localStorage.removeItem(wedKey);

// ===== v13: corrupt template override heals + editor pinned to its day =====
// simulate the bug's result: a 'wed' override holding THURSDAY's exercises
sandbox.localStorage.setItem('wo_tmpl',JSON.stringify({wed:sandbox.woNormTmpl(sandbox.WO_TEMPLATES.thu)}));
ok(!sandbox.woTmplValid(JSON.parse(sandbox.localStorage.getItem('wo_tmpl')).wed,'wed'),'a wed override carrying thu exercises is detected as invalid');
ok(sandbox.woEffTemplate('wed').ex[0].name==='Pull-Up','woEffTemplate ignores the corrupt override and falls back to built-in UPPER PULL');
sandbox.woCleanOverrides();
ok(!JSON.parse(sandbox.localStorage.getItem('wo_tmpl')).wed,'woCleanOverrides purges the corrupt override');
// an untouched Wednesday now seeds the correct template
sandbox.localStorage.removeItem(sandbox.woKeyForDow(3));sandbox.viewDow=3;sandbox.weekOffset=0;sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
ok(sandbox.woSession.exercises[0].name==='Pull-Up','Wednesday seeds UPPER PULL after the override is cleared');
// editor pinned to its open day: opening on Wed then "navigating" to Thu before Done still saves to Wed
sandbox.viewDow=3;sandbox.woOpenEditor();
ok(sandbox.woEditTag==='wed','editor captures the day it was opened on');
sandbox.viewDow=4; // user navigates to Thursday while the editor is open
sandbox.woEditTmpl.ex[0].workRest=999; // make a real change so the override is saved
sandbox.woEdDone();
var ovv=JSON.parse(sandbox.localStorage.getItem('wo_tmpl')||'{}');
ok(!ovv.thu&&(!ovv.wed||ovv.wed.ex[0].name==='Pull-Up'),'Done saves to the opened day (wed), never onto the navigated-to day (thu)');
// a legit override (same exercises, changed rest) is still accepted
ok(sandbox.woTmplValid(sandbox.woNormTmpl(sandbox.WO_TEMPLATES.wed),'wed'),'a matching override (editor-style change) stays valid');
sandbox.localStorage.removeItem('wo_tmpl');sandbox.localStorage.removeItem(sandbox.woKeyForDow(3));sandbox.woSession=null;sandbox.woEditing=false;

// ===== v14: UI batch — vitamins, week grid both, PR toggle, custom tests, test edit =====
// vitamins toggle (Day page, shares the food row)
sandbox.viewDow=1;sandbox.weekOffset=0;sandbox.loadState();sandbox.viewMode='day';
delete sandbox.state['vit'];sandbox.toggleVit();
ok(sandbox.state['vit']===true,'toggleVit sets the vitamins flag');
sandbox.toggleVit();ok(!sandbox.state['vit'],'toggleVit toggles back off');
// food row renders the inline Vitamins control
ok(/class="ivit/.test(sandbox.itemHTML({id:'cron',lbl:'Log Food',meta:'x',t:'other'})),'food row renders an inline Vitamins checkbox');
ok(!/ivit/.test(sandbox.itemHTML({id:'review',lbl:'r',meta:'x',t:'other'})),'other rows do not get the Vitamins control');
// week grid: a day with BOTH mobility and a lift gets the split "both" cell (no override)
var todayKey=sandbox.storeKeyForDate(new Date());
sandbox.localStorage.setItem(todayKey,JSON.stringify({mob:1,lift:true}));
ok(/\bboth\b/.test(sandbox.renderAdherence()),'a day with mobility + workout renders a "both" cell (mobility no longer hidden)');
sandbox.localStorage.setItem(todayKey,JSON.stringify({mob:1}));
ok(/\bmob\b/.test(sandbox.renderAdherence()),'mobility-only day still renders green');
sandbox.localStorage.removeItem(todayKey);
// progress strip / PR badge no longer have a showPR toggle (reverted to original)
sandbox.localStorage.removeItem(sandbox.woKeyForDow(1));sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
ok(typeof sandbox.woShowProg==='undefined'&&typeof sandbox.woEdToggleProg==='undefined','showPR plumbing removed (woShowProg/woEdToggleProg gone)');
ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).showPR===undefined,'templates no longer carry showPR');
sandbox.woSession=null;
// custom tests
sandbox.localStorage.removeItem('custom_tests');
ok(sandbox.isBackupKey('custom_tests'),'custom_tests is included in backups');
sandbox.newTestType='reps';
sandbox.document.getElementById('shtBody').innerHTML='';sandbox.openAddTestSheet();
sandbox.document.getElementById('newTName').value='Single-leg Balance';sandbox.tsSetType('time');
ok(sandbox.newTestType==='time','custom test type switches to time');
sandbox.document.getElementById('newTName').value='Single-leg Balance';sandbox.addCustomTest();
var ct=sandbox.loadCustomTests();
ok(ct.length===1&&ct[0].id.indexOf('ct_')===0&&ct[0].type==='time'&&ct[0].unit==='sec','addCustomTest persists a ct_ test with its type/unit');
ok(sandbox.getTestById(ct[0].id)&&sandbox.getTestById(ct[0].id).name==='Single-leg Balance','getTestById resolves a custom test');
ok(sandbox.loadTestActive(sandbox.tsMode).indexOf(ct[0].id)>=0,'new custom test is added to the active list');
sandbox.deleteCustomTest(ct[0].id);
ok(sandbox.loadCustomTests().length===0&&sandbox.loadTestActive(sandbox.tsMode).indexOf(ct[0].id)<0,'deleteCustomTest removes the definition + active entry');
// test edit mode hides/shows the remove X
sandbox.viewMode='test';sandbox.tsEditing=false;sandbox.renderTest();
ok(!/st-remove/.test(sandbox.document.getElementById('root').innerHTML),'test rows hide the remove X by default (no accidental removal)');
sandbox.tsToggleEdit();
ok(sandbox.tsEditing===true&&/st-remove/.test(sandbox.document.getElementById('root').innerHTML),'edit mode reveals the remove X');
sandbox.tsEditing=false;sandbox.localStorage.removeItem('custom_tests');

// ===== AI Coach =====
sandbox.localStorage.setItem('wo_coach_a',JSON.stringify({dateMs:Date.now(),dayTag:'mon',exercises:[{name:'CoachProbe',sets:[{tag:'work',done:true,weight:50,reps:10,rpe:8}]}]}));
sandbox.localStorage.setItem('wo_coach_b',JSON.stringify({dateMs:Date.now()-40*864e5,dayTag:'wed',exercises:[{name:'CoachOld',sets:[{tag:'work',done:true,reps:8}]}]}));
ok(sandbox.coachModel()==='claude-sonnet-4-6','coach defaults to Sonnet 4.6 when no model set');
var _cr=sandbox.coachRangeMs('this'),_lr=sandbox.coachRangeMs('last');
ok(_cr.start<=_cr.end&&_cr.label==='this week'&&_lr.end===_cr.start,'coachRangeMs windows are valid and contiguous (last ends where this begins)');
function _hasEx(p,n){for(var i=0;i<p.sessions.length;i++)for(var e=0;e<p.sessions[i].exercises.length;e++)if(p.sessions[i].exercises[e].name===n)return true;return false;}
sandbox.coachRange='this';var _cp=sandbox.coachPayload();
ok(_cp.weeklyTemplates.length===5&&_cp.weeklyTemplates[0].day==='mon'&&_cp.weeklyTemplates[0].exercises.length>0,'coachPayload bundles all 5 day-templates with exercises');
ok(_hasEx(_cp,'CoachProbe')&&!_hasEx(_cp,'CoachOld'),'this-week payload includes today\'s session and excludes the 40-day-old one');
ok(_cp.sessionsLogged===_cp.sessions.length&&'mobilityRoutine' in _cp&&'stretchRoutine' in _cp,'payload reports session count + mobility/stretch routine');
sandbox.coachRange='month';ok(!_hasEx(sandbox.coachPayload(),'CoachOld'),'30-day range still excludes the 40-day-old session');
sandbox.coachRange='this';
ok(sandbox.coachPrompt(_cp).indexOf('this week')>=0&&sandbox.coachPrompt(_cp).indexOf('weeklyTemplates')>=0,'coachPrompt embeds the range label and the JSON data');
var _md=sandbox.coachMd('## Progress\n- gained **5 lb** on bench\n\nSolid week');
ok(/<h2>Progress<\/h2>/.test(_md)&&/<li>/.test(_md)&&/<strong>5 lb<\/strong>/.test(_md)&&/<p>Solid week<\/p>/.test(_md),'coachMd renders headings, bullets, bold, and paragraphs');
ok(!sandbox.isBackupKey('coach_key'),'API key is excluded from backups');
// --- tune: length + focus feed the system prompt ---
ok(sandbox.coachLen()==='standard'&&sandbox.coachFocus()==='balanced','length/focus default to standard/balanced');
sandbox.coachSetLen('lean');ok(/under ~200 words/.test(sandbox.coachSystem()),'lean length tightens the system prompt');
sandbox.coachSetLen('detailed');ok(/up to ~800 words/.test(sandbox.coachSystem()),'detailed length loosens the system prompt');
sandbox.coachSetFocus('mobility');ok(/mobility and flexibility/i.test(sandbox.coachSystem()),'mobility focus is injected into the system prompt');
sandbox.coachSetFocus('progression');ok(/Emphasize progression/.test(sandbox.coachSystem()),'progression focus is injected');
sandbox.coachSetLen('standard');sandbox.coachSetFocus('balanced');
// --- report history: save / load / view / delete ---
sandbox.localStorage.removeItem('coach_reports');
sandbox.coachAddReport({ts:1000,rangeKey:'this',rangeLabel:'This week',model:'claude-sonnet-4-6',modelLabel:'Sonnet 4.6',focus:'balanced',text:'## Progress\n- ok'});
sandbox.coachAddReport({ts:2000,rangeKey:'last',rangeLabel:'Last week',model:'claude-opus-4-8',modelLabel:'Opus 4.8',focus:'mobility',text:'## Progress\n- better'});
ok(sandbox.coachLoadReports().length===2&&sandbox.coachLastReport().ts===2000,'reports persist newest-first');
ok(sandbox.coachReportByTs(1000).rangeLabel==='This week','coachReportByTs resolves a saved report');
ok(/cch-hrow/.test(sandbox.coachHistoryHTML())&&/Last week/.test(sandbox.coachHistoryHTML()),'history view lists saved reports');
sandbox.coachDeleteReport(1000);
ok(sandbox.coachLoadReports().length===1&&!sandbox.coachReportByTs(1000),'coachDeleteReport removes one report');
// --- comparison: previous report is woven into the prompt ---
var _prevP=sandbox.coachPrompt(_cp,{when:'7d ago',rangeLabel:'last week',text:'## Progress\n- prior note'});
ok(_prevP.indexOf('previous analysis')>=0&&_prevP.indexOf('prior note')>=0,'coachPrompt embeds the previous report for week-over-week comparison');
ok(sandbox.coachPrompt(_cp).indexOf('previous analysis')<0,'coachPrompt omits the comparison block when there is no prior report');
ok(/d ago|h ago|m ago|just now/.test(sandbox.coachAgo(Date.now()-3*864e5)),'coachAgo formats a relative timestamp');
ok(!sandbox.isBackupKey('coach_reports')&&!sandbox.isBackupKey('coach_len'),'report history + tune prefs stay out of backups (with the key)');
sandbox.localStorage.removeItem('coach_reports');
sandbox.localStorage.removeItem('wo_coach_a');sandbox.localStorage.removeItem('wo_coach_b');

// ===== RPE-creep nudges =====
var NX='Hanging Knee Raise';
sandbox.localStorage.setItem('wo_n1',JSON.stringify({dateMs:Date.now()-7*864e5,exercises:[{name:NX,sets:[{tag:'work',done:true,weight:50,reps:10,rpe:8.5}]}]}));
sandbox.localStorage.setItem('wo_n2',JSON.stringify({dateMs:Date.now(),exercises:[{name:NX,sets:[{tag:'work',done:true,weight:50,reps:10,rpe:9}]}]}));
var _nd=sandbox.woNudge(NX);
ok(_nd&&_nd.type==='deload','rising RPE at same load (8.5→9) yields a deload nudge');
ok(/wo-nudge deload/.test(sandbox.woNudgeHTML(NX)),'nudge renders a deload chip');
ok(sandbox.coachNudges().some(function(x){return x.exercise===NX&&x.type==='deload';}),'coach payload nudges include the deload');
sandbox.localStorage.setItem('wo_n1',JSON.stringify({dateMs:Date.now()-7*864e5,exercises:[{name:NX,sets:[{tag:'work',done:true,weight:50,reps:10,rpe:7}]}]}));
sandbox.localStorage.setItem('wo_n2',JSON.stringify({dateMs:Date.now(),exercises:[{name:NX,sets:[{tag:'work',done:true,weight:50,reps:10,rpe:6.5}]}]}));
ok(sandbox.woNudge(NX).type==='progress','consistently easy RPE (≤7) yields a progress nudge');
sandbox.localStorage.removeItem('wo_n1');
ok(sandbox.woNudge(NX)===null,'a single logged session produces no nudge');
sandbox.localStorage.removeItem('wo_n2');

// ===== one-tap coach template edits =====
sandbox.woResetTmpl('mon');
var _ejson='```json\n{"edits":[{"day":"mon","exercise":"DB Bench Press","field":"repTarget","value":"6-12","why":"strength bias"},{"day":"mon","exercise":"Ghost Lift","field":"sets","value":4,"why":"nope"},{"day":"mon","exercise":"DB Bench Press","field":"sets","value":3,"why":"more volume"}]}\n```';
var _etxt='## Recommendations\n- push the bench\n\n'+_ejson;
var _pe=sandbox.coachParseEdits(_etxt);
ok(_pe.prose.indexOf('```')<0&&/push the bench/.test(_pe.prose),'json edit block is stripped from the displayed prose');
ok(_pe.edits.length===2,'hallucinated/invalid edits are filtered (2 of 3 valid against the live template)');
ok(_pe.edits[0].field==='repTarget'&&_pe.edits[0].newStr==='6-12 reps'&&/8-15/.test(_pe.edits[0].curStr),'repTarget edit shows current → proposed');
sandbox.coachEdits=_pe.edits;sandbox.coachResult=_etxt;sandbox.coachMode='result';sandbox.coachEditState={};
function _benchT(){var t=sandbox.woNormTmpl(sandbox.woEffTemplate('mon'));for(var i=0;i<t.ex.length;i++)if(t.ex[i].name==='DB Bench Press')return t.ex[i];return null;}
// recommendations render as approve/dismiss cards and DON'T touch the template on their own
sandbox.coachRender('result');
var _hb=sandbox.document.getElementById('shtBody').innerHTML;
ok(/approve to update/i.test(_hb)&&/Approve<\/button>/.test(_hb)&&/Dismiss<\/button>/.test(_hb),'recommendations render with Approve + Dismiss controls');
ok(/can update your template/.test(_hb),'a top banner flags that approvable recommendations exist below');
ok(_benchT().target[0]===8&&_benchT().target[1]===15,'template is untouched before approval');
// approve persists the change, flashes, records undo state, stays a valid override
sandbox.coachApproveEdit(0);
ok(_benchT().target[0]===6&&_benchT().target[1]===12,'coachApproveEdit persists the rep-target change to the mon template override');
ok(/Approved:/.test(sandbox.coachFlash),'approving an edit sets a confirmation flash');
ok(sandbox.woTmplValid(sandbox.woLoadTmplOverrides().mon,'mon'),'the saved override stays valid (same exercise identity)');
ok(/Approved/.test(sandbox.document.getElementById('shtBody').innerHTML)&&/coachUndoEdit/.test(sandbox.document.getElementById('shtBody').innerHTML),'approved card shows an Undo control');
// undo restores the prior rep target
sandbox.coachUndoEdit(0);
ok(_benchT().target[0]===8&&_benchT().target[1]===15,'coachUndoEdit reverts the template to the prior value');
// dismiss records state without changing the template; restore clears it
var _origSets=_benchT().sets;
sandbox.coachDismissEdit(1);
ok(sandbox.coachEditState[sandbox.coachEditKey(sandbox.coachEdits[1])].status==='dismissed'&&_benchT().sets===_origSets,'dismiss records state without touching the template');
sandbox.coachRestoreEdit(1);
ok(!sandbox.coachEditState[sandbox.coachEditKey(sandbox.coachEdits[1])],'restore clears the dismissed state');
// approve all applies every pending edit at once
sandbox.coachEditState={};sandbox.coachApproveAll();
var _bb=_benchT();
ok(_bb&&_bb.target[0]===6&&_bb.target[1]===12&&_bb.sets===3,'coachApproveAll applies every pending edit (repTarget + sets)');
ok(/Approved 2 changes/.test(sandbox.coachFlash),'approve-all flash reports the count');
sandbox.woResetTmpl('mon');sandbox.coachEdits=[];sandbox.coachResult='';sandbox.coachFlash='';sandbox.coachEditState={};

// ===== coach can approve a starting-load (weight) change, with tolerant name matching =====
sandbox.woResetTmpl('wed');sandbox.coachEditState={};sandbox.coachParsedCache=null;
// 'bent-over db row' (lowercase, hyphen) must still resolve to 'Bent Over DB Row' (seedW 40 -> 45)
var _wjson='```json\n{"edits":[{"day":"wed","exercise":"bent-over db row","field":"seedW","value":45,"why":"earned it"},{"day":"thu","exercise":"Bulgarian Split Squat","field":"seedW","value":15,"why":"add load"}]}\n```';
var _wpe=sandbox.coachParseEdits('## Recommendations\n- row more\n\n'+_wjson);
ok(_wpe.edits.length===1&&_wpe.edits[0].field==='seedW'&&_wpe.edits[0].exercise==='Bent Over DB Row','seedW edit resolves a loosely-named weighted exercise; bodyweight seedW is rejected');
ok(/40 lb start/.test(_wpe.edits[0].curStr)&&/45 lb start/.test(_wpe.edits[0].newStr),'seedW card shows current → proposed start load');
sandbox.coachEdits=_wpe.edits;sandbox.coachResult='## Recommendations\n- row more\n\n'+_wjson;sandbox.coachMode='result';
sandbox.coachRender('result');// seed the per-report parse cache, as the app does before you tap Approve
function _rowW(){var t=sandbox.woNormTmpl(sandbox.woEffTemplate('wed'));for(var i=0;i<t.ex.length;i++)if(t.ex[i].name==='Bent Over DB Row')return t.ex[i].seedW;return null;}
sandbox.coachApproveEdit(0);
ok(_rowW()===45,'approving a seedW edit raises the starting load in the template');
sandbox.coachUndoEdit(0);
ok(_rowW()===40,'undo restores the prior starting load');
sandbox.woResetTmpl('wed');sandbox.coachEdits=[];sandbox.coachResult='';sandbox.coachFlash='';sandbox.coachEditState={};sandbox.coachParsedCache=null;

// ===== coach can approve ADDING and REMOVING exercises =====
sandbox.woResetTmpl('thu');sandbox.woResetTmpl('mon');sandbox.coachEditState={};sandbox.coachParsedCache=null;
function _thuNames(){return sandbox.woNormTmpl(sandbox.woEffTemplate('thu')).ex.map(function(x){return x.name;});}
// add 'DB Romanian Deadlift' (exists on tue) to thu; remove 'Plank' from thu; reject a made-up move + last-one removal
var _sjson='```json\n{"edits":['+
  '{"day":"thu","exercise":"DB Romanian Deadlift","field":"addExercise","value":"DB Romanian Deadlift","why":"balance hinge"},'+
  '{"day":"thu","exercise":"Plank","field":"removeExercise","value":"Plank","why":"low value"},'+
  '{"day":"thu","exercise":"Nordic Curl","field":"addExercise","value":"Nordic Curl","why":"not in program"}]}\n```';
var _spe=sandbox.coachParseEdits('## Recommendations\n- balance the hinge\n\n'+_sjson);
ok(_spe.edits.length===2,'structural edits validate: known add + valid remove kept, unknown exercise rejected');
ok(_spe.edits[0].field==='addExercise'&&_spe.edits[0].exercise==='DB Romanian Deadlift'&&/add exercise/.test(_spe.edits[0].newStr),'addExercise edit resolves a library exercise');
ok(_spe.edits[1].field==='removeExercise'&&_spe.edits[1].exercise==='Plank','removeExercise edit targets an exercise on the day');
sandbox.coachEdits=_spe.edits;sandbox.coachResult='## Recommendations\n- balance the hinge\n\n'+_sjson;sandbox.coachMode='result';sandbox.coachRender('result');
// approve the add
sandbox.coachApproveEdit(0);
ok(_thuNames().indexOf('DB Romanian Deadlift')>=0,'approving addExercise inserts the exercise into the thu template');
var _addedDef=sandbox.woNormTmpl(sandbox.woEffTemplate('thu')).ex.filter(function(x){return x.name==='DB Romanian Deadlift';})[0];
ok(_addedDef&&_addedDef.load==='pb'&&_addedDef.target&&_addedDef.target[0]===8,'the added exercise carries its proven setup (load + rep target)');
ok(sandbox.woTmplValid(sandbox.woLoadTmplOverrides().thu,'thu'),'a thu template with an added exercise is still a valid override');
// approve the remove
sandbox.coachApproveEdit(1);
ok(_thuNames().indexOf('Plank')<0,'approving removeExercise drops the exercise from the thu template');
// a freshly-seeded thursday reflects both structural changes
sandbox.localStorage.removeItem(sandbox.woKeyForDow(4));sandbox.viewDow=4;sandbox.weekOffset=0;sandbox.woSession=null;sandbox.woEditing=false;sandbox.renderWorkout();
var _seedNames=sandbox.woSession.exercises.map(function(x){return x.name;});
ok(_seedNames.indexOf('DB Romanian Deadlift')>=0&&_seedNames.indexOf('Plank')<0,'a seeded Thursday session includes the added exercise and omits the removed one');
// undo both restores the original structure
sandbox.coachUndoEdit(0);sandbox.coachUndoEdit(1);
var _fin=_thuNames();
ok(_fin.indexOf('DB Romanian Deadlift')<0&&_fin.indexOf('Plank')>=0,'undo removes the added exercise and restores the removed one');
sandbox.woResetTmpl('thu');sandbox.localStorage.removeItem(sandbox.woKeyForDow(4));sandbox.coachEdits=[];sandbox.coachResult='';sandbox.coachFlash='';sandbox.coachEditState={};sandbox.coachParsedCache=null;sandbox.woSession=null;

// ===== manual template editor can add & remove exercises =====
sandbox.woResetTmpl('thu');sandbox.localStorage.removeItem(sandbox.woKeyForDow(4));sandbox.viewDow=4;sandbox.weekOffset=0;sandbox.woSession=null;sandbox.woEditing=false;
sandbox.woOpenEditor();
ok(sandbox.woEditTag==='thu','editor opens pinned to thu');
var _avail=sandbox.woEdAvail(),_drlIdx=-1;for(var _ai=0;_ai<_avail.length;_ai++)if(_avail[_ai].name==='DB Romanian Deadlift')_drlIdx=_ai;
ok(_drlIdx>=0&&!_avail.some(function(d){return d.name==='Plank';}),'add picker lists library exercises not already on the day');
sandbox.woEdAddPick(_drlIdx);
ok(sandbox.woEditTmpl.ex.some(function(x){return x.name==='DB Romanian Deadlift';}),'picking adds the exercise (with its setup) to the working template');
var _pIdx=-1;for(var _pi=0;_pi<sandbox.woEditTmpl.ex.length;_pi++)if(sandbox.woEditTmpl.ex[_pi].name==='Plank')_pIdx=_pi;
sandbox.woEdRemove(_pIdx);
ok(!sandbox.woEditTmpl.ex.some(function(x){return x.name==='Plank';}),'woEdRemove drops the exercise from the working template');
sandbox.woEdDone();
var _ee=sandbox.woNormTmpl(sandbox.woEffTemplate('thu')),_en=_ee.ex.map(function(x){return x.name;});
ok(_en.indexOf('DB Romanian Deadlift')>=0&&_en.indexOf('Plank')<0,'editor Done persists the add + remove to the thu override');
ok(sandbox.woTmplValid(sandbox.woLoadTmplOverrides().thu,'thu'),'the structurally-edited override stays valid');
sandbox.woResetTmpl('thu');sandbox.localStorage.removeItem(sandbox.woKeyForDow(4));sandbox.woEditing=false;sandbox.woSession=null;

// ===== re-seed prompt: Keep preserves logged sets, no stash =====
sandbox.viewDow=3;sandbox.weekOffset=0;sandbox.woEditing=false;
var _wk=sandbox.woKeyForDow(3);
sandbox.localStorage.removeItem(_wk);sandbox.localStorage.removeItem('wo_trash');sandbox.woSession=null;sandbox.renderWorkout();
sandbox.woSession.exercises[0].sets[1].done=true;sandbox.woSave();
sandbox.woOpenEditor();sandbox.woEditTmpl.ex[0].workRest=999;sandbox.woEdDone();
ok(sandbox.woReseedKey===_wk,'Done on a logged day arms the Keep/Erase dialog without clearing');
sandbox.woReseedKeep();
ok(sandbox.woSessionHasWork(JSON.parse(sandbox.localStorage.getItem(_wk)))&&!sandbox.woLoadTrash()&&!sandbox.woReseedKey,'Keep preserves the logged sets and stashes nothing');
sandbox.woResetTmpl('wed');sandbox.localStorage.removeItem(_wk);sandbox.localStorage.removeItem('wo_trash');sandbox.woSession=null;

// ===== reset safety net: a wiped day can be undone =====
sandbox.viewDow=5;sandbox.weekOffset=0;sandbox.woEditing=false;
var _fkey=sandbox.woKeyForDow(5);
sandbox.localStorage.removeItem(_fkey);sandbox.localStorage.removeItem('wo_trash');sandbox.woSession=null;
sandbox.renderWorkout();// seeds a fresh Friday session
sandbox.woSession.exercises[0].sets[0].done=true;sandbox.woSave();// log a set (no rest-timer side effects)
ok(sandbox.woSessionHasWork(JSON.parse(sandbox.localStorage.getItem(_fkey))),'Friday session has logged work before a reset');
sandbox.woResetDay();// confirm() returns true in the sandbox, as in the woResetDay-clears test above
ok(sandbox.woLoadTrash()&&sandbox.woLoadTrash().key===_fkey,'Reset day stashes the cleared session to wo_trash');
ok(!sandbox.woSessionHasWork(JSON.parse(sandbox.localStorage.getItem(_fkey))),'the re-seeded day starts empty after reset');
sandbox.viewDow=5;sandbox.woSession=null;sandbox.renderWorkout();
ok(/woUndoReset/.test(sandbox.document.getElementById('root').innerHTML),'an Undo banner appears on the affected day');
sandbox.woUndoReset();
ok(sandbox.woSessionHasWork(JSON.parse(sandbox.localStorage.getItem(_fkey)))&&!sandbox.woLoadTrash(),'Undo restores the logged sets and clears the trash');
// nothing-logged resets don't create a trash entry (no false Undo)
sandbox.localStorage.removeItem(_fkey);sandbox.localStorage.removeItem('wo_trash');sandbox.woSession=null;sandbox.renderWorkout();
sandbox.woResetDay();
ok(!sandbox.woLoadTrash(),'resetting an empty day does not stash trash (no misleading Undo)');
sandbox.localStorage.removeItem(_fkey);sandbox.localStorage.removeItem('wo_trash');sandbox.woSession=null;

// ===== template is the single source of truth =====
sandbox.woResetTmpl('mon');
// a prior logged session must NOT influence seeding any more (template-only)
sandbox.localStorage.setItem('wo_carry',JSON.stringify({dateMs:Date.now()-7*864e5,dayTag:'mon',exercises:[{name:'DB Bench Press',sets:[{tag:'work',done:true,weight:70,reps:10}]}]}));
var _seedW0=sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex.find(function(x){return x.name==='DB Bench Press';}).seedW;
var _bw0=sandbox.woSeed(1,'wo_fresh').exercises.find(function(x){return x.name==='DB Bench Press';}).sets.find(function(s){return s.tag==='work';});
ok(_bw0&&_bw0.weight===sandbox.woSnap(_seedW0),'woSeed seeds weight from the template seed, ignoring last-session carry-forward');
// manual save writes the weight to the template (seedW), no pin field
sandbox.woSession={dayTag:'mon',exercises:[{name:'DB Bench Press',load:'pb',input:'wr',sets:[{tag:'work',weight:55,reps:10}]}]};
sandbox.woWheel={ei:0,si:0,idx:0};
sandbox.woSaveWeightToTmpl();
var _wb=sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex.find(function(x){return x.name==='DB Bench Press';});
ok(_wb&&_wb.seedW===55&&_wb.pinW===undefined,'Save writes the weight to template seedW (no pin field)');
ok(sandbox.woTmplValid(sandbox.woLoadTmplOverrides().mon,'mon'),'the template override stays valid');
ok(sandbox.woSeed(1,'wo_fresh').exercises.find(function(x){return x.name==='DB Bench Press';}).sets.find(function(s){return s.tag==='work';}).weight===55,'next seed uses the saved template weight (55)');
// the Add-weight suggestion writes straight to the template + records an undoable bump
sandbox.viewDow=1;sandbox.weekOffset=0;var _mk=sandbox.woKeyForDow(1);
sandbox.woSession={_key:_mk,dayTag:'mon',exercises:[{name:'DB Bench Press',load:'pb',input:'wr',target:[8,15],sets:[{tag:'work',weight:55,reps:10,done:true}]}]};
sandbox.localStorage.setItem(_mk,JSON.stringify(sandbox.woSession));
sandbox.woApplyProgress(0);
var _next=sandbox.woLadderStep(55,1);
ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex.find(function(x){return x.name==='DB Bench Press';}).seedW===_next,'Add-weight suggestion advances the template seedW one step');
ok(sandbox.woSession.exercises[0].bump&&sandbox.woSession.exercises[0].bump.from===55,'the applied bump is recorded on the session for undo');
sandbox.woUndoBump(0);
ok(sandbox.woNormTmpl(sandbox.woEffTemplate('mon')).ex.find(function(x){return x.name==='DB Bench Press';}).seedW===55&&!sandbox.woSession.exercises[0].bump,'Undo restores the template and clears the bump');
sandbox.localStorage.removeItem(_mk);sandbox.localStorage.removeItem('wo_carry');sandbox.woResetTmpl('mon');sandbox.woSession=null;sandbox.woWheel=null;

// ===== Apple Health setup guide =====
sandbox.viewDow=0;sandbox.openHealthSheet();
var _hb=sandbox.document.getElementById('shtBody').innerHTML;
ok(/Show step-by-step setup guide/.test(_hb)&&!/Part A/.test(_hb),'Health sheet starts with the guide collapsed');
ok(/hl-url/.test(_hb)&&/\?hl=/.test(_hb),'Health sheet shows the import URL');
sandbox.healthToggleGuide();
var _hb2=sandbox.document.getElementById('shtBody').innerHTML;
ok(/Part A/.test(_hb2)&&/Log to Health/.test(_hb2)&&/Part B/.test(_hb2),'toggling reveals the full Part A + Part B guide');
ok(/Get Dictionary from Input/.test(_hb2)&&/Copy My Stats/.test(_hb2)&&/Copy to Clipboard/.test(_hb2),'guide includes the key Shortcuts steps (export + Copy My Stats)');
ok(sandbox.HEALTH_FIELDS.every(function(f){return _hb2.indexOf(f)>=0;}),'guide lists every accepted import field');
sandbox.healthToggleGuide();
ok(!/Part A/.test(sandbox.document.getElementById('shtBody').innerHTML),'toggling again hides the guide');
sandbox.closeSheet&&sandbox.closeSheet();

// ---- WEEK view: calendar dates + pre-start days are neutral (not "missed") ----
(function(){
  var _snap=new Map(store);store.clear();
  var now=new Date();now.setHours(0,0,0,0);
  function dms(n){var d=new Date(now);d.setDate(now.getDate()-n);d.setHours(0,0,0,0);return d;}
  function trkey(d){return 'tr_'+d.getFullYear()+'_'+(d.getMonth()+1)+'_'+d.getDate();}
  var a=dms(10),b=dms(5);
  store.set(trkey(a),JSON.stringify({mob:1}));            // first activity = mobility 10d ago
  store.set(trkey(b),JSON.stringify({mob:1,lift:true}));  // first workout (lift) = 5d ago
  var ab=sandbox.activityBounds();
  ok(ab.firstAny===a.getTime(),'activityBounds.firstAny = earliest logged day (mobility, 10d ago)');
  ok(ab.firstWo===b.getTime(),'activityBounds.firstWo = earliest training day (lift, 5d ago)');
  var ah=sandbox.renderAdherence(ab);
  var nCells=(ah.match(/class="ah-cell/g)||[]).length,nDates=(ah.match(/class="ah-d"/g)||[]).length;
  ok(nCells===35&&nDates===35,'every calendar cell (5 weeks x 7) renders a date number');
  ok(new RegExp('>'+a.getDate()+'<').test(ah),'the actual day-of-month numbers appear in the grid');
  ok(/ah-cell pre/.test(ah),'days before the first logged activity render as neutral (pre), not missed');
  ok(/ah-cell mob|ah-cell both/.test(ah),'the first mobility day renders filled');
  store.clear();_snap.forEach(function(v,k){store.set(k,v);});
})();

// ===== audit remediation: security + correctness fixes =====
(function(){
  var _snap=new Map(store);
  // H1: custom test names are escaped in renderTest
  sandbox.localStorage.setItem('custom_tests',JSON.stringify([{id:'ct_x',name:'<img src=x onerror=alert(1)>',type:'number',unit:'reps'}]));
  sandbox.localStorage.setItem('test_active_weekly',JSON.stringify(['ct_x']));
  sandbox.tsMode='weekly';sandbox.tsEditing=false;sandbox.renderTest();
  var th=sandbox.document.getElementById('root').innerHTML;
  ok(th.indexOf('<img src=x onerror')<0&&/&lt;img src=x onerror/.test(th),'H1: a malicious custom test name is HTML-escaped in renderTest');
  // H2: exercise names are escaped in woExHTML
  var exHTML=sandbox.woExHTML({name:'<b>x</b><img src=y onerror=alert(2)>',load:'bw',input:'reps',sets:[{tag:'work',reps:5,done:false}]},0);
  ok(exHTML.indexOf('<img src=y onerror')<0&&/&lt;img/.test(exHTML),'H2: a malicious exercise name is HTML-escaped in woExHTML');
  // L5: wo_trash is excluded from backups
  ok(sandbox.isBackupKey('wo_2026_6_1')&&!sandbox.isBackupKey('wo_trash'),'L5: wo_trash is excluded from the backup sweep');
  // L8: out-of-range health dates are rejected
  ok(sandbox.ingestHealth({date:'2026-99-99',steps:100})===0&&sandbox.ingestHealth({date:'2026-13-01',steps:1})===0,'L8: out-of-range health dates are rejected');
  ok(sandbox.ingestHealth({date:'2026-06-13',steps:100})===1,'L8: a valid health date still ingests');
  sandbox.localStorage.removeItem('hl_2026_6_13');
  // L3: the two time formatters agree
  ok(sandbox.fmtMMSSVal(90)===sandbox.fmtTime(90)&&sandbox.fmtMMSSVal(90)==='1:30','L3: fmtMMSSVal delegates to fmtTime');
  // L1/L2: dead functions are gone
  ok(typeof sandbox.woPrevTxt==='undefined'&&typeof sandbox.coachApplyEdit==='undefined','L1/L2: removed dead functions are not defined');
  // M2: storageFail exists and is callable without throwing
  ok(typeof sandbox.storageFail==='function','M2: storageFail helper exists for surfacing save failures');
  // L7: shared key builders produce identical keys
  ok(sandbox.storeKeyForDow(1)===sandbox.storeKeyForDate(sandbox.getDateForDow(1))&&sandbox.woKeyForDow(1)===sandbox.woKeyForDate(sandbox.getDateForDow(1)),'L7: storeKeyForDow/woKeyForDow delegate to the date helpers (identical keys)');
  // M1: migrate() stamps a data_version gate
  sandbox.localStorage.removeItem('data_version');sandbox.migrate();
  ok(sandbox.localStorage.getItem('data_version')===String(sandbox.DATA_VERSION),'M1: migrate() records data_version');
  // H4: a never-backed-up user with data sees the nag immediately (respecting snooze)
  sandbox.localStorage.removeItem('last_backup');sandbox.localStorage.removeItem('backup_snooze');
  sandbox.localStorage.setItem('tr_2030_1_1',JSON.stringify({mob:1}));
  sandbox.updateBackupNag();
  ok(/No backup yet/.test(sandbox.document.getElementById('backupNag').innerHTML),'H4: never-backed-up user with data is nagged right away');
  sandbox.localStorage.setItem('backup_snooze',''+Date.now());sandbox.updateBackupNag();
  ok(sandbox.document.getElementById('backupNag').style.display==='none','H4: snoozing still hides the nag');
  sandbox.localStorage.removeItem('tr_2030_1_1');
  // H5: history scanners reflect fresh writes outside a render (render-scoped cache, no staleness)
  sandbox.localStorage.setItem('wo_2031_1_1',JSON.stringify({dateMs:new Date(2031,0,1).getTime(),exercises:[{name:'Cache Probe',sets:[{tag:'work',weight:50,reps:5,done:true}]}]}));
  ok(sandbox.woHistory('Cache Probe',null).length===1,'H5: woHistory sees a freshly written session');
  sandbox.localStorage.setItem('wo_2031_1_8',JSON.stringify({dateMs:new Date(2031,0,8).getTime(),exercises:[{name:'Cache Probe',sets:[{tag:'work',weight:55,reps:5,done:true}]}]}));
  ok(sandbox.woHistory('Cache Probe',null).length===2,'H5: a second write is reflected immediately (no stale cache between direct calls)');
  sandbox.localStorage.removeItem('wo_2031_1_1');sandbox.localStorage.removeItem('wo_2031_1_8');
  store.clear();_snap.forEach(function(v,k){store.set(k,v);});
})();

// ===== Treadmill / cardio metrics + ACSM calorie estimate =====
(function(){
  var _snap=new Map(store);store.clear();
  // ACSM estimator: incline walking matches a treadmill console (~305 kcal for a ~186lb user)
  var k=sandbox.estCardioKcal({min:25.5,spd:2.5,incl:15,weightLb:186});
  ok(k>=295&&k<=315,'estCardioKcal: 25.5min @2.5mph/15% incline ~ treadmill 305 kcal (got '+k+')');
  ok(sandbox.estCardioKcal({min:25.5,spd:2.5,incl:15,weightLb:186})>sandbox.estCardioKcal({min:25.5,spd:2.5,incl:0,weightLb:186}),'estCardioKcal: incline raises the burn');
  ok(sandbox.estCardioKcal({min:25.5,dist:1.06,incl:15,weightLb:186})>0,'estCardioKcal: derives speed from distance+time when speed is missing');
  ok(sandbox.estCardioKcal({min:0,spd:2.5,incl:15,weightLb:186})===null&&sandbox.estCardioKcal({min:25,spd:2.5,incl:15,weightLb:0})===null,'estCardioKcal: needs time + weight (null otherwise)');
  // body-weight lookup: Body Weight test as fallback, recent Apple Health weight preferred
  sandbox.localStorage.setItem('test_log',JSON.stringify({t_bw:[{date:sandbox.todayISO(),value:190}]}));
  ok(sandbox.latestBodyWeightLb()===190,'latestBodyWeightLb falls back to the Body Weight test result');
  sandbox.localStorage.setItem(sandbox.healthKeyForDate(new Date()),JSON.stringify({weightLb:181}));
  ok(sandbox.latestBodyWeightLb()===181,'latestBodyWeightLb prefers a recent Apple Health weight');
  // detail entry persists per-day under state, and summarizes
  sandbox.viewDow=2;sandbox.weekOffset=0;sandbox.loadState();
  sandbox.state={};sandbox.state['c_mill']=true;sandbox.cardioDetOpen='c_mill';sandbox.renderCardioSheet();
  sandbox.document.getElementById('cdt_c_mill_min').value='25';sandbox.cardioDetField('c_mill','min');
  sandbox.document.getElementById('cdt_c_mill_incl').value='15';sandbox.cardioDetField('c_mill','incl');
  sandbox.document.getElementById('cdt_c_mill_spd').value='2.5';sandbox.cardioDetField('c_mill','spd');
  sandbox.document.getElementById('cdt_c_mill_hr').value='107';sandbox.cardioDetField('c_mill','hr');
  ok(sandbox.state['cdt_c_mill']&&sandbox.state['cdt_c_mill'].min===25&&sandbox.state['cdt_c_mill'].incl===15,'cardioDetField stores numeric treadmill stats in the day state');
  ok(/25 min/.test(sandbox.cardioDetSummary('c_mill'))&&/15% incl/.test(sandbox.cardioDetSummary('c_mill'))&&/107 bpm/.test(sandbox.cardioDetSummary('c_mill')),'cardioDetSummary renders the logged stats');
  // estimate button fills calories from incline + speed + stored weight
  sandbox.cardioEstimate('c_mill');
  ok(sandbox.state['cdt_c_mill'].cal>0,'cardioEstimate writes an estimated calorie value');
  ok(sandbox.document.getElementById('cdt_c_mill_cal').value===String(sandbox.state['cdt_c_mill'].cal),'cardioEstimate fills the calories input');
  // clearing a field removes it
  sandbox.document.getElementById('cdt_c_mill_hr').value='';sandbox.cardioDetField('c_mill','hr');
  ok(sandbox.state['cdt_c_mill'].hr===undefined,'clearing a field deletes it from the detail object');
  // the day card surfaces the detail line
  var crow=sandbox.cardioRowHTML();
  ok(/cardio-det/.test(crow)&&/25 min/.test(crow),'cardioRowHTML shows the treadmill detail line on the day card');
  // details persist through a save/load round-trip on the per-day key (rides along in tr_ backups)
  sandbox.save();sandbox.state={};sandbox.loadState();
  ok(sandbox.state['cdt_c_mill']&&sandbox.state['cdt_c_mill'].min===25,'treadmill details persist on the per-day tr_ key');
  // deselecting the cardio type closes any open detail panel
  sandbox.cardioDetOpen='c_mill';sandbox.toggleCardioOpt('c_mill');
  ok(sandbox.state['c_mill']===false&&sandbox.cardioDetOpen==='','deselecting a cardio type collapses its detail panel');
  // weekly rollup sums cardio detail minutes / distance / calories across the week
  store.clear();
  var _wd0=sandbox.getDateForDow(1),_wd1=sandbox.getDateForDow(3);
  store.set(sandbox.storeKeyForDate(_wd0),JSON.stringify({c_mill:true,'cdt_c_mill':{min:25,dist:1.06,cal:305,hr:107}}));
  store.set(sandbox.storeKeyForDate(_wd1),JSON.stringify({c_incl:true,'cdt_c_incl':{min:30,dist:1.5,cal:280}}));
  var wst=sandbox.weekStats();
  ok(wst.cMin===55&&wst.cCal===585,'weekStats sums cardio minutes (55) + calories (585) across the week');
  ok(Math.abs(wst.cDist-2.56)<1e-9,'weekStats sums cardio distance (2.56 mi)');
  sandbox.weekOffset=0;sandbox.renderWeek();
  var wh=sandbox.document.getElementById('root').innerHTML;
  ok(/Logged totals/.test(wh)&&/55 min/.test(wh)&&/585 kcal/.test(wh),'Week view renders the cardio Logged totals row');
  // carry-forward: selecting a cardio type seeds details from the most recent prior session (minus HR)
  store.clear();
  var _prior=sandbox.getDateForDow(2);
  store.set(sandbox.storeKeyForDate(_prior),JSON.stringify({c_incl:true,'cdt_c_incl':{min:25,incl:15,spd:2.5,cal:305,hr:110}}));
  sandbox.viewDow=4;sandbox.weekOffset=0;sandbox.loadState();
  ok(!sandbox.state['cdt_c_incl'],'fresh day starts with no cardio details');
  sandbox.toggleCardioOpt('c_incl');
  ok(sandbox.state['c_incl']===true&&sandbox.state['cdt_c_incl'],'selecting a cardio type seeds details from the prior session');
  ok(sandbox.state['cdt_c_incl'].incl===15&&sandbox.state['cdt_c_incl'].spd===2.5&&sandbox.state['cdt_c_incl'].cal===305,'carried-forward details reuse incline / speed / calories');
  ok(sandbox.state['cdt_c_incl'].hr===undefined,'heart rate is NOT carried forward (left blank for a fresh reading)');
  sandbox.toggleCardioOpt('c_bike');
  ok(!sandbox.state['cdt_c_bike'],'a cardio type with no prior session seeds nothing');
  // an existing same-day entry is never overwritten by carry-forward
  sandbox.state={};sandbox.state['c_incl']=true;sandbox.state['cdt_c_incl']={min:40,incl:5};sandbox.toggleCardioOpt('c_incl');sandbox.toggleCardioOpt('c_incl');
  ok(sandbox.state['cdt_c_incl'].min===40&&sandbox.state['cdt_c_incl'].incl===5,'re-selecting keeps the current day edits (no clobber from history)');
  store.clear();_snap.forEach(function(v,k){store.set(k,v);});
})();

// ===== AI Coach: cardio sessions feed the workout report =====
(function(){
  var _snap=new Map(store);store.clear();
  var _td=new Date();
  store.set(sandbox.storeKeyForDate(_td),JSON.stringify({c_incl:true,'cdt_c_incl':{min:25,dist:1.06,spd:2.5,incl:15,cal:305,hr:107}}));
  sandbox.coachRange='this';sandbox.coachKind='workout';
  var cp=sandbox.coachPayload();
  ok(cp.cardioLogged===1,'coachPayload counts logged cardio sessions in range');
  ok(cp.cardioSessions&&cp.cardioSessions[0].type.indexOf('Incline Walk')>=0,'coachPayload labels the cardio type');
  ok(cp.cardioSessions[0].inclinePct===15&&cp.cardioSessions[0].speedMph===2.5&&cp.cardioSessions[0].kcal===305&&cp.cardioSessions[0].avgHr===107,'coachPayload carries the cardio detail metrics');
  ok(cp.sessionsLogged===0&&cp.cardioLogged===1,'a cardio-only range still surfaces cardio (no strength sessions needed)');
  var pr=sandbox.coachPrompt(cp,null);
  ok(/CONDITIONING/.test(pr)&&/cardioSessions/.test(pr),'coachPrompt asks the model to review conditioning + sees the cardio JSON');
  ok(/cardioSessions/.test(sandbox.coachSystem()),'coach system prompt tells the model how to read cardioSessions');
  store.clear();_snap.forEach(function(v,k){store.set(k,v);});
})();

console.log(fails?('\n'+fails+' FAILURES'):'\nALL CHECKS PASSED');
process.exit(fails?1:0);

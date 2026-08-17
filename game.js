(() => {
  'use strict';

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const screens = {
    title: $('#title-screen'), gallery: $('#gallery-screen'), settings: $('#settings-screen'), game: $('#game-screen')
  };
  const bgm = $('#bgm');
  const laugh = $('#laugh');
  const sakura = $('#sakura');
  const sctx = sakura.getContext('2d');
  const fade = $('#fade');
  const toastEl = $('#toast');
  const modalLayer = $('#modal-layer');
  const modalCard = $('#modal-card');
  const viewer = $('#viewer');
  const viewerImage = $('#viewer-image');
  const viewerTitle = $('#viewer-title');
  const viewerSubtitle = $('#viewer-subtitle');

  const DEFAULTS = { bgm: .34, se: .78, voice: .75, textSpeed: 34, autoSpeed: 2800, skipUnread: false, rightHide: true };
  let memoryStore = {};
  const Store = {
    get(key, fallback=null){ try { const v=localStorage.getItem(key); return v===null?fallback:JSON.parse(v); } catch(e){ return key in memoryStore?memoryStore[key]:fallback; } },
    set(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ memoryStore[key]=value; } },
    del(key){ try{ localStorage.removeItem(key); }catch(e){ delete memoryStore[key]; } }
  };
  let settings = Object.assign({}, DEFAULTS, Store.get('wa_settings', {}));
  let currentScreen = 'title';
  let settingsReturn = 'title';
  let soundUnlocked = false;
  let frogMode = false;
  let autoMode = false;
  let skipMode = false;
  let ctrlSkip = false;
  let typing = false;
  let typeTimer = null;
  let autoTimer = null;
  let revealTimer = null;
  let frogTimers = [];
  let scriptIndex = -1;
  let cinematicLock = false;
  let sakuraFrozen = false;
  let history = Store.get('wa_history', []);
  let completed = !!Store.get('wa_completed', false);

  const script = [
    { text:'四月。' },
    { text:'樱花落在教学楼后的坡道上。' },
    { text:'放学铃已经响过十几分钟。走廊里的人越来越少。' },
    { text:'那天轮到我值日。' },
    { text:'本来只是擦完黑板，倒掉垃圾，然后像往常一样回家。' },
    { text:'如果一切都照平时进行，那大概也只是一个很普通的下午。' },
    { text:'可偏偏旧教学楼旁边的施工还没有结束。' },
    { text:'正门被围栏挡住，我只好从后面的坡道绕出去。' },
    { text:'我一直觉得，所谓命运，大概只是人们在很多年后，替某个普通下午补上的名字。' },
    { text:'当时的我当然不会想到这些。' },
    { text:'我只记得那天风有些大。' },
    { text:'手里的值日表差点被吹进草丛。' },
    { text:'我弯腰去捡的时候，还在抱怨为什么偏偏轮到我最后一个离开教室。' },
    { text:'如果那天我没有因为值日晚走十分钟。' },
    { text:'如果我没有绕开正在施工的正门。' },
    { text:'如果我没有在旧校舍旁停下来。' },
    { text:'我大概永远不会遇见她。' },
    { text:'那时候的我还不知道。' },
    { text:'从那一天开始，我原本平静的高中生活，会因为一个人彻底改变。' },
    { text:'旧校舍后面平时很少有人经过。' },
    { text:'河岸就在围墙另一边。每到四月，那里的樱花总比学校其他地方更早一些。' },
    { text:'可那天我停下来，并不是因为樱花。' },
    { text:'前面有人。' },
    { text:'就站在坡道尽头。' },
    { text:'我看不清她的脸。' },
    { text:'夕阳正好落在她身后。' },
    { text:'风吹起她身旁的花瓣，连轮廓都显得有些模糊。' },
    { text:'奇怪的是，我后来怎么也想不起自己为什么会停在那里。' },
    { text:'也想不起那时候究竟说了什么。' },
    { text:'我只记得自己抬起了头。' },
    { text:'风吹过树梢。' },
    { text:'花瓣落在河面上。' },
    { text:'那一瞬间，周围忽然安静得有些过分。' },
    { text:'然后，我看见了她。', cinematic:true, pauseAfter:2000, speedMultiplier:1.08 },
    { text:'还有……', cinematic:true, pauseAfter:1700, speedMultiplier:1.35 },
    { text:'她的笑容。', cinematic:true, final:true, pauseAfter:2800, speedMultiplier:1.75 }
  ];

  const cgs = [
    ['CG01《春日》','春日的邂逅','assets/cg/cg01_spring.webp'],
    ['CG02《放学以后》','夕阳教室','assets/cg/cg02_after_school.webp'],
    ['CG03《她的笑容》','微笑','assets/cg/cg03_smile.webp'],
    ['CG04《雨天》','雨中的两人','assets/cg/cg04_rain.webp'],
    ['CG05《夏日》','海边与蓝天','assets/cg/cg05_summer.webp'],
    ['CG06《约定》','黄昏的约定','assets/cg/cg06_promise.webp'],
  ];
  const chars = [
    ['通常','NORMAL','assets/character/heroine_normal.png'],
    ['微笑','SMILE','assets/character/heroine_smile.png'],
    ['害羞','SHY','assets/character/heroine_shy.png'],
    ['惊讶','SURPRISED','assets/character/heroine_surprised.png'],
    ['悲伤','SAD','assets/character/heroine_sad.png'],
    ['认真','SERIOUS','assets/character/heroine_serious.png'],
  ];
  const sceneTitles = [
    '雨宿り','ふたりきり','放課後の教室','はじめての約束','彼女の部屋','春の夜','秘密の電話','夏祭り',
    '温泉旅行','眠れない夜','帰したくない','二人だけの朝','海辺のホテル','夕立のあと','名前を呼んで','もう少しだけ',
    '誰にも言えない','白い息','クリスマス','誕生日','卒業前夜','最後の放課後','約束の場所','そして、春へ'
  ];

  function showScreen(name){
    Object.entries(screens).forEach(([k,el]) => el.classList.toggle('active', k===name));
    currentScreen = name;
    sakura.style.display = (name==='title' || (name==='game' && !frogMode)) ? 'block':'none';
    if(name==='title') updateContinue();
  }
  function transition(fn, ms=430){
    fade.classList.add('on');
    setTimeout(()=>{ fn(); requestAnimationFrame(()=>fade.classList.remove('on')); }, ms);
  }
  function toast(msg){
    toastEl.textContent=msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1800);
  }
  function unlockSound(){
    soundUnlocked = true;
    $('#sound-hint').style.display='none';
  }
  async function playBgm(restart=false){
    if(!soundUnlocked) return;
    laugh.pause();
    if(restart) bgm.currentTime=0;
    bgm.volume=settings.bgm;
    try{ await bgm.play(); }catch(e){}
  }
  function stopBgm(){ bgm.pause(); }
  async function playLaugh(){
    if(!soundUnlocked) return;
    laugh.volume=settings.se;
    laugh.currentTime=0;
    try{ await laugh.play(); }catch(e){}
  }
  function stopLaugh(){ laugh.pause(); laugh.currentTime=0; }
  function applyAudio(){ bgm.volume=settings.bgm; laugh.volume=settings.se; }

  function updateContinue(){
    const a=Store.get('wa_autosave',null);
    $('#continue-btn').disabled=!a;
  }

  // Sakura particle system
  let petals=[];
  function resizeSakura(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    sakura.width=Math.round(innerWidth*dpr); sakura.height=Math.round(innerHeight*dpr);
    sakura.style.width=innerWidth+'px'; sakura.style.height=innerHeight+'px';
    sctx.setTransform(dpr,0,0,dpr,0,0);
    if(!petals.length) petals=Array.from({length:52},makePetal);
  }
  function makePetal(fromTop=false){
    return {x:Math.random()*innerWidth,y:fromTop?-30:Math.random()*innerHeight,size:5+Math.random()*11,vy:.35+Math.random()*1.1,vx:-.35+Math.random()*.7,rot:Math.random()*6.28,vr:-.018+Math.random()*.036,sway:Math.random()*6.28,alpha:.28+Math.random()*.5,blur:Math.random()>.87?1.4:0};
  }
  function petalPath(p){
    sctx.beginPath(); sctx.moveTo(0,-p.size/2);
    sctx.bezierCurveTo(p.size*.55,-p.size*.3,p.size*.52,p.size*.34,0,p.size*.55);
    sctx.bezierCurveTo(-p.size*.5,p.size*.34,-p.size*.55,-p.size*.3,0,-p.size/2);
  }
  function animateSakura(){
    sctx.clearRect(0,0,innerWidth,innerHeight);
    if(sakura.style.display!=='none'){
      for(let i=0;i<petals.length;i++){
        const p=petals[i];
        if(!sakuraFrozen){ p.sway+=.012; p.x+=p.vx+Math.sin(p.sway)*.32; p.y+=p.vy; p.rot+=p.vr; }
        sctx.save(); sctx.translate(p.x,p.y); sctx.rotate(p.rot); sctx.globalAlpha=p.alpha; sctx.filter=p.blur?'blur(1.4px)':'none';
        petalPath(p); sctx.fillStyle='#ffd6e2'; sctx.fill(); sctx.restore();
        if(p.y>innerHeight+40||p.x<-60||p.x>innerWidth+60) petals[i]=makePetal(true);
      }
    }
    requestAnimationFrame(animateSakura);
  }

  function galleryTab(type){
    $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.galleryTab===type));
    const grid=$('#gallery-grid'); grid.innerHTML='';
    if(type==='cg'){
      cgs.forEach((c,i)=>grid.appendChild(unlockedCard(c[2],c[0],c[1])));
      for(let i=7;i<=48;i++) grid.appendChild(lockedCard(`CG ${String(i).padStart(2,'0')}`));
    } else if(type==='scene'){
      sceneTitles.forEach((t,i)=>grid.appendChild(lockedCard(`SCENE ${String(i+1).padStart(2,'0')} · ${t}`)));
    } else if(type==='character'){
      chars.forEach(c=>grid.appendChild(unlockedCard(c[2],`春野诗音 · ${c[0]}`,c[1],true)));
    } else {
      for(let i=1;i<=8;i++) grid.appendChild(lockedCard(`SPECIAL ${String(i).padStart(2,'0')}`));
    }
    // 回想模式永远不展示奶蛙；SPECIAL 只承担“内容很多”的伪装。
    $('#special-count').textContent='0 / 8';
  }
  function unlockedCard(src,title,sub,character=false,special=false){
    const card=document.createElement('button'); card.className='gallery-card unlocked'+(character?' character':'');
    card.innerHTML=`<img src="${src}" alt=""><span class="card-label">${escapeHtml(title)}</span>`;
    card.addEventListener('click',()=>openViewer(src,title,sub,special)); return card;
  }
  function lockedCard(label){
    const card=document.createElement('div'); card.className='gallery-card locked';
    card.innerHTML=`<div class="lock-wrap"><img src="assets/ui/lock.svg" alt=""><span>${escapeHtml(label)}</span></div>`; return card;
  }
  function openViewer(src,title,sub,special=false){
    viewerImage.src=src; viewerImage.style.maxHeight=special?'78vh':'82vh'; viewerTitle.textContent=title; viewerSubtitle.textContent=sub||'';
    viewer.classList.remove('hidden'); viewer.setAttribute('aria-hidden','false');
  }
  function closeViewer(){ viewer.classList.add('hidden'); viewer.setAttribute('aria-hidden','true'); }

  function startNew(){
    unlockSound(); stopLaugh(); frogMode=false; cinematicLock=false; sakuraFrozen=false; autoMode=false; skipMode=false; ctrlSkip=false; scriptIndex=-1; clearTimers();
    history=[]; Store.set('wa_history',history);
    transition(()=>{
      showScreen('game');
      $('#frog-layer').classList.add('hidden');
      $('#frog-layer').classList.remove('revealed','laugh-hit');
      $('#dialogue-box').classList.add('hidden');
      $('#dialogue-box').classList.remove('cinematic-focus');
      $('#game-toolbar').classList.add('hidden');
      $('#game-toolbar').classList.remove('cinematic-hidden');
      $('#headphone-card').classList.remove('hidden');
      $('#game-background').style.backgroundImage="url('assets/bg/prologue.webp')";
      $('#chapter-label').textContent='我';
      $('#speaker-name').textContent='';
      $('#dialogue-text').textContent='';
      playBgm(true);
    });
  }
  function enterPrologue(index=-1){
    $('#headphone-card').classList.add('hidden');
    $('#chapter-label').textContent='我';
    $('#speaker-name').textContent='';
    $('#dialogue-box').classList.remove('hidden');
        $('#game-toolbar').classList.remove('hidden','cinematic-hidden');
    playBgm(index<0);
    if(index<0) advance(); else { scriptIndex=index-1; advance(); }
  }
  function clearFrogTimers(){ frogTimers.forEach(clearTimeout); frogTimers=[]; }
  function scheduleFrog(fn,ms){ const id=setTimeout(fn,ms); frogTimers.push(id); return id; }
  function clearTimers(){
    clearTimeout(typeTimer); clearTimeout(autoTimer); clearTimeout(revealTimer);
    clearFrogTimers();
    typeTimer=autoTimer=revealTimer=null; typing=false; cinematicLock=false;
  }
  function advance(){
    if(frogMode || cinematicLock) return;
    if(typing){ finishTyping(); return; }
    clearTimeout(autoTimer); clearTimeout(revealTimer);
    scriptIndex++;
    if(scriptIndex>=script.length){ revealFrog(); return; }
    const item=script[scriptIndex];
    const box=$('#dialogue-box');
    box.classList.toggle('cinematic-focus',!!item.cinematic);
    if(item.cinematic) $('#game-toolbar').classList.add('cinematic-hidden');
    else $('#game-toolbar').classList.remove('cinematic-hidden');
    addHistory(item.text);
    typeText(item.text,()=>{
      autosave();
      if(item.cinematic){
        cinematicLock=true;
        autoMode=false; skipMode=false; ctrlSkip=false;
        $('#auto-indicator').textContent='';
        $$('#game-toolbar button').forEach(b=>b.classList.remove('active'));
        revealTimer=setTimeout(()=>{
          cinematicLock=false;
          if(item.final) revealFrog();
          else advance();
        }, item.pauseAfter||1200);
      } else if(autoMode || skipMode || ctrlSkip){
        autoTimer=setTimeout(advance,(skipMode||ctrlSkip)?120:settings.autoSpeed);
      }
    },item.speedMultiplier||1);
  }
  function typeText(text,done,speedMultiplier=1){
    const el=$('#dialogue-text'); el.textContent=''; typing=true; let i=0;
    const step=()=>{
      if(!typing) return;
      if(i>=text.length){ typing=false; done&&done(); return; }
      el.textContent+=text[i++];
      typeTimer=setTimeout(step,(skipMode||ctrlSkip)?2:Math.round(settings.textSpeed*speedMultiplier));
    }; step();
    el._finish=()=>{ el.textContent=text; typing=false; clearTimeout(typeTimer); done&&done(); };
  }
  function finishTyping(){ const el=$('#dialogue-text'); if(typing&&el._finish) el._finish(); }
  function addHistory(text){
    history.push({time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),text});
    history=history.slice(-80); Store.set('wa_history',history);
  }
  function revealFrog(){
    if(frogMode) return;
    clearTimers();
    frogMode=true; cinematicLock=true; sakuraFrozen=true; autoMode=false; skipMode=false; ctrlSkip=false;
    $('#auto-indicator').textContent='';
    $$('#game-toolbar button').forEach(b=>b.classList.remove('active'));
    $('#game-toolbar').classList.add('cinematic-hidden');

    const impact=$('#impact-cut');
    const layer=$('#frog-layer');
    const dialogue=$('#dialogue-box');

    // 先让“她的笑容。”完整留在画面里，再让花瓣短暂停住。
    // 180ms 后硬切音乐与画面，保持一次非常短的黑场。
    scheduleFrog(()=>{
      stopBgm();
      impact.classList.add('on');
    },180);

    // 黑场里换好奶蛙，画面恢复时先保持无声，让玩家有一瞬间识别它。
    scheduleFrog(()=>{
      sakura.style.display='none';
      dialogue.classList.add('hidden');
      dialogue.classList.remove('cinematic-focus');
      layer.classList.remove('hidden','revealed','laugh-hit');
      void layer.offsetWidth;
      layer.classList.add('revealed');
    },330);
    scheduleFrog(()=>impact.classList.remove('on'),350);

    // 奶蛙先无声出现约 280ms，再突然开始笑；只弹一下，不持续抖屏。
    scheduleFrog(()=>{
      playLaugh();
      layer.classList.add('laugh-hit');
    },630);

    // 奶蛙出现后保持纯画面演出：不显示名牌、角色名或对话框。

    completed=true; Store.set('wa_completed',true);
    Store.set('wa_autosave',{mode:'frog',index:script.length-1,time:Date.now()});
    updateContinue();
  }

  function autosave(){ Store.set('wa_autosave',{mode:'prologue',index:scriptIndex,time:Date.now()}); updateContinue(); }

  function saveSlots(mode='save'){
    const slots=Store.get('wa_saves',Array(12).fill(null));
    const auto=Store.get('wa_autosave',null);
    modalLayer.classList.remove('hidden'); modalLayer.setAttribute('aria-hidden','false');
    modalCard.innerHTML=`<div class="modal-head"><h2>${mode==='save'?'保存游戏':'读取存档'}</h2><button class="x-btn" data-close-modal>×</button></div><div class="slot-grid" id="slot-grid"></div>`;
    const grid=$('#slot-grid');
    if(auto) grid.appendChild(slotButton(auto,'AUTO SAVE','autosave',()=>{ if(mode==='load') loadState(auto); }));
    for(let i=0;i<12;i++){
      const st=slots[i];
      grid.appendChild(slotButton(st,`SAVE ${String(i+1).padStart(2,'0')}`,st?'':'empty',()=>{
        if(mode==='save') saveTo(i); else if(st) loadState(st);
      }));
    }
    $('[data-close-modal]').addEventListener('click',closeModal);
  }
  function slotButton(st,label,extra,click){
    const b=document.createElement('button'); b.className='save-slot '+extra;
    const scene=st?(st.mode==='frog'?'她的笑容':`四月 · 河畔 / ${Math.max(1,(st.index??0)+1)}`):'EMPTY';
    const time=st?new Date(st.time).toLocaleString('zh-CN'):'尚未保存';
    b.innerHTML=`<b>${label}</b><div class="slot-scene">${scene}</div><small>${time}</small>`; b.addEventListener('click',click); return b;
  }
  function saveTo(i){
    if(currentScreen!=='game'){ toast('当前无法保存'); return; }
    const slots=Store.get('wa_saves',Array(12).fill(null));
    slots[i]={mode:frogMode?'frog':'prologue',index:scriptIndex,time:Date.now()}; Store.set('wa_saves',slots); toast(`已保存至 SAVE ${String(i+1).padStart(2,'0')}`); saveSlots('save');
  }
  function loadState(st){
    if(!st) return; closeModal(); unlockSound();
    transition(()=>{
      showScreen('game'); $('#headphone-card').classList.add('hidden'); $('#game-toolbar').classList.remove('hidden');
      if(st.mode==='frog'){
        frogMode=false; cinematicLock=false; sakuraFrozen=false; $('#dialogue-box').classList.add('hidden'); $('#dialogue-box').classList.remove('cinematic-focus'); $('#frog-layer').classList.add('hidden'); revealFrog();
      } else {
        stopLaugh(); frogMode=false; cinematicLock=false; sakuraFrozen=false; $('#chapter-label').textContent='我'; $('#speaker-name').textContent=''; $('#frog-layer').classList.add('hidden'); $('#dialogue-box').classList.remove('hidden'); $('#dialogue-box').classList.remove('cinematic-focus'); $('#game-toolbar').classList.remove('cinematic-hidden'); sakura.style.display='block'; scriptIndex=Math.max(-1,(st.index??0)-1); playBgm(true); advance();
      }
    });
  }

  function historyModal(){
    modalLayer.classList.remove('hidden'); modalCard.innerHTML=`<div class="modal-head"><h2>历史记录</h2><button class="x-btn" data-close-modal>×</button></div><div class="history-list">${history.map(h=>`<div class="history-item"><small>${escapeHtml(h.time)}</small>${escapeHtml(h.text)}</div>`).join('')||'<div class="history-item">暂无记录。</div>'}</div>`;
    $('[data-close-modal]').addEventListener('click',closeModal);
    const list=$('.history-list'); list.scrollTop=list.scrollHeight;
  }
  function pauseModal(){
    modalLayer.classList.remove('hidden'); modalCard.innerHTML=`<div class="modal-head"><h2>游戏菜单</h2><button class="x-btn" data-close-modal>×</button></div><div class="pause-menu"><button data-pause="resume">继续游戏</button><button data-pause="save">保存</button><button data-pause="load">读取</button><button data-pause="settings">设置</button><button data-pause="title">返回标题</button><button data-pause="quit">退出游戏</button></div>`;
    $('[data-close-modal]').addEventListener('click',closeModal);
    $$('[data-pause]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.pause; if(a==='resume') closeModal(); if(a==='save'){closeModal();saveSlots('save')} if(a==='load'){closeModal();saveSlots('load')} if(a==='settings'){closeModal();openSettings('game')} if(a==='title'){closeModal();toTitle()} if(a==='quit'){attemptQuit()}
    }));
  }
  function closeModal(){ modalLayer.classList.add('hidden'); modalLayer.setAttribute('aria-hidden','true'); }

  function openSettings(from='title'){
    settingsReturn=from; syncSettingsUI(); showScreen('settings'); sakura.style.display='none';
  }
  function syncSettingsUI(){
    $('#bgm-volume').value=settings.bgm; $('#se-volume').value=settings.se; $('#voice-volume').value=settings.voice; $('#text-speed').value=settings.textSpeed; $('#auto-speed').value=settings.autoSpeed; $('#skip-unread').checked=settings.skipUnread; $('#right-hide').checked=settings.rightHide; updateOutputs();
  }
  function updateOutputs(){
    $('#bgm-volume-out').value=Math.round(settings.bgm*100)+'%'; $('#se-volume-out').value=Math.round(settings.se*100)+'%'; $('#voice-volume-out').value=Math.round(settings.voice*100)+'%'; $('#text-speed-out').value=settings.textSpeed+'ms'; $('#auto-speed-out').value=(settings.autoSpeed/1000).toFixed(1)+'s';
  }
  function saveSettings(){ Store.set('wa_settings',settings); applyAudio(); updateOutputs(); }

  function toTitle(){
    clearTimers(); frogMode=false; cinematicLock=false; sakuraFrozen=false; autoMode=false; skipMode=false; stopLaugh();
    $('#dialogue-box').classList.remove('cinematic-focus');
    $('#game-toolbar').classList.remove('cinematic-hidden');
    $('#impact-cut').classList.remove('on');
    transition(()=>{ showScreen('title'); playBgm(false); });
  }
  function attemptQuit(){
    try{ window.close(); }catch(e){}
    toast('浏览器环境无法直接关闭窗口，请关闭当前标签页。');
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  // Main menu actions
  $$('.menu-btn').forEach(btn=>btn.addEventListener('click',()=>{
    unlockSound(); const a=btn.dataset.action;
    if(a==='gallery'){ playBgm(false); showScreen('gallery'); sakura.style.display='none'; galleryTab('cg'); }
    if(a==='start') startNew();
    if(a==='continue'){ const st=Store.get('wa_autosave',null); if(st) loadState(st); }
    if(a==='load') saveSlots('load');
    if(a==='settings') openSettings('title');
    if(a==='quit') attemptQuit();
  }));
  $$('[data-back-title]').forEach(b=>b.addEventListener('click',()=>{showScreen('title');playBgm(false)}));
  $$('[data-back-context]').forEach(b=>b.addEventListener('click',()=>{
    if(settingsReturn==='game'){ showScreen('game'); sakura.style.display=frogMode?'none':'block'; }
    else { showScreen('title'); playBgm(false); }
  }));
  $$('.tab').forEach(t=>t.addEventListener('click',()=>galleryTab(t.dataset.galleryTab)));
  $('#viewer-close').addEventListener('click',closeViewer); viewer.addEventListener('click',e=>{if(e.target===viewer)closeViewer()});
  $('#headphone-enter').addEventListener('click',()=>{ unlockSound(); enterPrologue(); });

  // Game click-to-advance
  $('#game-screen').addEventListener('click',e=>{
    if(currentScreen!=='game'||frogMode||!$('#headphone-card').classList.contains('hidden')) return;
    if(e.target.closest('button')||e.target.closest('.game-toolbar')) return;
    if(!$('#dialogue-box').classList.contains('hidden')) advance();
  });
  $('#game-screen').addEventListener('contextmenu',e=>{
    if(settings.rightHide && currentScreen==='game' && !frogMode && $('#headphone-card').classList.contains('hidden')){
      e.preventDefault(); $('#dialogue-box').classList.toggle('hidden');
    }
  });
  $$('#game-toolbar button').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation(); const a=b.dataset.tool;
    if(a==='history')historyModal();
    if(a==='auto'){autoMode=!autoMode;b.classList.toggle('active',autoMode);$('#auto-indicator').textContent=autoMode?'AUTO':'';if(autoMode&&!typing&&!frogMode)autoTimer=setTimeout(advance,settings.autoSpeed)}
    if(a==='skip'){skipMode=!skipMode;b.classList.toggle('active',skipMode);if(skipMode&&!frogMode){if(typing)finishTyping();autoTimer=setTimeout(advance,100)}}
    if(a==='save')saveSlots('save'); if(a==='load')saveSlots('load'); if(a==='settings')openSettings('game'); if(a==='title')toTitle();
  }));

  // Settings listeners
  [['#bgm-volume','bgm',Number],['#se-volume','se',Number],['#voice-volume','voice',Number],['#text-speed','textSpeed',Number],['#auto-speed','autoSpeed',Number]].forEach(([sel,key,cast])=>$(sel).addEventListener('input',e=>{settings[key]=cast(e.target.value);saveSettings()}));
  $('#skip-unread').addEventListener('change',e=>{settings.skipUnread=e.target.checked;saveSettings()});
  $('#right-hide').addEventListener('change',e=>{settings.rightHide=e.target.checked;saveSettings()});
  $('#reset-settings').addEventListener('click',()=>{settings={...DEFAULTS};saveSettings();syncSettingsUI();toast('已恢复默认设置')});
  $('#fullscreen-btn').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(e){toast('当前浏览器不允许全屏')}});

  // Keyboard
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(!viewer.classList.contains('hidden')) return closeViewer();
      if(!modalLayer.classList.contains('hidden')) return closeModal();
      if(currentScreen==='game') return pauseModal();
      if(currentScreen==='gallery'||currentScreen==='settings'){showScreen(settingsReturn==='game'?'game':'title');return;}
    }
    if(e.key==='Control'&&currentScreen==='game'&&!frogMode&&!cinematicLock){ctrlSkip=true;if(typing)finishTyping();else advance();}
    if((e.key==='Enter'||e.code==='Space')&&currentScreen==='game'&&!frogMode&&$('#headphone-card').classList.contains('hidden')){e.preventDefault();advance();}
    if((e.key==='h'||e.key==='H')&&currentScreen==='game'&&!frogMode){$('#dialogue-box').classList.toggle('hidden')}
  });
  document.addEventListener('keyup',e=>{if(e.key==='Control')ctrlSkip=false});

  modalLayer.addEventListener('click',e=>{if(e.target===modalLayer)closeModal()});
  window.addEventListener('resize',resizeSakura);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){ if(!bgm.paused) bgm._resume=true; if(!laugh.paused) laugh._resume=true; bgm.pause(); laugh.pause(); } else { if(soundUnlocked&&frogMode&&laugh._resume) laugh.play().catch(()=>{}); else if(soundUnlocked&&bgm._resume) bgm.play().catch(()=>{}); bgm._resume=laugh._resume=false; } });

  // Initial state
  applyAudio(); syncSettingsUI(); updateContinue(); resizeSakura(); animateSakura(); galleryTab('cg');
})();

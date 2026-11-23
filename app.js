(function(){
  'use strict';
  const KEY='mgt110-exam2-study-v1';
  const defaults={completed:[],flashKnown:[],quizHistory:[],lastLesson:null};
  let state=load();
  let currentView='dashboard', currentLesson=state.lastLesson||LESSONS[0].id;
  let flashOrder=[...FLASHCARDS], flashIndex=0;
  let quizQuestions=[], quizIndex=0, quizCorrect=0, quizMissed=[], quizAnswered=false;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const unit=id=>UNITS.find(u=>u.id===id);
  const mascots={differences:'🐰',stress:'🐻',decisions:'🦊',communication:'🐱',motivation:'🐸',teams:'🐼'};
  function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
  function save(){localStorage.setItem(KEY,JSON.stringify(state));updateProgress()}
  function pct(n,d){return d?Math.round(n/d*100):0}
  function shuffle(a){let x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function init(){
    renderSidebar(); renderDashboard(); renderUnitFilter(); renderLessonList(); renderLesson(); renderFlashcard(); renderGlossary(); updateProgress();
    $$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
    $$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
    $('#continue-button').addEventListener('click',()=>{const next=LESSONS.find(l=>!state.completed.includes(l.id))||LESSONS[0];currentLesson=next.id;showView('learn');renderLessonList();renderLesson()});
    $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
    $('#reset-progress').addEventListener('click',()=>{if(confirm('Reset lesson, flashcard, and quiz progress on this device?')){state={...defaults};save();renderSidebar();renderDashboard();renderLessonList();renderFlashcard();toast('Progress reset')}});
    $('#unit-filter').addEventListener('change',()=>{renderLessonList();const visible=getFilteredLessons();if(!visible.some(l=>l.id===currentLesson)){currentLesson=visible[0].id;renderLesson()}});
    $('#flashcard').addEventListener('click',flipCard); $('#flashcard').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();flipCard()}});
    $('#flash-prev').addEventListener('click',()=>moveFlash(-1)); $('#flash-next').addEventListener('click',()=>moveFlash(1));
    $$('.rating-button').forEach(b=>b.addEventListener('click',()=>rateFlash(b.dataset.rating)));
    $$('.quiz-option').forEach(b=>b.addEventListener('click',()=>startQuiz(+b.dataset.count)));
    $('#quit-quiz').addEventListener('click',resetQuiz); $('#next-question').addEventListener('click',nextQuestion);
    $('#glossary-search').addEventListener('input',renderGlossary);
    $('#global-search').addEventListener('input',e=>renderSearch(e.target.value));
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName)){e.preventDefault();$('#global-search').focus()}});
    window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(['dashboard','learn','flashcards','quiz','glossary'].includes(v))showView(v,false)});
    const hv=location.hash.slice(1);if(hv)showView(hv,false);
  }

  function showView(name,hash=true){
    currentView=name;$$('.view').forEach(v=>v.classList.remove('active'));const target=$(`#view-${name}`);if(!target)return;target.classList.add('active');
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(hash)history.replaceState(null,'','#'+name);window.scrollTo({top:0,behavior:'smooth'});$('#sidebar').classList.remove('open');
    if(name==='dashboard')renderDashboard(); if(name==='learn'){renderLessonList();renderLesson()} if(name==='flashcards')renderFlashcard();
  }

  function renderSidebar(){
    $('#sidebar-units').innerHTML=UNITS.map(u=>{const ls=LESSONS.filter(l=>l.unit===u.id),done=ls.filter(l=>state.completed.includes(l.id)).length;return `<div class="side-unit ${done===ls.length?'done':''}"><i></i><span>${mascots[u.id]} ${u.short}</span><b>${done}/${ls.length}</b></div>`}).join('');
  }

  function progressData(){
    const lessonPct=pct(state.completed.length,LESSONS.length);const recent=state.quizHistory.at(-1);const quizPct=recent?recent.percent:0;return {lessonPct,quizPct,overall:Math.round(lessonPct*.7+quizPct*.3)};
  }
  function updateProgress(){
    const p=progressData();$('#top-progress-text').textContent=`${p.overall}% ready`;$('#top-progress-bar').style.width=p.overall+'%';$('#hero-progress').textContent=p.overall+'%';
    $('#readiness-bar').style.width=p.overall+'%';$('#lesson-total').textContent=`${state.completed.length} / ${LESSONS.length} lessons`;renderSidebar();
    const label=p.overall>=85?'Exam ready—keep it sharp':p.overall>=60?'Strong foundation—target weak spots':p.overall>=30?'Momentum is building':'Let’s establish your baseline';
    $('#readiness-label').textContent=label;$('#readiness-copy').textContent=state.quizHistory.length?`Latest quiz: ${state.quizHistory.at(-1).percent}%. Readiness combines quiz accuracy with lesson completion.`:'Complete lessons and quizzes to build your readiness score. Your study buddies are cheering for you.';
  }
  function renderDashboard(){
    $('#unit-cards').innerHTML=UNITS.map(u=>{const ls=LESSONS.filter(l=>l.unit===u.id),done=ls.filter(l=>state.completed.includes(l.id)).length;return `<button class="unit-card" data-unit="${u.id}"><span class="unit-no">${u.number} · ${u.short}</span><span class="unit-mascot" aria-hidden="true">${mascots[u.id]}</span><strong>${u.title}</strong><div class="mini-progress"><i style="width:${pct(done,ls.length)}%"></i></div><small>${done} of ${ls.length} lessons</small></button>`}).join('');
    $$('.unit-card').forEach(b=>b.addEventListener('click',()=>{$('#unit-filter').value=b.dataset.unit;currentLesson=LESSONS.find(l=>l.unit===b.dataset.unit).id;showView('learn');renderLessonList();renderLesson()}));
    $('#path-line').innerHTML=UNITS.map(u=>`<div class="path-step" data-n="${mascots[u.id]}"><strong>${u.title}</strong><span>${LESSONS.filter(l=>l.unit===u.id).length} connected lessons</span></div>`).join('');updateProgress();
  }
  function renderUnitFilter(){$('#unit-filter').innerHTML='<option value="all">All units</option>'+UNITS.map(u=>`<option value="${u.id}">${u.short} · ${u.title}</option>`).join('')}
  function getFilteredLessons(){const f=$('#unit-filter').value;return f==='all'?LESSONS:LESSONS.filter(l=>l.unit===f)}
  function renderLessonList(){
    $('#lesson-list').innerHTML=getFilteredLessons().map(l=>`<button class="lesson-button ${l.id===currentLesson?'active':''} ${state.completed.includes(l.id)?'done':''}" data-lesson="${l.id}">${l.title}</button>`).join('');
    $$('.lesson-button').forEach(b=>b.addEventListener('click',()=>{currentLesson=b.dataset.lesson;state.lastLesson=currentLesson;save();renderLessonList();renderLesson();window.scrollTo({top:0,behavior:'smooth'})}));
  }
  function renderLesson(){
    const l=LESSONS.find(x=>x.id===currentLesson)||LESSONS[0],u=unit(l.unit),done=state.completed.includes(l.id);
    $('#lesson-content').innerHTML=`<div class="lesson-kicker"><span>${u.short} · ${u.title}</span><span>${done?'✓ Completed':'In progress'}</span></div><h2>${l.title}</h2><p class="lesson-lede">${l.lede}</p><div class="concept-grid">${l.concepts.map(c=>`<div class="concept-card"><h3>${c[0]}</h3><p>${c[1]}</p></div>`).join('')}</div><div class="contrast"><strong>Exam distinction</strong>${l.contrast}</div><div class="scenario"><p class="eyebrow">Workplace application</p><h3>See it in action</h3><p>${l.scenario}</p></div><div class="lesson-check"><p class="eyebrow">One-minute check</p><h3>${l.check.q}</h3><div class="check-options">${l.check.a.map((a,i)=>`<button class="check-option" data-i="${i}">${a}</button>`).join('')}</div><p class="check-explanation" hidden></p></div><div class="lesson-actions"><span class="source-tag">${l.source}</span><button class="primary-button complete-lesson">${done?'Completed ✓':'Mark complete'}</button></div>`;
    $$('.check-option').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;$$('.check-option').forEach((x,j)=>{x.disabled=true;x.classList.toggle('correct',j===l.check.correct)});if(i!==l.check.correct)b.classList.add('wrong');const p=$('.check-explanation');p.hidden=false;p.textContent=l.check.why}));
    $('.complete-lesson').addEventListener('click',()=>{if(!state.completed.includes(l.id)){state.completed.push(l.id);save();toast(`${mascots[l.unit]} Lesson completed — nice work!`);renderLessonList();renderLesson()}else toast('Already completed ✨')});
  }

  function flipCard(){$('#flashcard').classList.toggle('flipped')}
  function moveFlash(dir){flashIndex=(flashIndex+dir+flashOrder.length)%flashOrder.length;renderFlashcard()}
  function renderFlashcard(){
    const f=flashOrder[flashIndex]||FLASHCARDS[0],u=unit(f.unit);$('#flashcard')?.classList.remove('flipped');$('#flash-unit').textContent=u?`${u.short} · ${u.title}`:'MGT 110';$('#flash-question').textContent=f.question;$('#flash-answer').textContent=f.answer;$('#flash-source').textContent=f.source;$('#flash-position').textContent=`${flashIndex+1} / ${flashOrder.length}`;$('#flash-known').textContent=`${state.flashKnown.length} known`;
  }
  function rateFlash(r){const f=flashOrder[flashIndex];if(r==='know'&&!state.flashKnown.includes(f.id)){state.flashKnown.push(f.id);save();toast('Card mastered ✨')}if(r==='again'){state.flashKnown=state.flashKnown.filter(id=>id!==f.id);save();toast('Saved for another cozy review')}moveFlash(1)}

  function startQuiz(count){quizQuestions=shuffle(QUIZ).slice(0,Math.min(count,QUIZ.length));quizIndex=0;quizCorrect=0;quizMissed=[];$('#quiz-setup').hidden=true;$('#quiz-results').hidden=true;$('#quiz-runner').hidden=false;renderQuestion()}
  function renderQuestion(){
    quizAnswered=false;const q=quizQuestions[quizIndex],u=unit(q.unit);$('#quiz-counter').textContent=`${quizIndex+1} of ${quizQuestions.length}`;$('#quiz-progress-bar').style.width=pct(quizIndex,quizQuestions.length)+'%';$('#quiz-unit').textContent=`${u.short} · ${u.title}`;$('#quiz-question').textContent=q.question;$('#quiz-answers').innerHTML=q.answers.map((a,i)=>`<button class="answer-button" data-i="${i}"><span>${String.fromCharCode(65+i)}</span>${a}</button>`).join('');$('#quiz-feedback').hidden=true;$('#next-question').hidden=true;$$('.answer-button').forEach(b=>b.addEventListener('click',()=>answerQuestion(+b.dataset.i)));
  }
  function answerQuestion(i){
    if(quizAnswered)return;quizAnswered=true;const q=quizQuestions[quizIndex];if(i===q.correct)quizCorrect++;else quizMissed.push(q);$$('.answer-button').forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add('correct');if(j===i&&i!==q.correct)b.classList.add('wrong')});const f=$('#quiz-feedback');f.hidden=false;f.innerHTML=`<strong>${i===q.correct?'Correct.':'Not quite.'}</strong>${q.explanation}`;$('#next-question').hidden=false;$('#next-question').textContent=quizIndex===quizQuestions.length-1?'See results →':'Next question →';
  }
  function nextQuestion(){if(quizIndex<quizQuestions.length-1){quizIndex++;renderQuestion()}else finishQuiz()}
  function finishQuiz(){
    const score=pct(quizCorrect,quizQuestions.length);state.quizHistory.push({date:new Date().toISOString(),correct:quizCorrect,total:quizQuestions.length,percent:score});state.quizHistory=state.quizHistory.slice(-12);save();$('#quiz-runner').hidden=true;const label=score>=90?'Excellent exam readiness':score>=75?'Strong—review the misses':score>=60?'Developing—another pass will help':'Rebuild the foundation';
    $('#quiz-results').hidden=false;$('#quiz-results').innerHTML=`<article class="panel results-card"><p class="eyebrow">Practice complete</p><h1>${label}</h1><div class="result-score"><strong>${score}%</strong><span>${quizCorrect} of ${quizQuestions.length}</span></div><p>${score>=80?'You are applying the distinctions well. Keep retrieving the material so it stays accessible under pressure.':'Use the explanations below to target concepts, then retry a focused quiz.'}</p><div class="results-actions"><button class="primary-button retry-quiz">Try another</button><button class="secondary-button review-lessons">Review lessons</button></div>${quizMissed.length?`<div class="missed-list"><p class="eyebrow">Concepts to revisit</p>${quizMissed.map(q=>`<div class="missed-item"><strong>${q.question}</strong><p>${q.explanation}</p></div>`).join('')}</div>`:'<p><strong>Perfect retrieval—nicely done.</strong></p>'}</article>`;
    $('.retry-quiz').addEventListener('click',resetQuiz);$('.review-lessons').addEventListener('click',()=>showView('learn'));updateProgress();
  }
  function resetQuiz(){$('#quiz-setup').hidden=false;$('#quiz-runner').hidden=true;$('#quiz-results').hidden=true;quizQuestions=[]}

  let alpha='all';
  function renderGlossary(){
    if(!$('#alpha-filter').innerHTML){const letters=['all',...new Set(GLOSSARY.map(g=>g.term[0]))];$('#alpha-filter').innerHTML=letters.map(l=>`<button class="text-button alpha-button ${l===alpha?'active':''}" data-alpha="${l}">${l==='all'?'All':l}</button>`).join('');$$('.alpha-button').forEach(b=>b.addEventListener('click',()=>{alpha=b.dataset.alpha;$$('.alpha-button').forEach(x=>x.classList.toggle('active',x.dataset.alpha===alpha));renderGlossary()}))}
    const q=$('#glossary-search').value.trim().toLowerCase();const items=GLOSSARY.filter(g=>(alpha==='all'||g.term.startsWith(alpha))&&(!q||`${g.term} ${g.definition} ${g.contrast}`.toLowerCase().includes(q)));$('#glossary-grid').innerHTML=items.map(g=>`<article class="glossary-card concept-card"><p class="eyebrow">${g.term[0]}</p><h3>${g.term}</h3><p>${g.definition}</p><small>${g.contrast}</small></article>`).join('')||'<p>No matching terms.</p>';
  }
  function renderSearch(raw){
    const q=raw.trim().toLowerCase();if(!q){if(currentView==='search')showView('dashboard');return}currentView='search';$$('.view').forEach(v=>v.classList.remove('active'));$('#view-search').classList.add('active');$$('.nav-item').forEach(b=>b.classList.remove('active'));const lr=LESSONS.filter(l=>JSON.stringify(l).toLowerCase().includes(q));const gr=GLOSSARY.filter(g=>JSON.stringify(g).toLowerCase().includes(q));$('#search-summary').textContent=`${lr.length+gr.length} result${lr.length+gr.length===1?'':'s'} for “${raw.trim()}”`;$('#search-results').innerHTML=[...lr.map(l=>({type:'Lesson',title:l.title,copy:l.lede,id:l.id})),...gr.map(g=>({type:'Glossary',title:g.term,copy:g.definition}))].map(x=>`<button class="panel search-result" ${x.id?`data-lesson="${x.id}"`:''}><span>${x.type}</span><h2>${escapeHtml(x.title)}</h2><p>${escapeHtml(x.copy)}</p></button>`).join('')||'<div class="panel"><p>No matches. Try a broader term.</p></div>';$$('.search-result[data-lesson]').forEach(b=>b.addEventListener('click',()=>{currentLesson=b.dataset.lesson;$('#unit-filter').value='all';showView('learn');renderLessonList();renderLesson()}));
  }
  init();
})();

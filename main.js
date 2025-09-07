// Stable main.js — translations.js must be loaded first (index.html does that)
(() => {
  // localStorage keys
  const USERS_KEY = "calorie_users";
  const ACTIVITIES_KEY = "calorie_savedActivities";
  const CURRENT_USER_KEY = "calorie_currentUser";
  const LANG_KEY = "calorie_lang";

  // state
  let users = JSON.parse(localStorage.getItem(USERS_KEY)) || []; // array of user objects
  let savedActivities = JSON.parse(localStorage.getItem(ACTIVITIES_KEY)) || [
    // default activities with both names
    { key: "running", nameCZ: "Běh", nameEN: "Running", calories: 600, icon: "🏃" },
    { key: "walking", nameCZ: "Chůze", nameEN: "Walking", calories: 280, icon: "🚶" },
    { key: "tennis", nameCZ: "Tenis", nameEN: "Tennis", calories: 500, icon: "🎾" },
    { key: "swimming", nameCZ: "Plavání", nameEN: "Swimming", calories: 700, icon: "🏊" }
  ];
  let currentUserNickname = localStorage.getItem(CURRENT_USER_KEY) || null;
  let currentLang = localStorage.getItem(LANG_KEY) || "cz";
  let pendingActivity = null; // object from drag
  let selectedHistoryDate = null; // 'YYYY-MM-DD' or null => today
  const palette = ["#FFCC29","#54D472","#EB3D90","#4FCCD9","#407CE8"];
  const remainingColor = "#ED3B3B";
  let calorieChart = null;

  // helpers: date formatting
  function dateKeyFromDate(d){ // returns YYYY-MM-DD
    return d.toISOString().split("T")[0];
  }
  function displayDateYYYYMMDD(d){ // d is Date
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}/${m}/${day}`; // display with slashes
  }
  function getDateNDaysAgo(n){
    const d=new Date(); d.setDate(d.getDate()-n); return d;
  }
  function todayKey(){ return dateKeyFromDate(new Date()); }

  // storage helpers
  function saveUsers(){ localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
  function saveActivities(){ localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(savedActivities)); }
  function saveCurrentUserNickname(){ if(currentUserNickname) localStorage.setItem(CURRENT_USER_KEY,currentUserNickname); else localStorage.removeItem(CURRENT_USER_KEY); }
  function saveLang(){ localStorage.setItem(LANG_KEY,currentLang); }

  // find user by nickname
  function findUser(nick){ return users.find(u=>u.nickname===nick); }
  function ensureUserHasHistory(u){ if(!u.history) u.history={}; }

  // calculate BMR * activity factor
  function calcDailyGoalFromBMR(w,h,a,g,f){
    let bmr = g==="male"? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
    return Math.round(bmr*f);
  }

  // ---------- TRANSLATION ----------
  function translatePage(){
    // main title
    const mt = document.getElementById("mainTitle");
    mt.textContent = translations[currentLang].appTitle || mt.textContent;

    // data-i18n elements (card headers and labels)
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const key = el.getAttribute("data-i18n");
      if(translations[currentLang][key] !== undefined){
        if(el.tagName==="INPUT" || el.tagName==="TEXTAREA"){
          el.placeholder = translations[currentLang][key];
        } else {
          el.textContent = translations[currentLang][key];
        }
      }
    });

    // placeholders for custom activity fields
    const nameInp = document.getElementById("customActivityName");
    if(nameInp) nameInp.placeholder = translations[currentLang].activityPlaceholderName;
    const kcalInp = document.getElementById("customActivityCalories");
    if(kcalInp) kcalInp.placeholder = translations[currentLang].activityPlaceholderKcal;

    // update history button labels after translation
    renderHistoryButtons();
  }

  // ---------- RENDER USER LIST ----------
  function renderUserList(){
    const wrap = document.getElementById("userList");
    wrap.innerHTML="";
    users.forEach(u=>{
      const b = document.createElement("button");
      b.className = "list-group-item list-group-item-action";
      b.style.textAlign="center";
      b.textContent = `${u.nickname}`;
      if(currentUserNickname && currentUserNickname===u.nickname){
        b.classList.add("active");
      }
      b.addEventListener("click", ()=>{
        currentUserNickname = u.nickname;
        saveCurrentUserNickname();
        selectedHistoryDate = null; // reset to show today's view
        fillUserForm(u);
        renderUserList();
        renderActivityList();
        updateChart();
        renderHistoryButtons();
      });
      wrap.appendChild(b);
    });
  }

  function fillUserForm(u){
    if(!u) return;
    document.getElementById("nickname").value = u.nickname||"";
    document.getElementById("weight").value = u.weight||"";
    document.getElementById("height").value = u.height||"";
    document.getElementById("age").value = u.age||"";
    document.getElementById("gender").value = u.gender||"male";
    document.getElementById("jobType").value = u.jobType||1.2;
  }

  // ---------- SAVE USER ----------
  document.getElementById("saveUserBtn").addEventListener("click", ()=>{
    const nickname = document.getElementById("nickname").value.trim();
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const age = parseInt(document.getElementById("age").value,10);
    const gender = document.getElementById("gender").value;
    const jobType = parseFloat(document.getElementById("jobType").value);

    if(!nickname || isNaN(weight) || isNaN(height) || isNaN(age)){
      alert("Vyplň prosím všechna pole."); return;
    }

    let existing = findUser(nickname);
    if(existing){
      // update fields but keep history
      existing.weight = weight; existing.height = height; existing.age = age;
      existing.gender = gender; existing.jobType = jobType;
      existing.dailyGoal = calcDailyGoalFromBMR(weight,height,age,gender,jobType);
    } else {
      const userObj = {
        nickname, weight, height, age, gender, jobType,
        dailyGoal: calcDailyGoalFromBMR(weight,height,age,gender,jobType),
        history: {} // map dateKey -> array of activities
      };
      users.push(userObj);
    }
    currentUserNickname = nickname;
    saveUsers();
    saveCurrentUserNickname();
    renderUserList();
    fillUserForm(findUser(nickname));
    renderActivityList();
    updateChart();
    renderHistoryButtons();
  });

  // ---------- RENDER SAVED ACTIVITIES ----------
  function renderSavedActivities(lang = currentLang){
    const wrap = document.getElementById("savedActivities");
    wrap.innerHTML = "";
    savedActivities.forEach((a, idx)=>{
      const div = document.createElement("div");
      div.className = "list-group-item draggable activity-item d-flex align-items-center";
      div.draggable = true;
      const nameText = (lang==="eng" ? (a.nameEN||a.nameCZ) : (a.nameCZ||a.nameEN));
      div.innerHTML = `<span class="me-2">${a.icon||""}</span><strong class="me-auto">${nameText}</strong><small>${a.calories} kcal/h</small><span class="delete-btn ms-2" data-idx="${idx}" title="Smazat">&times;</span>`;
      div.addEventListener("dragstart",(e)=>{
        e.dataTransfer.setData("text/plain", JSON.stringify({
          key: a.key||a.nameEN||a.nameCZ,
          nameCZ: a.nameCZ,
          nameEN: a.nameEN,
          calories: a.calories,
          icon: a.icon
        }));
      });
      wrap.appendChild(div);
    });
    // delete btns
    wrap.querySelectorAll(".delete-btn").forEach(btn=>{
      btn.addEventListener("click",(ev)=>{
        ev.stopPropagation();
        const i = parseInt(btn.getAttribute("data-idx"),10);
        if(!isNaN(i)){
          savedActivities.splice(i,1);
          saveActivities();
          renderSavedActivities(currentLang);
        }
      });
    });
  }

  // add custom activity
  document.getElementById("addCustomActivity").addEventListener("click", ()=>{
    const rawName = document.getElementById("customActivityName").value.trim();
    const calories = parseInt(document.getElementById("customActivityCalories").value,10);
    if(!rawName || isNaN(calories) || calories<=0){ alert("Vyplň název a kladné kcal/h."); return; }
    // generate key
    const baseKey = rawName.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
    const key = `${baseKey}_${Date.now()}`;
    let nameCZ = rawName, nameEN = rawName;
    if(currentLang === "eng"){ nameEN = rawName; nameCZ = rawName; } else { nameCZ = rawName; nameEN = rawName; }
    const icon = getIconForActivity(rawName);
    savedActivities.push({ key, nameCZ, nameEN, calories, icon });
    saveActivities();
    renderSavedActivities(currentLang);
    document.getElementById("customActivityName").value = "";
    document.getElementById("customActivityCalories").value = "";
  });

  // ---------- RENDER ACTIVITY LIST (for selected date) ----------
  function renderActivityList(dateKey = (selectedHistoryDate || todayKey()), lang = currentLang){
    const ul = document.getElementById("activityList");
    ul.innerHTML = "";
    if(!currentUserNickname){ return; }
    const user = findUser(currentUserNickname);
    if(!user) return;
    ensureUserHasHistory(user);
    const arr = user.history[dateKey] || [];
    arr.forEach((it, idx)=>{
      const li = document.createElement("li");
      li.className = "list-group-item d-flex align-items-center";
      const nameText = (lang === "eng") ? (it.nameEN || it.nameCZ || lookupActivityNameEN(it.key)) : (it.nameCZ || it.nameEN || lookupActivityNameCZ(it.key));
      li.innerHTML = `<div class="me-auto">${nameText} — ${it.duration} min — ${it.calories} kcal</div><button class="btn btn-sm btn-outline-danger ms-2 delete-act" data-idx="${idx}">&times;</button>`;
      ul.appendChild(li);
    });
    // delete handlers
    ul.querySelectorAll(".delete-act").forEach(btn=>{
      btn.addEventListener("click",(e)=>{
        const idx = parseInt(btn.getAttribute("data-idx"),10);
        const user = findUser(currentUserNickname);
        const dayKey = dateKey;
        if(user && user.history && user.history[dayKey]){
          user.history[dayKey].splice(idx,1);
          users = users.map(u => u.nickname===user.nickname ? user : u);
          saveUsers();
          renderActivityList(dayKey, currentLang);
          updateChart(dayKey, currentLang);
        }
      });
    });
  }

  // lookup names from savedActivities safely
  function lookupActivityNameCZ(key){
    const a = savedActivities.find(x=>x.key===key || x.nameCZ===key || x.nameEN===key);
    return a ? (a.nameCZ||a.nameEN||key) : (translations[currentLang].activityNames?.[key] || key);
  }
  function lookupActivityNameEN(key){
    const a = savedActivities.find(x=>x.key===key || x.nameCZ===key || x.nameEN===key);
    return a ? (a.nameEN||a.nameCZ||key) : (translations[currentLang].activityNames?.[key] || key);
  }

  // ---------- Drag & Drop to add activity ----------
  const dropZone = document.getElementById("dropZone");
  dropZone.addEventListener("dragover",(e)=>{ e.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave",()=>{ dropZone.classList.remove("dragover"); });
  dropZone.addEventListener("drop",(e)=>{
    e.preventDefault(); dropZone.classList.remove("dragover");
    try{
      const raw = e.dataTransfer.getData("text/plain");
      const data = JSON.parse(raw);
      pendingActivity = data;
      // show modal to input minutes
      const modal = new bootstrap.Modal(document.getElementById("durationModal"));
      document.getElementById("activityDuration").value = 30;
      modal.show();
    }catch(err){
      console.error("drop parse error", err);
    }
  });

  document.getElementById("confirmDuration").addEventListener("click", ()=>{
    if(!pendingActivity){ return; }
    const minutes = parseInt(document.getElementById("activityDuration").value,10);
    if(isNaN(minutes) || minutes<=0){ alert("Zadej délku >0."); return; }
    if(!currentUserNickname){ alert("Vyber uživatele."); return; }
    const burned = Math.round((pendingActivity.calories/60) * minutes);
    const dateKey = selectedHistoryDate || todayKey();
    const user = findUser(currentUserNickname);
    ensureUserHasHistory(user);
    // store item with both names for stability
    const item = {
      key: pendingActivity.key || (pendingActivity.nameEN||pendingActivity.nameCZ),
      nameCZ: pendingActivity.nameCZ || pendingActivity.nameEN || pendingActivity.key,
      nameEN: pendingActivity.nameEN || pendingActivity.nameCZ || pendingActivity.key,
      calories: burned,
      duration: minutes
    };
    if(!user.history[dateKey]) user.history[dateKey]=[];
    user.history[dateKey].push(item);
    // persist
    users = users.map(u => u.nickname===user.nickname?user:u);
    saveUsers();
    // update UI
    renderActivityList(dateKey, currentLang);
    updateChart(dateKey, currentLang);
    // hide modal
    bootstrap.Modal.getInstance(document.getElementById("durationModal")).hide();
    pendingActivity = null;
  });

  // ---------- CHART UPDATE ----------
  function updateChart(dateKey = (selectedHistoryDate || todayKey()), lang = currentLang){
    const ctx = document.getElementById("calorieChart").getContext("2d");
    if(!currentUserNickname){ // no user selected
      if(calorieChart){ calorieChart.destroy(); calorieChart = null; }
      document.getElementById("burnedKcal").textContent = `${translations[lang].burnedPrefix} 0 kCal`;
      return;
    }
    const user = findUser(currentUserNickname);
    ensureUserHasHistory(user);
    const arr = user.history[dateKey] || [];
    const labels = []; const data=[]; const bg=[];
    let burnedTotal = 0;
    arr.forEach((it,i)=>{
      const name = (lang==="eng") ? (it.nameEN || lookupActivityNameEN(it.key)) : (it.nameCZ || lookupActivityNameCZ(it.key));
      labels.push(`${name} (${it.duration} min, ${it.calories} kcal)`);
      data.push(it.calories);
      bg.push(palette[i%palette.length]);
      burnedTotal += it.calories;
    });
    // remaining
    const goal = user.dailyGoal || calcDailyGoalFromBMR(user.weight,user.height,user.age,user.gender,user.jobType||1.2);
    const remaining = Math.max(goal - burnedTotal, 0);
    labels.push(`${ (lang==="eng" ? "Remaining":"Zbývá")} (${remaining} kcal)`);
    data.push(remaining);
    bg.push(remainingColor);

    if(calorieChart) calorieChart.destroy();
    calorieChart = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: bg }] },
      options: { responsive:true, plugins:{ legend:{ position:"bottom" } } }
    });

    // update burned text
    document.getElementById("burnedKcal").textContent = `${translations[lang].burnedPrefix} ${burnedTotal} kCal`;
  }

  // ---------- HISTORY BUTTONS ----------
  function renderHistoryButtons(){
    const wrap = document.getElementById("historyButtons");
    wrap.innerHTML = "";
    if(!currentUserNickname){
      // still render greyed buttons for layout, but they do nothing
    }
    const today = new Date();
    // we need 7 buttons: first = Včera (1 day ago), then next 6 (2..7 days ago)
    for(let i=1;i<=7;i++){
      const d = getDateNDaysAgo(i);
      const dateKey = dateKeyFromDate(d);
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.style.borderRadius = "8px";
      btn.style.padding = "6px 8px";
      btn.style.flex = "1";
      btn.style.minWidth = "120px";
      btn.style.backgroundColor = "#54D472";
      btn.style.color = "white";
      // label: first is translated "Včera"/"Yesterday"
      const label = (i===1) ? translations[currentLang].yesterday : displayDateYYYYMMDD(d);
      btn.textContent = label;
      // active
      if(selectedHistoryDate && selectedHistoryDate===dateKey){
        btn.classList.add("active");
        btn.style.backgroundColor = "#666666";
      }
      btn.addEventListener("click", ()=>{
        // set selected history date and render that date
        selectedHistoryDate = dateKey;
        // toggle active classes: regenerate so styling consistent
        renderHistoryButtons();
        renderActivityList(selectedHistoryDate, currentLang);
        updateChart(selectedHistoryDate, currentLang);
      });
      wrap.appendChild(btn);
    }
  }

  // ---------- LANGUAGE SWITCH ----------
  document.getElementById("btnLangCZ").addEventListener("click", ()=>{
    currentLang = "cz"; saveLang();
    document.getElementById("btnLangCZ").classList.add("active");
    document.getElementById("btnLangEN").classList.remove("active");
    translatePage();
    renderSavedActivities(currentLang);
    renderActivityList(selectedHistoryDate, currentLang);
    updateChart(selectedHistoryDate, currentLang);
  });
  document.getElementById("btnLangEN").addEventListener("click", ()=>{
    currentLang = "eng"; saveLang();
    document.getElementById("btnLangEN").classList.add("active");
    document.getElementById("btnLangCZ").classList.remove("active");
    translatePage();
    renderSavedActivities(currentLang);
    renderActivityList(selectedHistoryDate, currentLang);
    updateChart(selectedHistoryDate, currentLang);
  });

  // ---------- ICON guesser ----------
  function getIconForActivity(name){
    const s = name.toLowerCase();
    if(s.includes("běh")||s.includes("run")) return "🏃";
    if(s.includes("chůz")||s.includes("walk")) return "🚶";
    if(s.includes("tenis")||s.includes("tenn")) return "🎾";
    if(s.includes("plav")||s.includes("swim")) return "🏊";
    if(s.includes("kolo")||s.includes("cyc")||s.includes("bike")) return "🚴";
    if(s.includes("vařen")||s.includes("cook")) return "🍳";
    return "⚡";
  }

  // ---------- BOOTSTRAP / INIT on DOMContentLoaded ----------
  function boot(){
    // ensure arrays from storage were loaded above
    // set current user if not set but users exist
    if(!currentUserNickname && users.length>0){
      currentUserNickname = users[0].nickname;
      saveCurrentUserNickname();
    }
    // apply translations and placeholders
    translatePage();
    // render UI pieces
    renderUserList();
    renderSavedActivities(currentLang);
    renderActivityList(null, currentLang);
    updateChart(null, currentLang);
    renderHistoryButtons();

    // if inputs placeholders must be set:
    document.getElementById("customActivityName").placeholder = translations[currentLang].activityPlaceholderName;
    document.getElementById("customActivityCalories").placeholder = translations[currentLang].activityPlaceholderKcal;
  }

  // run
  document.addEventListener("DOMContentLoaded", boot);

})();

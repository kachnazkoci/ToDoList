let users = JSON.parse(localStorage.getItem("users")) || {};
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
let pendingActivity = null;
let selectedHistoryDate = null;

let savedActivities = JSON.parse(localStorage.getItem("savedActivities")) || [
  { name: "Běh", calories: 600, icon: "🏃" },
  { name: "Chůze", calories: 280, icon: "🚶" },
  { name: "Tenis", calories: 500, icon: "🎾" }
];

const palette = ["#FFCC29","#54D472","#EB3D90","#4FCCD9","#407CE8"];
const remainingColor = "#ED3B3B";

const ctx = document.getElementById("calorieChart").getContext("2d");
let calorieChart = new Chart(ctx, {
  type: "doughnut",
  data: { labels: ["Zbývá"], datasets: [{ data: [1], backgroundColor: [remainingColor] }] },
  options: { responsive: true, plugins: { legend: { position: "bottom" } } }
});

function saveData(){ localStorage.setItem("users", JSON.stringify(users)); }
function saveActivities(){ localStorage.setItem("savedActivities", JSON.stringify(savedActivities)); }

function getIconForActivity(name){
  const s = name.toLowerCase();
  if (s.includes("běh")) return "🏃";
  if (s.includes("chůz")) return "🚶";
  if (s.includes("plav")) return "🏊";
  if (s.includes("tenis")) return "🎾";
  if (s.includes("vařen")) return "🍳";
  return "⚡";
}

function calcDailyGoalFromBMR(w,h,a,g,f){
  let bmr = g==="male"? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
  return Math.round(bmr*f);
}

// --- Uživatelský seznam ---
function renderUserList(){
  const wrap=document.getElementById("userList");
  wrap.innerHTML="";
  Object.keys(users).forEach(k=>{
    const u=users[k];
    const b=document.createElement("button");
    b.className="list-group-item";
    if(currentUser && currentUser.nickname===u.nickname){
      b.classList.add("active");
    }
    b.textContent=u.nickname;
    b.addEventListener("click",()=>{
      currentUser=users[u.nickname];
      localStorage.setItem("currentUser",JSON.stringify(currentUser));
      selectedHistoryDate = null;
      fillUserForm(currentUser);
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
  document.getElementById("nickname").value=u.nickname||"";
  document.getElementById("weight").value=u.weight||"";
  document.getElementById("height").value=u.height||"";
  document.getElementById("age").value=u.age||"";
  document.getElementById("gender").value=u.gender||"male";
  document.getElementById("jobType").value=u.jobType||1.2;
}

// --- Aktivity ---
function renderSavedActivities(){
  const wrap=document.getElementById("savedActivities");
  wrap.innerHTML="";
  savedActivities.forEach((a,idx)=>{
    const div=document.createElement("div");
    div.className="list-group-item draggable activity-item";
    div.draggable=true;
    div.innerHTML=`${a.icon} <strong>${a.name}</strong> — ${a.calories} kcal/h <span class="delete-btn" data-idx="${idx}">&times;</span>`;
    div.addEventListener("dragstart",(e)=>{
      e.dataTransfer.setData("text/plain",JSON.stringify({name:a.name,calories:a.calories}));
    });
    wrap.appendChild(div);
  });
  wrap.querySelectorAll(".delete-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const idx=parseInt(btn.getAttribute("data-idx"),10);
      savedActivities.splice(idx,1);
      saveActivities();
      renderSavedActivities();
    });
  });
}

document.getElementById("addCustomActivity").addEventListener("click",()=>{
  const name=document.getElementById("customActivityName").value.trim();
  const calories=parseInt(document.getElementById("customActivityCalories").value,10);
  if(!name||isNaN(calories)||calories<=0){alert("Vyplň název a kladné kcal/h.");return;}
  const icon=getIconForActivity(name);
  savedActivities.push({name,calories,icon});
  saveActivities();
  renderSavedActivities();
  document.getElementById("customActivityName").value="";
  document.getElementById("customActivityCalories").value="";
});

// --- Uložení uživatele ---
document.getElementById("saveUserBtn").addEventListener("click",()=>{
  const nickname=document.getElementById("nickname").value.trim();
  const weight=parseFloat(document.getElementById("weight").value);
  const height=parseFloat(document.getElementById("height").value);
  const age=parseInt(document.getElementById("age").value,10);
  const gender=document.getElementById("gender").value;
  const jobType=parseFloat(document.getElementById("jobType").value);
  if(!nickname||isNaN(weight)||isNaN(height)||isNaN(age)){alert("Vyplň prosím všechna pole.");return;}
  const dailyGoal=calcDailyGoalFromBMR(weight,height,age,gender,jobType);
  const prevHistory = users[nickname]?.history || {};
  users[nickname]={nickname,weight,height,age,gender,jobType,dailyGoal,history:prevHistory};
  currentUser=users[nickname];
  saveData();
  localStorage.setItem("currentUser",JSON.stringify(currentUser));
  renderUserList();
  fillUserForm(currentUser);
  renderActivityList();
  updateChart();
  renderHistoryButtons();
});

// --- Přidání aktivity ---
function addActivity(name,calories,minutes){
  if(!currentUser){alert("Vyber uživatele.");return;}
  const today=new Date().toISOString().split("T")[0];
  if(!currentUser.history) currentUser.history={};
  if(!currentUser.history[today]) currentUser.history[today]=[];
  currentUser.history[today].push({name,calories,duration:minutes});
  users[currentUser.nickname]=currentUser;
  saveData();
  localStorage.setItem("currentUser",JSON.stringify(currentUser));
  renderActivityList();
  updateChart();
}

// --- Seznam aktivit podle dne ---
function renderActivityList(date=null){
  const ul=document.getElementById("activityList");
  ul.innerHTML="";
  if(!currentUser) return;
  const day = date || new Date().toISOString().split("T")[0];
  const acts=(currentUser.history&&currentUser.history[day])||[];
  acts.forEach((a,idx)=>{
    const li=document.createElement("li");
    li.className="list-group-item activity-item";
    li.innerHTML=`${a.name} — ${a.duration} min — ${a.calories} kcal <span class="delete-btn" data-idx="${idx}">&times;</span>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".delete-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const idx=parseInt(btn.getAttribute("data-idx"),10);
      ul.removeChild(ul.children[idx]);
    });
  });
}

// --- Drag & drop ---
const dropZone=document.getElementById("dropZone");
dropZone.addEventListener("dragover",e=>{e.preventDefault();dropZone.classList.add("dragover");});
dropZone.addEventListener("dragleave",()=>dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop",e=>{
  e.preventDefault();dropZone.classList.remove("dragover");
  const raw=e.dataTransfer.getData("text/plain");
  try{
    const data=JSON.parse(raw);
    pendingActivity=data;
    const modal=new bootstrap.Modal(document.getElementById("durationModal"));
    document.getElementById("activityDuration").value=30;
    modal.show();
  }catch(err){console.error("drop parse error",err);}
});

document.getElementById("confirmDuration").addEventListener("click",()=>{
  if(!pendingActivity) return;
  const minutes=parseInt(document.getElementById("activityDuration").value,10);
  if(isNaN(minutes)||minutes<=0){alert("Zadej délku >0.");return;}
  const kcal=Math.round((pendingActivity.calories/60)*minutes);
  addActivity(pendingActivity.name,kcal,minutes);
  pendingActivity=null;
  bootstrap.Modal.getInstance(document.getElementById("durationModal")).hide();
});

// --- Aktualizace grafu ---
function updateChart(date=null){
  const ctx=document.getElementById("calorieChart").getContext("2d");
  if(!currentUser){
    if(calorieChart) calorieChart.destroy();
    calorieChart=new Chart(ctx,{type:"doughnut",data:{labels:["Žádný uživatel"],datasets:[{data:[1],backgroundColor:["#ddd"]}]}}); 
    document.getElementById("burnedKcal").textContent="| Spáleno: 0 kCal";
    return;
  }
  const day = date || new Date().toISOString().split("T")[0];
  const acts=(currentUser.history&&currentUser.history[day])||[];
  const burned=acts.reduce((s,a)=>s+a.calories,0);
  const remaining=Math.max(currentUser.dailyGoal-burned,0);
  const labels=[];const data=[];const colors=[];
  acts.forEach((a,i)=>{labels.push(`${a.name} (${a.duration} min, ${a.calories} kcal)`);data.push(a.calories);colors.push(palette[i%palette.length]);});
  labels.push(`Zbývá (${remaining} kcal)`);data.push(remaining);colors.push(remainingColor);
  if(calorieChart) calorieChart.destroy();
  calorieChart=new Chart(ctx,{type:"doughnut",data:{labels,datasets:[{data,backgroundColor:colors}]},options:{responsive:true,plugins:{legend:{position:"bottom"}}}});
  document.getElementById("burnedKcal").textContent=`| Spáleno: ${burned} kCal`;
}

// --- Historie tlačítek ---
function renderHistoryButtons(){
  const wrap=document.getElementById("historyButtons");
  wrap.innerHTML="";
  if(!currentUser) return;

  const today = new Date();
  for(let i=1;i<=7;i++){
    const d = new Date(today);
    d.setDate(today.getDate()-i);
    const btn = document.createElement("button");
    btn.className="btn"; // default zelená
    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
    btn.textContent=i===1?"Včera":dateStr;

    // jen pokud vybráno
    if(selectedHistoryDate && selectedHistoryDate===dateStr){
      btn.classList.add("active");
    }

    btn.addEventListener("click",()=>{
      selectedHistoryDate = dateStr;
      renderActivityList(selectedHistoryDate);
      updateChart(selectedHistoryDate);
      Array.from(wrap.children).forEach(c=>c.classList.remove("active"));
      btn.classList.add("active");
    });
    wrap.appendChild(btn);
  }
}

// --- Boot ---
(function boot(){
  renderSavedActivities();
  renderUserList();
  if(!currentUser && Object.keys(users).length>0){currentUser=users[Object.keys(users)[0]];fillUserForm(currentUser);}
  renderActivityList();
  updateChart();
  renderHistoryButtons();
})();

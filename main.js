let users = {};
let currentUser = null;
let pendingActivity = null;
let chart = null;

// Předdefinované aktivity (kcal/hod)
const presetActivitiesData = [
  { name: "Vytírání podlahy", calories: 195 },
  { name: "Vysávání", calories: 175 },
  { name: "Mytí oken", calories: 165 },
  { name: "Utírání prachu", calories: 105 },
  { name: "Úklid koupelny", calories: 195 },
  { name: "Umývání nádobí", calories: 90 },
  { name: "Žehlení", calories: 90 },
  { name: "Sekání trávníku", calories: 320 },
  { name: "Squash", calories: 500 },
  { name: "Badminton", calories: 400 },
  { name: "Běh", calories: 600 },
  { name: "Tenis", calories: 500 },
  { name: "Silový trénink", calories: 450 }
];

// ----------- Uživatelský management -----------
document.getElementById("saveUserBtn").addEventListener("click", () => {
  const nickname = document.getElementById("nickname").value.trim();
  const weight = parseFloat(document.getElementById("weight").value);
  const height = parseFloat(document.getElementById("height").value);
  const age = parseInt(document.getElementById("age").value);
  const gender = document.getElementById("gender").value;
  const jobType = parseFloat(document.getElementById("jobType").value);

  if (!nickname || !weight || !height || !age) {
    document.getElementById("userMessage").textContent = "Vyplň prosím všechna pole!";
    document.getElementById("userMessage").className = "text-danger";
    return;
  }

  // výpočet BMR (Mifflin-St Jeor)
  let bmr;
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  const dailyGoal = Math.round(bmr * jobType);

  users[nickname] = {
    nickname,
    weight,
    height,
    age,
    gender,
    jobType,
    dailyGoal,
    history: {}
  };

  currentUser = users[nickname];

  document.getElementById("userMessage").textContent = `Uživatel ${nickname} uložen! Denní cíl: ${dailyGoal} kcal`;
  document.getElementById("userMessage").className = "text-success";

  updateStatus();
  renderHistory();
});

// ----------- Přidávání aktivit -----------
function addActivity(name, calories) {
  if (!currentUser) {
    alert("Nejprve ulož uživatele!");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  if (!currentUser.history[today]) {
    currentUser.history[today] = { activities: [] };
  }
  currentUser.history[today].activities.push({ name, calories });

  renderActivities();
  updateStatus();
  renderChart();
  renderHistory();
}

function renderActivities() {
  if (!currentUser) return;
  const list = document.getElementById("activityList");
  list.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];
  const todayData = currentUser.history[today] || { activities: [] };

  todayData.activities.forEach(act => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.textContent = `${act.name} – ${act.calories} kcal`;
    list.appendChild(li);
  });
}

// ----------- Stav cíle -----------
function updateStatus() {
  if (!currentUser) return;
  const today = new Date().toISOString().split("T")[0];
  const todayData = currentUser.history[today] || { activities: [] };
  const burned = todayData.activities.reduce((sum, a) => sum + a.calories, 0);
  document.getElementById("goalStatus").textContent =
    `Dnes spáleno ${burned} / ${currentUser.dailyGoal} kcal`;
}

// ----------- Graf -----------
function renderChart() {
  if (!currentUser) return;
  const today = new Date().toISOString().split("T")[0];
  const todayData = currentUser.history[today] || { activities: [] };

  const ctx = document.getElementById("calorieChart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: todayData.activities.map(a => a.name),
      datasets: [{
        data: todayData.activities.map(a => a.calories)
      }]
    }
  });
}

// ----------- Historie ----------- 
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function renderHistory() {
  if (!currentUser) return;
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";

  const last7 = getLast7Days();
  last7.forEach(date => {
    const dayData = currentUser.history[date] || { activities: [] };
    const calories = dayData.activities.reduce((sum, a) => sum + a.calories, 0);
    const names = dayData.activities.map(a => a.name).join(", ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${names || "-"}</td>
      <td>${calories}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------- Drag & Drop aktivit -----------
function setupPresetActivities() {
  const container = document.getElementById("presetActivities");
  container.innerHTML = "";
  presetActivitiesData.forEach(act => {
    const card = document.createElement("div");
    card.className = "card p-2 draggable";
    card.textContent = `${act.name} – ${act.calories} kcal/hod`;
    card.setAttribute("draggable", "true");
    card.dataset.name = act.name;
    card.dataset.calories = act.calories;
    container.appendChild(card);
  });

  document.querySelectorAll(".draggable").forEach(item => {
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({
        name: item.dataset.name,
        calories: parseInt(item.dataset.calories)
      }));
    });
  });

  const dropZone = document.getElementById("activityList");
  dropZone.addEventListener("dragover", (e) => e.preventDefault());
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    pendingActivity = data;

    document.getElementById("selectedActivityName").textContent =
      `${data.name} (${data.calories} kcal/hod)`;

    document.getElementById("activityDuration").value = "";
    const modal = new bootstrap.Modal(document.getElementById("durationModal"));
    modal.show();
  });
}

document.getElementById("confirmDurationBtn").addEventListener("click", () => {
  const duration = parseFloat(document.getElementById("activityDuration").value);
  if (!duration || duration <= 0) {
    alert("Zadej délku v hodinách!");
    return;
  }
  const calories = Math.round(pendingActivity.calories * duration);
  addActivity(`${pendingActivity.name} (${duration} h)`, calories);

  const modal = bootstrap.Modal.getInstance(document.getElementById("durationModal"));
  modal.hide();
});

// Inicializace
setupPresetActivities();

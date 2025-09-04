let dailyGoal = 0;
let totalBurned = 0;

const goalInput = document.getElementById('goalInput');
const setGoalBtn = document.getElementById('setGoalBtn');
const goalStatus = document.getElementById('goalStatus');

const activityInput = document.getElementById('activityInput');
const caloriesInput = document.getElementById('caloriesInput');
const addBtn = document.getElementById('addBtn');
const activityList = document.getElementById('activityList');

// Nastavení cíle
setGoalBtn.addEventListener('click', () => {
  dailyGoal = parseInt(goalInput.value) || 0;
  totalBurned = 0;
  updateStatus();
  activityList.innerHTML = ""; // nový den = prázdný list
});

// Přidání aktivity
addBtn.addEventListener('click', () => {
  const activity = activityInput.value;
  const calories = parseInt(caloriesInput.value);

  if (activity && calories) {
    const li = document.createElement('li');
    li.textContent = `${activity} – ${calories} kcal`;
    activityList.appendChild(li);

    totalBurned += calories;
    updateStatus();

    activityInput.value = "";
    caloriesInput.value = "";
  }
});

// Funkce pro update stavu
function updateStatus() {
  if (dailyGoal > 0) {
    if (totalBurned >= dailyGoal) {
      goalStatus.textContent = `✅ Splněno! Spálil/a jsi ${totalBurned} kcal (cíl byl ${dailyGoal})`;
      goalStatus.style.color = "green";
    } else {
      goalStatus.textContent = `Spáleno: ${totalBurned} / ${dailyGoal} kcal`;
      goalStatus.style.color = "black";
    }
  } else {
    goalStatus.textContent = "Zatím nemáš nastavený cíl.";
  }
}

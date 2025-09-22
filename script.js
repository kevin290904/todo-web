// Cek apakah user sudah login
if (!localStorage.getItem('userId')) {
  alert('Silakan login terlebih dahulu.');
  window.location.href = 'login.html';
}

const form = document.getElementById('todo-form');
const taskList = document.getElementById('task-list');
const themeToggle = document.getElementById('toggle-theme');
const filterSelect = document.getElementById('filter-priority');
const focusMode = document.getElementById('focus-mode');
const recommendation = document.getElementById('recommendation');
const saveMoodBtn = document.getElementById('save-mood');
const badgesDiv = document.getElementById('badges');
const fileInput = document.getElementById('task-file');

let tasks = [];
let alarmAudio = null;
let points = 0;
let productivityChart = null;
let countdownIntervals = {};


if (Notification.permission !== 'granted') {
  Notification.requestPermission();
}

function playAlarm() {
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
  alarmAudio = new Audio('alarm.mp3');
  alarmAudio.loop = true;
  alarmAudio.play();

  // Tampilkan tombol penghenti alarm
  const alarmControl = document.getElementById('alarm-control');
  if (alarmControl) alarmControl.style.display = 'flex';
}


function stopAlarm() {
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    alarmAudio = null;
  }

  // Sembunyikan tombol
  const alarmControl = document.getElementById('alarm-control');
  if (alarmControl) alarmControl.style.display = 'none';
}



// Notifikasi: 10 menit sebelum deadline
function notifyUser(taskText) {
  if (Notification.permission === 'granted') {
    new Notification('Pengingat Tugas', {
      body: `Deadline tugas: ${taskText} tinggal 10 menit lagi!`,
      icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827504.png'
    });
  }
}

function checkDeadlines() {
  const now = new Date();
  tasks.forEach(task => {
    if (!task.done && task.deadline) {
      const deadlineTime = new Date(task.deadline);
      const diff = deadlineTime - now;
      if (diff > 0 && diff <= 10 * 60 * 1000 && !task.notified) {
        playAlarm();
        notifyUser(task.text);
        task.notified = true;
        updateTask(task.id, task);
      }
    }
  });
}

setInterval(checkDeadlines, 60000);

// Notifikasi: reminder 1–3 hari sebelum deadline, 3x sehari
function setupDailyNotifications() {
  const now = new Date();
  const times = [8, 13, 19];

  times.forEach(hour => {
    const target = new Date();
    target.setHours(hour, 0, 0, 0);

    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target - now;

    setTimeout(() => {
      checkDailyTaskReminders();
      setInterval(checkDailyTaskReminders, 24 * 60 * 60 * 1000);
    }, delay);
  });
}

function checkDailyTaskReminders() {
  const now = new Date();
  tasks.forEach(task => {
    if (!task.done && task.deadline) {
      const deadline = new Date(task.deadline);
      const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      if (diffDays >= 1 && diffDays <= 3) {
        notifyUserTaskReminder(task.text, diffDays);
      }
    }
  });
}

function notifyUserTaskReminder(taskText, daysLeft) {
  let message = daysLeft === 1
    ? `Deadline tugas "${taskText}" tinggal BESOK!`
    : `Tugas "${taskText}" tinggal ${daysLeft} hari lagi. Segera kerjakan!`;

  if (Notification.permission === 'granted') {
    new Notification('📅 Reminder Tugas', {
      body: message,
      icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827504.png'
    });
  }
}

setupDailyNotifications();



function updateBadges() {
  badgesDiv.innerHTML = '';
  if (points < 50) {
    badgesDiv.innerHTML = '<span class="badge">Belum ada level</span>';
  }
  if (points >= 50) badgesDiv.innerHTML += '<span class="badge">Level 1: Beginner</span>';
  if (points >= 100) badgesDiv.innerHTML += '<span class="badge">Level 2: Task Warrior</span>';
}


function startCountdown(deadline, taskId) {
  const deadlineTime = new Date(deadline).getTime();
  const timerElement = document.getElementById(taskId);

  // 🔒 Cegah countdown jika tugas sudah selesai
  const task = tasks.find(t => `timer-${tasks.indexOf(t)}` === taskId);
  if (task && task.done) return;

  const interval = setInterval(() => {
    const now = new Date().getTime();
    const remainingTime = deadlineTime - now;

    if (remainingTime <= 0) {
      clearInterval(interval);
      timerElement.innerHTML = "⏰ Waktu Habis";
    } else {
      const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

      let display = '';
      if (days > 0) display += `${days}d `;
      display += `${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;

      timerElement.innerHTML = `⏳ ${display}`;
    }
  }, 1000);

  countdownIntervals[taskId] = interval;
}




async function fetchTasks() {
  const userId = localStorage.getItem('userId');
  const res = await fetch(`/tasks?user_id=${userId}`);
  const data = await res.json();
  tasks = data;
  renderTasks();
  generateSmartRecommendation();
}

async function addTask(taskData) {
  const res = await fetch('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  const newTask = await res.json();
  tasks.push(newTask);
  renderTasks();
  generateSmartRecommendation();
}

async function deleteTask(taskId) {
  await fetch(`/tasks/${taskId}`, { method: 'DELETE' });
  tasks = tasks.filter(t => t.id !== taskId);
  renderTasks();
  generateSmartRecommendation();
}

async function updateTask(taskId, updatedData) {
  await fetch(`/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  generateSmartRecommendation();
}

function renderTasks() {
  taskList.innerHTML = '';
  const completedTaskList = document.getElementById('completed-task-list');
  completedTaskList.innerHTML = '';

  const filter = filterSelect.value;
  let unfinishedTasks = [];

  tasks.forEach((task, index) => {
    if (task.done && task.deadline && new Date(task.deadline) < new Date()) return;
    if (filter !== 'semua' && task.priority !== filter) return;

    const li = document.createElement('li');
    li.classList.add(task.priority === 'tinggi' ? 'high' : task.priority === 'sedang' ? 'medium' : 'low');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
    
      // Stop countdown jika tugas dicentang selesai
      if (task.done) {
        points += 10;
        if (countdownIntervals[taskId]) {
          clearInterval(countdownIntervals[taskId]);
          delete countdownIntervals[taskId];
        }
      }
    
      updateTask(task.id, task);
      renderTasks();
      updateBadges();
    });
    

    const span = document.createElement('span');
    span.innerHTML = `${task.text} (${task.priority}, ${task.deadline})` +
      (task.file ? ` - <a href="${task.file}" download="${task.filename}">Unduh Materi</a>` : '');

    const timerSpan = document.createElement('span');
    const taskId = `timer-${index}`;
    timerSpan.id = taskId;
    timerSpan.classList.add('task-timer');
    timerSpan.innerHTML = "00:00:00";
    span.appendChild(timerSpan);

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'delete-btn';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    taskList.appendChild(li);

    if (task.deadline) startCountdown(task.deadline, taskId);
    if (!task.done) unfinishedTasks.push(task);
  });

  if (unfinishedTasks.length > 0) {
    const focusHTML = unfinishedTasks.slice(0, 3).map(task => `
      <div class="focus-card">
        🔥 Fokus: <strong>${task.text}</strong> (Prioritas: ${task.priority})
      </div>
    `).join('');
    focusMode.innerHTML = focusHTML;
    
    const focus = unfinishedTasks.slice(0, 3).map(task => `<li>${task.text}</li>`).join('');
    focusMode.innerHTML = `<ul>${focus}</ul>`;
    const urgent = unfinishedTasks.find(t => t.priority === 'tinggi');
    recommendation.innerHTML = urgent
      ? `Kerjakan tugas prioritas tinggi terlebih dahulu: "${urgent.text}"`
      : 'Tidak ada tugas prioritas tinggi saat ini.';
  }

  tasks.forEach(task => {
    if (task.done && (!task.deadline || new Date(task.deadline) >= new Date())) {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fas fa-check-circle"></i> ${task.text}`;
      li.classList.add('completed-card');
      completedTaskList.appendChild(li);
    }
    
  });

  updateChart();
  renderCalendar();
}

function updateChart() {
  const ctx = document.getElementById('productivityChart').getContext('2d');
  const chartData = {
    labels: ['Tinggi', 'Sedang', 'Rendah'],
    datasets: [{
      label: 'Prioritas Tugas',
      data: [
        tasks.filter(t => t.priority === 'tinggi').length,
        tasks.filter(t => t.priority === 'sedang').length,
        tasks.filter(t => t.priority === 'rendah').length
      ],
      backgroundColor: ['#e53e3e', '#ed8936', '#48bb78']
    }]
  };

  if (productivityChart !== null) {
    productivityChart.destroy();
  }

  productivityChart = new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = '';

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    events: tasks
      .filter(task => task.deadline)
      .map(task => ({
        title: task.text,
        start: task.deadline,
        color: task.priority === 'tinggi' ? '#e53e3e' :
               task.priority === 'sedang' ? '#ed8936' : '#48bb78'
      }))
  });

  calendar.render();
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const text = document.getElementById('task').value;
  const priority = document.getElementById('priority').value;
  const deadline = document.getElementById('deadline').value;
  const file = fileInput.files[0];
  const user_id = localStorage.getItem('userId');

  if (file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      const fileData = e.target.result;
      await addTask({ text, priority, deadline, done: false, notified: false, file: fileData, filename: file.name, user_id });
      form.reset();
    };
    reader.readAsDataURL(file);
  } else {
    await addTask({ text, priority, deadline, done: false, notified: false, user_id });
    form.reset();
  }
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
});

filterSelect.addEventListener('change', renderTasks);

saveMoodBtn.addEventListener('click', () => {
  const selectedMood = document.getElementById('mood').value;
  alert(`Mood "${selectedMood}" tersimpan!`);
});

fetchTasks();
updateBadges();

function generateSmartRecommendation() {
  const now = new Date();
  const currentHour = now.getHours();
  const suggestions = [];

  const urgentTasks = tasks.filter(t => t.priority === 'tinggi' && !t.done);
  const mediumTasks = tasks.filter(t => t.priority === 'sedang' && !t.done);
  const lowTasks = tasks.filter(t => t.priority === 'rendah' && !t.done);

  if (urgentTasks.length > 0) {
    urgentTasks.forEach(t => {
      const timeLeft = new Date(t.deadline) - now;
      if (timeLeft < 60 * 60 * 1000) {
        suggestions.push(`⏰ Segera kerjakan "${t.text}" (deadline < 1 jam)`);
      }
    });
  }

  if (mediumTasks.length > 0 && (currentHour >= 9 && currentHour <= 11 || currentHour >= 19 && currentHour <= 21)) {
    suggestions.push(`📌 Waktu yang bagus untuk kerjakan tugas prioritas sedang`);
  }

  if (lowTasks.length > 0 && (currentHour >= 20 || currentHour <= 7)) {
    suggestions.push(`🧘‍♂️ Mungkin sekarang cocok kerjakan tugas ringan untuk santai`);
  }

  if (suggestions.length === 0) {
    suggestions.push("🎯 Tidak ada rekomendasi khusus saat ini. Fokuskan pada tugas yang belum selesai.");
  }

  recommendation.innerHTML = `<ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`;
}

// Tangani tombol logout di luar profil (jika ada elemen dengan ID 'logout')
const logoutElement = document.getElementById('logout');
if (logoutElement) {
  logoutElement.addEventListener('click', () => {
    localStorage.removeItem('userId');
    alert('Anda telah logout.');
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const profileUsername = document.getElementById('profile-username');
  const profilePic = document.getElementById('profile-pic');

  if (username && profileUsername && profilePic) {
    profileUsername.textContent = username;
    profilePic.src = `https://ui-avatars.com/api/?name=${username}`;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }
});


function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

navigator.serviceWorker.ready.then(registration => {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array('BERdF2RCyiuTyNPaVcknf2fU98BLRLM-M1EAZPZDayAKykMzcXfYFx14FIaCld_n63O-FCOJkThjfLG9xBEOfaI'),
 // Public key hasil generate
  });
}).then(subscription => {
  return fetch('/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' }
  });
}).catch(err => console.error('Gagal subscribe push', err));

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("active");
});

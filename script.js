const SITE_URL = "https://guardians.fami.life/UTK0101_";
const STORAGE_KEY = "guardians-ticket-helper:v1";

const checklistItems = [
  "已完成官方售票網會員註冊",
  "已確認可正常登入，密碼與手機驗證工具在身邊",
  "已確認購票方式、退票辦法與付款工具",
  "已先想好替代區域與可接受預算",
  "開賣前關閉不必要程式，保持網路穩定",
];

const state = {
  saleAt: "",
  eventName: "",
  ticketCount: "2",
  budget: "",
  seatPreference: "",
  checks: {},
};

const form = document.querySelector("#ticketForm");
const countdown = document.querySelector("#countdown");
const countdownHint = document.querySelector("#countdownHint");
const checklist = document.querySelector("#checklist");
const progressText = document.querySelector("#progressText");
const toast = document.querySelector("#toast");
const notifyButton = document.querySelector("#notifyButton");

let notificationTimer = null;
let saleTimer = null;
let lastSaleAlertAt = "";

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    Object.assign(state, JSON.parse(saved));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  const data = new FormData(form);
  state.saleAt = data.get("saleAt") || "";
  state.eventName = data.get("eventName") || "";
  state.ticketCount = data.get("ticketCount") || "1";
  state.budget = data.get("budget") || "";
  state.seatPreference = data.get("seatPreference") || "";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleNotifications();
}

function hydrateForm() {
  for (const [key, value] of Object.entries(state)) {
    const field = form.elements[key];
    if (field && typeof value === "string") field.value = value;
  }
}

function renderChecklist() {
  checklist.innerHTML = "";

  checklistItems.forEach((item, index) => {
    const id = `check-${index}`;
    const label = document.createElement("label");
    label.className = "check-item";
    label.htmlFor = id;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.checked = Boolean(state.checks[id]);
    input.addEventListener("change", () => {
      state.checks[id] = input.checked;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateProgress();
    });

    const span = document.createElement("span");
    span.textContent = item;

    label.append(input, span);
    checklist.append(label);
  });

  updateProgress();
}

function updateProgress() {
  const done = Object.values(state.checks).filter(Boolean).length;
  progressText.textContent = `${done}/${checklistItems.length}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}天 ${hours}時 ${minutes}分`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateCountdown() {
  if (!state.saleAt) {
    countdown.textContent = "尚未設定";
    countdownHint.textContent = "設定開賣時間後，這裡會顯示倒數並在時間到時提醒你手動進站。";
    return;
  }

  const saleDate = new Date(state.saleAt);
  const diff = saleDate.getTime() - Date.now();

  if (Number.isNaN(saleDate.getTime())) {
    countdown.textContent = "時間格式錯誤";
    countdownHint.textContent = "請重新選擇開賣時間。";
    return;
  }

  if (diff <= 0) {
    countdown.textContent = "開賣中";
    countdownHint.textContent = "現在可以手動進入官方售票網，依官方流程完成購票。";
    alertAtSaleTime();
    return;
  }

  countdown.textContent = formatDuration(diff);
  countdownHint.textContent = `目標：${state.eventName || "尚未填寫場次"}。建議開賣前 3 到 5 分鐘完成登入與頁面確認。`;
}

function alertAtSaleTime() {
  if (lastSaleAlertAt === state.saleAt) return;
  lastSaleAlertAt = state.saleAt;
  showToast("開賣時間到了，請手動進入官方售票網。");
  sendNotification("富邦悍將購票提醒", "開賣時間到了，請手動進入官方售票網。");
}

function scheduleNotifications() {
  window.clearTimeout(notificationTimer);
  window.clearTimeout(saleTimer);

  if (!state.saleAt || Notification.permission !== "granted") return;

  const saleTime = new Date(state.saleAt).getTime();
  if (Number.isNaN(saleTime)) return;

  const tenMinutesBefore = saleTime - 10 * 60 * 1000 - Date.now();
  const atSale = saleTime - Date.now();

  if (tenMinutesBefore > 0) {
    notificationTimer = window.setTimeout(() => {
      sendNotification("購票準備提醒", "距離開賣剩 10 分鐘，請確認登入、付款工具與座位偏好。");
    }, tenMinutesBefore);
  }

  if (atSale > 0) {
    saleTimer = window.setTimeout(() => {
      sendNotification("富邦悍將購票提醒", "開賣時間到了，請手動進入官方售票網。");
      showToast("開賣時間到了，請手動進入官方售票網。");
    }, atSale);
  }
}

function sendNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function buildSummary() {
  const lines = [
    "富邦悍將購票摘要",
    `開賣時間：${state.saleAt || "未設定"}`,
    `目標場次：${state.eventName || "未設定"}`,
    `張數：${state.ticketCount || "未設定"}`,
    `預算上限：${state.budget ? `每張 ${state.budget}` : "未設定"}`,
    `座位偏好：${state.seatPreference || "未設定"}`,
    `官方售票網：${SITE_URL}`,
  ];
  return lines.join("\n");
}

form.addEventListener("input", () => {
  saveState();
  updateCountdown();
});

document.querySelector("#openSiteButton").addEventListener("click", () => {
  window.open(SITE_URL, "_blank", "noopener,noreferrer");
});

document.querySelector("#copyPlanButton").addEventListener("click", async () => {
  saveState();
  try {
    await navigator.clipboard.writeText(buildSummary());
    showToast("已複製購票摘要。");
  } catch {
    showToast("瀏覽器不允許複製，請手動選取摘要。");
  }
});

document.querySelector("#resetButton").addEventListener("click", () => {
  if (!confirm("要清除這台瀏覽器中的購票設定嗎？")) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, {
    saleAt: "",
    eventName: "",
    ticketCount: "2",
    budget: "",
    seatPreference: "",
    checks: {},
  });
  hydrateForm();
  renderChecklist();
  updateCountdown();
  showToast("已重設。");
});

notifyButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("這個瀏覽器不支援桌面通知。");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    scheduleNotifications();
    showToast("提醒已啟用。");
  } else {
    showToast("提醒未啟用，仍可使用倒數功能。");
  }
});

loadState();
hydrateForm();
renderChecklist();
updateCountdown();
scheduleNotifications();
window.setInterval(updateCountdown, 1000);

const SITE_URL = "https://tixcraft.com/activity/detail/26_aespa";
const GAME_URL = "https://tixcraft.com/activity/game/26_aespa";
const STORAGE_KEY = "tixcraft-aespa-helper:v1";

const checklistItems = [
  "已完成 tixCraft 會員註冊與手機號碼驗證",
  "已確認 Google / Facebook 登入方式可正常使用",
  "若使用 Weverse 或 Samsung 預售，已準備好會員碼或資格確認",
  "已確認張數限制、付款方式與信用卡狀態",
  "已接受遇到驗證碼、排隊、粉絲資格題時改由手動操作",
];

const state = {
  activityUrl: SITE_URL,
  saleAt: "2026-05-17T11:00",
  eventName: "aespa LIVE TOUR - SYNK：COMPLæXITY - in TAIPEI",
  ticketCount: "2",
  budget: "",
  seatPreference: "",
  presaleCode: "",
  autoSubmit: false,
  checks: {},
};

const form = document.querySelector("#ticketForm");
const countdown = document.querySelector("#countdown");
const countdownHint = document.querySelector("#countdownHint");
const checklist = document.querySelector("#checklist");
const progressText = document.querySelector("#progressText");
const toast = document.querySelector("#toast");
const notifyButton = document.querySelector("#notifyButton");
const scriptPreview = document.querySelector("#scriptPreview");
const bookmarkletLink = document.querySelector("#bookmarkletLink");
const primarySiteLink = document.querySelector("#primarySiteLink");

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
  state.activityUrl = data.get("activityUrl") || SITE_URL;
  state.saleAt = data.get("saleAt") || "";
  state.eventName = data.get("eventName") || "";
  state.ticketCount = data.get("ticketCount") || "1";
  state.budget = data.get("budget") || "";
  state.seatPreference = data.get("seatPreference") || "";
  state.presaleCode = data.get("presaleCode") || "";
  state.autoSubmit = data.get("autoSubmit") === "on";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleNotifications();
  renderAssistantScript();
}

function hydrateForm() {
  for (const [key, value] of Object.entries(state)) {
    const field = form.elements[key];
    if (!field) continue;
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else if (typeof value === "string") {
      field.value = value;
    }
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
    countdownHint.textContent = "設定開賣時間後，這裡會顯示倒數並在時間到時提醒你。";
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
    countdownHint.textContent = "可開啟 Tixcraft 頁面並執行輔助腳本；遇到驗證或資格確認時請手動處理。";
    alertAtSaleTime();
    return;
  }

  countdown.textContent = formatDuration(diff);
  countdownHint.textContent = `目標：${state.eventName || "尚未填寫場次"}。建議提前完成登入與手機驗證。`;
}

function alertAtSaleTime() {
  if (lastSaleAlertAt === state.saleAt) return;
  lastSaleAlertAt = state.saleAt;
  showToast("開賣時間到了，可以前往 Tixcraft。");
  sendNotification("Tixcraft 購票提醒", "開賣時間到了，可以前往 Tixcraft。");
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
      sendNotification("購票準備提醒", "距離開賣剩 10 分鐘，請確認登入、付款工具、預售碼與座位偏好。");
    }, tenMinutesBefore);
  }

  if (atSale > 0) {
    saleTimer = window.setTimeout(() => {
      sendNotification("Tixcraft 購票提醒", "開賣時間到了，可以前往 Tixcraft。");
      showToast("開賣時間到了，可以前往 Tixcraft。");
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
  const urls = getActivityUrls();
  const lines = [
    "Tixcraft aespa 購票摘要",
    `開賣時間：${state.saleAt || "未設定"}`,
    `目標場次：${state.eventName || "未設定"}`,
    `張數：${state.ticketCount || "未設定"}`,
    `預算上限：${state.budget ? `每張 ${state.budget}` : "未設定"}`,
    `座位偏好：${state.seatPreference || "未設定"}`,
    `活動頁：${urls.targetUrl}`,
  ];
  return lines.join("\n");
}

function getActivityUrls() {
  const rawUrl = (state.activityUrl || SITE_URL).trim();
  let targetUrl = rawUrl || SITE_URL;

  try {
    const url = new URL(targetUrl);
    if (!url.hostname.endsWith("tixcraft.com")) throw new Error("not tixcraft");
    targetUrl = url.href;
  } catch {
    targetUrl = SITE_URL;
  }

  const gameUrl = targetUrl.includes("/activity/detail/")
    ? targetUrl.replace("/activity/detail/", "/activity/game/")
    : targetUrl.includes("/activity/game/")
      ? targetUrl
      : GAME_URL;

  return { targetUrl, gameUrl };
}

function getAssistantConfig() {
  const urls = getActivityUrls();
  return {
    targetUrl: urls.targetUrl,
    gameUrl: urls.gameUrl,
    ticketCount: Number.parseInt(state.ticketCount, 10) || 1,
    budget: Number.parseInt(state.budget, 10) || 0,
    seatPreference: state.seatPreference.trim(),
    presaleCode: state.presaleCode.trim(),
    autoSubmit: Boolean(state.autoSubmit),
  };
}

function getAssistantSource() {
  const config = getAssistantConfig();
  return `(() => {
  const config = ${JSON.stringify(config)};
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clicked = new WeakSet();
  let busy = false;
  let stoppedBeforeSubmit = false;
  let lastNotice = "";
  const textOf = (node) => (node && node.innerText ? node.innerText : "").replace(/\\s+/g, " ").trim();
  const visible = (node) => {
    if (!node) return false;
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
  };
  const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
  const log = (message) => {
    console.log("[Tixcraft helper]", message);
    const list = document.querySelector("#tixcraft-helper-log");
    if (list) {
      const item = document.createElement("li");
      item.textContent = message;
      list.prepend(item);
    }
  };
  const notice = (message) => {
    if (lastNotice === message) return;
    lastNotice = message;
    log(message);
  };
  const makePanel = () => {
    if (document.querySelector("#tixcraft-helper-panel")) return;
    const panel = document.createElement("section");
    panel.id = "tixcraft-helper-panel";
    panel.style.cssText = "position:fixed;z-index:2147483647;right:14px;bottom:14px;width:min(360px,calc(100vw - 28px));max-height:45vh;overflow:auto;border:1px solid #d7dde4;background:#fff;color:#17202a;border-radius:8px;box-shadow:0 18px 60px rgba(0,0,0,.2);font:14px/1.45 system-ui,sans-serif;padding:12px";
    panel.innerHTML = '<strong>Tixcraft 輔助中</strong><p style="margin:6px 0;color:#5f6b76">驗證碼、排隊、粉絲資格或付款請手動完成。</p><ol id="tixcraft-helper-log" style="margin:8px 0 0 20px;padding:0"></ol>';
    document.body.append(panel);
  };
  const clickText = (pattern) => {
    const candidates = [...document.querySelectorAll("a,button,input[type='button'],input[type='submit']")].filter((node) => visible(node) && !clicked.has(node));
    const hit = candidates.find((node) => pattern.test(textOf(node) || node.value || node.getAttribute("title") || ""));
    if (hit) {
      clicked.add(hit);
      hit.click();
    }
    return hit;
  };
  const manualGateText = () => {
    const selectors = [
      ".modal",
      ".alert",
      ".captcha",
      ".verify",
      ".verification",
      "form",
      "label",
      "input",
      "textarea",
      "select",
    ];
    return [...document.querySelectorAll(selectors.join(","))]
      .filter(visible)
      .map((node) => [textOf(node), node.placeholder, node.name, node.id, node.getAttribute("aria-label")].filter(Boolean).join(" "))
      .join(" ");
  };
  const hasManualGate = () => /驗證碼|captcha|recaptcha|排隊|queue|粉絲|fan|會員碼|資格|verification|verify/i.test(manualGateText());
  const fillPresaleCode = () => {
    if (!config.presaleCode) return false;
    const inputs = [...document.querySelectorAll("input")].filter(visible);
    const codeInput = inputs.find((input) => /code|member|fan|password|promo|pass|序號|會員|粉絲|驗證/i.test([input.name, input.id, input.placeholder, input.getAttribute("aria-label")].join(" ")));
    if (!codeInput) return false;
    codeInput.focus();
    codeInput.value = config.presaleCode;
    codeInput.dispatchEvent(new Event("input", { bubbles: true }));
    codeInput.dispatchEvent(new Event("change", { bubbles: true }));
    log("已填入預售碼，若頁面要求資格確認請手動確認。");
    return true;
  };
  const setQuantity = () => {
    const selects = [...document.querySelectorAll("select")].filter(visible);
    const quantitySelect = selects.find((select) => [...select.options].some((option) => Number(option.value) === config.ticketCount));
    if (!quantitySelect) return false;
    quantitySelect.value = String(config.ticketCount);
    quantitySelect.dispatchEvent(new Event("change", { bubbles: true }));
    log("已選擇張數：" + config.ticketCount);
    return true;
  };
  const acceptTerms = () => {
    [...document.querySelectorAll("input[type='checkbox']")].filter(visible).forEach((box) => {
      if (!box.checked) box.click();
    });
  };
  const areaScore = (text) => {
    let score = 0;
    const preference = config.seatPreference.toLowerCase();
    if (preference) {
      preference.split(/[ ,，、\\n]+/).filter(Boolean).forEach((word) => {
        if (text.toLowerCase().includes(word)) score += 3;
      });
    }
    const prices = [...text.matchAll(/(?:NT\\$?|\\$)?\\s*([0-9][0-9,]{2,})/g)].map((match) => Number(match[1].replace(/,/g, "")));
    if (config.budget && prices.some((price) => price > config.budget)) score -= 8;
    if (/售完|sold\\s*out|disabled|暫無|已售/i.test(text)) score -= 100;
    if (/熱賣|剩餘|available|可購|立即/i.test(text)) score += 2;
    return score;
  };
  const chooseGame = async () => {
    const buttons = [...document.querySelectorAll("a,button")].filter((node) => visible(node) && !clicked.has(node) && /立即|購票|Buy|Order|選購/i.test(textOf(node)));
    if (!buttons.length) return false;
    const button = pickRandom(buttons);
    clicked.add(button);
    button.click();
    log("已點選可購買場次。");
    await wait(80);
    return true;
  };
  const chooseArea = async () => {
    const nodes = [...document.querySelectorAll("a,button,li,td")].filter((node) => visible(node) && !clicked.has(node));
    const areas = nodes
      .map((node) => ({ node, text: textOf(node), score: areaScore(textOf(node)) }))
      .filter((item) => item.text && item.score > -50 && /[0-9]|NT|VIP|區|area|seat|available|剩餘|熱賣/i.test(item.text));
    if (!areas.length) return false;
    const bestScore = Math.max(...areas.map((item) => item.score));
    const pool = areas.filter((item) => item.score === bestScore);
    const choice = pickRandom(pool);
    clicked.add(choice.node);
    choice.node.click();
    log("已隨機挑選區域：" + choice.text.slice(0, 80));
    await wait(80);
    return true;
  };
  const submitIfAllowed = () => {
    if (!config.autoSubmit) {
      if (!stoppedBeforeSubmit) log("已停在送出前，請確認資料後手動加入購物車。");
      stoppedBeforeSubmit = true;
      return false;
    }
    if (hasManualGate()) {
      log("偵測到驗證、排隊或資格文字，暫停自動送出，請手動確認。");
      return false;
    }
    const button = clickText(/加入|下一步|確認|送出|Submit|Next/i);
    if (button) log("已嘗試送出加入購物車。");
    return Boolean(button);
  };
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
    makePanel();
    if (!location.hostname.includes("tixcraft.com")) {
      log("前往 Tixcraft 活動頁。");
      location.href = config.targetUrl;
      return;
    }
    if (clickText(/Sign In|登入|會員登入/i)) {
      log("已開啟登入。請完成登入後，再按一次書籤腳本。");
      return;
    }
    if (/\\/activity\\/detail\\//.test(location.pathname)) {
      log("前往購票場次列表。");
      location.href = config.gameUrl;
      return;
    }
    fillPresaleCode();
    if (hasManualGate() && !config.presaleCode) {
      notice("偵測到粉絲資格、會員碼、驗證或排隊相關文字，請先手動處理。");
      return;
    }
    if (/\\/activity\\/game\\//.test(location.pathname)) {
      if (await chooseGame()) return;
      notice("找不到可購買場次，請確認是否已開賣或是否需要手動刷新。");
      return;
    }
    if (/\\/ticket\\/area\\//.test(location.pathname)) {
      if (await chooseArea()) return;
      notice("找不到可選座位區，請手動確認是否售完或頁面尚未載入。");
      return;
    }
    if (/\\/ticket\\/ticket\\//.test(location.pathname)) {
      fillPresaleCode();
      setQuantity();
      acceptTerms();
      submitIfAllowed();
      return;
    }
    notice("目前頁面不屬於場次、座位區或張數頁，暫停自動點擊。");
    } finally {
      window.setTimeout(() => {
        busy = false;
      }, 40);
    }
  };
  const scheduleRun = () => {
    if (scheduleRun.timer) return;
    scheduleRun.timer = window.setTimeout(() => {
      scheduleRun.timer = 0;
      run();
    }, 35);
  };
  run();
  new MutationObserver(scheduleRun).observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(run, 250);
})();`;
}

function getUserScriptSource() {
  return `// ==UserScript==
// @name         Tixcraft aespa fast assistant
// @namespace    local.tixcraft.aespa
// @version      1.0.0
// @description  Faster Tixcraft page-to-page helper for 26_aespa. Manual gates remain manual.
// @match        https://tixcraft.com/*
// @match        https://*.tixcraft.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

${getAssistantSource()}`;
}

function renderAssistantScript() {
  const source = getAssistantSource();
  const bookmarklet = `javascript:${encodeURIComponent(source)}`;
  scriptPreview.value = getUserScriptSource();
  bookmarkletLink.href = bookmarklet;
  primarySiteLink.href = getActivityUrls().targetUrl;
}

form.addEventListener("input", () => {
  saveState();
  updateCountdown();
});

document.querySelector("#openSiteButton").addEventListener("click", () => {
  saveState();
  window.open(getActivityUrls().targetUrl, "_blank", "noopener,noreferrer");
});

document.querySelector("#openGameButton").addEventListener("click", () => {
  saveState();
  window.open(getActivityUrls().gameUrl, "_blank", "noopener,noreferrer");
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

document.querySelector("#copyScriptButton").addEventListener("click", async () => {
  saveState();
  try {
    await navigator.clipboard.writeText(getAssistantSource());
    showToast("已複製書籤腳本，可貼到 Tixcraft 頁面的 Console 執行。");
  } catch {
    showToast("瀏覽器不允許複製，請手動選取腳本。");
  }
});

document.querySelector("#copyUserScriptButton").addEventListener("click", async () => {
  saveState();
  try {
    await navigator.clipboard.writeText(getUserScriptSource());
    showToast("已複製 Userscript，貼到 Tampermonkey 或 Violentmonkey 新腳本即可。");
  } catch {
    showToast("瀏覽器不允許複製，請手動選取腳本。");
  }
});

document.querySelector("#resetButton").addEventListener("click", () => {
  if (!confirm("要清除這台瀏覽器中的購票設定嗎？")) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, {
    activityUrl: SITE_URL,
    saleAt: "2026-05-17T11:00",
    eventName: "aespa LIVE TOUR - SYNK：COMPLæXITY - in TAIPEI",
    ticketCount: "2",
    budget: "",
    seatPreference: "",
    presaleCode: "",
    autoSubmit: false,
    checks: {},
  });
  hydrateForm();
  renderChecklist();
  updateCountdown();
  renderAssistantScript();
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
renderAssistantScript();
scheduleNotifications();
window.setInterval(updateCountdown, 1000);

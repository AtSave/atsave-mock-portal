// 檢查登入
if (localStorage.getItem("atsave_logged_in") !== "1") {
  window.location.href = "index.html";
}

const RUN_MIN_A = 2;   // >2A 視為運行
const FAULT_MIN_A = 50; // >50A 視為故障

let allDevices = [];
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  loadDevices();
  setupBoardButton();
});

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-button");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderDeviceGrid();
    });
  });
}

async function loadDevices() {
  try {
    const res = await fetch("data/devices.json");
    allDevices = await res.json();

    // 根據 current_a 算狀態（如果之後由 MQTT 算，就可以拿掉這段）
    allDevices = allDevices.map((d) => ({
      ...d,
      computedStatus: calcStatus(d.current_a),
    }));

    renderDeviceGrid();
  } catch (err) {
    console.error("loadDevices error", err);
  }
}

function calcStatus(currentA) {
  if (currentA >= FAULT_MIN_A) return "fault";
  if (currentA >= RUN_MIN_A) return "running";
  if (currentA > 0) return "standby";
  return "standby";
}

function renderDeviceGrid() {
  const grid = document.getElementById("deviceGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const list = allDevices.filter((d) => {
    if (currentFilter === "all") return true;
    return d.category === currentFilter;
  });

  list.forEach((d) => {
    const card = document.createElement("div");
    card.className = "device-card2";

    const status = d.computedStatus || d.status || "standby";
    const statusText =
      status === "running"
        ? "運行中"
        : status === "fault"
        ? "故障"
        : "待機";

    const statusClass =
      status === "running"
        ? "status-running"
        : status === "fault"
        ? "status-fault"
        : "status-standby";

    const statusDuration = formatDuration(d.status_seconds || 0);

    card.innerHTML = `
      <img src="${d.photo || "img/device-placeholder.jpg"}" alt="${
      d.machine_name
    }" />
      <div class="device-card-body">
        <div class="device-title-row">
          <div>
            <div class="device-title">${d.machine_name}</div>
            <div class="device-serial">${d.serial_no || ""}</div>
          </div>
          <div class="device-kind-tag">${d.device_kind || ""}</div>
        </div>

        <div class="device-metrics-row">
          <div class="metric">
            <span class="metric-label">電流</span>
            <span class="metric-value">${(d.current_a ?? 0).toFixed(2)} A</span>
          </div>
          <div class="metric">
            <span class="metric-label">能耗</span>
            <span class="metric-value">${(d.power_w ?? 0).toFixed(2)} W</span>
          </div>
          <div class="metric">
            <span class="metric-label">產品能效</span>
            <span class="metric-value">${(d.product_eff ?? 0).toFixed(
              4
            )}</span>
          </div>
        </div>

        <div class="device-status-row">
          <div class="status-bar-background">
            <div class="status-indicator ${statusClass}">
              <span>${statusText}　${statusDuration}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

/**
 * 把秒數轉成「HH 小時 MM 分 SS 秒」
 */
function formatDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  if (h > 0) return `${pad(h)} 小時 ${pad(m)} 分 ${pad(s)} 秒`;
  if (m > 0) return `${pad(m)} 分 ${pad(s)} 秒`;
  return `${pad(s)} 秒`;
}

/* 看板模式：暫時用「全螢幕 grid」 */
function setupBoardButton() {
  const btn = document.getElementById("boardBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    document.body.classList.toggle("board-mode");
  });
}
// device.js

if (localStorage.getItem("atsave_logged_in") !== "1") {
  window.location.href = "index.html";
}

const RUN_MIN_A = 2;
const FAULT_MIN_A = 50;

// TODO: 依實際 broker 設定調整
const MQTT_WS_URL = "wss://save-mqtt.artifactdev.tw:8083/mqtt"; // 範例
const MQTT_USERNAME = "james"; // 你原本的帳號
const MQTT_PASSWORD = "TSN7d74ksHgswEHB";

// 目前設備資訊
let currentDevice = null;
let historyData = []; // { ts, currentA, powerW, hourEnergy }

let chart = null;

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    alert("缺少設備 id 參數");
    window.location.href = "dashboard.html";
    return;
  }

  initDeviceInfo(id);
});

// 讀 devices.json，找出這台設備
async function initDeviceInfo(deviceId) {
  try {
    const res = await fetch("data/devices.json");
    const devices = await res.json();
    const dev = devices.find((d) => d.id === deviceId);
    if (!dev) {
      alert("找不到設備：" + deviceId);
      window.location.href = "dashboard.html";
      return;
    }

    currentDevice = dev;
    fillBasicInfo(dev);
    setupHistoryChart();
    setupHistoryRangeButtons();
    connectMqtt(dev);
    loadHistoryFromFile(dev); // 讀舊資料
  } catch (err) {
    console.error("initDeviceInfo error", err);
  }
}

function fillBasicInfo(dev) {
  document.getElementById("deviceTitle").textContent = dev.machine_name;
  document.getElementById("deviceName").textContent = dev.machine_name;
  document.getElementById("deviceSerial").textContent = dev.serial_no || "--";
  document.getElementById("deviceKind").textContent = dev.device_kind || "--";

  const img = document.getElementById("devicePhoto");
  img.src = dev.photo || "img/device-placeholder.jpg";
}

// ===== MQTT 連線與即時更新 =====

function connectMqtt(dev) {
  // 這裡假設 topic 與裝置序號有關，你可以改成實際的 topic 規則
  const topic = `/atsave/${dev.serial_no || dev.id}`;

  const options = {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 3000,
  };

  const client = mqtt.connect(MQTT_WS_URL, options);

  client.on("connect", () => {
    console.log("MQTT connected");
    setMqttStatus(true);
    client.subscribe(topic, (err) => {
      if (err) console.error("subscribe error", err);
    });
  });

  client.on("reconnect", () => {
    setMqttStatus(false, "重連中...");
  });

  client.on("offline", () => {
    setMqttStatus(false, "離線");
  });

  client.on("error", (err) => {
    console.error("MQTT error", err);
    setMqttStatus(false, "錯誤");
  });

  client.on("message", (topic, message) => {
    try {
      const payloadStr = message.toString();
      const data = JSON.parse(payloadStr);
      handleRealtimePayload(data);
    } catch (e) {
      console.error("payload parse error", e);
    }
  });
}

function setMqttStatus(online, text) {
  const dot = document.getElementById("mqttDot");
  const label = document.getElementById("mqttStatusText");
  if (!dot || !label) return;

  if (online) {
    dot.classList.add("online");
    label.textContent = text || "已連線";
  } else {
    dot.classList.remove("online");
    label.textContent = text || "未連線";
  }
}

// 處理你給的 PLAYLOAD
function handleRealtimePayload(p) {
  // 這裡先用「簡單推估」，實際倍率你可以再調整：
  // 電壓：取 UA/UB/UC 平均
  const ua = p.UA || 0;
  const ub = p.UB || 0;
  const uc = p.UC || 0;
  const voltage = (ua + ub + uc) / 3 / 10; // 假設數值 /10 變成 V

  // 電流：取 IA/IB/IC 平均
  const ia = p.IA || 0;
  const ib = p.IB || 0;
  const ic = p.IC || 0;
  const currentA = (ia + ib + ic) / 3 / 100; // 假設 /100 變 A

  // 有功功率：PT
  const powerW = (p.PT || 0) / 10; // 假設 /10

  // 當小時累積電能：用 EPT（總電能）先當成 Wh
  const hourEnergy = (p.EPT || 0); // 之後可改成「本小時差值」

  // 狀態：用電流判斷
  const status = calcStatus(currentA);
  const statusText =
    status === "running" ? "運行中" : status === "fault" ? "故障" : "待機";

  // 更新畫面
  document.getElementById("rtVoltage").textContent = voltage.toFixed(1);
  document.getElementById("rtCurrent").textContent = currentA.toFixed(2);
  document.getElementById("rtPower").textContent = powerW.toFixed(1);
  document.getElementById("rtHourEnergy").textContent = hourEnergy.toFixed(0);

  document.getElementById("rtStatusText").textContent = statusText;
  // 狀態持續時間這裡先用「未知」，之後可以由 PLC / 後端計算
  document.getElementById("rtStatusDuration").textContent = "";

  const now = new Date();
  document.getElementById("lastUpdate").textContent = now.toLocaleString();

  // 推到歷史資料（for 畫圖用）
  historyData.push({
    ts: now.toISOString(),
    currentA,
    powerW,
    hourEnergy,
  });
  trimHistory();
  refreshChart();
}

function calcStatus(currentA) {
  if (currentA >= FAULT_MIN_A) return "fault";
  if (currentA >= RUN_MIN_A) return "running";
  if (currentA > 0) return "standby";
  return "standby";
}

// ===== 歷史資料與 Chart.js =====

// 建立空圖
function setupHistoryChart() {
  const ctx = document.getElementById("historyChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "能耗 (W)",
          data: [],
          yAxisID: "y1",
        },
        {
          label: "電流 (A)",
          data: [],
          yAxisID: "y2",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y1: {
          type: "linear",
          position: "left",
          title: { display: true, text: "能耗 (W)" },
        },
        y2: {
          type: "linear",
          position: "right",
          title: { display: true, text: "電流 (A)" },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: { position: "top" },
      },
    },
  });
}

// 從檔案載入歷史資料（智器匯出的資料可以轉成這種 JSON）
async function loadHistoryFromFile(dev) {
  try {
    // 建議一台一檔，例如 data/history_A_926.json
    const file = `data/history_${dev.id}.json`;
    const res = await fetch(file);
    if (!res.ok) return; // 找不到就略過（用 MQTT 即時資料）

    const list = await res.json(); // [{ts, currentA, powerW, hourEnergy}]
    historyData = list;
    trimHistory();
    refreshChart();
  } catch (e) {
    console.warn("history file not found or error", e);
  }
}

// 控制只保留最近一段時間資料
function trimHistory(maxPoints = 500) {
  if (historyData.length > maxPoints) {
    historyData = historyData.slice(historyData.length - maxPoints);
  }
}

// 更新圖表
function refreshChart() {
  if (!chart) return;
  const labels = historyData.map((d) =>
    new Date(d.ts).toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  chart.data.labels = labels;
  chart.data.datasets[0].data = historyData.map((d) => d.powerW);
  chart.data.datasets[1].data = historyData.map((d) => d.currentA);
  chart.update("none");
}

// 最近 24h / 7d 的按鈕（現在先只是切時間範圍，資料還是同一組）
function setupHistoryRangeButtons() {
  const buttons = document.querySelectorAll(
    ".device-history-section .tab-button"
  );
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      // 簡單處理：目前不做 server 分段查詢，只是未來預留
      refreshChart();
    });
  });
}


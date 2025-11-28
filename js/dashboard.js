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
function renderDeviceGrid() {
  const grid = document.getElementById("deviceGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const list = allDevices.filter((d) => {
    if (currentFilter === "all") return true;
    return d.category === currentFilter;
  });

  list.forEach((d) => {
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

    // ★ 這裡用 device_id 當作跳轉用的識別碼
    const deviceId = d.device_id || d.serial_no || "";

    // 外層 <a>，整張卡片都可以點
    const link = document.createElement("a");
    link.href = `device.html?id=${encodeURIComponent(deviceId)}`;
    link.className = "device-card-link";

    // 內層卡片本體
    const card = document.createElement("div");
    card.className = "device-card2";
    card.dataset.deviceId = deviceId; // 若之後要用 JS 操作可以用到

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

    // 把卡片塞進連結，再塞進 grid
    link.appendChild(card);
    grid.appendChild(link);
  });
}

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
function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds)); // 防呆
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(h)} 小時 ${pad(m)} 分 ${pad(s)} 秒`;
}
function setupBoardButton() {
  const btn = document.getElementById("boardBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const isBoard = document.body.classList.toggle("board-mode");

    // 切換按鈕文字
    btn.textContent = isBoard ? "退出看板" : "看板";

    // 額外嘗試進入 / 離開瀏覽器全螢幕
    if (isBoard) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  });
}




// 簡單檢查是否已登入
if (localStorage.getItem('atsave_logged_in') !== '1') {
  window.location.href = 'index.html';
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('atsave_logged_in');
  window.location.href = 'index.html';
});

async function loadDevices() {
  console.log('loadDevices start');  // Debug 用
  const res = await fetch('data/devices.json');
  const devices = await res.json();
  console.log('devices = ', devices); // Debug 用

  const container = document.getElementById('deviceCards');

  devices.forEach(d => {
    const card = document.createElement('div');
    card.className = 'device-card';

    const statusClass =
      d.status === 'running' ? 'status-running' :
      d.status === 'stop'    ? 'status-stop' :
      'status-standby';

    const ecoClass = d.eco_status === 'green' ? 'green' : 'red';

    card.innerHTML = `
      <div class="device-header">
        <h3>${d.name}</h3>
        <span class="device-status ${statusClass}">
          ${statusLabel(d.status)}
        </span>
      </div>
      <div class="device-metrics">
        <div>今日用電：<b>${d.today_energy_kwh.toFixed(1)} kWh</b></div>
        <div>今日產量：<b>${d.today_output}</b></div>
        <div>今日稼動率：<b>${(d.today_oee * 100).toFixed(1)}%</b></div>
      </div>
      <div class="eco-bar">
        <div class="eco-bar-inner ${ecoClass}"></div>
      </div>
      <button style="margin-top:10px" onclick="openDevice('${d.id}')">
        查看詳情
      </button>
    `;

    container.appendChild(card);
  });
}

function statusLabel(s) {
  if (s === 'running') return '運轉中';
  if (s === 'stop') return '停機';
  if (s === 'standby') return '待機';
  return '未知';
}

function openDevice(id) {
  window.location.href = `device.html?id=${id}`;
}

loadDevices();

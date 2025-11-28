// 檢查登入
if (localStorage.getItem('atsave_logged_in') !== '1') {
  window.location.href = 'index.html';
}

async function loadDeviceDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 'A_926';

  document.getElementById('deviceTitle').innerText = `${id} 機台詳情`;

  const res = await fetch(`data/logs_${id}.json`);
  const logs = await res.json();

  const labels = logs.map(row => row.ts_hour.slice(11, 16)); // 取 HH:MM
  const energy = logs.map(row => row.energy_kwh);
  const output = logs.map(row => row.production_count);

  // 建圖表
  const ctx = document.getElementById('energyChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '用電量 (kWh)',
          data: energy,
          yAxisID: 'y1'
        },
        {
          label: '產量',
          data: output,
          type: 'line',
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y1: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'kWh' }
        },
        y2: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: '產量' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });

  // 填表格
  const tbody = document.querySelector('#detailTable tbody');
  logs.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.ts_hour}</td>
      <td>${row.energy_kwh.toFixed(2)}</td>
      <td>${row.production_count}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadDeviceDetail();

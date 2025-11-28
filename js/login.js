document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();

  // Demo 帳號
  if (user === 'admin' && pass === '123456') {
    // 用 localStorage 記錄已登入
    localStorage.setItem('atsave_logged_in', '1');
    window.location.href = 'dashboard.html';
  } else {
    alert('帳號或密碼錯誤');
  }
});

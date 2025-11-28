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

// 顯示 / 隱藏密碼
const pwdInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');

if (toggleBtn && pwdInput) {
  toggleBtn.addEventListener('click', () => {
    const isHidden = pwdInput.type === 'password';
    pwdInput.type = isHidden ? 'text' : 'password';
    toggleBtn.classList.toggle('show', isHidden);
  });
}


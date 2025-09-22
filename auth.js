document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
  
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
  
        const res = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
  
        if (res.ok) {
          alert('Berhasil daftar!');
          window.location.href = 'login.html';
        } else {
          alert('Gagal daftar.');
        }
      });
    }
  
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
  
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
  
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('username', username);
          alert('Login berhasil!');
          window.location.href = 'index.html';
        } else {
          alert(data.message || 'Login gagal.');
        }
      });
    }
  });
  
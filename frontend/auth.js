const API_BASE = "https://linkshortner-6ils.onrender.com";


document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Tab Switching Logic
    const switchTab = (mode) => {
        if (mode === 'signup') {
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            signupTab.classList.add('bg-white', 'dark:bg-background-dark', 'text-slate-900', 'dark:text-white', 'shadow-sm', 'ring-1', 'ring-slate-900/5', 'dark:ring-white/10');
            signupTab.classList.remove('text-slate-500', 'dark:text-slate-400');
            loginTab.classList.remove('bg-white', 'dark:bg-background-dark', 'text-slate-900', 'dark:text-white', 'shadow-sm', 'ring-1', 'ring-slate-900/5', 'dark:ring-white/10');
            loginTab.classList.add('text-slate-500', 'dark:text-slate-400');
        } else {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            loginTab.classList.add('bg-white', 'dark:bg-background-dark', 'text-slate-900', 'dark:text-white', 'shadow-sm', 'ring-1', 'ring-slate-900/5', 'dark:ring-white/10');
            loginTab.classList.remove('text-slate-500', 'dark:text-slate-400');
            signupTab.classList.remove('bg-white', 'dark:bg-background-dark', 'text-slate-900', 'dark:text-white', 'shadow-sm', 'ring-1', 'ring-slate-900/5', 'dark:ring-white/10');
            signupTab.classList.add('text-slate-500', 'dark:text-slate-400');
        }
    };

    loginTab.addEventListener('click', () => switchTab('login'));
    signupTab.addEventListener('click', () => switchTab('signup'));

    // Helper: Show Notification (Stylized to match main script)
    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-[1000] animate-fade-in-up ${type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('opacity-0', 'translate-y-[-10px]');
            notification.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };

    // Check for mode or redirection
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup') {
        switchTab('signup');
    }

    if (urlParams.get('redirected') === 'true') {
        showNotification('Please log in to access your links and QR codes.', 'error');
    }

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new TypeError("Oops, we haven't got JSON from the server! (Maybe you are using Live Server instead of the Node backend?)");
            }

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                window.location.href = 'index.html';
            } else {
                showNotification(data.error || 'Login failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification(err.message === "TypeError" ? err.message : 'Server error: ' + err.message, 'error');
        }
    });

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new TypeError("Oops, we haven't got JSON from the server! (Maybe you are using Live Server instead of the Node backend?)");
            }

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                window.location.href = 'index.html';
            } else {
                showNotification(data.error || 'Signup failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Server error: ' + err.message, 'error');
        }
    });

    // Google Sign-in Placeholder
    const googleBtn = document.querySelector('button img[src*="google"]')?.parentElement;
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            showNotification('Google Sign-in is not yet implemented. Please use email/password.', 'info');
        });
    }
});

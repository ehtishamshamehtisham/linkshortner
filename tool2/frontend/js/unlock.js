const API_BASE = 'http://localhost:5000/api/content';
const passwordInput = document.getElementById('passwordInput');
const errorMsg = document.getElementById('errorMsg');
const unlockBtn = document.getElementById('unlockBtn');
const togglePassword = document.getElementById('togglePassword');

console.log('Accessing URL:', window.location.href);

const getShareId = () => {
    // 1. Try URL Hash (Most stable for local servers)
    if (window.location.hash) {
        const hashMatch = window.location.hash.match(/id=([a-fA-F0-9]{24})/);
        if (hashMatch) return hashMatch[1];
    }

    // 2. Try standard URLSearchParams
    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');

    // 3. Try searching the whole URL string (fallback)
    if (!id) {
        const fullUrl = window.location.href;
        const matches = [
            /[?&#]id=([a-fA-F0-9]{24})/,  // Standard MongoDB ID format
            /[?&#]id=([^&#]+)/            // Any ID format
        ];

        for (const regex of matches) {
            const match = fullUrl.match(regex);
            if (match) {
                id = match[1];
                break;
            }
        }
    }
    return id;
};

const shareId = getShareId();

if (!shareId) {
    console.error('Extraction failed. URL:', window.location.href);
    document.body.innerHTML += `
        <div id="debugOverlay" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
            <div class="bg-white dark:bg-[#1a1835] p-8 rounded-3xl max-w-lg w-full shadow-2xl space-y-6">
                <div class="text-red-500 flex flex-col items-center gap-2">
                    <span class="material-symbols-outlined text-5xl">warning</span>
                    <h2 class="text-xl font-bold">Extraction Error</h2>
                </div>
                <p class="text-sm dark:text-gray-400 text-center">
                    The Content ID is missing from the link. <br>
                    <strong>Detected URL:</strong> <code class="bg-primary/10 p-1 rounded text-[10px] break-all">${window.location.href}</code>
                </p>
                <div class="space-y-4">
                    <p class="text-xs font-bold uppercase tracking-wider text-center">Copy & Paste ID from your link:</p>
                    <input id="manualIdInput" class="w-full p-4 rounded-xl border-2 border-primary/20 bg-gray-50 dark:bg-black/20 text-center font-mono" placeholder="Paste ID (e.g. 697715...)" />
                    <button onclick="window.location.href = 'secureunlock.html#id=' + document.getElementById('manualIdInput').value" 
                        class="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20">
                        Unlock Manually
                    </button>
                    <button onclick="window.location.href = 'index.html'" class="w-full text-sm text-gray-500 hover:text-primary transition-colors">
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    `;
    // Stop execution
    throw new Error('Missing Content ID');
}

togglePassword.onclick = () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.querySelector('span').innerText = type === 'password' ? 'visibility' : 'visibility_off';
};

unlockBtn.onclick = async () => {
    const password = passwordInput.value;
    if (!password) return;

    unlockBtn.disabled = true;
    unlockBtn.innerText = 'Unlocking...';
    errorMsg.classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE}/access/${shareId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();

        if (res.ok) {
            sessionStorage.setItem('secure_content', JSON.stringify(data));

            sessionStorage.setItem('secure_content', JSON.stringify(data));
            window.location.href = 'secureview.html';
        } else {
            errorMsg.querySelector('p').innerText = data.message || 'Error unlocking content';
            errorMsg.classList.remove('hidden');
            errorMsg.classList.add('flex');
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error. Please check if the backend is running.', 'error');
    } finally {
        unlockBtn.disabled = false;
        unlockBtn.innerText = 'Unlock Content';
    }
};

const contentData = JSON.parse(sessionStorage.getItem('secure_content'));
const container = document.getElementById('contentContainer');
const timerBanner = document.getElementById('timerBanner');
const countdownEl = document.getElementById('countdown');

if (!contentData || !contentData.items) {
    showToast('No content found or session expired.', 'error');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// 1. Setup Timer (Per-Session Logic)
const startTimer = () => {
    // Each view session gets its own fresh countdown
    const durationMs = (contentData.sessionDurationMinutes || 1) * 60 * 1000;
    const sessionExpiresAt = Date.now() + durationMs;

    const update = () => {
        const now = Date.now();
        const distance = sessionExpiresAt - now;

        if (distance < 0) {
            clearInterval(timerInterval);
            sessionStorage.removeItem('secure_content');
            document.body.innerHTML = `
                <div class="h-screen w-full flex flex-col items-center justify-center bg-[#121022] text-white p-6 text-center">
                    <span class="material-symbols-outlined text-7xl text-red-500 mb-6 animate-bounce">timer_off</span>
                    <h1 class="text-4xl font-black mb-4">Content Destroyed</h1>
                    <p class="text-gray-400 max-w-md">Your secure session has timed out. For security reasons, all data has been wiped from this view.</p>
                    <button onclick="window.location.href='index.html'" class="mt-10 bg-primary px-10 py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-all">Return Home</button>
                </div>
            `;
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerBanner.classList.remove('hidden');
    };

    update();
    const timerInterval = setInterval(update, 1000);
};

if (contentData.expiresAt) {
    startTimer();
}

// 2. Render all items (WITHOUT downloads or copy buttons)
contentData.items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-[#1a1835] rounded-3xl border border-[#d1cfe7] dark:border-white/10 shadow-lg overflow-hidden flex flex-col';

    let contentHtml = '';

    switch (item.contentType) {
        case 'text':
            contentHtml = `
                <div class="p-4 bg-primary/5 border-b border-[#e8e7f3] dark:border-white/5 flex items-center justify-between">
                    <span class="text-xs font-bold text-primary uppercase tracking-widest">Protected Message</span>
                    <span class="material-symbols-outlined text-primary text-sm">lock_person</span>
                </div>
                <div class="p-8">
                    <pre class="whitespace-pre-wrap text-[#0f0d1b] dark:text-gray-200 font-display text-lg leading-relaxed select-none">${item.textData}</pre>
                </div>
            `;
            break;

        case 'link':
            contentHtml = `
                <div class="p-4 bg-primary/5 border-b border-[#e8e7f3] dark:border-white/5 flex items-center justify-between">
                    <span class="text-xs font-bold text-primary uppercase tracking-widest">Secure Link</span>
                    <span class="material-symbols-outlined text-primary text-sm">link</span>
                </div>
                <div class="p-8 flex flex-col gap-4">
                    <div class="w-full bg-[#f8f8fc] dark:bg-[#0f0d1b] border border-[#d1cfe7] dark:border-white/10 p-4 rounded-xl text-primary font-mono text-xs truncate select-none">
                        ${item.textData}
                    </div>
                    <a href="${item.textData}" target="_blank" class="w-full bg-primary text-white text-center py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                        Visit Secure Link
                    </a>
                </div>
            `;
            break;

        case 'image':
            contentHtml = `
                 <div class="p-4 bg-primary/5 border-b border-[#e8e7f3] dark:border-white/5 flex items-center justify-between">
                    <span class="text-xs font-bold text-primary uppercase tracking-widest">Protected Image</span>
                    <span class="material-symbols-outlined text-primary text-sm">visibility_lock</span>
                </div>
                <div class="p-2 bg-black flex items-center justify-center min-h-[200px]">
                    <img src="${item.fileUrl}" class="max-w-full h-auto rounded-lg pointer-events-none select-none" oncontextmenu="return false;" />
                </div>
            `;
            break;

        case 'video':
            contentHtml = `
                <div class="p-4 bg-primary/5 border-b border-[#e8e7f3] dark:border-white/5 flex items-center justify-between">
                    <span class="text-xs font-bold text-primary uppercase tracking-widest">Protected Video</span>
                    <span class="material-symbols-outlined text-primary text-sm">videocam_off</span>
                </div>
                <div class="p-4 bg-black">
                    <video controls controlsList="nodownload" class="w-full rounded-lg shadow-xl pointer-events-none select-none" oncontextmenu="return false;">
                        <source src="${item.fileUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
            break;
    }

    card.innerHTML = contentHtml;
    container.appendChild(card);
});

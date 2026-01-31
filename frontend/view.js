const contentData = JSON.parse(sessionStorage.getItem('secure_content'));
const container = document.getElementById('contentContainer');
const timerBanner = document.getElementById('timerBanner');
const countdownEl = document.getElementById('countdown');

if (!contentData || !contentData.items) {
    showToast('No content found or session expired.', 'error');
    setTimeout(() => {
        window.location.href = 'secure.html';
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
    <div class="relative flex min-h-screen w-full flex-col bg-[#121022] text-white overflow-x-hidden">
        <!-- Header -->
        <header class="flex items-center justify-between px-6 md:px-20 lg:px-40 py-4 bg-white/5 backdrop-blur-md border-b border-white/10">
            <div class="flex items-center gap-4 text-white cursor-pointer" onclick="window.location.href='index.html'">
                <div class="size-6 flex items-center justify-center">
                    <span class="material-symbols-outlined text-2xl md:text-3xl">shield_lock</span>
                </div>
                <h2 class="text-base md:text-lg font-bold leading-tight tracking-[-0.015em]">SecureShare</h2>
            </div>
            
            <!-- Header Ad (320x50) - Desktop only -->
            <div class="hidden md:block mx-4 flex-1">
                <div class="relative w-full max-w-[320px] mx-auto h-[50px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div id="header-ad-destroyed">
                        <!-- 320x50 Ad -->
                        <script type="text/javascript">
                            atOptions = {
                                'key' : 'dbac2741ab7ffdfd9a56cfe03db8c579',
                                'format' : 'iframe',
                                'height' : 50,
                                'width' : 320,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="https://www.highperformanceformat.com/dbac2741ab7ffdfd9a56cfe03db8c579/invoke.js"></script>
                    </div>
                </div>
            </div>
            
            <button onclick="window.location.href='secure.html'" 
                class="flex min-w-[90px] md:min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-9 md:h-10 px-3 md:px-4 bg-[#2513ec] text-white text-xs md:text-sm font-bold shadow-lg shadow-[#2513ec]/20 transition-all hover:scale-[1.02]">
                <span>Share Now</span>
            </button>
        </header>

        <!-- Main Content with Side Ads -->
        <div class="flex flex-1 justify-center gap-6 md:gap-8 px-4 md:px-6 py-8 md:py-12">
            <!-- Left Side Ads Column - Desktop only -->
            <div class="hidden xl:flex flex-col gap-4 w-[160px] flex-shrink-0">
                <!-- 160x600 Skyscraper -->
                <div class="relative w-full h-[600px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div id="left-skyscraper-destroyed">
                        <!-- 160x600 Ad -->
                        <script type="text/javascript">
                            atOptions = {
                                'key' : '7a9c4ae3ff8b42ccd7f1308efa96161c',
                                'format' : 'iframe',
                                'height' : 600,
                                'width' : 160,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="https://www.highperformanceformat.com/7a9c4ae3ff8b42ccd7f1308efa96161c/invoke.js"></script>
                    </div>
                </div>
                
                <!-- 300x250 Rectangle -->
                <div class="relative w-full max-w-[300px] h-[250px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div id="left-rectangle-destroyed">
                        <!-- 300x250 Ad -->
                        <script type="text/javascript">
                            atOptions = {
                                'key' : '9ad838278dc8e53ec577d59c72133ae2',
                                'format' : 'iframe',
                                'height' : 250,
                                'width' : 300,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="https://www.highperformanceformat.com/9ad838278dc8e53ec577d59c72133ae2/invoke.js"></script>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="flex flex-col items-center justify-center w-full max-w-[800px]">
                <!-- Top Banner (468x60) -->
                <div class="mb-6 w-full max-w-[468px]">
                    <div class="relative w-full h-[60px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div id="top-banner-destroyed">
                            <!-- 468x60 Ad -->
                            <script type="text/javascript">
                                atOptions = {
                                    'key' : 'a7010e8356f3a6c4fc483bcaec8750f8',
                                    'format' : 'iframe',
                                    'height' : 60,
                                    'width' : 468,
                                    'params' : {}
                                };
                            </script>
                            <script type="text/javascript" src="https://www.highperformanceformat.com/a7010e8356f3a6c4fc483bcaec8750f8/invoke.js"></script>
                        </div>
                    </div>
                </div>

                <!-- Mobile Square Ad (300x250) - Mobile only -->
                <div class="xl:hidden mb-6 w-full max-w-[300px]">
                    <div class="relative w-full h-[250px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div id="mobile-square-destroyed">
                            <!-- 300x250 Ad -->
                            <script type="text/javascript">
                                atOptions = {
                                    'key' : '9ad838278dc8e53ec577d59c72133ae2',
                                    'format' : 'iframe',
                                    'height' : 250,
                                    'width' : 300,
                                    'params' : {}
                                };
                            </script>
                            <script type="text/javascript" src="https://www.highperformanceformat.com/9ad838278dc8e53ec577d59c72133ae2/invoke.js"></script>
                        </div>
                    </div>
                </div>

                <div class="w-full bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-8 md:p-12 text-center">
                    <span class="material-symbols-outlined text-7xl text-red-500 mb-6 animate-bounce">timer_off</span>
                    <h1 class="text-3xl md:text-4xl font-black mb-4">Content Destroyed</h1>
                    <p class="text-gray-400 mb-8 max-w-md mx-auto">Your secure session has timed out. For security reasons, all data has been wiped from this view.</p>

                    <!-- In-content Mobile Ad (320x50) - Mobile only -->
                    <div class="xl:hidden my-6 w-full max-w-[320px] mx-auto">
                        <div class="relative w-full h-[50px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            <div id="incontent-mobile-destroyed">
                                <!-- 320x50 Ad -->
                                <script type="text/javascript">
                                    atOptions = {
                                        'key' : 'dbac2741ab7ffdfd9a56cfe03db8c579',
                                        'format' : 'iframe',
                                        'height' : 50,
                                        'width' : 320,
                                        'params' : {}
                                    };
                                </script>
                                <script type="text/javascript" src="https://www.highperformanceformat.com/dbac2741ab7ffdfd9a56cfe03db8c579/invoke.js"></script>
                            </div>
                        </div>
                    </div>

                    <!-- In-content Desktop Ad (728x90) - Desktop only -->
                    <div class="hidden md:block my-6 w-full max-w-[728px] mx-auto">
                        <div class="relative w-full h-[90px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            <div id="incontent-desktop-destroyed">
                                <!-- 728x90 Ad -->
                                <script type="text/javascript">
                                    atOptions = {
                                        'key' : 'a7010e8356f3a6c4fc483bcaec8750f8',
                                        'format' : 'iframe',
                                        'height' : 90,
                                        'width' : 728,
                                        'params' : {}
                                    };
                                </script>
                                <script type="text/javascript" src="https://www.highperformanceformat.com/a7010e8356f3a6c4fc483bcaec8750f8/invoke.js"></script>
                            </div>
                        </div>
                    </div>

                    <button onclick="window.location.href='secure.html'" 
                        class="mt-4 bg-[#2513ec] px-8 md:px-10 py-3 md:py-4 rounded-2xl font-bold shadow-xl shadow-[#2513ec]/30 hover:scale-105 transition-all">
                        Return to SecureShare
                    </button>
                </div>

                <!-- Bottom Banner (468x60) -->
                <div class="mt-6 w-full max-w-[468px]">
                    <div class="relative w-full h-[60px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div id="bottom-banner-destroyed">
                            <!-- 468x60 Ad -->
                            <script type="text/javascript">
                                atOptions = {
                                    'key' : 'a7010e8356f3a6c4fc483bcaec8750f8',
                                    'format' : 'iframe',
                                    'height' : 60,
                                    'width' : 468,
                                    'params' : {}
                                };
                            </script>
                            <script type="text/javascript" src="https://www.highperformanceformat.com/a7010e8356f3a6c4fc483bcaec8750f8/invoke.js"></script>
                        </div>
                    </div>
                </div>

                <!-- Additional mobile ad (300x250) - Mobile only -->
                <div class="xl:hidden mt-6 w-full max-w-[300px]">
                    <div class="relative w-full h-[250px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div id="mobile-bottom-destroyed">
                            <!-- 300x250 Ad -->
                            <script type="text/javascript">
                                atOptions = {
                                    'key' : '9ad838278dc8e53ec577d59c72133ae2',
                                    'format' : 'iframe',
                                    'height' : 250,
                                    'width' : 300,
                                    'params' : {}
                                };
                            </script>
                            <script type="text/javascript" src="https://www.highperformanceformat.com/9ad838278dc8e53ec577d59c72133ae2/invoke.js"></script>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side Ads Column - Desktop only -->
            <div class="hidden xl:flex flex-col gap-4 w-[160px] flex-shrink-0">
                <!-- 160x300 Sidebar -->
                <div class="relative w-full h-[300px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div id="right-sidebar-destroyed">
                        <!-- 160x300 Ad -->
                        <script type="text/javascript">
                            atOptions = {
                                'key' : '65e4ed2bd95a6a2b1a9211a79c81e2c3',
                                'format' : 'iframe',
                                'height' : 300,
                                'width' : 160,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="https://www.highperformanceformat.com/65e4ed2bd95a6a2b1a9211a79c81e2c3/invoke.js"></script>
                    </div>
                </div>
                
                <!-- 468x60 Leaderboard -->
                <div class="relative w-full max-w-[468px] h-[60px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div id="right-leaderboard-destroyed">
                        <!-- 468x60 Ad -->
                        <script type="text/javascript">
                            atOptions = {
                                'key' : 'a7010e8356f3a6c4fc483bcaec8750f8',
                                'format' : 'iframe',
                                'height' : 60,
                                'width' : 468,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="https://www.highperformanceformat.com/a7010e8356f3a6c4fc483bcaec8750f8/invoke.js"></script>
                    </div>
                </div>
                
                <!-- 300x250 Rectangle -->
                <div class="relative w-full max-w-[300px] h-[250px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div id="right-rectangle-destroyed">
                        <!-- 300x250 Ad -->
                        <script type="text/javascript">
                            atOptions = {
                                'key' : '9ad838278dc8e53ec577d59c72133ae2',
                                'format' : 'iframe',
                                'height' : 250,
                                'width' : 300,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="https://www.highperformanceformat.com/9ad838278dc8e53ec577d59c72133ae2/invoke.js"></script>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Banner (728x90) -->
        <div class="py-6 md:py-8 px-4 md:px-20 lg:px-40 bg-white/5">
            <div class="max-w-[728px] mx-auto">
                <div class="relative w-full h-[90px] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div id="footer-banner-destroyed">
                        <!-- 728x90 Ad -->
                        <script type="text/javascript">
                            atOptions = {
                                'key' : 'a7010e8356f3a6c4fc483bcaec8750f8',
                                'format' : 'iframe',
                                'height' : 90,
                                'width' : 728,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="https://www.highperformanceformat.com/a7010e8356f3a6c4fc483bcaec8750f8/invoke.js"></script>
                    </div>
                </div>
            </div>
        </div>

        <!-- Simple ad fallback check -->
        <script>
            setTimeout(() => {
                const adIds = [
                    'header-ad-destroyed',
                    'left-skyscraper-destroyed', 'left-rectangle-destroyed',
                    'right-sidebar-destroyed', 'right-leaderboard-destroyed', 'right-rectangle-destroyed',
                    'top-banner-destroyed', 'mobile-square-destroyed', 'incontent-mobile-destroyed',
                    'incontent-desktop-destroyed', 'bottom-banner-destroyed', 'mobile-bottom-destroyed',
                    'footer-banner-destroyed'
                ];
                
                adIds.forEach(adId => {
                    const container = document.getElementById(adId);
                    if (container) {
                        const iframe = container.querySelector('iframe');
                        if (!iframe || iframe.offsetWidth === 0 || iframe.offsetHeight === 0) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-full h-full flex flex-col items-center justify-center bg-gray-800/50 rounded-lg';
                            fallback.innerHTML = '<span class="material-symbols-outlined text-gray-400 mb-1">ads_click</span><span class="text-gray-400 text-xs">Advertisement</span>';
                            if (iframe) container.replaceChild(fallback, iframe);
                            else container.appendChild(fallback);
                        }
                    }
                });
            }, 3000);
        </script>
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

const API_BASE = "https://linkshortner-6ils.onrender.com";

const REDIRECT_BASE = "https://linkshortner-6ils.onrender.com";

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // --- AUTH GUARD ---
    const protectedPages = ['mylinks.html', 'qrcodes.html', 'analytics.html', 'setting.html', 'analyticsid.html'];

    if (protectedPages.includes(currentPage) && !token) {
        // Not logged in and trying to access protected page
        window.location.href = 'auth.html?redirected=true';
        return; // Stop execution
    }

    // --- UTILITIES ---
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

    // --- CUSTOM CONFIRM MODAL ---
    const showConfirmModal = (title, message, onConfirm, options = {}) => {
        let modal = document.getElementById('custom-confirm-modal');
        const confirmText = options.confirmText || 'Delete Now';
        const confirmClass = options.confirmClass || 'bg-red-600 hover:bg-red-500 shadow-red-600/30';

        if (!modal) {
            const modalHTML = `
        <div id="custom-confirm-modal" class="fixed inset-0 z-[2000] hidden flex items-center justify-center p-4">
          <div id="confirm-modal-overlay" class="absolute inset-0 bg-black/60"></div>
          <div class="bg-[#1a1625] relative w-full max-w-md rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl animate-fade-in-up border border-white/10">
            <div class="size-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6" id="confirm-modal-icon-container">
              <span class="material-symbols-outlined text-4xl" id="confirm-modal-icon">delete_forever</span>
            </div>
            <h3 class="text-2xl font-bold text-white mb-2" id="confirm-modal-title">Delete?</h3>
            <p class="text-gray-400 mb-8" id="confirm-modal-message">Are you sure? This action cannot be undone.</p>
            <div class="flex gap-4 w-full">
              <button id="confirm-modal-cancel" class="flex-1 py-3 px-6 rounded-xl bg-surface-dark text-gray-300 font-bold hover:bg-border-dark transition-all border border-border-dark">Cancel</button>
              <button id="confirm-modal-ok" class="flex-1 py-3 px-6 rounded-xl text-white font-bold transition-all shadow-lg">Confirm</button>
            </div>
          </div>
        </div>
      `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('custom-confirm-modal');
        }

        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-message');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const confirmBtn = document.getElementById('confirm-modal-ok');
        const overlay = document.getElementById('confirm-modal-overlay');
        const icon = document.getElementById('confirm-modal-icon');
        const iconContainer = document.getElementById('confirm-modal-icon-container');

        titleEl.textContent = title;
        msgEl.textContent = message;
        confirmBtn.textContent = confirmText;
        confirmBtn.className = `flex-1 py-3 px-6 rounded-xl text-white font-bold transition-all shadow-lg ${confirmClass}`;

        if (title.toLowerCase().includes('logout')) {
            icon.textContent = 'logout';
            iconContainer.className = 'size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6';
        } else {
            icon.textContent = 'delete_forever';
            iconContainer.className = 'size-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Processing...';
            await onConfirm();
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = confirmText;
            closeModal();
        };
        cancelBtn.onclick = closeModal;
        overlay.onclick = closeModal;
    };

    let qrColor = '#5b13ec';
    let qrLogo = null;
    let qrCodeInstance = null;
    let currentShortUrl = '';

    // --- AUTH UI ---
    const updateAuthUI = () => {
        const loggedOutView = document.getElementById('logged-out-view');
        const loggedInView = document.getElementById('loggedIn-view') || document.getElementById('logged-in-view');
        const userNameSpan = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');

        if (token && username) {
            if (loggedOutView) loggedOutView.classList.add('hidden');
            if (loggedInView) loggedInView.classList.remove('hidden');
            if (userNameSpan) userNameSpan.textContent = username;
            if (userAvatar) {
                userAvatar.style.backgroundImage = `url('https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=5b13ec&color=fff')`;
            }
        } else {
            if (loggedOutView) loggedOutView.classList.remove('hidden');
            if (loggedInView) loggedInView.classList.add('hidden');
        }

        // Update visibility of protected nav links - Keep them visible as per user request
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.classList.remove('hidden');
        });
    };
    updateAuthUI();

    // --- MOBILE MENU LOGIC ---
    const menuOpenBtn = document.getElementById('menu-open');
    const menuCloseBtn = document.getElementById('menu-close');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileOverlay = document.getElementById('mobile-overlay');

    if (menuOpenBtn && menuCloseBtn && mobileMenu && mobileOverlay) {
        const toggleMenu = (show) => {
            if (show) {
                mobileMenu.classList.remove('hidden');
                mobileOverlay.classList.remove('hidden');
                menuOpenBtn.classList.add('hidden');
                menuCloseBtn.classList.remove('hidden');
                setTimeout(() => {
                    mobileMenu.classList.remove('-translate-y-full');
                    mobileOverlay.classList.add('opacity-100');
                    mobileOverlay.classList.remove('opacity-0');
                }, 10);
            } else {
                mobileMenu.classList.add('-translate-y-full');
                mobileOverlay.classList.remove('opacity-100');
                mobileOverlay.classList.add('opacity-0');
                menuOpenBtn.classList.remove('hidden');
                menuCloseBtn.classList.add('hidden');
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                    mobileOverlay.classList.add('hidden');
                }, 300);
            }
        };

        menuOpenBtn.onclick = () => toggleMenu(true);
        menuCloseBtn.onclick = () => toggleMenu(false);
        mobileOverlay.onclick = () => toggleMenu(false);

        // Close menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.onclick = () => toggleMenu(false);
        });
    }

    // Check if redirected from a protected page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('redirected') === 'true' && (currentPage === 'auth.html' || currentPage.includes('auth'))) {
        showNotification('Please log in to access that page.', 'error');
    }

    // --- ANALYTICS LOGIC ---
    if (currentPage === 'analytics.html' || currentPage === 'analyticsid.html') {
        let currentRange = '24h';
        const rangeLabel = document.getElementById('range-label');
        const rangeOptions = document.querySelectorAll('#date-range-options button[data-range]');

        const countryCoords = {
            'United States': { top: '35%', left: '20%' },
            'Germany': { top: '28%', left: '50%' },
            'United Kingdom': { top: '24%', left: '47%' },
            'India': { top: '48%', left: '73%' },
            'Canada': { top: '22%', left: '18%' },
            'France': { top: '30%', left: '48%' },
            'Australia': { top: '75%', left: '85%' },
            'Brazil': { top: '70%', left: '33%' },
            'China': { top: '42%', left: '78%' },
            'Japan': { top: '38%', left: '88%' },
            'Russia': { top: '20%', left: '70%' },
            'Netherlands': { top: '26%', left: '49%' },
            'Spain': { top: '35%', left: '46%' },
            'Italy': { top: '32%', left: '50%' },
            'Pakistan': { top: '45%', left: '70%' },
            'United Arab Emirates': { top: '48%', left: '60%' }
        };

        // Explicitly clear filter if we are on main analytics page to avoid confusion
        if (currentPage === 'analytics.html') {
            sessionStorage.removeItem('analyticsFilterId');
        }

        const fetchAnalytics = async (range, start = null, end = null) => {
            try {
                // Only apply filter on the specific analytics page
                const linkIdFilter = (currentPage === 'analyticsid.html') ? sessionStorage.getItem('analyticsFilterId') : null;

                console.log('fetchAnalytics called:', { currentPage, range, linkIdFilter });

                let url = `${API_BASE}/api/analytics-data?range=${range}`;


                if (range === 'custom' && start && end) {
                    url += `&startDate=${start}&endDate=${end}`;
                }

                if (linkIdFilter) {
                    url += `&linkId=${linkIdFilter}`;
                    console.log('Added linkId to URL:', url);
                    // Show filter indicator and update title to reflect we are analyzing a specific link
                    // The backend should ideally return the link info in the summary, 
                    // but for now, we rely on the summary.topLink if it aligns, or we fetch it separately?
                    // Actually, if filtered, summary.topLink IS the link.
                }

                if (currentPage === 'analyticsid.html' && !linkIdFilter) {
                    console.warn('On analyticsid.html but no linkIdFilter found in sessionStorage');
                    // Redirect if no ID (optional, or just show empty state/global)
                    // window.location.href = 'analytics.html';
                }

                const res = await fetch(url, {
                    headers: { 'Authorization': token }
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                updateAnalyticsUI(data);
            } catch (err) {
                console.error('Analytics fetch error:', err);
                console.log('Current linkIdFilter:', sessionStorage.getItem('analyticsFilterId'));

                // Only clear filter and reload if it's an authorization error
                if (err.message && (err.message.includes('Unauthorized') || err.message.includes('403'))) {
                    console.log('Authorization error - clearing filter');
                    sessionStorage.removeItem('analyticsFilterId');
                    window.location.reload();
                } else {
                    showNotification('Failed to load analytics data: ' + err.message, 'error');
                }
            }
        };

        const drawChart = (timeline, range = '24h') => {
            const chartArea = document.getElementById('chart-area');
            const chartLine = document.getElementById('chart-line');
            const chartLabels = document.getElementById('chart-labels');
            const yLabels = document.getElementById('y-axis-labels');

            if (!chartArea || !chartLine || timeline.length === 0) return;

            const maxClicks = Math.max(...timeline.map(t => t.count), 5);
            const dataPoints = timeline.map(t => t.count);
            const count = timeline.length;

            // Update Y-Axis
            if (yLabels) {
                yLabels.innerHTML = `
                    <span>${maxClicks}</span>
                    <span>${Math.round(maxClicks * 0.75)}</span>
                    <span>${Math.round(maxClicks * 0.5)}</span>
                    <span>${Math.round(maxClicks * 0.25)}</span>
                    <span>0</span>
                `;
            }

            // Create Path 
            // Viewbox: 0 0 100 50
            let pathD = "";
            timeline.forEach((point, i) => {
                const x = count > 1 ? (i / (count - 1)) * 100 : 50;
                const y = 50 - ((point.count / maxClicks) * 50);
                pathD += (i === 0 ? "M" : "L") + `${x} ${y} `;
            });

            if (count === 1) pathD += "L 51 50";

            chartLine.setAttribute('d', pathD);
            chartArea.setAttribute('d', pathD + ` L ${count > 1 ? 100 : 51} 50 L ${count > 1 ? 0 : 49} 50 Z`);
            chartArea.classList.remove('opacity-0');

            // Bottom Labels (Custom Intervals)
            // Bottom Labels (Custom Intervals)
            if (chartLabels) {
                let labelsHtml = "";
                if (range === '24h') {
                    // 0..23 (Hourly) -> show eve n hours: 2, 4, 6...
                    labelsHtml = timeline.map((_, i) => {
                        if (i > 0 && (i + 1) % 2 === 0) return `<span>${i + 1}</span>`;
                        return '';
                    }).join('');
                } else if (range === '7d') {
                    // 0..6 (Daily) -> D1..D7
                    labelsHtml = timeline.map((_, i) => `<span>D${i + 1}</span>`).join('');
                } else if (range === '30d') {
                    // 0..3 (Weeks) -> W1..W4
                    labelsHtml = timeline.map((_, i) => `<span>W${i + 1}</span>`).join('');
                } else if (range === '3m') {
                    // 0..5 (15 days) -> 15, 30, 45...
                    labelsHtml = timeline.map((_, i) => `<span>${(i + 1) * 15}</span>`).join('');
                } else if (range === '6m' || range === '1y') {
                    // 0..N (Months) -> 1, 2, 3...
                    labelsHtml = timeline.map((_, i) => `<span>${i + 1}</span>`).join('');
                } else {
                    const step = Math.ceil(count / 6);
                    labelsHtml = timeline.filter((_, i) => i % step === 0).map(t => `<span>${parseInt(t._id) + 1}</span>`).join('');
                }
                chartLabels.innerHTML = labelsHtml;
            }
        };

        const updateAnalyticsUI = (data) => {
            const { summary, charts, recentActivity } = data;

            // Update Counters
            document.getElementById('total-clicks-val').textContent = summary.totalClicks.toLocaleString();
            document.getElementById('unique-visitors-val').textContent = summary.uniqueVisitors.toLocaleString();
            document.getElementById('qr-scans-val').textContent = summary.qrScans.toLocaleString();
            document.getElementById('top-link-val').textContent = summary.topLink.title;
            document.getElementById('top-link-val').title = summary.topLink.title;
            document.getElementById('top-link-info').textContent = `${summary.topLink.count} total clicks`;

            // Update List (Top Performing Links)
            const topLinksTbody = document.getElementById('top-links-tbody');
            if (topLinksTbody) {
                topLinksTbody.innerHTML = charts.topPerformingLinks.map((link, index) => `
                    <tr class="hover:bg-white/5 transition-all duration-200 group relative border-l-2 border-l-transparent hover:border-l-primary">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-4 transform group-hover:translate-x-2 transition-transform duration-300">
                                <span class="text-slate-500 font-bold text-xs">#${index + 1}</span>
                                <div class="flex flex-col">
                                    <span class="text-white font-medium text-base truncate max-w-[200px]">${link.shortCode}</span>
                                <a href="${link.originalUrl}" target="_blank" class="text-primary text-xs hover:underline flex items-center gap-1 mt-0.5 w-fit">
                                    ${link.originalUrl.substring(0, 30)}... <span class="material-symbols-outlined text-[10px]">open_in_new</span>
                                </a>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-slate-400 text-sm whitespace-nowrap">
                            ${new Date(link.createdAt).toLocaleDateString()}
                        </td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Active
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <span class="text-white font-bold text-lg group-hover:text-primary transition-colors">${link.clicks}</span>
                        </td>
                    </tr>
                `).join('');
            }

            // Update Recent Activity
            const recentActivityTbody = document.getElementById('recent-activity-tbody');
            if (recentActivityTbody) {
                recentActivityTbody.innerHTML = recentActivity.map(act => `
                    <tr class="hover:bg-white/5">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <span class="material-symbols-outlined text-sm">link</span>
                                </div>
                                <span class="text-white font-medium truncate max-w-[150px]">${act.urlId ? act.urlId.shortCode : 'Deleted'}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-2 text-slate-400">
                                <span class="text-xs">${act.country || 'Unknown'}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <span class="text-xs text-slate-400">${act.device || 'Desktop'}</span>
                        </td>
                        <td class="px-6 py-4 text-right text-slate-500 text-xs whitespace-nowrap">
                            ${new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                    </tr>
                `).join('');
            }

            // Update Charts (Line Chart)
            drawChart(charts.clicksOverTime, currentRange);

            // Update Device List & Pie
            const deviceList = document.getElementById('device-type-list')?.querySelector('.flex-col');
            const devicePie = document.getElementById('device-type-pie');
            if (deviceList && charts.deviceType) {
                const total = charts.deviceType.reduce((acc, curr) => acc + curr.count, 0);
                const colors = ['#5b13ec', '#3b82f6', '#f59e0b', '#10b981', '#475569'];

                let currentPercent = 0;
                const gradientParts = charts.deviceType.length > 0 ? charts.deviceType.map((d, i) => {
                    const p = total > 0 ? (d.count / total) * 100 : 0;
                    const part = `${colors[i % colors.length]} ${currentPercent}% ${currentPercent + p}%`;
                    currentPercent += p;
                    return part;
                }) : ['#2e2839 0% 100%'];

                if (devicePie) devicePie.style.background = `conic-gradient(${gradientParts.join(', ')})`;

                deviceList.innerHTML = charts.deviceType.length > 0 ? charts.deviceType.map((d, i) => {
                    const percent = total > 0 ? Math.round((d.count / total) * 100) : 0;
                    return `
                        <div class="group cursor-default">
                            <div class="flex justify-between items-center text-xs mb-1">
                                <span class="text-slate-300 font-medium">${d._id || 'Unknown'}</span>
                                <span class="text-slate-500">${percent}%</span>
                            </div>
                            <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-1000" style="width: ${percent}%; background-color: ${colors[i % colors.length]}"></div>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="text-slate-500 text-xs italic">No device data yet</p>';
            }

            // Update Browser Pie
            const browserList = document.getElementById('browser-type-list');
            const browserPie = document.getElementById('browser-type-pie');
            if (browserPie && charts.browserType) {
                const total = charts.browserType.reduce((acc, curr) => acc + curr.count, 0);
                const colors = ['#14b8a6', '#475569', '#3b82f6', '#f59e0b', '#ef4444'];

                let currentPercent = 0;
                const gradientParts = charts.browserType.length > 0 ? charts.browserType.map((b, i) => {
                    const p = total > 0 ? (b.count / total) * 100 : 0;
                    const part = `${colors[i % colors.length]} ${currentPercent}% ${currentPercent + p}%`;
                    currentPercent += p;
                    return part;
                }) : ['#2e2839 0% 100%'];

                if (browserPie) browserPie.style.background = `conic-gradient(${gradientParts.join(', ')})`;

                if (browserList) {
                    browserList.innerHTML = charts.browserType.map((b, i) => `
                        <div class="flex items-center gap-2">
                            <div class="size-2 rounded-full" style="background-color: ${colors[i % colors.length]}"></div>
                            <span class="text-slate-300 text-sm">${b._id || 'Unknown'} (${total > 0 ? Math.round((b.count / total) * 100) : 0}%)</span>
                        </div>
                    `).join('') || '<span class="text-slate-500 text-xs">No data</span>';
                }
            }

            // Update Top Locations & Map Dots
            const locationsContainer = document.getElementById('top-locations-list');
            const mapContainer = document.getElementById('top-locations-container');
            if (locationsContainer && charts.locations) {
                // Remove old dots
                mapContainer.querySelectorAll('.map-dot').forEach(d => d.remove());

                const total = charts.locations.reduce((acc, curr) => acc + curr.count, 0);
                locationsContainer.innerHTML = charts.locations.length > 0 ? charts.locations.map(loc => {
                    const p = total > 0 ? Math.round((loc.count / total) * 100) : 0;
                    const name = loc._id === 'Unknown' ? 'Others (Global)' : loc._id;

                    // Add dot to map if coords exist
                    if (countryCoords[loc._id]) {
                        const dot = document.createElement('div');
                        dot.className = 'map-dot absolute size-3 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0';
                        dot.style.top = countryCoords[loc._id].top;
                        dot.style.left = countryCoords[loc._id].left;
                        dot.innerHTML = `
                            <span class="absolute size-full rounded-full bg-primary animate-ping opacity-60"></span>
                            <span class="relative block size-full rounded-full bg-primary shadow-[0_0_8px_#5b13ec]"></span>
                        `;
                        mapContainer.appendChild(dot);
                    }

                    return `
                        <div class="group cursor-pointer">
                            <div class="flex justify-between items-center mb-1.5">
                                <div class="flex items-center gap-3">
                                    <div class="size-6 rounded bg-surface-dark-lighter border border-border-dark flex items-center justify-center overflow-hidden shrink-0">
                                        <img src="https://ui-avatars.com/api/?name=${name[0] || '?'}&background=5b13ec&color=fff&size=32" class="size-full object-cover">
                                    </div>
                                    <span class="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">${name}</span>
                                </div>
                                <span class="text-xs font-mono text-slate-400">${loc.count} clicks</span>
                            </div>
                            <div class="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden shadow-inner flex-1">
                                <div class="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-1000 delay-300" 
                                     style="width: ${p}%"></div>
                            </div>
                        </div>
                    `;
                }).join('') : '<div class="flex items-center justify-center h-full text-slate-500 italic pb-10">No geographic data yet</div>';
            }

            // Update Traffic Sources
            const trafficGrid = document.getElementById('traffic-sources-grid');
            const trafficPie = document.getElementById('traffic-sources-pie');
            if (trafficGrid && charts.trafficSources) {
                const total = charts.trafficSources.reduce((acc, curr) => acc + curr.count, 0);
                const colors = ['#5b13ec', '#3b82f6', '#14b8a6', '#f59e0b', '#475569', '#ec4899', '#25d366'];
                document.getElementById('total-sources').textContent = total;

                let currentPercent = 0;
                const gradientParts = charts.trafficSources.length > 0 ? charts.trafficSources.map((s, i) => {
                    const p = total > 0 ? (s.count / total) * 100 : 0;
                    const part = `${colors[i % colors.length]} ${currentPercent}% ${currentPercent + p}%`;
                    currentPercent += p;
                    return part;
                }) : ['#2e2839 0% 100%'];

                if (trafficPie) trafficPie.style.background = `conic-gradient(${gradientParts.join(', ')})`;

                trafficGrid.innerHTML = charts.trafficSources.length > 0 ? charts.trafficSources.map((s, i) => {
                    const p = total > 0 ? Math.round((s.count / total) * 100) : 0;
                    return `
                        <div class="flex items-center gap-2 group cursor-default">
                            <div class="size-2.5 rounded-full group-hover:scale-150 transition-transform shadow-sm" style="background-color: ${colors[i % colors.length]}"></div>
                            <div class="flex flex-col">
                                <span class="text-slate-200 text-sm font-medium transition-colors truncate max-w-[80px]">${s._id || 'Direct'}</span>
                                <span class="text-slate-500 text-xs">${p}%</span>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="text-slate-500 text-xs italic">No traffic data</p>';
            }
        };



        // Range Event Listeners
        rangeOptions.forEach(opt => {
            opt.onclick = () => {
                // Update UI state
                rangeOptions.forEach(b => {
                    b.classList.remove('bg-black/40', 'border-white/5', 'text-white', 'shadow-pressed');
                    b.querySelector('.flex.items-center.justify-center')?.classList.add('hidden');
                });
                opt.classList.add('bg-black/40', 'border-white/5', 'text-white', 'shadow-pressed');
                opt.querySelector('.flex.items-center.justify-center')?.classList.remove('hidden');

                const range = opt.getAttribute('data-range');
                currentRange = range;
                rangeLabel.textContent = opt.querySelector('.font-bold, .font-medium').textContent;
                fetchAnalytics(range);
            };
        });

        // Custom Range
        const applyBtn = document.getElementById('apply-custom-range');
        if (applyBtn) {
            applyBtn.onclick = () => {
                const start = document.getElementById('start-date').value;
                const end = document.getElementById('end-date').value;
                if (!start || !end) return showNotification('Select both dates', 'error');
                rangeLabel.textContent = 'Custom Range';
                fetchAnalytics('custom', start, end);
            };
        }

        // Refresh Button
        const refreshBtn = document.getElementById('refresh-analytics');
        if (refreshBtn) {
            refreshBtn.onclick = () => {
                showNotification('Refreshing data...');
                fetchAnalytics(currentRange);
            };
        }

        // Handle Dynamic Search for Analytics ID page
        if (currentPage === 'analyticsid.html') {
            const searchInput = document.getElementById('analytics-link-search');
            const resultsDropdown = document.getElementById('analytics-search-results');
            const loading = document.getElementById('link-search-loading');

            if (searchInput && resultsDropdown) {
                let debounce;
                searchInput.oninput = (e) => {
                    const val = e.target.value.trim();
                    clearTimeout(debounce);

                    if (!val) {
                        resultsDropdown.classList.add('hidden');
                        return;
                    }

                    loading.classList.remove('hidden');

                    debounce = setTimeout(async () => {
                        try {
                            const res = await fetch(`${API_BASE}/api/links?search=${val}&limit=5`, {
                                headers: { 'Authorization': token }
                            });
                            const d = await res.json();

                            loading.classList.add('hidden');
                            resultsDropdown.innerHTML = '';
                            resultsDropdown.classList.remove('hidden');

                            if (d.links && d.links.length > 0) {
                                d.links.forEach(l => {
                                    const item = document.createElement('div');
                                    item.className = 'px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-center gap-3 transition-colors';
                                    item.innerHTML = `
                                        <div class="size-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
                                            ${l.shortCode.charAt(0).toUpperCase()}
                                        </div>
                                        <div class="flex flex-col overflow-hidden">
                                            <span class="text-white text-sm font-medium truncate">${l.shortCode}</span>
                                            <span class="text-slate-500 text-xs truncate">${l.originalUrl}</span>
                                        </div>
                                    `;
                                    item.onclick = () => {
                                        sessionStorage.setItem('analyticsFilterId', l._id);
                                        window.location.reload();
                                    };
                                    resultsDropdown.appendChild(item);
                                });
                            } else {
                                resultsDropdown.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">No links found</div>`;
                            }

                        } catch (err) {
                            console.error(err);
                            loading.classList.add('hidden');
                        }
                    }, 300);
                };

                // Close dropdown on click outside
                document.addEventListener('click', (e) => {
                    if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
                        resultsDropdown.classList.add('hidden');
                    }
                });
            }
        }

        // Initial Load
        const storedFilter = sessionStorage.getItem('analyticsFilterId');
fetchAnalytics('24h');

    }

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = 'index.html'; // Explicit redirect to home
    };

    const profileBtn = document.getElementById('user-profile-btn');
    if (profileBtn) {
        // Create dropdown if it doesn't exist
        let dropdown = document.getElementById('profile-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'profile-dropdown';
            // sidebar context check
            const isSidebar = profileBtn.closest('aside') !== null;
            dropdown.className = `hidden absolute ${isSidebar ? 'bottom-full mb-4 left-0' : 'top-full mt-2 right-0'} w-48 bg-surface-dark border border-border-dark rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 z-[100] animate-fade-in-up`;
            dropdown.innerHTML = `
                <button id="nav-logout-btn" class="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 font-bold">
                    <span class="material-symbols-outlined text-[20px]">logout</span>
                    Logout Session
                </button>
            `;
            profileBtn.parentElement.classList.add('relative');
            profileBtn.parentElement.appendChild(dropdown);

            // Attach event to the new logout button inside dropdown
            document.getElementById('nav-logout-btn').onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.add('hidden');
                showConfirmModal('Logout?', 'Are you sure you want to log out of your session?', logout, {
                    confirmText: 'Logout Now',
                    confirmClass: 'bg-primary hover:bg-primary-hover shadow-primary/30'
                });
            };
        }

        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });
    }

    // --- QR LOGIC ---
    const initQrCode = (url) => {
        const container = document.getElementById('qr-code-container');
        if (!container) return;
        container.innerHTML = '';

        qrCodeInstance = new QRCodeStyling({
            width: 280,
            height: 280,
            data: url,
            image: qrLogo,
            dotsOptions: { color: qrColor, type: 'rounded' },
            backgroundOptions: { color: '#ffffff' },
            imageOptions: { crossOrigin: 'anonymous', margin: 10, imageSize: 0.4 }
        });

        qrCodeInstance.append(container);
    };

    if (currentPage === 'index.html') {
        // 1. Color Selection
        const colorBtns = document.querySelectorAll('#qr-color-selector button[data-color]');
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                qrColor = btn.dataset.color;
                // Reset all rings
                document.querySelectorAll('#qr-color-selector button').forEach(b => {
                    b.classList.remove('ring-gray-500');
                    b.classList.add('ring-transparent');
                });
                btn.classList.add('ring-gray-500');
                btn.classList.remove('ring-transparent');

                if (qrCodeInstance) {
                    qrCodeInstance.update({ dotsOptions: { color: qrColor } });
                    const capDisplay = document.getElementById('qr-caption-display');
                    if (capDisplay) capDisplay.style.color = qrColor;
                }
            });
        });

        const customColorBtn = document.getElementById('custom-color-btn');
        const customColorInput = document.getElementById('custom-color-input');
        if (customColorBtn && customColorInput) {
            customColorBtn.onclick = () => customColorInput.click();
            customColorInput.oninput = (e) => {
                qrColor = e.target.value;
                customColorBtn.style.backgroundColor = qrColor;
                customColorBtn.innerHTML = '';
                if (qrCodeInstance) {
                    qrCodeInstance.update({ dotsOptions: { color: qrColor } });
                    const capDisplay = document.getElementById('qr-caption-display');
                    if (capDisplay) capDisplay.style.color = qrColor;
                }
            };
        }

        // 2. Logo Upload
        const logoInput = document.getElementById('logo-input');
        const logoArea = document.getElementById('logo-upload-area');

        if (logoArea && logoInput) {
            logoArea.onclick = () => logoInput.click();
            logoInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        qrLogo = evt.target.result;
                        // Update UI to show selected file
                        const textContainer = logoArea.querySelector('.flex.flex-col');
                        if (textContainer) {
                            textContainer.innerHTML = `
                                <span class="text-sm font-bold text-emerald-400">Logo Selected</span>
                                <span class="text-xs text-gray-500 truncate max-w-[150px]">${file.name}</span>
                            `;
                        }

                        // Update QR instance if exists
                        if (qrCodeInstance) {
                            qrCodeInstance.update({
                                image: qrLogo,
                                imageOptions: { imageSize: 0.4, margin: 10 }
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        // 3. Generate Logic
        const shortenBtn = document.getElementById('shorten-btn');
        const clearBtn = document.getElementById('clear-btn');
        const resultCard = document.getElementById('result-card');
        const resultLink = document.getElementById('result-link');

        // Inputs
        const urlInput = document.getElementById('url-input');
        const aliasInput = document.getElementById('custom-alias-input');
        const captionInput = document.getElementById('caption-input');

        // Check for Edit Mode
        const editDataRaw = localStorage.getItem('editLinkData');
        let editId = null;

        if (editDataRaw && urlInput) {
            try {
                const editData = JSON.parse(editDataRaw);
                editId = editData._id;

                // Pre-fill inputs
                urlInput.value = editData.originalUrl || '';
                if (aliasInput) aliasInput.value = editData.shortCode || '';
                if (captionInput) captionInput.value = editData.caption || '';

                // Change UI
                if (shortenBtn) shortenBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Update Link';
                if (clearBtn) clearBtn.textContent = 'Cancel Edit';

                showNotification('Editing Link: ' + editData.shortCode);
            } catch (e) {
                console.error("Error parsing edit data", e);
                localStorage.removeItem('editLinkData');
            }
        }

        if (shortenBtn) {
            shortenBtn.onclick = async () => {
                const originalUrl = urlInput.value.trim();
                const alias = aliasInput ? aliasInput.value.trim() : '';
                const caption = captionInput ? captionInput.value.trim() : '';

                if (!originalUrl) return showNotification('Please enter a URL', 'error');

                // Loading State
                shortenBtn.disabled = true;
                const originalBtnContent = shortenBtn.innerHTML;
                shortenBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Working...';

                try {
                    let res, data;

                    if (editId) {
                        // UPDATE EXISTING LINK
                        res = await fetch(`${API_BASE}/api/links/${editId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': token || ''
                            },
                            body: JSON.stringify({ originalUrl, alias, caption })
                        });
                        data = await res.json();
                        if (data.error) throw new Error(data.error);

                        showNotification('Link Updated Successfully!');
                        localStorage.removeItem('editLinkData');
                        setTimeout(() => window.location.href = 'mylinks.html', 1000);
                        return; // Stop here for edit mode
                    } else {
                        // CREATE NEW LINK
                        res = await fetch(`${API_BASE}/api/shorten`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': token || ''
                            },
                            body: JSON.stringify({ originalUrl, alias, caption })
                        });
                        data = await res.json();
                    }

                    if (data.error) throw new Error(data.error);

                    // Define your display domain at the top
const DISPLAY_DOMAIN = "linkshortner.site"; // Add this line at the top with other constants

// Then in your shorten function:
currentShortUrl = `${DISPLAY_DOMAIN}/${data.shortCode}`;

// Update UI
if (resultLink) {
    resultLink.textContent = `${DISPLAY_DOMAIN}/${data.shortCode}`;  // Shows: linkshortner.site/mhzjFB
    resultLink.href = `${REDIRECT_BASE}/${data.shortCode}`;          // Links to: https://linkshortner-6ils.onrender.com/mhzjFB
}



                    if (resultLink) {
                        resultLink.textContent = `linkshortner.site/${data.shortCode}`;
resultLink.href = `${REDIRECT_BASE}/${data.shortCode}`;
                    }

                    // Generate QR
                    initQrCode(currentShortUrl);

                    // Update Caption in QR Card
                    const qrCaption = document.getElementById('qr-caption-display');
                    if (qrCaption) {
                        if (caption) {
                            // Prepend '@' if not present
                            const formattedCaption = caption.startsWith('@') ? caption : '@' + caption;
                            qrCaption.textContent = formattedCaption;
                            qrCaption.style.color = qrColor;
                            qrCaption.classList.remove('hidden');
                        } else {
                            qrCaption.classList.add('hidden');
                        }
                    }

                    // Scroll to result
                    if (resultCard) resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    showNotification('Link shortened successfully!');

                    urlInput.value = '';

                } catch (err) {
                    console.error(err);
                    showNotification(err.message || 'Failed to process request', 'error');
                } finally {
                    shortenBtn.disabled = false;
                    shortenBtn.innerHTML = originalBtnContent;
                }
            };
        }

        // Clear/Cancel Button
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (editId) {
                    localStorage.removeItem('editLinkData');
                    window.location.reload();
                } else {
                    document.getElementById('url-input').value = '';
                    document.getElementById('custom-alias-input').value = '';
                    document.getElementById('caption-input').value = '';
                    document.getElementById('result-card').classList.add('hidden');
                    qrLogo = null;
                    showNotification('Cleared');
                }
            };
        }

        // Copy Button
        const copyBtn = document.getElementById('copy-btn');
        if (copyBtn) {
    copyBtn.onclick = () => {
        if (!currentShortUrl) {
            showNotification('Nothing to copy', 'error');
            return;
        }
        navigator.clipboard.writeText(currentShortUrl);
        showNotification('Copied to clipboard!');
    };
}


        // Download QR
        const downloadBtn = document.getElementById('download-qr-btn');
        if (downloadBtn) {
            downloadBtn.onclick = async () => {
                if (!qrCodeInstance) return;

                // If caption exists, we need to canvas-compose it
                const captionText = captionInput ? captionInput.value.trim() : '';

                if (captionText) {
                    // Create a temporary canvas to composite
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // We need to wait for the QR code to be drawn or get its blob
                    const qrBlob = await qrCodeInstance.getRawData('png'); // Getting raw blob
                    const img = new Image();
                    img.src = URL.createObjectURL(qrBlob);

                    img.onload = () => {
                        // Set canvas size (QR + padding for text)
                        const paddingBottom = 40;
                        canvas.width = img.width;
                        canvas.height = img.height + paddingBottom;

                        // Fill white background
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Draw QR
                        ctx.drawImage(img, 0, 0);

                        // Draw Text
                        ctx.font = 'bold 20px Manrope';
                        ctx.fillStyle = qrColor;
                        ctx.textAlign = 'center';
                        ctx.fillText(captionText, canvas.width / 2, canvas.height - 15);

                        // Download
                        const link = document.createElement('a');
                        link.download = 'premium-qr.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    };
                } else {
                    qrCodeInstance.download({ name: 'premium-qr', extension: 'png' });
                }
            };
        }

        // Caption Live Update
        if (captionInput) {
            captionInput.addEventListener('input', (e) => {
                const text = e.target.value;
                const container = document.getElementById('qr-code-container');
                let capDisplay = document.getElementById('qr-caption-display');

                if (!text) {
                    if (capDisplay) capDisplay.remove();
                    return;
                }

                if (!capDisplay) {
                    capDisplay = document.createElement('div');
                    capDisplay.id = 'qr-caption-display';
                    capDisplay.className = 'qr-caption-overlay text-center font-bold text-sm mt-2 break-all max-w-[280px]';
                    capDisplay.style.color = qrColor;
                    container.appendChild(capDisplay);
                }
                capDisplay.textContent = text;
            });
        }
    }

    // --- MY LINKS PAGE LOGIC ---
    if (currentPage === 'mylinks.html') {
        let currentPageNum = 1;
        let currentSort = 'newest';
        let currentSearch = '';

        const updateLinksTable = (links) => {
            const tbody = document.getElementById('links-tbody');
            if (!tbody) return;

            if (links.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                            <div class="flex flex-col items-center gap-4">
                                <span class="material-symbols-outlined text-4xl opacity-50">link_off</span>
                                <p>No links found matching your criteria</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = links.map(link => `
                <tr class="group hover:bg-white/5 transition-all link-row">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-4">
                            <div class="size-10 rounded-lg bg-surface-dark border border-white/10 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                ${link.originalUrl.charAt(8).toUpperCase()}
                            </div>
                            <div class="flex flex-col">
                                <span class="text-white font-bold truncate max-w-[200px]" title="${link.originalUrl}">${link.originalUrl.replace(/^https?:\/\//, '')}</span>
                                <span class="text-xs text-slate-400">${link.caption || 'No caption'}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <a href="${REDIRECT_BASE}/${link.shortCode}" target="_blank" class="text-primary font-medium hover:underline text-sm truncate max-w-[150px]">
                                /${link.shortCode}
                            </a>
                            <button onclick="navigator.clipboard.writeText('${REDIRECT_BASE}/${link.shortCode}'); showNotification('Copied!')" 
                                class="text-slate-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors" title="Copy">
                                <span class="material-symbols-outlined text-[16px]">content_copy</span>
                            </button>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-slate-400 text-sm">
                        ${new Date(link.createdAt).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4">
                        <button onclick="sessionStorage.setItem('analyticsFilterId', '${link._id}'); window.location.href='analyticsid.html'" 
                            class="flex items-center gap-1.5 text-white font-bold hover:text-primary transition-colors group/chart" title="View Detailed Analytics">
                            <span class="material-symbols-outlined text-emerald-400 text-[18px] group-hover/chart:text-primary">bar_chart</span>
                            ${link.clicks}
                        </button>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Active
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2 group-hover:opacity-100 opacity-0 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <button class="edit-link-btn text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors" title="Edit" data-link='${JSON.stringify(link).replace(/'/g, "&#39;")}'>
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                            <button class="delete-link-btn text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete" data-id="${link._id}">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Bind Edit events
            document.querySelectorAll('.edit-link-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const linkData = JSON.parse(e.currentTarget.dataset.link);
                    localStorage.setItem('editLinkData', JSON.stringify(linkData));
                    window.location.href = 'index.html';
                };
            });

            // Bind Delete events
            document.querySelectorAll('.delete-link-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    showConfirmModal('Delete Link?', 'This will permanently remove the link and all its analytics data.', async () => {
                        try {
                            const res = await fetch(`${API_BASE}/api/links/${id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': token }
                            });
                            const data = await res.json();
                            if (data.error) throw new Error(data.error);

                            showNotification('Link deleted successfully');
                            fetchLinks(); // Refresh
                        } catch (err) {
                            console.error(err);
                            showNotification(err.message || 'Failed to delete', 'error');
                        }
                    });
                });
            });
        };

        const fetchLinks = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/links?page=${currentPageNum}&sort=${currentSort}&search=${currentSearch}`, {
                    headers: { 'Authorization': token }
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                updateLinksTable(data.links);
                updatePagination(data.pagination);

                // Update header count
                const countEl = document.getElementById('active-links-count');
                if (countEl) countEl.textContent = data.pagination.totalCount;

            } catch (err) {
                console.error(err);
                showNotification('Failed to fetch links', 'error');
            }
        };


        const updatePagination = (meta) => {
            const info = document.getElementById('pagination-info');
            const container = document.getElementById('pagination-container');
            if (!info || !container) return;

            const start = (meta.currentPage - 1) * meta.limit + 1;
            const end = Math.min(meta.currentPage * meta.limit, meta.totalCount);

            info.innerHTML = `Showing <span class="text-white font-bold">${meta.totalCount > 0 ? start : 0}-${end}</span> of <span class="text-white font-bold">${meta.totalCount}</span> links`;

            let pagesHtml = '';

            // Prev
            pagesHtml += `
                <button ${meta.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${meta.currentPage - 1})"
                    class="btn-3d flex size-10 items-center justify-center rounded-lg bg-[#2e2839] text-white hover:bg-[#3d364b] disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>
            `;

            // Simple pagination pages (1, 2, ... N)
            // For brevity, just showing standard nearby pages could be implemented, 
            // but here we can just show simplified active page
            for (let i = 1; i <= meta.totalPages; i++) {
                if (i === meta.currentPage) {
                    pagesHtml += `<button class="btn-3d flex size-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-glow shadow-neon">${i}</button>`;
                } else if (i <= 3 || i === meta.totalPages || (i >= meta.currentPage - 1 && i <= meta.currentPage + 1)) {
                    pagesHtml += `<button onclick="changePage(${i})" class="btn-3d flex size-10 items-center justify-center rounded-lg bg-[#2e2839] text-white hover:bg-[#3d364b]">${i}</button>`;
                } else if (i === 4 && meta.currentPage > 5) {
                    pagesHtml += `<span class="flex items-center justify-center text-slate-500 w-8">...</span>`;
                }
            }

            // Next
            pagesHtml += `
                <button ${meta.currentPage === meta.totalPages ? 'disabled' : ''} onclick="changePage(${meta.currentPage + 1})"
                    class="btn-3d flex size-10 items-center justify-center rounded-lg bg-[#2e2839] text-white hover:bg-[#3d364b] disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            `;

            container.innerHTML = pagesHtml;

            // Bind global function for page change (hacky but works for simple vanilla js structure)
            window.changePage = (page) => {
                if (page < 1 || page > meta.totalPages) return;
                currentPageNum = page;
                fetchLinks();
            };
        };

        // Event Listeners
        const searchInput = document.getElementById('link-search');
        if (searchInput) {
            let debounce;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    currentSearch = e.target.value;
                    currentPageNum = 1;
                    fetchLinks();
                }, 300);
            });
        }

        const sortBtns = document.querySelectorAll('.sort-btn');
        sortBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                sortBtns.forEach(b => {
                    b.classList.remove('bg-primary/10', 'border-primary/30');
                    b.classList.add('bg-[#2e2839]');
                    b.querySelector('span:first-child').classList.remove('text-primary');
                    b.querySelector('span:first-child').classList.add('text-white');
                    b.querySelector('.material-symbols-outlined').classList.remove('text-primary');
                });
                btn.classList.add('bg-primary/10', 'border-primary/30');
                btn.classList.remove('bg-[#2e2839]');
                btn.querySelector('span:first-child').classList.add('text-primary');
                btn.querySelector('span:first-child').classList.remove('text-white');
                btn.querySelector('.material-symbols-outlined').classList.add('text-primary');

                currentSort = btn.dataset.sort;
                currentPageNum = 1;
                fetchLinks();
            });
        });

        // FAB
        const fab = document.getElementById('fab-add-link');
        if (fab) {
            fab.onclick = () => window.location.href = 'index.html';
        }

        // Init
        fetchLinks();
    }

    // --- QR CODES PAGE LOGIC ---
    if (currentPage === 'qrcodes.html') {
        const searchInput = document.getElementById('qr-search');
        const resultsDropdown = document.getElementById('qr-search-results');
        const loading = document.getElementById('qr-search-loading');
        const tbody = document.getElementById('qr-codes-tbody');
        const statusFilter = document.getElementById('status-filter');
        const dateFilter = document.getElementById('date-filter');
        const captionFilter = document.getElementById('caption-filter');
        const customDateRange = document.getElementById('qr-custom-date');
        const startDateInput = document.getElementById('qr-start-date');
        const endDateInput = document.getElementById('qr-end-date');
        const applyCustomBtn = document.getElementById('qr-apply-custom');

        let qrCurrentPageNum = 1;
        let qrLimit = 40;
        let qrSearch = '';
        let qrStatus = 'all';
        let qrDateRange = 'all';
        let qrCaption = 'all';
        let qrStartDate = '';
        let qrEndDate = '';

        const fetchQRCodes = async () => {
            try {
                loading && loading.classList.remove('hidden');
                let url = `${API_BASE}/api/qr/list?page=${qrCurrentPageNum}&limit=${qrLimit}&search=${qrSearch}&status=${qrStatus}&dateRange=${qrDateRange}&caption=${qrCaption}`;

                if (qrDateRange === 'custom') {
                    url += `&startDate=${qrStartDate}&endDate=${qrEndDate}`;
                }

                const res = await fetch(url, {
                    headers: { 'Authorization': token }
                });
                const data = await res.json();

                loading && loading.classList.add('hidden');
                if (data.error) throw new Error(data.error);
                if (!tbody) return;

                // Populate caption filter if not already populated or on first load
                if (data.captions && captionFilter && captionFilter.children.length <= 1) {
                    data.captions.forEach(cap => {
                        const opt = document.createElement('option');
                        opt.value = cap;
                        opt.textContent = cap;
                        captionFilter.appendChild(opt);
                    });
                }

                if (!data.qrCodes || data.qrCodes.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                                <div class="flex flex-col items-center gap-4">
                                    <span class="material-symbols-outlined text-4xl opacity-50">qr_code_2</span>
                                    <p>No QR codes found matching your filters.</p>
                                </div>
                            </td>
                        </tr>
                    `;
                    updateQRPagination({ totalCount: 0, currentPage: 1, limit: qrLimit, totalPages: 1 });
                    return;
                }

                tbody.innerHTML = data.qrCodes.map(qr => {
                    if (!qr.urlId) return '';
                    const link = qr.urlId;
                    const shortUrl = `${REDIRECT_BASE}/${link.shortCode}`;
                    const statusClass = qr.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                    return `
                        <tr class="group hover:bg-white/5 transition-all">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-4">
                                    <div class="size-16 bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden">
                                        <img src="${qr.qrImage}" alt="QR" class="w-full h-full object-contain" />
                                    </div>
                                    <div class="flex flex-col">
                                        <div class="flex items-center gap-2">
                                            <a href="${shortUrl}" target="_blank" class="text-primary font-bold hover:underline text-sm">/${link.shortCode}</a>
                                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/10 uppercase font-bold">${link.type || 'Short'}</span>
                                        </div>
                                        <span class="text-xs text-slate-400 truncate max-w-[250px]" title="${link.originalUrl}">${link.originalUrl}</span>
                                        ${link.caption ? `<span class="text-[11px] text-slate-500 mt-1 italic"># ${link.caption}</span>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-slate-400 text-sm">
                                <div class="flex flex-col">
                                    <span>${new Date(qr.createdAt).toLocaleDateString()}</span>
                                    <span class="text-[10px] opacity-50">${new Date(qr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusClass}">
                                    ${qr.status === 'active' ? '<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>' : ''}
                                    ${qr.status.charAt(0).toUpperCase() + qr.status.slice(1)}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex flex-col items-end">
                                    <span class="text-white font-bold text-lg">${qr.scans || 0}</span>
                                    <span class="text-[10px] text-slate-500 uppercase tracking-wider">Total Scans</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <a href="${qr.qrImage}" download="qr-${link.shortCode}.png" class="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors" title="Download PNG">
                                        <span class="material-symbols-outlined">download</span>
                                    </a>
                                    <button class="delete-qr-btn text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors" data-id="${qr._id}" title="Delete">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                updateQRPagination({
                    totalCount: data.total,
                    currentPage: data.page,
                    limit: data.limit,
                    totalPages: data.pages
                });

                document.querySelectorAll('.delete-qr-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        const id = e.currentTarget.dataset.id;
                        showConfirmModal('Delete QR?', 'This will permanently remove this QR code record.', async () => {
                            try {
                                const res = await fetch(`${API_BASE}/api/qr/${id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': token }
                                });
                                if (res.ok) {
                                    showNotification('QR Code deleted');
                                    fetchQRCodes();
                                }
                            } catch (err) { console.error(err); }
                        });
                    };
                });

            } catch (err) {
                console.error(err);
                if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400">Error loading QR codes.</td></tr>`;
            }
        };

        const updateQRPagination = (meta) => {
            const status = document.getElementById('pagination-status');
            const container = document.getElementById('pagination-container');
            if (!status || !container) return;

            const start = (meta.currentPage - 1) * meta.limit + 1;
            const end = Math.min(meta.currentPage * meta.limit, meta.totalCount);

            // Format: "1-40 of 84"
            status.innerHTML = `<span class="font-bold text-white">${meta.totalCount > 0 ? start : 0}-${end}</span> of <span class="font-bold text-white">${meta.totalCount}</span> QR codes`;

            let html = '';
            html += `<button onclick="changeQRPage(${meta.currentPage - 1})" ${meta.currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-700 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><span class="material-symbols-outlined">chevron_left</span></button>`;

            for (let i = 1; i <= meta.totalPages; i++) {
                if (i === meta.currentPage) {
                    html += `<span class="relative z-10 inline-flex items-center bg-primary px-4 py-2 text-sm font-semibold text-white focus:z-20">${i}</span>`;
                } else if (i <= 2 || i === meta.totalPages || (i >= meta.currentPage - 1 && i <= meta.currentPage + 1)) {
                    html += `<button onclick="changeQRPage(${i})" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-400 ring-1 ring-inset ring-slate-700 hover:bg-slate-800 transition-colors">${i}</button>`;
                } else if (i === 3 && meta.currentPage > 4) {
                    html += `<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-400 ring-1 ring-inset ring-slate-700">...</span>`;
                }
            }

            html += `<button onclick="changeQRPage(${meta.currentPage + 1})" ${meta.currentPage === meta.totalPages ? 'disabled' : ''} class="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-700 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><span class="material-symbols-outlined">chevron_right</span></button>`;
            container.innerHTML = html;
        };

        window.changeQRPage = (page) => { qrCurrentPageNum = page; fetchQRCodes(); };

        // Event Listeners for Filters
        if (statusFilter) statusFilter.onchange = (e) => { qrStatus = e.target.value; qrCurrentPageNum = 1; fetchQRCodes(); };
        if (dateFilter) dateFilter.onchange = (e) => {
            qrDateRange = e.target.value;
            if (qrDateRange === 'custom') {
                customDateRange && customDateRange.classList.remove('hidden');
            } else {
                customDateRange && customDateRange.classList.add('hidden');
                qrCurrentPageNum = 1;
                fetchQRCodes();
            }
        };
        if (captionFilter) captionFilter.onchange = (e) => { qrCaption = e.target.value; qrCurrentPageNum = 1; fetchQRCodes(); };
        if (applyCustomBtn) applyCustomBtn.onclick = () => {
            qrStartDate = startDateInput.value;
            qrEndDate = endDateInput.value;
            if (qrStartDate && qrEndDate) {
                qrCurrentPageNum = 1;
                fetchQRCodes();
            } else {
                showNotification('Please select both dates', 'error');
            }
        };

        // Search logic
        if (searchInput && resultsDropdown) {
            let debounce;
            searchInput.oninput = (e) => {
                const val = e.target.value.trim();
                qrSearch = val;
                clearTimeout(debounce);

                if (!val) {
                    resultsDropdown.classList.add('hidden');
                    qrCurrentPageNum = 1;
                    fetchQRCodes();
                    return;
                }

                loading && loading.classList.remove('hidden');
                debounce = setTimeout(async () => {
                    qrCurrentPageNum = 1;
                    fetchQRCodes();
                    try {
                        const res = await fetch(`${API_BASE}/api/links?search=${val}&limit=5`, { headers: { 'Authorization': token } });
                        const d = await res.json();
                        loading && loading.classList.add('hidden');
                        resultsDropdown.innerHTML = '';
                        resultsDropdown.classList.remove('hidden');
                        if (d.links?.length > 0) {
                            d.links.forEach(l => {
                                const item = document.createElement('div');
                                item.className = 'px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors border-b border-white/5 last:border-0';
                                item.innerHTML = `<div class="size-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">${l.shortCode[0].toUpperCase()}</div><div class="flex flex-col overflow-hidden"><span class="text-white text-sm font-medium">${l.shortCode}</span><span class="text-[11px] text-slate-500 truncate max-w-[200px]">${l.originalUrl}</span></div>`;
                                item.onclick = () => { searchInput.value = l.shortCode; qrSearch = l.shortCode; resultsDropdown.classList.add('hidden'); qrCurrentPageNum = 1; fetchQRCodes(); };
                                resultsDropdown.appendChild(item);
                            });
                        } else {
                            resultsDropdown.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">No links found</div>`;
                        }
                    } catch (err) { console.error(err); loading && loading.classList.add('hidden'); }
                }, 400);
            };
            document.addEventListener('click', (e) => { if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) resultsDropdown.classList.add('hidden'); });
        }
        fetchQRCodes();
    }

    // --- PREMIUM SUCCESS MODAL ---
    const showSuccessModal = (title, message) => {
        let modal = document.getElementById('premium-success-modal');
        if (!modal) {
            const modalHTML = `
                <div id="premium-success-modal" class="fixed inset-0 z-[3000] hidden flex items-center justify-center p-4">
                    <div id="success-modal-overlay" class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
                    <div class="bg-[#1a1625] relative w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(91,19,236,0.3)] animate-fade-in-up border border-primary/20">
                        <div class="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6 relative">
                            <div class="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                            <span class="material-symbols-outlined text-5xl relative z-10">check_circle</span>
                        </div>
                        <h3 class="text-2xl font-black text-white mb-2" id="success-modal-title">Success!</h3>
                        <p class="text-gray-400 mb-8 leading-relaxed" id="success-modal-message">Your message has been sent successfully.</p>
                        <button id="success-modal-close" class="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/30">Continue</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('premium-success-modal');
        }

        const titleEl = document.getElementById('success-modal-title');
        const msgEl = document.getElementById('success-modal-message');
        const closeBtn = document.getElementById('success-modal-close');
        const overlay = document.getElementById('success-modal-overlay');

        titleEl.textContent = title;
        msgEl.textContent = message;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        closeBtn.onclick = closeModal;
        overlay.onclick = closeModal;
    };

    // --- CONTACT PAGE LOGIC ---
    if (currentPage === 'contact.html') {
        const contactForm = document.getElementById('contact-form');
        const submitBtn = document.getElementById('contact-submit');
        const submitText = document.getElementById('submit-text');
        const submitIcon = document.getElementById('submit-icon');

        if (contactForm) {
            contactForm.onsubmit = async (e) => {
                e.preventDefault();

                const name = document.getElementById('contact-name').value;
                const email = document.getElementById('contact-email').value;
                const subject = document.getElementById('contact-subject').value;
                const message = document.getElementById('contact-message').value;

                try {
                    // Update UI to loading state
                    submitBtn.disabled = true;
                    submitText.textContent = 'Sending...';
                    submitIcon.innerHTML = 'refresh';
                    submitIcon.classList.add('animate-spin');

                    const res = await fetch(`${API_BASE}/api/contact`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, subject, message })
                    });

                    const data = await res.json();

                    if (res.ok) {
                        showSuccessModal('Message Sent!', 'Thank you for reaching out. Our support team will get back to you within 24 hours at ' + email);
                        contactForm.reset();
                    } else {
                        throw new Error(data.error || 'Failed to send message');
                    }
                } catch (err) {
                    console.error('Contact error:', err);
                    showNotification(err.message || 'Error sending message. Please try again.', 'error');
                } finally {
                    // Restore UI
                    submitBtn.disabled = false;
                    submitText.textContent = 'Send Message';
                    submitIcon.innerHTML = 'send';
                    submitIcon.classList.remove('animate-spin');
                }
            };
        }
    }

    // --- SETTINGS PAGE LOGIC ---
    if (currentPage === 'setting.html') {
        const updateBillingStatus = (user) => {
            const starterBadge = document.getElementById('starter-badge');
            const trialTimer = document.getElementById('trial-timer');
            const daysLeftDisplay = document.getElementById('days-left');
            const trialProgress = document.getElementById('trial-progress');
            const startTrialBtn = document.getElementById('start-trial-btn');
            const guestPlanStatus = document.getElementById('guest-plan-status');

            if (user) {
                if (starterBadge) starterBadge.classList.remove('hidden');
                if (trialTimer) trialTimer.classList.remove('hidden');
                if (startTrialBtn) startTrialBtn.classList.add('hidden');
                if (guestPlanStatus) guestPlanStatus.classList.remove('hidden');

                const createdAt = new Date(user.createdAt);
                const now = new Date();
                const trialLength = 30 * 24 * 60 * 60 * 1000;
                const expirationDate = new Date(createdAt.getTime() + trialLength);
                const timeDiff = expirationDate - now;
                const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

                if (daysLeftDisplay) daysLeftDisplay.textContent = `${daysLeft} days left`;
                const progress = Math.max(0, (daysLeft / 30) * 100);
                if (trialProgress) trialProgress.style.width = `${progress}%`;

                if (daysLeft === 0) {
                    if (daysLeftDisplay) {
                        daysLeftDisplay.textContent = 'Trial Expired';
                        daysLeftDisplay.classList.add('text-red-400');
                    }
                    if (trialProgress) trialProgress.classList.replace('bg-primary', 'bg-red-400');
                }
            } else {
                if (starterBadge) starterBadge.classList.add('hidden');
                if (trialTimer) trialTimer.classList.add('hidden');
                if (startTrialBtn) startTrialBtn.classList.remove('hidden');
                if (guestPlanStatus) guestPlanStatus.classList.add('hidden');
            }
        };

        // Handle Sidebar Navigation with View Toggling
        const settingsSidebarLinks = document.querySelectorAll('aside a[href^="#"]');
        const accountView = document.getElementById('account-view');
        const billingView = document.getElementById('billing-view');
        const settingsTitle = document.getElementById('settings-title');
        const settingsSubtitle = document.getElementById('settings-subtitle');

        settingsSidebarLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);

                // Update Active State in Sidebar
                settingsSidebarLinks.forEach(l => {
                    l.classList.remove('bg-primary/10', 'text-primary', 'border', 'border-primary/20', 'shadow-glow');
                    l.classList.add('text-text-secondary', 'hover:bg-white/5');
                    const icon = l.querySelector('.material-symbols-outlined');
                    if (icon) icon.classList.remove('filled');
                });
                link.classList.add('bg-primary/10', 'text-primary', 'border', 'border-primary/20', 'shadow-glow');
                link.classList.remove('text-text-secondary', 'hover:bg-white/5');
                const icon = link.querySelector('.material-symbols-outlined');
                if (icon) icon.classList.add('filled');

                // Toggle Views
                if (targetId === 'billing-section') {
                    if (accountView) accountView.classList.add('hidden');
                    if (billingView) billingView.classList.remove('hidden');
                    if (settingsTitle) settingsTitle.textContent = 'Billing & Plans';
                    if (settingsSubtitle) settingsSubtitle.textContent = 'Choose a plan that fits your needs.';
                } else {
                    if (accountView) accountView.classList.remove('hidden');
                    if (billingView) billingView.classList.add('hidden');
                    if (settingsTitle) settingsTitle.textContent = 'My Account';
                    if (settingsSubtitle) settingsSubtitle.textContent = 'Manage your personal information and security.';
                }
            };
        });

        const fetchUserData = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { 'Authorization': token }
                });
                if (!res.ok) throw new Error('Failed to fetch user');
                const user = await res.json();

                // Fill inputs
                if (document.getElementById('setting-username')) document.getElementById('setting-username').value = user.username;
                if (document.getElementById('setting-email')) document.getElementById('setting-email').value = user.email;
                if (document.getElementById('profile-name-display')) document.getElementById('profile-name-display').textContent = user.username;
                if (document.getElementById('profile-email-display')) document.getElementById('profile-email-display').textContent = user.email;

                const joinedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
                if (document.getElementById('profile-joined-display')) document.getElementById('profile-joined-display').textContent = joinedDate;

                const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=5b13ec&color=fff`;
                const avatarEl = document.getElementById('profile-avatar-large');
                if (avatarEl) avatarEl.style.backgroundImage = `url('${avatarUrl}')`;

                // Also update global avatar/name
                const globalAvatar = document.getElementById('user-avatar');
                const globalName = document.getElementById('user-name');
                if (globalAvatar) globalAvatar.style.backgroundImage = `url('${avatarUrl}')`;
                if (globalName) globalName.textContent = user.username;

                // Put username back to localStorage just in case it changed
                localStorage.setItem('username', user.username);

                // Update Billing trial status
                if (typeof updateBillingStatus === 'function') {
                    updateBillingStatus(user);
                }

            } catch (err) {
                console.error(err);
                showNotification('Error loading settings', 'error');
            }
        };

        fetchUserData();

        // Profile Form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.onsubmit = async (e) => {
                e.preventDefault();
                const username = document.getElementById('setting-username').value;
                const saveBtn = document.getElementById('save-profile-text');
                const saveIcon = document.getElementById('save-profile-icon');

                try {
                    saveBtn.textContent = 'Saving...';
                    saveIcon.innerHTML = 'refresh';
                    saveIcon.classList.add('animate-spin');

                    const res = await fetch(`${API_BASE}/api/auth/profile`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token
                        },
                        body: JSON.stringify({ username })
                    });

                    if (res.ok) {
                        showNotification('Profile updated successfully');
                        fetchUserData();
                    } else {
                        const data = await res.json();
                        throw new Error(data.error || 'Update failed');
                    }
                } catch (err) {
                    showNotification(err.message, 'error');
                } finally {
                    saveBtn.textContent = 'Save Changes';
                    saveIcon.innerHTML = 'save';
                    saveIcon.classList.remove('animate-spin');
                }
            };
        }

        // Password Form
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.onsubmit = async (e) => {
                e.preventDefault();
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;

                if (newPassword !== confirmPassword) {
                    return showNotification('New passwords do not match', 'error');
                }

                try {
                    const res = await fetch(`${API_BASE}/api/auth/password`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token
                        },
                        body: JSON.stringify({ currentPassword, newPassword })
                    });

                    if (res.ok) {
                        showNotification('Password updated successfully');
                        passwordForm.reset();
                    } else {
                        const data = await res.json();
                        throw new Error(data.error || 'Update failed');
                    }
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            };
        }

        // Avatar Upload
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Avatar = reader.result;
                    try {
                        const res = await fetch(`${API_BASE}/api/auth/profile`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': token
                            },
                            body: JSON.stringify({ avatar: base64Avatar })
                        });
                        if (res.ok) {
                            showNotification('Avatar updated');
                            fetchUserData();
                        } else {
                            throw new Error('Upload failed');
                        }
                    } catch (err) {
                        showNotification(err.message, 'error');
                    }
                };
                reader.readAsDataURL(file);
            };
        }

        // Avatar Remove
        const removeAvatarBtn = document.getElementById('remove-avatar-btn');
        if (removeAvatarBtn) {
            removeAvatarBtn.onclick = async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/auth/profile`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token
                        },
                        body: JSON.stringify({ avatar: '' })
                    });
                    if (res.ok) {
                        showNotification('Avatar removed');
                        fetchUserData();
                    }
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            };
        }

    }

    const logoutBtnSidebar = document.getElementById('logout-btn-sidebar');
    if (logoutBtnSidebar) {
        logoutBtnSidebar.onclick = () => {
            showConfirmModal('Logout?', 'Are you sure you want to log out of your session?', logout, {
                confirmText: 'Logout Now',
                confirmClass: 'bg-primary hover:bg-primary-hover shadow-primary/30'
            });
        };
    }

    // --- PROMO POPUP LOGIC ---
    if (currentPage === 'index.html' || currentPage === '') {
        const promoPopup = document.getElementById('promo-popup');
        const promoClose = document.getElementById('promo-close');

        if (promoPopup && promoClose) {
            setTimeout(() => {
                promoPopup.classList.remove('hidden');
                // Trigger reflow for transition
                void promoPopup.offsetWidth;
                promoPopup.classList.remove('transform', '-translate-y-20', 'opacity-0');
            }, 500); // 0.5 seconds

            promoClose.onclick = () => {
                promoPopup.classList.add('opacity-0', '-translate-y-20');
                setTimeout(() => {
                    promoPopup.classList.add('hidden');
                }, 500);
            };
        }
    }
});

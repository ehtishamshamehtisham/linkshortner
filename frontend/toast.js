/**
 * Toast Notification System for SecureShare
 * Provides non-blocking, beautiful popups instead of standard alerts.
 */

(function () {
    // Inject styles for toasts
    const style = document.createElement('style');
    style.textContent = `
        #toast-container {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-col: column;
            gap: 12px;
            pointer-events: none;
        }

        .toast-item {
            min-width: 300px;
            max-width: 450px;
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: auto;
            animation: toast-slide-in 0.3s ease-out forwards;
            border-left: 4px solid #2513ec;
            transition: all 0.3s ease;
        }

        .dark .toast-item {
            background: #1e1b3a;
            color: white;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .toast-item.success { border-left-color: #10b981; }
        .toast-item.error { border-left-color: #ef4444; }
        .toast-item.warning { border-left-color: #f59e0b; }
        .toast-item.info { border-left-color: #2513ec; }

        .toast-icon {
            font-size: 24px;
            flex-shrink: 0;
        }

        .toast-item.success .toast-icon { color: #10b981; }
        .toast-item.error .toast-icon { color: #ef4444; }
        .toast-item.warning .toast-icon { color: #f59e0b; }
        .toast-item.info .toast-icon { color: #2513ec; }

        .toast-content {
            flex-grow: 1;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.4;
        }

        .toast-close {
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;
        }

        .toast-close:hover { opacity: 1; }

        @keyframes toast-slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes toast-fade-out {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }

        @media (max-width: 640px) {
            #toast-container {
                top: auto;
                bottom: 24px;
                left: 24px;
                right: 24px;
            }
            .toast-item {
                min-width: 0;
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    window.showToast = function (message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;

        let iconName = 'info';
        if (type === 'success') iconName = 'check_circle';
        if (type === 'error') iconName = 'error';
        if (type === 'warning') iconName = 'warning';

        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">${iconName}</span>
            <div class="toast-content">${message}</div>
            <span class="material-symbols-outlined toast-close text-sm" onclick="this.parentElement.remove()">close</span>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'toast-fade-out 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };
})();

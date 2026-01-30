// BACKEND BASE URL
const API_BASE = "https://linkshortner-6ils.onrender.com";



// Selectors
const textDataInput = document.getElementById('textDataInput');
const linkDataInput = document.getElementById('linkDataInput');
const imageDropZone = document.getElementById('imageDropZone');
// Video dropzone removed
const selectedImagesList = document.getElementById('selectedImagesList');
// Video list removed

const textInputArea = document.getElementById('textInputArea');
const linkInputArea = document.getElementById('linkInputArea');
const imageInputArea = document.getElementById('imageInputArea');
const videoInputArea = document.getElementById('videoInputArea');

const tabs = {
    text: document.getElementById('textTabBtn'),
    link: document.getElementById('linkTabBtn'),
    image: document.getElementById('imageTabBtn'),
    video: document.getElementById('videoTabBtn')
};

const areas = {
    text: textInputArea,
    link: linkInputArea,
    image: imageInputArea,
    video: videoInputArea
};

let activeTab = 'text';
let uploadedFiles = [];

// Tab Logic
const switchTab = (type) => {
    activeTab = type;
    Object.keys(tabs).forEach(key => {
        tabs[key].className = `flex-1 min-w-[100px] flex flex-col items-center justify-center border-b-[3px] ${key === type ? 'border-b-primary text-slate-900 dark:text-white' : 'border-b-transparent text-slate-400'} pb-3 pt-4 cursor-pointer whitespace-nowrap transition-all`;
        areas[key].classList.toggle('hidden', key !== type);
    });
};

tabs.text.onclick = (e) => { e.preventDefault(); switchTab('text'); };
tabs.link.onclick = (e) => { e.preventDefault(); switchTab('link'); };
tabs.image.onclick = (e) => { e.preventDefault(); switchTab('image'); };
tabs.video.onclick = (e) => { e.preventDefault(); switchTab('video'); };

// File Logic
const addFiles = (files, type) => {
    const maxSizeMB = type === 'image' ? 5 : 15;
    files.forEach(file => {
        if (!file.type.startsWith(type + '/')) {
            showToast(`File "${file.name}" is not a valid ${type}.`, 'error');
            return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`File "${file.name}" exceeds the ${maxSizeMB}MB limit.`, 'error');
            return;
        }
        if (uploadedFiles.length >= 5) {
            showToast("Maximum 5 files allowed total.", 'warning');
            return;
        }
        uploadedFiles.push(file);
    });
    renderFiles();
};

const imageInput = document.createElement('input');
imageInput.type = 'file';
imageInput.accept = 'image/*';
imageInput.multiple = true;
imageInput.className = 'hidden';
document.body.appendChild(imageInput);

// Video input removed

imageDropZone.onclick = () => imageInput.click();
// Video dropzone event removed

imageInput.onchange = () => { addFiles(Array.from(imageInput.files), 'image'); imageInput.value = ''; };
// Video input event removed

function renderFiles() {
    selectedImagesList.innerHTML = '';
    // Video list rendering removed
    uploadedFiles.forEach((file, index) => {
        // Only handle images for now
        if (file.type.startsWith('image/')) {
            const chip = document.createElement('div');
            chip.className = 'flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20';
            chip.innerHTML = `
                <span class="truncate max-w-[150px]">${file.name}</span>
                <button onclick="removeFile(${index})" class="hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            `;
            selectedImagesList.appendChild(chip);
        }
    });
}

window.removeFile = (index) => {
    uploadedFiles.splice(index, 1);
    renderFiles();
};

// Upload Logic
const generateBtn = document.getElementById('generateBtn');
const passwordInput = document.getElementById('passwordInput');
const expirySelect = document.getElementById('expirySelect');
const maxViewsSelect = document.getElementById('maxViewsSelect');
const resultCard = document.getElementById('resultCard');
const shareLinkInput = document.getElementById('shareLinkInput');

generateBtn.onclick = async () => {
    const password = passwordInput.value;
    const expiry = expirySelect.value;
    const maxViews = maxViewsSelect.value;

    if (!password) { showToast('Please set a password for security.', 'warning'); return; }

    const text = textDataInput.value.trim();
    const link = linkDataInput.value.trim();

    // Check content availability
    if (activeTab === 'video') {
        if (!text && !link && uploadedFiles.length === 0) {
            showToast('Video uploads are currently disabled. Please add Text, Link, or Images.', 'info');
            return;
        }
    } else {
        if (!text && !link && uploadedFiles.length === 0) {
            showToast('Please fill out the content in the active tab before generating.', 'warning');
            return;
        }
    }

    let expiryMinutes = 60;
    if (expiry.includes('1 minute')) expiryMinutes = 1;
    if (expiry.includes('2 minutes')) expiryMinutes = 2;
    if (expiry.includes('5 minutes')) expiryMinutes = 5;
    if (expiry.includes('10 minutes')) expiryMinutes = 10;
    if (expiry.includes('1 hour')) expiryMinutes = 60;
    if (expiry.includes('2 hours')) expiryMinutes = 120;
    if (expiry.includes('6 hours')) expiryMinutes = 360;
    if (expiry.includes('10 hours')) expiryMinutes = 600;
    if (expiry.includes('24 hours')) expiryMinutes = 1440;

    const formData = new FormData();
    formData.append('password', password);
    formData.append('expiryMinutes', expiryMinutes);
    formData.append('maxViews', maxViews);
    if (text) formData.append('textData', text);
    if (link) formData.append('linkData', link);
    uploadedFiles.forEach(file => formData.append('files', file));

    generateBtn.disabled = true;
    generateBtn.innerText = 'Creating Secure Share...';

    try {
        const res = await fetch(`${API_BASE}/api/content/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            // HIGH-RESILIENCE URL: Using Hash (#)
            const shareUrl = new URL('secureunlock.html', window.location.href);
            shareUrl.hash = `id=${data.shareId}`;
            shareLinkInput.value = shareUrl.toString();

            resultCard.classList.remove('hidden');
            resultCard.scrollIntoView({ behavior: 'smooth' });
        } else {
            showToast(data.message || 'Upload failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error. Is the backend running?', 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerText = 'Generate Secure Link';
    }
};

document.getElementById('copyBtn').onclick = () => {
    shareLinkInput.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard!', 'success');
};

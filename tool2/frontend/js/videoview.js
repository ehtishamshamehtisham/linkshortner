const contentData = JSON.parse(sessionStorage.getItem('secure_content'));

if (!contentData || contentData.contentType !== 'video') {
    showToast('Invalid session or content type.', 'error');
    setTimeout(() => {
        window.location.href = 'securetool.html';
    }, 2000);
}

const mainVideo = document.getElementById('mainVideo');
const videoSource = document.getElementById('videoSource');
const createdAtDisplay = document.getElementById('createdAt');
const closeBtn = document.getElementById('closeVideoBtn');
const topCloseBtn = document.querySelector('header button');

// Populate
videoSource.src = contentData.fileUrl;
mainVideo.load();
createdAtDisplay.innerText = new Date(contentData.createdAt).toLocaleString();

const handleClose = () => {
    if (confirm('Ready to close? This video will no longer be accessible.')) {
        sessionStorage.removeItem('secure_content');
        window.location.href = 'index.html';
    }
};

closeBtn.onclick = handleClose;
topCloseBtn.onclick = handleClose;

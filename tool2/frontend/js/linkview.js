const contentData = JSON.parse(sessionStorage.getItem('secure_content'));

if (!contentData || contentData.contentType !== 'link') {
    showToast('Invalid session or content type.', 'error');
    setTimeout(() => {
        window.location.href = 'securetool.html';
    }, 2000);
}

const linkInput = document.getElementById('linkInput');
const openLinkBtn = document.getElementById('openLinkBtn');
const copyBtn = document.getElementById('copyBtn');

// Populate
linkInput.value = contentData.textData;

openLinkBtn.onclick = () => {
    if (confirm('You are about to visit an external link. Continue?')) {
        window.open(contentData.textData, '_blank');
    }
};

copyBtn.onclick = () => {
    navigator.clipboard.writeText(contentData.textData);
    showToast('Link copied to clipboard!', 'success');
};

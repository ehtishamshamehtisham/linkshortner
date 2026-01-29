const contentData = JSON.parse(sessionStorage.getItem('secure_content'));

if (!contentData || contentData.contentType !== 'image') {
    showToast('Invalid session or content type.', 'error');
    setTimeout(() => {
        window.location.href = 'securetool.html';
    }, 2000);
}

const mainImage = document.getElementById('mainImage');
const fileName = document.getElementById('fileName');
const fileType = document.getElementById('fileType');
const downloadBtn = document.getElementById('downloadBtn');
const fullSizeBtn = document.getElementById('fullSizeBtn');
const closeBtn = document.querySelector('header button');

// Populate
mainImage.src = contentData.fileUrl;
fileName.innerText = `Secure_Image_${Math.random().toString(36).substr(2, 5)}.png`;
fileType.innerText = `Encrypted Image • ${new Date(contentData.createdAt).toLocaleDateString()}`;

closeBtn.onclick = () => {
    if (confirm('Are you sure? Once closed, you won\'t be able to access this link again.')) {
        sessionStorage.removeItem('secure_content');
        window.location.href = 'index.html';
    }
};

downloadBtn.onclick = async () => {
    try {
        const response = await fetch(contentData.fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.innerText;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Download error:', err);
        showToast('Could not download image.', 'error');
    }
};

fullSizeBtn.onclick = () => {
    window.open(contentData.fileUrl, '_blank');
};

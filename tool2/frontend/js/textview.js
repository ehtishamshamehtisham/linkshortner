const contentData = JSON.parse(sessionStorage.getItem('secure_content'));

if (!contentData) {
    showToast('No content found or session expired.', 'error');
    setTimeout(() => {
        window.location.href = 'securetool.html';
    }, 2000);
}

// Populate Content
document.getElementById('textContent').innerText = contentData.textData;
document.getElementById('displayId').innerText = `ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// Timer Logic
const expiresAt = new Date(contentData.expiresAt).getTime();
const timerMins = document.getElementById('timerMins');
const timerSecs = document.getElementById('timerSecs');

function updateTimer() {
    const now = new Date().getTime();
    const distance = expiresAt - now;

    if (distance < 0) {
        clearInterval(timerInterval);
        timerMins.innerText = "00";
        timerSecs.innerText = "00";
        showToast('This content has expired and self-destructed.', 'warning');
        setTimeout(() => {
            window.location.href = 'securetool.html';
        }, 2000);
        return;
    }

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    timerMins.innerText = minutes.toString().padStart(2, '0');
    timerSecs.innerText = seconds.toString().padStart(2, '0');
}

const timerInterval = setInterval(updateTimer, 1000);
updateTimer();

// Copy Logic
document.querySelector('button.group').onclick = () => {
    navigator.clipboard.writeText(contentData.textData);
    showToast('Text copied to clipboard!', 'success');
};

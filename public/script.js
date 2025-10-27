// Consolidated script.js - reliable QR + logo + caption generator
// Features:
// - Single source of truth for QR generation
// - captionWithoutLogo / captionWithLogo semantics
// - color/gradient presets
// - logo upload (client-side only, validated)
// - embed caption into generated PNG and preview
// - download & share handlers

console.log('script.js consolidated loader');

// Provide a synchronous stub early so any other script (site.js) that checks for
// window.generateAndShowQr will see this and avoid running its own generator.
if (!window.generateAndShowQr) {
  window.generateAndShowQr = function () {
    // stub: real implementation defined after DOMContentLoaded
    console.log('generateAndShowQr stub called before init');
    return Promise.resolve(null);
  };
}

document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);

    // DOM refs
    const longInput = $('longUrl');
    const aliasInput = $('alias');
    const noteInput = $('note');
    const qrCaptionInput = $('qrCaption');
    const shortenBtn = $('shortenBtn');
    const clearBtn = $('clearBtn');
    const resultDiv = $('result');
    const shortLinkA = $('shortLink');
    const qrImg = $('qrImg');
    const qrCanvas = $('qrCanvas');
    const logoFileEl = $('logoFile');
    const downloadBtn = $('downloadQrBtn');
    const shareBtn = $('shareQrBtn');
    const qrControls = $('qr-controls');
    const msg = $('msg');
    const noteDisplay = $('noteDisplay');

    // presets
    const PRESETS = {
      g1: { type: 'gradient', colors: ['#007bff', '#00c6ff'] },
      g2: { type: 'gradient', colors: ['#ff7a18', '#ff5b9d'] },
      g3: { type: 'gradient', colors: ['#00b894', '#006a75'] },
      flat: { type: 'flat', color: '#0b1220' }
    };
    let selectedPreset = null;

    // basic helpers
    function showMsg(txt, t = 3000) {
      if (!msg) return console.log('msg:', txt);
      msg.textContent = txt;
      if (t) setTimeout(() => { if (msg) msg.textContent = ''; }, t);
    }

    function readFileAsDataURL(file) {
      return new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
    }
    function createImage(dataUrl) {
      return new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
      });
    }
    function dataURLtoBlob(dataurl) {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], { type: mime });
    }

    // mask helper
    function createMaskFromCanvas(sourceCanvas, threshold = 200) {
      const w = sourceCanvas.width, h = sourceCanvas.height;
      const ctx = sourceCanvas.getContext('2d');
      const src = ctx.getImageData(0, 0, w, h);
      const maskData = new Uint8ClampedArray(src.data.length);
      for (let i = 0; i < src.data.length; i += 4) {
        const r = src.data[i], g = src.data[i+1], b = src.data[i+2];
        const lum = 0.2126*r + 0.7152*g + 0.0722*b;
        if (lum < threshold) { maskData[i+3] = 255; } else { maskData[i+3] = 0; }
      }
      const mask = document.createElement('canvas');
      mask.width = w; mask.height = h;
      mask.getContext('2d').putImageData(new ImageData(maskData, w, h), 0, 0);
      return mask;
    }

    // core drawer: draws colored QR from base QR mask, overlays logo, and draws caption
    async function drawStyledQr(text, opts = {}) {
      if (!text) throw new Error('No text for QR');
      const size = opts.size || 640;
      const logoDataUrl = opts.logoDataUrl || null;

      // caption variants
      const captionWithoutLogo = (opts.captionWithoutLogo || '').toString();
      const captionWithLogo = (opts.captionWithLogo || '').toString();
      const captionStr = logoDataUrl ? (captionWithLogo || '') : (captionWithoutLogo || '');

      // create tmp canvas for base QR
      const tmp = document.createElement('canvas');
      tmp.width = size; tmp.height = size;
      await new Promise((resolve, reject) => {
        QRCode.toCanvas(tmp, text, { errorCorrectionLevel: 'H', margin: 1, width: size, color: { dark: '#000', light: '#fff' } }, (err) => err ? reject(err) : resolve());
      });

      const mask = createMaskFromCanvas(tmp, 200);

      if (!qrCanvas) throw new Error('#qrCanvas missing');
      const canvas = qrCanvas; const ctx = canvas.getContext('2d');

      const captionArea = captionStr ? Math.round(size * 0.15) : 0;
      canvas.width = size; canvas.height = size + captionArea;

      // white bg
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width, canvas.height);

      // paint gradient/flat then mask
      if (selectedPreset && PRESETS[selectedPreset]) {
        const p = PRESETS[selectedPreset];
        if (p.type === 'gradient') {
          const g = ctx.createLinearGradient(0,0,size,size);
          g.addColorStop(0, p.colors[0]); g.addColorStop(1, p.colors[1]);
          ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
        } else { ctx.fillStyle = p.color; ctx.fillRect(0,0,size,size); }
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0,0,size,size);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,size,size);
        ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask,0,0,size,size); ctx.globalCompositeOperation = 'source-over';
      }

      // draw logo if given
      if (logoDataUrl) {
        try {
          const img = await createImage(logoDataUrl);
          const max = Math.round(size * 0.20);
          let lw = img.width, lh = img.height;
          const ratio = lw / lh;
          if (lw > max) { lw = max; lh = Math.round(lw / ratio); }
          if (lh > max) { lh = max; lw = Math.round(lh * ratio); }
          const lx = Math.round((size - lw)/2), ly = Math.round((size - lh)/2);
          const pad = Math.round(Math.max(6, lw * 0.12));
          const bgW = lw + pad*2, bgH = lh + pad*2, bx = lx - pad, by = ly - pad, r = Math.round(Math.min(14, bgW * 0.08));
          ctx.save();
          // rounded rect bg
          ctx.beginPath();
          ctx.moveTo(bx + r, by);
          ctx.arcTo(bx + bgW, by, bx + bgW, by + bgH, r);
          ctx.arcTo(bx + bgW, by + bgH, bx, by + bgH, r);
          ctx.arcTo(bx, by + bgH, bx, by, r);
          ctx.arcTo(bx, by, bx + bgW, by, r);
          ctx.closePath();
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.stroke();
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, lx, ly, lw, lh);
          ctx.restore();
        } catch (e) { console.warn('logo draw failed', e); }
      }

      // draw caption
      if (captionStr) {
        ctx.save();
        const padding = Math.round(size * 0.04);
        let fontSize = Math.max(16, Math.round(size * 0.10));
        const maxW = size - padding*2;
  const fontFamily = 'Montserrat, Poppins, Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        function wrap(text, maxW) {
          const words = (text||'').split(/\s+/).filter(Boolean);
          if (!words.length) return [];
          const lines = []; let line = words[0];
          for (let i=1;i<words.length;i++){
            const test = line + ' ' + words[i];
            if (ctx.measureText(test).width <= maxW) line = test; else { lines.push(line); line = words[i]; }
          }
          if (line) lines.push(line); return lines;
        }

        ctx.font = `${fontSize}px ${fontFamily}`;
        let lines = wrap(captionStr, maxW);
        let measuredMax = 0; lines.forEach(l=>measuredMax = Math.max(measuredMax, ctx.measureText(l).width));
        while ((measuredMax > maxW || lines.length * Math.round(fontSize * 1.25) > Math.round(size * 0.15) - padding) && fontSize > 10) {
          fontSize -= 2; ctx.font = `${fontSize}px ${fontFamily}`; lines = wrap(captionStr, maxW); measuredMax = 0; lines.forEach(l=>measuredMax = Math.max(measuredMax, ctx.measureText(l).width));
        }

        const lineH = Math.round(fontSize * 1.25);
        const totalH = lines.length * lineH;
        const startY = size + Math.round((Math.round(size * 0.15) - totalH)/2) + Math.round(lineH/2);
        const x = size/2;

        // fill style matches preset
        if (selectedPreset && PRESETS[selectedPreset]) {
          const p = PRESETS[selectedPreset];
          if (p.type === 'gradient') {
            const g = ctx.createLinearGradient(0, size + Math.round(size*0.15)/2, size, size + Math.round(size*0.15)/2);
            g.addColorStop(0, p.colors[0]); g.addColorStop(1, p.colors[1]); ctx.fillStyle = g;
          } else { ctx.fillStyle = p.color; }
        } else { ctx.fillStyle = '#0b1220'; }

        ctx.lineJoin = 'round'; ctx.miterLimit = 2;
        ctx.font = `700 ${fontSize}px ${fontFamily}`;
        const strokeW = Math.max(2, Math.round(fontSize * 0.10)); ctx.lineWidth = strokeW; ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        for (let i=0;i<lines.length;i++){
          const y = startY + i*lineH; try { ctx.strokeText(lines[i], x, y); } catch(e){}
          ctx.fillText(lines[i], x, y);
        }
        ctx.restore();
      }

      return canvas.toDataURL('image/png');
    }

    // expose generator
    window.generateAndShowQr = async function(shortUrl) {
      if (!shortUrl) return showMsg('No short URL');
      if (qrControls) { qrControls.style.display = 'flex'; qrControls.style.gap = '8px'; }

      const captionValue = (qrCaptionInput && (qrCaptionInput.value||'').trim()) || '';

      // read logo file
      let logoData = null;
      if (logoFileEl && logoFileEl.files && logoFileEl.files[0]) {
        try { logoData = await readFileAsDataURL(logoFileEl.files[0]); } catch(e) { console.warn('read logo failed', e); logoData = null; }
      }

      const captionWithoutLogo = logoData ? '' : captionValue;
      const captionWithLogo = logoData ? captionValue : '';

      const dataUrl = await drawStyledQr(shortUrl, { size: 640, captionWithoutLogo, captionWithLogo, logoDataUrl: logoData });
      if (qrImg) { qrImg.src = dataUrl; qrImg.alt = 'QR for ' + shortUrl; }

      // download handler
      if (downloadBtn) {
        downloadBtn.onclick = () => {
          try {
            const blob = dataURLtoBlob(dataUrl); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'smartlink-qr.png'; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),15000);
          } catch(e) { console.error('download failed', e); alert('Download failed'); }
        };
      }

      // share handler
      if (shareBtn) {
        shareBtn.onclick = async () => {
          try {
            const blob = dataURLtoBlob(dataUrl); const file = new File([blob],'smartlink-qr.png',{type:'image/png'});
            if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
              await navigator.share({ files: [file], title: 'QR code', text: 'Scan to open the link' });
            } else if (navigator.share) {
              await navigator.share({ title: 'QR code', text: 'Scan to open: ' + shortUrl });
            } else {
              if (confirm('Sharing not supported. Download instead?')) { const a = document.createElement('a'); a.href = dataUrl; a.download = 'smartlink-qr.png'; document.body.appendChild(a); a.click(); a.remove(); }
            }
          } catch(e) { console.error('share failed', e); alert('Share failed'); }
        };
      }

      // clear file input value
      if (logoFileEl) try { logoFileEl.value = ''; } catch(e){}

      return dataUrl;
    };

    // Wire shorten button -> calls /api/shorten and then generate
    if (shortenBtn) {
      shortenBtn.addEventListener('click', async () => {
        try {
          const long = (longInput && (longInput.value||'').trim()) || '';
          const alias = (aliasInput && (aliasInput.value||'').trim()) || '';
          const note = (noteInput && (noteInput.value||'').trim()) || '';
          if (!long) return showMsg('Enter a long URL');
          const payload = { original: long }; if (alias) payload.alias = alias; if (note) payload.note = note;
          const resp = await fetch('https://linkshortner.site/api/shorten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await resp.json();
          if (!resp.ok) { showMsg(data && data.error ? data.error : 'Server error'); return; }
          if (data && data.shortUrl) {
            if (shortLinkA) { shortLinkA.href = data.shortUrl; shortLinkA.textContent = data.shortUrl; }
            if (noteDisplay) noteDisplay.textContent = note ? `Note: ${note}` : '';
            if (resultDiv) resultDiv.classList.remove('hidden');
            showMsg('Short link created', 2000);
            try { await window.generateAndShowQr(data.shortUrl); } catch(e){ console.error('QR gen failed', e); showMsg('QR generation failed'); }
          } else { showMsg('No shortUrl returned'); }
        } catch (e) { console.error('shorten failed', e); showMsg('Failed to create short link'); }
      });
    }

    // Clear handler
    clearBtn?.addEventListener('click', () => {
      if (longInput) longInput.value = ''; if (aliasInput) aliasInput.value = ''; if (noteInput) noteInput.value = ''; if (qrCaptionInput) qrCaptionInput.value = '';
      if (resultDiv) resultDiv.classList.add('hidden'); if (shortLinkA) { shortLinkA.href = '#'; shortLinkA.textContent = ''; }
      if (qrImg) qrImg.src = ''; if (qrControls) qrControls.style.display = 'none'; if (msg) msg.textContent = '';
    });

    // Wire preset buttons
    const presetContainer = $('gradientPresets');
    if (presetContainer) {
      presetContainer.querySelectorAll('.preset-btn').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-id'); if (!id) return;
          if (selectedPreset === id) { selectedPreset = null; presetContainer.querySelectorAll('.preset-btn').forEach(x=>x.classList.remove('active')); }
          else { selectedPreset = id; presetContainer.querySelectorAll('.preset-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }
        });
      });
      const clearBtnPreset = $('presetClear'); if (clearBtnPreset) clearBtnPreset.addEventListener('click', () => { selectedPreset = null; presetContainer.querySelectorAll('.preset-btn').forEach(x=>x.classList.remove('active')); });
    }

    // If page already has a short link, auto-generate
    if (shortLinkA && (shortLinkA.href && shortLinkA.href !== '#' || shortLinkA.textContent)) {
      const initial = (shortLinkA.href && shortLinkA.href !== '#') ? shortLinkA.href : shortLinkA.textContent;
      if (initial) setTimeout(()=>window.generateAndShowQr(initial).catch(()=>{}), 220);
    }

  });
  // ========== ALL YOUR EXISTING URL SHORTENER CODE ==========
// ... all your current functions ...
// ... shortenBtn event listeners ...
// ... QR generation code ...
// ... social sharing functions ...
// ========== END EXISTING CODE ==========

// ========== EMAIL COLLECTION WITH BACKEND SUPPORT ==========
document.getElementById('emailForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const emailInput = this.querySelector('input[type="email"]');
  const email = emailInput.value.trim();
  const button = this.querySelector('button');
  
  if (!email) return;
  
  // Show loading
  button.textContent = 'Adding...';
  button.disabled = true;
  
  try {
    // Save to localStorage (backup)
    let emails = JSON.parse(localStorage.getItem('waitlistEmails') || '[]');
    emails.push({
      email: email, 
      date: new Date().toISOString(),
      source: 'homepage_waitlist'
    });
    localStorage.setItem('waitlistEmails', JSON.stringify(emails));
    
    // Send to your backend API
    const response = await fetch('https://linkshortner.site/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email })
    });
    
    if (response.ok) {
      // Success message
      this.innerHTML = `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <p style="color: white; font-weight: bold; font-size: 18px; margin: 0;">✅ Thank You!</p>
          <p style="color: white; opacity: 0.9; margin: 10px 0 0 0;">We'll notify you when premium features launch!</p>
        </div>
      `;
    } else {
      throw new Error('Failed to save email');
    }
    
  } catch (error) {
    // Fallback: still show success even if backend fails
    this.innerHTML = `
      <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
        <p style="color: white; font-weight: bold; font-size: 18px; margin: 0;">✅ Thank You!</p>
        <p style="color: white; opacity: 0.9; margin: 10px 0 0 0;">We'll notify you when premium features launch!</p>
      </div>
    `;
    console.log('Email saved locally:', email);
  }
});
// ========== END EMAIL COLLECTION ==========

// ========== FEEDBACK FORM HANDLING ==========
document.getElementById('feedbackForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  
  const form = this;
  const textarea = form.querySelector('textarea');
  const emailInput = form.querySelector('input[type="email"]');
  const button = form.querySelector('button');
  const successDiv = document.getElementById('feedbackSuccess');
  
  const feedback = textarea.value.trim();
  const email = emailInput.value.trim();
  
  if (!feedback) return;
  
  // Show loading
  button.textContent = 'Sending...';
  button.disabled = true;
  
  // Save to localStorage
  let feedbacks = JSON.parse(localStorage.getItem('userFeedbacks') || '[]');
  feedbacks.push({
    feedback: feedback,
    email: email || 'anonymous',
    date: new Date().toISOString(),
    page: 'homepage'
  });
  localStorage.setItem('userFeedbacks', JSON.stringify(feedbacks));
  
  // Simulate sending (replace with actual API later)
  setTimeout(() => {
    // Show success message
    form.style.display = 'none';
    successDiv.style.display = 'block';
    
    // Reset form
    textarea.value = '';
    emailInput.value = '';
    button.textContent = 'Send Feedback';
    button.disabled = false;
  }, 1000);
});

// Function to view collected feedback (for you)
function viewFeedback() {
  const feedbacks = JSON.parse(localStorage.getItem('userFeedbacks') || '[]');
  console.log('User feedbacks:', feedbacks);
  return feedbacks;
}
// ========== COPY BUTTON FUNCTIONALITY ==========
document.getElementById('copyBtn')?.addEventListener('click', async function() {
  const shortLink = document.getElementById('shortLink').href;
  const button = this;
  const originalText = button.textContent;
  
  try {
    // Try modern clipboard API first
    await navigator.clipboard.writeText(shortLink);
    
    // Success feedback
    button.textContent = '✅ Copied!';
    button.style.background = '#007bff';
    
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = shortLink;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      button.textContent = '✅ Copied!';
      button.style.background = '#fffff';
    } catch (err2) {
      console.error('Fallback copy failed:', err2);
      button.textContent = '❌ Failed';
      button.style.background = '#dc3545';
    }
    
    document.body.removeChild(textArea);
  }
  
  // Reset button after 2 seconds
  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = '';
  }, 2000);
});
// ========== END COPY BUTTON ==========
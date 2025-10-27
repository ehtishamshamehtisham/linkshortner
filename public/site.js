// site.js - global UI helpers (mobile menu + scroll reveal + focus trap)
// Put this file in same folder as your pages and include it like:
// <script src="site.js"></script> (after your app script)

(() => {
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    const toggle = document.getElementById('mobileToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const backdrop = document.getElementById('mobileBackdrop');
    const mobileClose = document.getElementById('mobileClose');

    if (toggle && mobileMenu) {
      const openMenu = () => {
        document.body.classList.add('nav-open');
        toggle.setAttribute('aria-expanded', 'true');
        mobileMenu.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const first = mobileMenu.querySelector('a, button, input, [tabindex]:not([tabindex="-1"])');
        if (first) first.focus();
      };
      const closeMenu = () => {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        try { toggle.focus(); } catch(e) {}
      };
      const toggleMenu = () => (document.body.classList.contains('nav-open') ? closeMenu() : openMenu());

      // avoid duplicate attachments
      if (!toggle.__siteInstalled) {
        toggle.addEventListener('click', toggleMenu);
        toggle.__siteInstalled = true;
      }
      if (backdrop && !backdrop.__siteInstalled) {
        backdrop.addEventListener('click', closeMenu);
        backdrop.__siteInstalled = true;
      }
      if (mobileClose && !mobileClose.__siteInstalled) {
        mobileClose.addEventListener('click', closeMenu);
        mobileClose.__siteInstalled = true;
      }

      // mobile links: close menu and navigate (default navigation will still work)
      const mobileLinks = mobileMenu.querySelectorAll('a');
      mobileLinks.forEach(a => {
        if (a.__siteInstalled) return;
        a.addEventListener('click', () => {
          closeMenu();
          // let browser handle navigation, or a small delay can be added if desired
        });
        a.__siteInstalled = true;
      });

      // Esc to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('nav-open')) closeMenu();
      });

      // focus trap inside panel
      mobileMenu.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const focusable = mobileMenu.querySelectorAll('a,button,input,textarea,[tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    } // end toggle+mobileMenu

    // Scroll reveal for sections (optional)
    try {
      const sections = document.querySelectorAll('section');
      if ('IntersectionObserver' in window && sections.length) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach(en => {
            if (en.isIntersecting) en.target.classList.add('visible');
          });
        }, { threshold: 0.15 });
        sections.forEach(s => obs.observe(s));
      } else {
        document.querySelectorAll('section').forEach(s => s.classList.add('visible'));
      }
    } catch (e) {
      console.warn('scroll reveal init failed', e);
    }
  });
})();

/* ===========================================================
   QR + Logo + Caption module
   - auto-generates when #shortLink is updated
   - uses hidden canvas #qrCanvas to produce final image
   - supports logo upload (id="logoFile") and caption (id="qrCaption")
   - shows controls: #qr-controls, #downloadQrBtn, #shareQrBtn
   =========================================================== */

(function qrLogoModule(){
  // If another script already provides generateAndShowQr, don't run this module to avoid
  // duplicate QR generation and duplicated captions. script.js defines window.generateAndShowQr
  // earlier in the page, so prefer that implementation when present.
  if (window.generateAndShowQr) {
    console.log('site.js: generateAndShowQr already provided by another script — skipping site.js QR module');
    return;
  }
  // config
  const LOGO_MAX_BYTES = 300 * 1024; // 300 KB recommended
  const allowedTypes = ['image/png','image/jpeg','image/webp'];
  const QR_BASE_SIZE = 640; // base QR size in px (canvas height before caption)
  const CAPTION_AREA = 80;  // extra px below QR for caption text

  // DOM refs (may be missing on pages without generator — that's fine)
  const shortLinkEl = document.getElementById('shortLink');
  const logoFileEl = document.getElementById('logoFile');
  // optional caption input (if not present, we still allow caption from note)
  let captionInput = document.getElementById('qrCaption');
  const qrImgEl = document.getElementById('qrImg');
  const qrCanvas = document.getElementById('qrCanvas');
  const qrControls = document.getElementById('qr-controls');
  const downloadBtn = document.getElementById('downloadQrBtn');
  const shareBtn = document.getElementById('shareQrBtn');
  const noteInput = document.getElementById('note'); // re-use 'note' if caption input missing

  // safe no-op if no canvas / controls present
  if (!qrCanvas) {
    // nothing to do on pages without generator UI
    return;
  }

  // helper: draw rounded rect path
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // read File -> dataURL
  function readFileAsDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }
  // create image from dataURL
  function createImage(dataUrl) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
  }

  // convert dataURL to blob
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  // generate QR onto canvas, optionally embed logo and caption
  async function generateQrWithLogoAndCaption(text, logoFile=null, captionText='', size=QR_BASE_SIZE, captionArea=CAPTION_AREA) {
    const canvas = qrCanvas;
    const ctx = canvas.getContext('2d');

    // full canvas size includes caption area
    const fullH = size + captionArea;
    canvas.width = size;
    canvas.height = fullH;

    // clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // generate QR in the top square area - use qrcode lib to draw into temporary canvas
    // We'll ask QRCode.toCanvas to draw into our top area then keep canvas as-is.
    // QRCode.toCanvas will draw into the canvas element fully sized; we want size x size.
    await new Promise((resolve, reject) => {
      try {
        QRCode.toCanvas(canvas, text, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: size,
          color: { dark:'#000000', light:'#ffffff' }
        }, function (err) {
          if (err) return reject(err);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });

    // If no logo, still draw caption area below (if captionText exists)
    if (!logoFile && captionText) {
      // draw caption background (subtle)
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, size, size, captionArea);

      // caption text
      ctx.fillStyle = '#0b2e50';
      const fontSize = Math.round(Math.min(18, captionArea * 0.45));
      ctx.font = `600 ${fontSize}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(captionText, size/2, size + captionArea/2);
      ctx.restore();

      return canvas.toDataURL('image/png');
    }

    // If logo present, validate and draw
    if (logoFile) {
      // validate file type/size
      if (!allowedTypes.includes(logoFile.type)) {
        throw new Error('Logo must be PNG/JPEG/WebP');
      }
      if (logoFile.size > LOGO_MAX_BYTES) {
        throw new Error('Logo too large. Max ' + (LOGO_MAX_BYTES/1024).toFixed(0) + ' KB');
      }

      const dataUrl = await readFileAsDataURL(logoFile);
      const img = await createImage(dataUrl);

      // compute logo size ~ 20% of QR width
      const logoScale = 0.20;
      const logoW = Math.round(size * logoScale);
      const logoH = Math.round((img.height / img.width) * logoW);

      const pad = Math.round(logoW * 0.18);
      const bgW = logoW + pad*2;
      const bgH = logoH + pad*2;
      const bx = Math.round((size - bgW)/2);
      const by = Math.round((size - bgH)/2);
      const radius = Math.round(Math.min(bgW, bgH) * 0.16);

      // Draw white rounded background for logo with subtle border/shadow
      ctx.save();
      ctx.fillStyle = '#ffffff';
      roundRectPath(ctx, bx, by, bgW, bgH, radius);
      ctx.fill();

      // subtle border
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      roundRectPath(ctx, bx+0.5, by+0.5, bgW-1, bgH-1, radius);
      ctx.stroke();

      // small drop shadow (soft)
      ctx.restore();

      // draw logo with smoothing
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const lx = Math.round((size - logoW)/2);
      const ly = Math.round((size - logoH)/2);
      ctx.drawImage(img, lx, ly, logoW, logoH);
      ctx.restore();

      // Draw caption if provided
      if (captionText) {
        ctx.save();
        ctx.fillStyle = '#0b2e50';
        const fontSize = Math.round(Math.min(18, captionArea * 0.45));
        ctx.font = `600 ${fontSize}px Poppins, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(captionText, size/2, size + captionArea/2);
        ctx.restore();
      }

      return canvas.toDataURL('image/png');
    }

    // fallback return plain QR with caption empty
    return canvas.toDataURL('image/png');
  }

  // show/hide controls
  function showControls(show) {
    if (!qrControls) return;
    qrControls.style.display = show ? 'flex' : 'none';
  }

  // main wrapper: given shortUrl string, generate and preview
  async function generateAndShowQr(shortUrl) {
    if (!shortUrl) return;
    try {
      showControls(false); // hide until ready

      // caption text pulled from captionInput if present, or fallback to note input if available
      let captionText = '';
      if (captionInput && captionInput.value && captionInput.value.trim()) captionText = captionInput.value.trim();
      else if (noteInput && noteInput.value && noteInput.value.trim()) captionText = noteInput.value.trim();

      // pick logo file if present
      let logoFile = logoFileEl && logoFileEl.files && logoFileEl.files[0] ? logoFileEl.files[0] : null;

      // generate
      const dataUrl = await generateQrWithLogoAndCaption(shortUrl, logoFile, captionText, QR_BASE_SIZE, CAPTION_AREA);

      // preview
      if (qrImgEl) {
        qrImgEl.src = dataUrl;
        qrImgEl.alt = 'QR code for ' + shortUrl;
      }

      // reveal controls
      showControls(true);

      // clear file input to avoid lingering references (logo only in memory)
      if (logoFileEl) {
        try { logoFileEl.value = ''; } catch (e) { /* ignore */ }
      }

      return dataUrl;
    } catch (err) {
      console.error('QR generation error', err);
      alert('QR generation failed: ' + (err && err.message ? err.message : err));
      showControls(false);
      return null;
    }
  }

  // attach Download button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      try {
        const dataUrl = qrCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'smartlink-qr.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        console.error('Download failed', e);
        alert('Could not download QR image.');
      }
    });
  }

  // attach Share button (Web Share API if supports files)
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      try {
        const dataUrl = qrCanvas.toDataURL('image/png');
        const blob = dataURLtoBlob(dataUrl);
        const file = new File([blob], 'smartlink-qr.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          await navigator.share({ files: [file], title: 'QR code', text: 'Scan to open the link' });
        } else if (navigator.share) {
          // some implementations allow sharing text/url only
          await navigator.share({ title: 'QR code', text: 'Scan to open: ' + (shortLinkEl ? shortLinkEl.href : '') });
        } else {
          // fallback -> download
          const ok = confirm('Sharing images is not supported in this browser. Download the QR instead?');
          if (ok) {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'smartlink-qr.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
        }
      } catch (e) {
        console.error('Share failed', e);
        alert('Share failed. Try downloading the QR image instead.');
      }
    });
  }

  // If #shortLink exists we want to auto-generate QR when it changes.
  // Use a MutationObserver to detect changes to href or text content.
  if (shortLinkEl) {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // if href or text changed -> generate
        if ((m.type === 'attributes' && (m.attributeName === 'href' || m.attributeName === 'title')) || m.type === 'childList') {
          const shortUrl = shortLinkEl.href || shortLinkEl.textContent || shortLinkEl.innerText;
          if (shortUrl) {
            // call generation async, but don't block
            generateAndShowQr(shortUrl).catch(()=>{});
          }
        }
      }
    });
    mo.observe(shortLinkEl, { attributes: true, attributeFilter: ['href','title'], childList: true, subtree: false });

    // also if page loaded with existing short link, generate now
    const initial = shortLinkEl.href || shortLinkEl.textContent || shortLinkEl.innerText;
    if (initial) {
      // slight delay to let other UI settle
      setTimeout(() => generateAndShowQr(initial).catch(()=>{}), 250);
    }
  }

  // expose function globally if other code wants to call directly
  window.generateAndShowQr = generateAndShowQr;
})();

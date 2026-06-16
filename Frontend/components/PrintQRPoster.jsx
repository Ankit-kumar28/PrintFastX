import React from 'react';
import { Printer } from 'lucide-react';

/**
 * PrintQRPoster Component
 * 
 * Renders a button that triggers A4 poster printing for the shop QR code.
 * Encapsulates the entire HTML/CSS printing template to keep the dashboard clean.
 * 
 * @param {Object} props.shop - The shop object containing shopId and shopName.
 * @param {Object} props.qrData - The QR code data containing qrDataUrl and uploadUrl.
 */
export default function PrintQRPoster({ shop, qrData }) {
  
  // Handles generating and opening the printable document in a new window
  const handlePrintQR = () => {
    if (!shop || !qrData) return;
    
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
        <title>${shop.shopName} - PrintFastX Poster</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Outfit', sans-serif; background-color: #f1f5f9e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .poster { position: relative; width: 210mm; height: 297mm; background-color: #ffffff; padding: 24px 32px; display: flex; flex-direction: column; justify-content: space-between; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0; }
          .dots { position: absolute; width: 80px; height: 80px; background-image: radial-gradient(#94a3b8 1.5px, transparent 1.5px); background-size: 8px 8px; opacity: 0.35; }
          .dots-tl { top: 24px; left: 24px; }
          .dots-tr { top: 24px; right: 24px; }
          .dots-bl { bottom: 95px; left: 24px; }
          .dots-br { bottom: 95px; right: 24px; }
          .brand-header { text-align: center; margin-top: 15px; margin-bottom: 20px; }
          .logo-group { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }
          .logo-text { font-size: 56px; font-weight: 800; color: #021a36; letter-spacing: -1.5px; display: flex; align-items: center; line-height: 1; }
          .logo-x { color: #0d9488; }
          .brand-tagline { font-size: 20px; font-weight: 700; color: #0d9488; letter-spacing: 0.5px; }
          .shop-bar { background-color: #021a36; height: 74px; display: flex; align-items: center; justify-content: center; color: #ffffff; border-radius: 8px; padding: 0 24px; margin-bottom: 28px; }
          .shop-bar-line { flex-grow: 1; height: 2px; background-color: #0d9488; opacity: 0.6; }
          .shop-bar-name { font-size: 46px; font-weight: 800; white-space: nowrap; letter-spacing: -0.5px; margin: 0 15px; }
          .main-grid { display: flex; flex-grow: 1; gap: 32px; margin-bottom: 28px; }
          .col-left { width: 45%; display: flex; flex-direction: column; align-items: flex-start; }
          .how-it-works-title { background-color: #0d9488; color: #ffffff; font-size: 19px; font-weight: 800; padding: 10px 24px; border-radius: 8px; margin-bottom: 24px; letter-spacing: 0.5px; text-transform: uppercase; }
          .steps-list { display: flex; flex-direction: column; width: 100%; }
          .step-item { display: flex; align-items: center; gap: 16px; }
          .step-icon-wrapper { width: 64px; height: 64px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .step-text-group { display: flex; align-items: center; gap: 12px; }
          .step-number-bubble { background-color: #0d9488; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; flex-shrink: 0; line-height: 1; }
          .step-label { font-size: 35px; font-weight: 700; color: #021a36; }
          .text-multiline .step-label { font-size: 25px; line-height: 1.3; max-width: 180px; }
          .step-arrow-container { display: flex; align-items: center; padding-left: 80px; margin: 6px 0; }
          .arrow-down { color: #0d9488; font-size: 24px; font-weight: 900; line-height: 1; }
          .grid-divider { width: 1px; background-color: #e2e8f0; align-self: stretch; }
          .col-right { flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 10px; }
          .qr-code-border { border: 4px solid #0d9488; border-radius: 24px; padding: 8px; background-color: #ffffff; margin-bottom: 24px; box-shadow: 0 8px 24px rgba(13, 148, 136, 0.06); }
          .qr-img { width: 280px; height: 280px; display: block; }
          .scan-to-start-btn { background-color: #021a36; color: #ffffff; font-size: 19px; font-weight: 800; padding: 12px 36px; border-radius: 999px; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px; margin-bottom: 18px; box-shadow: 0 4px 12px rgba(2, 26, 54, 0.2); }
          .shop-id-pill { border: 1.5px solid #a7f3d0; background-color: #f6fdfa; color: #021a36; font-size: 16px; font-weight: 700; padding: 8px 24px; border-radius: 999px; margin-bottom: 18px; }
          .shop-id-highlight { color: #0d9488; font-weight: 800; }
          .scan-instructions { font-size: 15px; color: #475569; text-align: center; max-width: 280px; line-height: 1.4; font-weight: 500; }
          .section-divider { height: 1px; background-color: #e2e8f0; margin-bottom: 24px; }
          .features-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; padding: 0 10px; }
          .feature-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
          .feature-title { font-size: 18px; font-weight: 700; color: #021a36; line-height: 1.3; max-width: 170px; }
          .feature-divider { width: 1px; height: 60px; background-color: #e2e8f0; }
          .footer-bar { background-color: #021a36; color: #ffffff; padding: 16px 20px; border-radius: 8px; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 14px; }
          .footer-powered { font-size: 30px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
          .footer-brand { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
          .footer-brand-x { color: #0d9488; }
          .footer-web { font-size: 20px; font-weight: 600; color: #ffffff; display: flex; align-items: center; gap: 6px; margin-left: 40px; opacity: 0.9; }
          @media print { body { background-color: #ffffff; padding: 0; } .poster { width: 210mm; height: 297mm; border: none; box-shadow: none; border-radius: 0; padding: 24px 32px; } }
        </style>
      </head>
      <body>
        <div class="poster">
          <div class="dots dots-tl"></div>
          <div class="dots dots-tr"></div>
          <div class="dots dots-bl"></div>
          <div class="dots dots-br"></div>
          <div class="brand-header">
            <div class="logo-group">
              <svg class="logo-svg" viewBox="0 0 100 80" width="60" height="48" style="margin-right: 2px;">
                <path d="M15 25 L35 25" stroke="#0d9488" stroke-width="6" stroke-linecap="round" />
                <path d="M10 40 L30 40" stroke="#0d9488" stroke-width="6" stroke-linecap="round" />
                <path d="M15 55 L35 55" stroke="#0d9488" stroke-width="6" stroke-linecap="round" />
                <path d="M48 20 L72 20 L85 33 L85 70 C85 73 83 75 80 75 L48 75 C45 75 43 73 43 70 L43 25 C43 22 45 20 48 20 Z" fill="none" stroke="#021a36" stroke-width="6" stroke-linejoin="round" />
                <path d="M72 20 L72 33 L85 33" fill="none" stroke="#021a36" stroke-width="6" stroke-linejoin="round" />
              </svg>
              <span class="logo-text">PrintFast<span class="logo-x">X</span></span>
            </div>
            <div class="brand-tagline">Fast &bull; Secure &bull; Contactless Printing</div>
          </div>
          <div class="shop-bar">
            <div class="shop-bar-line"></div>
            <span class="shop-bar-name">${shop.shopName}</span>
            <div class="shop-bar-line"></div>
          </div>
          <div class="main-grid">
            <div class="col-left">
              <div class="how-it-works-title">HOW IT WORKS</div>
              <div class="steps-list">
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" stroke="#0d9488" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                      <rect x="7" y="7" width="3" height="3" stroke="#0d9488" stroke-width="1.5" />
                      <rect x="14" y="7" width="3" height="3" stroke="#0d9488" stroke-width="1.5" />
                      <rect x="7" y="14" width="3" height="3" stroke="#0d9488" stroke-width="1.5" />
                      <rect x="14" y="14" width="3" height="3" fill="#0d9488" />
                    </svg>
                  </div>
                  <div class="step-text-group">
                    <span class="step-number-bubble">1</span>
                    <span class="step-label">Scan QR</span>
                  </div>
                </div>
                <div class="step-arrow-container"><span class="arrow-down">&darr;</span></div>
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 10a5 5 0 0 0-9.53-1.5A6 6 0 0 0 9 20h9a5 5 0 0 0 0-10z" fill="#0d9488" />
                      <path d="M12 12v5M9 15l3-3 3 3" stroke="white" stroke-width="2.5" />
                    </svg>
                  </div>
                  <div class="step-text-group">
                    <span class="step-number-bubble">2</span>
                    <span class="step-label">Upload File</span>
                  </div>
                </div>
                <div class="step-arrow-container"><span class="arrow-down">&darr;</span></div>
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2 2 2 0 0 0 0 8 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 0 0-8z" fill="#0d9488" />
                      <polygon points="12 9 13.5 12 16.5 12 14 14 15 17 12 15 9 17 10 14 7.5 12 10.5 12" fill="white" />
                    </svg>
                  </div>
                  <div class="step-text-group">
                    <span class="step-number-bubble">3</span>
                    <span class="step-label">Get Token</span>
                  </div>
                </div>
                <div class="step-arrow-container"><span class="arrow-down">&darr;</span></div>
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="#0d9488">
                      <path d="M2 17h20v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3z" />
                      <rect x="4" y="12" width="5" height="4" rx="0.5" />
                      <rect x="6" y="16" width="1" height="1" />
                      <circle cx="4" cy="9.5" r="1.5" />
                      <rect x="3.5" y="11" width="1" height="1.5" />
                      <circle cx="16" cy="10" r="2.5" />
                      <path d="M12.5 17a3.5 3.5 0 0 1 7 0z" />
                    </svg>
                  </div>
                  <div class="step-text-group text-multiline">
                    <span class="step-number-bubble">4</span>
                    <span class="step-label">Show token & get printout from counter</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="grid-divider"></div>
            <div class="col-right">
              <div class="qr-code-border">
                <img class="qr-img" src="${qrData?.qrDataUrl}" alt="Shop QR Code" />
              </div>
              <div class="scan-to-start-btn">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
                SCAN TO START
              </div>
              <div class="shop-id-pill">
                Shop ID: <span class="shop-id-highlight">${shop.shopId}</span>
              </div>
              <p class="scan-instructions">Scan this QR code to upload your files and get your print done instantly.</p>
            </div>
          </div>
          <div class="section-divider"></div>
          <div class="features-row">
            <div class="feature-col">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="#0d9488" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#e6f4f1" />
                <rect x="9" y="12" width="6" height="5" rx="1" fill="#0d9488" stroke="none" />
                <path d="M10.5 12V10a1.5 1.5 0 0 1 3 0v2" stroke="#0d9488" stroke-width="1.5" />
              </svg>
              <p class="feature-title">Secure & Private Upload</p>
            </div>
            <div class="feature-divider"></div>
            <div class="feature-col">
              <span style="font-size: 48px; line-height: 1;">🚫</span>
              <p class="feature-title">No Login, No App, No Phone No.</p>
            </div>
            <div class="feature-divider"></div>
            <div class="feature-col">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
                <circle cx="12" cy="12" r="11" fill="#f59e0b" />
                <path d="M13 3 L7 12 H12 L11 21 L17 12 H12 Z" fill="white" />
              </svg>
              <p class="feature-title">Instant Transfer, Fast Printing</p>
            </div>
          </div>
          <div class="footer-bar">
            <div class="footer-powered">Powered by</div>
            <div class="footer-brand">PrintFast<span class="footer-brand-x">X</span></div>
            <div class="footer-web">Visit : www.printfastx.com</div>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <button onClick={handlePrintQR} style={styles.btnPrimaryLarge}>
      <Printer size={18} /> Print Poster (A4)
    </button>
  );
}

const styles = {
  btnPrimaryLarge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
};

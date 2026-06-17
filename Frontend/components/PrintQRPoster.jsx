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
          body { font-family: 'Outfit', sans-serif; background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* ── POSTER SHELL ── */
          .poster { position: relative; width: 210mm; min-height: 297mm; background-color: #ffffff; padding: 28px 36px 24px; display: flex; flex-direction: column; overflow: hidden; }

          /* ── DOT PATTERN CORNERS ── */
          .dots { position: absolute; width: 90px; height: 90px; background-image: radial-gradient(#94a3b8 1.5px, transparent 1.5px); background-size: 9px 9px; opacity: 0.35; }
          .dots-tl { top: 20px; left: 20px; }
          .dots-tr { top: 20px; right: 20px; }
          .dots-bl { bottom: 70px; left: 20px; }
          .dots-br { bottom: 70px; right: 20px; }

          /* ── BRAND HEADER ── */
          .brand-header { text-align: center; margin-bottom: 18px; }
          .logo-group { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px; }
          .logo-text { font-size: 52px; font-weight: 800; color: #021a36; letter-spacing: -1.5px; display: flex; align-items: center; line-height: 1; }
          .logo-x { color: #0d9488; }
          .brand-tagline { font-size: 18px; font-weight: 700; color: #0d9488; letter-spacing: 0.5px; }

          /* ── SHOP NAME BAR ── */
          .shop-bar { background-color: #021a36; height: 72px; display: flex; align-items: center; justify-content: center; color: #ffffff; border-radius: 10px; padding: 0 24px; margin-bottom: 26px; }
          .shop-bar-line { flex-grow: 1; height: 2px; background-color: #0d9488; opacity: 0.7; }
          .shop-bar-name { font-size: 44px; font-weight: 800; white-space: nowrap; letter-spacing: -0.5px; margin: 0 18px; }

          /* ── MAIN GRID ── */
          .main-grid { display: flex; gap: 28px; margin-bottom: 24px; flex-grow: 1; }
          .col-left { width: 46%; display: flex; flex-direction: column; align-items: flex-start; }
          .grid-divider { width: 1px; background-color: #e2e8f0; align-self: stretch; }
          .col-right { flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 6px; }

          /* ── HOW IT WORKS ── */
          .how-it-works-title { background-color: #0d9488; color: #ffffff; font-size: 18px; font-weight: 800; padding: 10px 22px; border-radius: 8px; margin-bottom: 22px; letter-spacing: 0.5px; text-transform: uppercase; }
          .steps-list { display: flex; flex-direction: column; width: 100%; }
          .step-item { display: flex; align-items: center; gap: 16px; }
          .step-icon-wrapper { width: 62px; height: 62px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .step-text-group { display: flex; align-items: center; gap: 12px; }
          .step-number-bubble { background-color: #0d9488; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; flex-shrink: 0; line-height: 1; }
          .step-label { font-size: 32px; font-weight: 700; color: #021a36; }
          .text-multiline .step-label { font-size: 22px; line-height: 1.3; max-width: 175px; font-weight: 700; }
          .step-arrow-container { display: flex; align-items: center; padding-left: 78px; margin: 4px 0; }
          .arrow-down { color: #0d9488; font-size: 22px; font-weight: 900; line-height: 1; }

          /* ── HINDI BADGE ── */
          .hindi-badge-wrapper { display: flex; justify-content: center; align-items: center; margin-top: 22px; width: 100%; }
          .hindi-badge {
            position: relative;
            width: 168px; height: 168px;
            background-color: #0d9488;
            border-radius: 50%;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; padding: 22px;
            box-shadow: 0 6px 20px rgba(13,148,136,0.35);
          }
          /* Outer dashed ring exactly like image */
          .hindi-badge::before {
            content: '';
            position: absolute;
            inset: 7px;
            border-radius: 50%;
            border: 2.5px dashed rgba(255,255,255,0.80);
          }
          .hindi-badge::after { display: none; }
          .quote-mark-top { font-size: 34px; color: #fcd34d; font-family: Georgia, serif; line-height: 0.75; margin-bottom: 2px; position: relative; z-index: 1; }
          .hindi-line1 { font-size: 21px; font-weight: 800; color: #ffffff; line-height: 1.25; position: relative; z-index: 1; }
          .hindi-highlight { color: #fcd34d; font-weight: 900; font-style: italic; }
          .hindi-line2 { font-size: 19px; font-weight: 800; color: #ffffff; line-height: 1.25; position: relative; z-index: 1; }
          .quote-mark-bottom { font-size: 34px; color: #fcd34d; font-family: Georgia, serif; line-height: 0.75; margin-top: 2px; position: relative; z-index: 1; }

          /* ── QR SECTION ── */
          .qr-code-border { border: 4px solid #0d9488; border-radius: 20px; padding: 8px; background-color: #ffffff; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(13, 148, 136, 0.08); }
          .qr-img { width: 270px; height: 270px; display: block; }
          .scan-to-start-btn { background-color: #021a36; color: #ffffff; font-size: 19px; font-weight: 800; padding: 14px 0; border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 12px; letter-spacing: 0.5px; margin-bottom: 16px; width: 100%; box-shadow: 0 4px 14px rgba(2, 26, 54, 0.25); }
          .shop-id-pill { border: 1.5px solid #94a3b8; background-color: #ffffff; color: #021a36; font-size: 16px; font-weight: 600; padding: 8px 28px; border-radius: 999px; margin-bottom: 16px; }
          .shop-id-label { font-weight: 700; color: #021a36; }
          .shop-id-highlight { color: #0d9488; font-weight: 800; }
          .scan-instructions { font-size: 14px; color: #475569; text-align: center; max-width: 270px; line-height: 1.5; font-weight: 500; }

          /* ── SECTION DIVIDER ── */
          .section-divider { height: 1px; background-color: #e2e8f0; margin-bottom: 20px; }

          /* ── FEATURES ROW ── */
          .features-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; padding: 0 8px; }
          .feature-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
          .feature-title { font-size: 17px; font-weight: 700; color: #021a36; line-height: 1.3; max-width: 160px; }
          .feature-divider { width: 1px; height: 64px; background-color: #e2e8f0; }

          /* ── FOOTER ── */
          .footer-bar { background-color: #021a36; color: #ffffff; padding: 14px 24px; border-radius: 8px; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 10px; }
          .footer-powered { font-size: 26px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
          .footer-brand { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; }
          .footer-brand-x { color: #0d9488; }
          .footer-sep { width: 1px; height: 28px; background: rgba(255,255,255,0.2); margin: 0 20px; }
          .footer-web { font-size: 18px; font-weight: 600; color: #ffffff; display: flex; align-items: center; gap: 6px; opacity: 0.9; }

          @media print {
            body { background-color: #ffffff; padding: 0; }
            .poster { width: 210mm; min-height: 297mm; border: none; box-shadow: none; border-radius: 0; padding: 28px 36px 24px; }
          }
        </style>
      </head>
      <body>
        <div class="poster">
          <!-- Dot corners -->
          <div class="dots dots-tl"></div>
          <div class="dots dots-tr"></div>
          <div class="dots dots-bl"></div>
          <div class="dots dots-br"></div>

          <!-- Brand Header -->
          <div class="brand-header">
            <div class="logo-group">
              <!-- Speed/Lines + Document logo matching image -->
              <svg viewBox="0 0 110 80" width="62" height="45" style="margin-right:4px;">
                <!-- Speed lines on left -->
                <path d="M5 24 L32 24" stroke="#0d9488" stroke-width="6" stroke-linecap="round"/>
                <path d="M0 38 L28 38" stroke="#0d9488" stroke-width="6" stroke-linecap="round"/>
                <path d="M5 52 L32 52" stroke="#0d9488" stroke-width="6" stroke-linecap="round"/>
                <!-- Document shape -->
                <path d="M45 12 L73 12 L88 28 L88 72 C88 75 86 77 83 77 L45 77 C42 77 40 75 40 72 L40 17 C40 14 42 12 45 12 Z" fill="none" stroke="#021a36" stroke-width="5.5" stroke-linejoin="round"/>
                <path d="M73 12 L73 28 L88 28" fill="none" stroke="#021a36" stroke-width="5.5" stroke-linejoin="round"/>
                <!-- Lines inside doc -->
                <path d="M50 40 L78 40" stroke="#0d9488" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M50 50 L78 50" stroke="#0d9488" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M50 60 L68 60" stroke="#0d9488" stroke-width="3.5" stroke-linecap="round"/>
              </svg>
              <span class="logo-text">PrintFast<span class="logo-x">X</span></span>
            </div>
            <div class="brand-tagline">Fast &bull; Secure &bull; Contactless Printing</div>
          </div>

          <!-- Shop Name Bar -->
          <div class="shop-bar">
            <div class="shop-bar-line"></div>
            <span class="shop-bar-name">${shop.shopName}</span>
            <div class="shop-bar-line"></div>
          </div>

          <!-- Main Content Grid -->
          <div class="main-grid">

            <!-- LEFT: How It Works + Hindi Badge -->
            <div class="col-left">
              <div class="how-it-works-title">HOW IT WORKS</div>
              <div class="steps-list">

                <!-- Step 1 -->
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" stroke="#0d9488" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
                      <rect x="7" y="7" width="3" height="3" stroke="#0d9488" stroke-width="1.5"/>
                      <rect x="14" y="7" width="3" height="3" stroke="#0d9488" stroke-width="1.5"/>
                      <rect x="7" y="14" width="3" height="3" stroke="#0d9488" stroke-width="1.5"/>
                      <rect x="14" y="14" width="3" height="3" fill="#0d9488"/>
                    </svg>
                  </div>
                  <div class="step-text-group">
                    <span class="step-number-bubble">1</span>
                    <span class="step-label">Scan QR</span>
                  </div>
                </div>
                <div class="step-arrow-container"><span class="arrow-down">&darr;</span></div>

                <!-- Step 2 -->
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 10a5 5 0 0 0-9.53-1.5A6 6 0 0 0 9 20h9a5 5 0 0 0 0-10z" fill="#0d9488"/>
                      <path d="M12 12v5M9 15l3-3 3 3" stroke="white" stroke-width="2.5"/>
                    </svg>
                  </div>
                  <div class="step-text-group">
                    <span class="step-number-bubble">2</span>
                    <span class="step-label">Upload File</span>
                  </div>
                </div>
                <div class="step-arrow-container"><span class="arrow-down">&darr;</span></div>

                <!-- Step 3 -->
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2 2 2 0 0 0 0 8 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 0 0-8z" fill="#0d9488"/>
                      <polygon points="12 9 13.5 12 16.5 12 14 14 15 17 12 15 9 17 10 14 7.5 12 10.5 12" fill="white"/>
                    </svg>
                  </div>
                  <div class="step-text-group">
                    <span class="step-number-bubble">3</span>
                    <span class="step-label">Get Token</span>
                  </div>
                </div>
                <div class="step-arrow-container"><span class="arrow-down">&darr;</span></div>

                <!-- Step 4 -->
                <div class="step-item">
                  <div class="step-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="#0d9488">
                      <path d="M2 17h20v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3z"/>
                      <rect x="4" y="12" width="5" height="4" rx="0.5"/>
                      <rect x="6" y="16" width="1" height="1"/>
                      <circle cx="4" cy="9.5" r="1.5"/>
                      <rect x="3.5" y="11" width="1" height="1.5"/>
                      <circle cx="16" cy="10" r="2.5"/>
                      <path d="M12.5 17a3.5 3.5 0 0 1 7 0z"/>
                    </svg>
                  </div>
                  <div class="step-text-group text-multiline">
                    <span class="step-number-bubble">4</span>
                    <span class="step-label">Show token &amp; get printout from counter</span>
                  </div>
                </div>
              </div>

              <!-- Hindi Badge -->
              <div class="hindi-badge-wrapper">
                <div class="hindi-badge">
                  <div class="quote-mark-top">&#10077;</div>
                  <div class="hindi-line1">Bas Token</div>
                  <div class="hindi-line1"><span class="hindi-highlight">Batao,</span></div>
                  <div class="hindi-line2">Print Karao!</div>
                  <div class="quote-mark-bottom">&#10078;</div>
                </div>
              </div>
            </div>

            <!-- Vertical divider -->
            <div class="grid-divider"></div>

            <!-- RIGHT: QR Code -->
            <div class="col-right">
              <div class="qr-code-border">
                <img class="qr-img" src="${qrData?.qrDataUrl}" alt="Shop QR Code"/>
              </div>

              <!-- Scan to Start pill button -->
              <div class="scan-to-start-btn">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
                SCAN TO START
              </div>

              <!-- Shop ID pill -->
              <div class="shop-id-pill">
                <span class="shop-id-label">Shop ID: </span><span class="shop-id-highlight">${shop.shopId}</span>
              </div>

              <p class="scan-instructions">Scan this QR code to upload your files and get your print done instantly.</p>
            </div>
          </div>

          <!-- Section Divider -->
          <div class="section-divider"></div>

          <!-- Features Row -->
          <div class="features-row">
            <!-- Secure & Private Upload -->
            <div class="feature-col">
              <svg viewBox="0 0 24 24" width="52" height="52" fill="none">
                <!-- Shield -->
                <path d="M12 2 L20 5.5 L20 12 C20 17 16 21 12 22 C8 21 4 17 4 12 L4 5.5 Z" fill="#e6f4f1" stroke="#0d9488" stroke-width="1.5" stroke-linejoin="round"/>
                <!-- Lock body -->
                <rect x="8.5" y="11.5" width="7" height="6" rx="1" fill="#0d9488"/>
                <!-- Lock shackle -->
                <path d="M10 11.5 L10 9.5 A2 2 0 0 1 14 9.5 L14 11.5" stroke="#0d9488" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                <!-- Keyhole -->
                <circle cx="12" cy="14" r="1" fill="white"/>
                <rect x="11.4" y="14" width="1.2" height="2" rx="0.5" fill="white"/>
              </svg>
              <p class="feature-title">Secure &amp; Private Upload</p>
            </div>

            <div class="feature-divider"></div>

            <!-- No Login, No App -->
            <div class="feature-col">
              <!-- No person allowed icon matching image -->
              <svg viewBox="0 0 52 52" width="52" height="52" fill="none">
                <!-- Dark navy person: head -->
                <circle cx="26" cy="17" r="7.5" fill="#1e2d3d"/>
                <!-- Dark navy person: body/shoulders -->
                <path d="M11 42 C11 29 41 29 41 42Z" fill="#1e2d3d"/>
                <!-- Red prohibition ring (no background fill) -->
                <circle cx="26" cy="26" r="23" fill="none" stroke="#e53e3e" stroke-width="3.8"/>
                <!-- Red diagonal slash: top-right to bottom-left like image -->
                <line x1="41" y1="9" x2="11" y2="43" stroke="#e53e3e" stroke-width="3.8" stroke-linecap="round"/>
              </svg>
              <p class="feature-title">No Login, No App, No Phone No.</p>
            </div>

            <div class="feature-divider"></div>

            <!-- Instant Transfer -->
            <div class="feature-col">
              <svg viewBox="0 0 52 52" width="52" height="52" fill="none">
                <circle cx="26" cy="26" r="24" fill="#fef3c7" stroke="#f59e0b" stroke-width="2.5"/>
                <!-- Lightning bolt -->
                <path d="M29 8 L18 27 L25 27 L23 44 L34 25 L27 25 Z" fill="#f59e0b"/>
              </svg>
              <p class="feature-title">Instant Transfer, Fast Printing</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-bar">
            <div class="footer-powered">POWERED BY</div>
            <div class="footer-brand">PrintFast<span class="footer-brand-x">X</span></div>
            <div class="footer-sep"></div>
            <div class="footer-web">Visit : www.printfastx.in</div>
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
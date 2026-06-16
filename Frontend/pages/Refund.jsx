// pages/Refund.jsx
import { useNavigate } from 'react-router-dom';

export default function Refund() {
  const navigate = useNavigate();

  return (
    <div style={styles.pageContainer}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Outfit', sans-serif; background-color: #f8fafc; }

        @media (max-width: 768px) {
          .legal-header {
            padding: 16px 20px !important;
          }
          .legal-main {
            padding: 24px 16px !important;
          }
          .legal-card {
            padding: 24px 20px !important;
            border-radius: 16px !important;
          }
          .legal-h1 {
            font-size: 28px !important;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <header className="legal-header" style={styles.header}>
        <div style={styles.logoRow} onClick={() => navigate('/')}>
          <div style={styles.logoBox}>P</div>
          <span style={styles.brandText}>PrintFast<span style={{ color: '#0d9488' }}>X</span></span>
        </div>
        <button onClick={() => navigate('/')} style={styles.backBtn}>Back to Home</button>
      </header>

      {/* CONTENT */}
      <main className="legal-main" style={styles.main}>
        <div className="legal-card" style={styles.card}>
          <h1 className="legal-h1" style={styles.h1}>Refund Policy</h1>
          <p style={styles.lastUpdated}>Last Updated: June 16, 2026</p>

          <div style={styles.section}>
            <h2 style={styles.h2}>1. Transaction Structures</h2>
            <p style={styles.p}>
              PrintFastX is a contactless routing software that helps customers queue files for local shops. Payments for printing services are collected directly by individual shop owners at the counter. PrintFastX does not process, handle, or hold customer payments for document printing.
            </p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>2. Customer Refunds</h2>
            <p style={styles.p}>
              Because printing transactions occur directly between the customer and the shop, any requests for refunds (due to bad paper quality, misaligned margins, double-billing at the counter, or incorrect colors) must be negotiated and settled directly with the shop owner at the time of pickup. PrintFastX is not responsible for issuing refunds for local store transactions.
            </p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>3. Shopkeeper Subscriptions</h2>
            <p style={styles.p}>
              For shopkeepers who purchase paid subscription licenses for premium features:
            </p>
            <ul style={styles.ul}>
              <li style={styles.li}>We offer a <strong>7-day money-back guarantee</strong>. If you experience persistent technical difficulties that prevent you from receiving orders and our support team cannot resolve them, you are eligible for a 100% refund of your subscription fee.</li>
              <li style={styles.li}>Refund requests submitted after 7 days of subscription activation are not eligible for refunds but can be canceled to prevent future renewals.</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>4. How to Request a Subscription Refund</h2>
            <p style={styles.p}>
              To request a refund on your merchant license, send an email to billing@printfastx.com or contact our support representative with your registered shop email, Shop ID, and proof of payment.
            </p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>5. Contact Information</h2>
            <p style={styles.p}>
              For refund-related disputes or merchant billing assistance:
            </p>
            <p style={styles.contactDetails}>
              <strong>Ankit Kumar</strong><br />
              Phone: +91 8434362600<br />
              Email: billing@printfastx.com
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: "'Outfit', sans-serif"
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 40px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  logoBox: {
    width: 36,
    height: 36,
    background: '#0d9488',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 900,
    fontSize: '18px'
  },
  brandText: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#021a36',
    letterSpacing: '-0.5px'
  },
  backBtn: {
    padding: '8px 16px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  main: {
    flexGrow: 1,
    padding: '40px 24px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%'
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.02)',
    padding: '40px'
  },
  h1: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#021a36',
    margin: '0 0 8px',
    letterSpacing: '-0.5px'
  },
  lastUpdated: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 0 32px'
  },
  section: {
    marginBottom: '28px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '20px'
  },
  h2: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#021a36',
    margin: '0 0 12px'
  },
  p: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.6,
    margin: 0
  },
  ul: {
    margin: '12px 0 0',
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  li: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.5
  },
  contactDetails: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.6,
    marginTop: '12px',
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  }
};

// pages/Privacy.jsx
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
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
          <h1 className="legal-h1" style={styles.h1}>Privacy Policy</h1>
          <p style={styles.lastUpdated}>Last Updated: June 16, 2026</p>

          <div style={styles.section}>
            <h2 style={styles.h2}>1. Privacy-First Philosophy</h2>
            <p style={styles.p}>
              At PrintFastX, we respect your privacy. Our platform is built to facilitate quick, contactless file transfer between customers and print shops without requiring unnecessary personal identification or registration. We do not require customer logins, phone numbers, or emails to upload files.
            </p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>2. Information We Collect</h2>
            <p style={styles.p}>
              We do not track or build customer profiles. The only information processed by our system includes:
            </p>
            <ul style={styles.ul}>
              <li style={styles.li}>The files uploaded by the customer for the purpose of printing.</li>
              <li style={styles.li}>The formatting parameters selected for the files (copies, pages, B&W or Color, single/double sided).</li>
              <li style={styles.li}>Optional custom instruction text notes left for the shopkeeper.</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>3. Unconditional File Deletion</h2>
            <p style={styles.p}>
              All customer uploaded files are kept temporarily for the execution of the print order. We enforce a strict deletion policy:
            </p>
            <ul style={styles.ul}>
              <li style={styles.li}><strong>Immediate Deletion:</strong> As soon as the shopkeeper executes the printout or dismisses the order from their dashboard, the file is immediately and permanently deleted from our servers.</li>
              <li style={styles.li}><strong>Timeout Preset:</strong> Any files left pending or unprinted are automatically and permanently purged from the system after the queue timeout period set by the shop (defaulting to 24 hours).</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>4. Security Practices</h2>
            <p style={styles.p}>
              We deploy industry-standard HTTPS encryption for all file transfers. Only the authorized shopkeeper connected to the specific destination Shop ID can access the uploaded documents in their private session.
            </p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>5. Third-Party Integrations</h2>
            <p style={styles.p}>
              We use secure Google OAuth credentials for shopkeeper registrations and sign-ins. PrintFastX does not sell, trade, or distribute your information to third parties.
            </p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>6. Contact Information</h2>
            <p style={styles.p}>
              For privacy-related questions or data deletion requests, contact our privacy officer:
            </p>
            <p style={styles.contactDetails}>
              <strong>Ankit Kumar</strong><br />
              Phone: +91 84342600<br />
              Email: privacy@printfastx.com
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

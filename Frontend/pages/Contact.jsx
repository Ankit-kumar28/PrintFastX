// pages/Contact.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success('Message sent! We will get back to you shortly.');
      setFormData({ name: '', email: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div style={styles.pageContainer}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Outfit', sans-serif; background-color: #f8fafc; }
        .input-focus:focus { border-color: #0d9488 !important; }

        @media (max-width: 768px) {
          .contact-header {
            padding: 16px 20px !important;
          }
          .contact-main {
            padding: 30px 16px !important;
          }
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .contact-h1 {
            font-size: 32px !important;
          }
          .contact-form-card {
            padding: 24px 20px !important;
            border-radius: 16px !important;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <header className="contact-header" style={styles.header}>
        <div style={styles.logoRow} onClick={() => navigate('/')}>
          <div style={styles.logoBox}>P</div>
          <span style={styles.brandText}>PrintFast<span style={{ color: '#0d9488' }}>X</span></span>
        </div>
        <button onClick={() => navigate('/')} style={styles.backBtn}>Back to Home</button>
      </header>

      {/* CONTENT */}
      <main className="contact-main" style={styles.main}>
        <div className="contact-grid" style={styles.grid}>
          {/* Info Card */}
          <div style={styles.infoCard}>
            <h1 className="contact-h1" style={styles.h1}>Contact Us</h1>
            <p style={styles.description}>
              Have questions, feedback, or need help? Get in touch with our team. We usually respond within 2 hours.
            </p>

            <div style={styles.contactDetails}>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>👤</span>
                <div>
                  <p style={styles.contactLabel}>Representative</p>
                  <p style={styles.contactValue}>Ankit Kumar</p>
                </div>
              </div>

              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📞</span>
                <div>
                  <p style={styles.contactLabel}>Phone Support</p>
                  <p style={styles.contactValue}>+91 8434362600</p>
                </div>
              </div>

              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>✉️</span>
                <div>
                  <p style={styles.contactLabel}>Email Us</p>
                  <p style={styles.contactValue}>support@printfastx.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="contact-form-card" style={styles.formCard}>
            <h2 style={styles.h2}>Send a Message</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Your Name</label>
                <input
                  type="text"
                  className="input-focus"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  className="input-focus"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Message</label>
                <textarea
                  className="input-focus"
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Type your query here..."
                  style={styles.textarea}
                  required
                />
              </div>

              <button type="submit" disabled={submitting} style={styles.submitBtn}>
                {submitting ? 'Sending...' : 'Submit Message'}
              </button>
            </form>
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
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  main: {
    flexGrow: 1,
    padding: '60px 40px',
    maxWidth: '1120px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    alignItems: 'center'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '48px',
    width: '100%',
    alignItems: 'start'
  },
  infoCard: {
    padding: '20px 0'
  },
  h1: {
    fontSize: '44px',
    fontWeight: 900,
    color: '#021a36',
    margin: '0 0 16px',
    letterSpacing: '-1px'
  },
  description: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 40px'
  },
  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  contactIcon: {
    width: '48px',
    height: '48px',
    background: '#e6f4f1',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0
  },
  contactLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#94a3b8',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  contactValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#021a36',
    margin: '2px 0 0'
  },
  formCard: {
    background: '#fff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.03)',
    padding: '36px 32px'
  },
  h2: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#021a36',
    margin: '0 0 24px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569'
  },
  input: {
    padding: '12px 14px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    color: '#334155'
  },
  textarea: {
    padding: '12px 14px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    color: '#334155',
    height: '120px',
    resize: 'none'
  },
  submitBtn: {
    padding: '14px',
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.15)',
    marginTop: '8px'
  }
};

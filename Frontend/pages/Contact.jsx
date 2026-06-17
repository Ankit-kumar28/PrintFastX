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
        body { margin: 0; font-family: 'Outfit', sans-serif; background-color: #f0f9ff; }

        @media (max-width: 768px) {
          .contact-header {
            padding: 16px 20px !important;
          }
          .contact-main {
            padding: 40px 16px !important;
            gap: 30px !important;
          }
          .contact-cards-row {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .contact-h1 {
            font-size: 36px !important;
          }
          .contact-card, .support-info-card {
            padding: 32px 20px !important;
            border-radius: 20px !important;
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
        <div style={styles.heroSection}>
          <h1 className="contact-h1" style={styles.h1}>Get in Touch</h1>
          <p style={styles.subtitle}>
            Have questions or need support? We're here to help! Choose your preferred way to reach us.
          </p>
        </div>

        {/* Cards Row */}
        <div className="contact-cards-row" style={styles.cardsRow}>
          {/* Email Card */}
          <div className="contact-card" style={styles.card}>
            <div style={styles.iconContainer}>
              {/* Envelope SVG */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h2 style={styles.cardTitle}>Email Us</h2>
            <p style={styles.cardDesc}>
              Send us an email at <strong style={{ color: '#0f172a' }}>helloprintfastx@gmail.com</strong> and we'll respond within 24 hours
            </p>
            <a href="mailto:helloprintfastx@gmail.com" style={styles.actionBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              Send Email
            </a>
          </div>

          {/* WhatsApp Card */}
          <div className="contact-card" style={styles.card}>
            <div style={{ ...styles.iconContainer, background: '#10b981', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.15)' }}>
              {/* Message/WhatsApp Icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <h2 style={styles.cardTitle}>WhatsApp</h2>
            <p style={styles.cardDesc}>
              Chat with us directly for quick support
            </p>
            <a href="https://wa.me/918434362600" target="_blank" rel="noopener noreferrer" style={{ ...styles.actionBtn, background: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
              {/* Message bubble icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Open WhatsApp
            </a>
          </div>
        </div>

        {/* Support Detail Card */}
        <div className="support-info-card" style={styles.supportCard}>
          <h2 style={styles.supportTitle}>PrintFastX Support</h2>
          <p style={styles.supportDesc}>
            We're committed to helping you get the most out of PrintFastX. Whether you have technical questions, billing inquiries, or need assistance with your print shop setup, our team is ready to assist.
          </p>
          <div style={styles.supportMeta}>
            <p style={styles.metaRow}>
              <strong>Business Hours:</strong> Open All Days • Monday - Sunday, 9:00 AM - 9:00 PM IST
            </p>
            <p style={{ ...styles.metaRow, color: '#0d9488', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
              <span>📍</span> Greater Noida, Uttar Pradesh, India
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
    background: '#f0f9ff',
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
    padding: '60px 40px 80px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '40px'
  },
  heroSection: {
    textAlign: 'center',
    maxWidth: '600px',
    margin: '0 auto'
  },
  h1: {
    fontSize: '44px',
    fontWeight: 900,
    color: '#021a36',
    margin: '0 0 16px',
    letterSpacing: '-1px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0
  },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
    width: '100%'
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    border: '1.5px solid #e2e8f0',
    padding: '40px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.02)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    background: '#0d9488',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 8px 16px rgba(13, 148, 136, 0.15)'
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '12px'
  },
  cardDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    marginBottom: '28px',
    flexGrow: 1,
    maxWidth: '280px'
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    background: '#0d9488',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.15)'
  },
  supportCard: {
    background: '#fff',
    borderRadius: '24px',
    border: '1.5px solid #e2e8f0',
    padding: '40px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.02)'
  },
  supportTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '16px'
  },
  supportDesc: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    maxWidth: '720px',
    margin: '0 auto 24px'
  },
  supportMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center'
  },
  metaRow: {
    fontSize: '14px',
    color: '#475569',
    margin: 0
  }
};

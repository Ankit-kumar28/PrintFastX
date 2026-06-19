const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If credentials are not configured, return null (log-only/simulation mode)
  if (!user || !pass) {
    console.warn('[Mail System Warning] SMTP credentials (SMTP_USER/SMTP_PASS) are not set. Mailer will run in console log simulation mode.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for SSL (465), false for TLS (587)
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

/**
 * Sends a notification email to the admin for a new shopkeeper registration or onboarding details.
 * 
 * @param {Object} shopDetails - The details of the shop.
 * @returns {Promise<void>}
 */
async function sendAdminNotificationEmail(shopDetails) {
  const adminEmail = process.env.ADMIN_EMAIL || 'helloprintfastx@gmail.com';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const adminApprovalUrl = `${frontendUrl}/admin`;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"PrintFastX" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `🔔 New Shop Registration: ${shopDetails.shopName}`,
    html: `
      <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-top: 0;">New Shop Registration Request</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          A new shopkeeper has registered on PrintFastX and completed setup. Please verify their details below and take action (Approve/Reject) from the admin panel.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left; font-size: 13px; color: #64748b; text-transform: uppercase;">Field</th>
              <th style="padding: 10px; text-align: left; font-size: 13px; color: #64748b; text-transform: uppercase;">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155; width: 35%;">Shop ID</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a; font-family: monospace; font-weight: bold;">${shopDetails.shopId || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">Shop Name</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a;">${shopDetails.shopName || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">Owner Name</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a;">${shopDetails.ownerName || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">Email Address</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a;">
                <a href="mailto:${shopDetails.email}" style="color: #2563eb; text-decoration: none;">${shopDetails.email}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">Phone / Whatsapp</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a;">${shopDetails.whatsappNumber || shopDetails.phone || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">State</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a;">${shopDetails.state || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">Address</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a; line-height: 1.4;">${shopDetails.address || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">Referral Code</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a;">${shopDetails.referralCode || 'None'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: bold; font-size: 14px; color: #334155;">Auth Provider</td>
              <td style="padding: 10px; font-size: 14px; color: #0f172a; text-transform: capitalize;">${shopDetails.authProvider || 'local'}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${adminApprovalUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
            Open Admin Dashboard to Approve
          </a>
        </div>
        
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">
          This is an automated notification from PrintFastX server.
        </p>
      </div>
    `,
  };

  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Mail Simulation] Sending Admin Notification Email:', {
      to: adminEmail,
      subject: mailOptions.subject,
      shopDetails: {
        shopId: shopDetails.shopId,
        shopName: shopDetails.shopName,
        ownerName: shopDetails.ownerName,
        email: shopDetails.email,
        phone: shopDetails.phone || shopDetails.whatsappNumber,
      }
    });
    return;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mail System] Admin notification email sent: ${info.messageId}`);
  } catch (error) {
    console.error('[Mail System Error] Failed to send admin notification email:', error);
  }
}

/**
 * Sends a confirmation email to the shopkeeper when their shop gets approved.
 * 
 * @param {Object} shopDetails - The details of the approved shop.
 * @returns {Promise<void>}
 */
async function sendShopkeeperApprovalEmail(shopDetails) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login`;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"PrintFastX" <${process.env.SMTP_USER}>`,
    to: shopDetails.email,
    subject: `🎉 Your PrintFastX Shop Has Been Approved!`,
    html: `
      <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 48px;">🎉</span>
        </div>
        <h2 style="color: #0f172a; text-align: center; margin-top: 0;">Congratulations! Shop Approved</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">
          Hello ${shopDetails.ownerName || 'Shopkeeper'}, we are excited to inform you that your shop <strong>${shopDetails.shopName}</strong> has been verified and successfully approved by the admin.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Your Shop Details</h4>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
            <span style="color: #64748b;">Shop Name:</span>
            <strong style="color: #0f172a;">${shopDetails.shopName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
            <span style="color: #64748b;">Shop ID:</span>
            <strong style="color: #0f172a; font-family: monospace;">${shopDetails.shopId || 'N/A'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span style="color: #64748b;">Status:</span>
            <strong style="color: #0d9488;">ACTIVE / APPROVED</strong>
          </div>
        </div>

        <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
          You can now log in to your dashboard to set up your custom print pricing, view QR posters, and start receiving live printing orders from your customers.
        </p>

        <div style="text-align: center;">
          <a href="${loginUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
            Log In to Shop Dashboard
          </a>
        </div>
        
        <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          If you have any questions or need support, contact our support team at <a href="mailto:helloprintfastx@gmail.com" style="color: #0d9488; text-decoration: none;">helloprintfastx@gmail.com</a>.
        </p>
      </div>
    `,
  };

  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Mail Simulation] Sending Shopkeeper Approval Email:', {
      to: shopDetails.email,
      subject: mailOptions.subject,
      shopDetails: {
        shopId: shopDetails.shopId,
        shopName: shopDetails.shopName,
        ownerName: shopDetails.ownerName,
        email: shopDetails.email,
      }
    });
    return;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mail System] Shopkeeper approval email sent: ${info.messageId}`);
  } catch (error) {
    console.error('[Mail System Error] Failed to send shopkeeper approval email:', error);
  }
}

module.exports = {
  sendAdminNotificationEmail,
  sendShopkeeperApprovalEmail,
};

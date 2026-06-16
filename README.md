# PrintFastX 🚀

PrintFastX is a modern QR-code-based contactless document printing SaaS designed for print shops and copy centers. Customers can scan a unique shop QR code, upload documents securely from their phones, and receive a secure checkout token without downloading apps or sharing personal information.

---

## 📁 Repository Structure

```text
├── Backend/                 # Express.js, MongoDB models, upload handlers, and cron cleanups
│   ├── config/              # MongoDB database configuration
│   ├── cron/                # Background auto-delete queue cleanup jobs (hourly)
│   ├── middleware/          # Multer upload filters and auth middleware
│   ├── models/              # Mongoose database schemas (Order, Shop)
│   ├── routes/              # Express endpoint controllers
│   └── server.js            # Entrypoint
│
└── Frontend/                # React, Vite, and Lucide Icons dashboard
    ├── components/          # Reusable UI elements (including PrintQRPoster.jsx)
    ├── pages/               # Main pages (ShopDashboard, SetupShop, ShopLogin)
    └── src/                 # Configs, styles, and assets
```

---

## ⚡ Getting Started (Local Development)

### 1. Prerequisites
- **Node.js** (v16+)
- **MongoDB** (Local instance or MongoDB Atlas account)

### 2. Backend Setup
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://your_mongo_url
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   FRONTEND_URL=http://localhost:5173
   ADMIN_EMAIL=admin@printfastx.in
   ADMIN_PASSWORD=admin123
   ```
4. Start the development server (runs with nodemon):
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `Frontend` directory:
   ```bash
   cd ../Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```

---

## 🔒 Key Features & Security
- **No registration required for customers**: Scan, upload, get token.
- **Privacy First**: Files are completely deleted 24 hours after submission (or customized time defined by the shop owner) or when manually dismissed.
- **Auto-Delete Engine**: An hourly backend cron job cleans up expired queues and unlinks files from disk.
- **Shop Dashboard**: Analytics, period comparisons, print distribution (B&W vs Color), custom QR poster prints, and rate settings.

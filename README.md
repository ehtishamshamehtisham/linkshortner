# 🚀 LinkShortner.site - All-in-One Digital Utilities

A premium, consolidated platform providing professional-grade URL shortening, advanced analytics, and zero-knowledge secure data sharing.

**Live Demo:** [https://linkshortner.site](https://linkshortner.site)

---

## 💎 Overview

LinkShortner.site is a dual-tool platform built for security, speed, and insight. By consolidating a powerful **URL Shortener** and an encrypted **Secure Share** utility under one domain, we provide a seamless experience for modern digital workflows.

### 🛠️ The Suite

#### 1. PremiumShort (Root /)
*The ultimate link management tool.*
- **Smart Shortening**: Convert long URLs into sleek, branded links.
- **Advanced Analytics**: Track clicks, geographic locations (City/Country), browser types, and operating systems in real-time.
- **QR Engine**: Generate highly customizable QR codes for any link with custom colors and styling.
- **User Dashboard**: Manage your entire library of links and their performance from a central hub.

#### 2. SecureShare (/tool2/)
*Zero-knowledge encrypted sharing.*
- **Multi-Format Support**: Securely share Text, Links, and Images.
- **Password Protection**: Every share is encrypted and requires a password to unlock.
- **Self-Destruct Logic**: Set expiry times (1min to 24hrs) or view limits (1 to 100 views).
- **Glassmorphic UI**: A premium, high-end interface designed for a superior user experience.

---

## 🏗️ Architecture & Workflow

The platform operates on a **Distributed Micro-Frontend Architecture**:

1.  **Frontend (Netlify)**: Hosted on `linkshortner.site`. It uses Netlify's high-performance CDN and Edge Functions for routing.
2.  **Backend (Render)**: A Node.js/Express API cluster hosted on Render (`linkshortner-6ils.onrender.com`).
3.  **Database (MongoDB)**: Scalable document storage for links, analytics, and encrypted metadata.

### 🔄 How it Works (The Process)

#### URL Shortening Process
1.  **Request**: User enters a long URL.
2.  **Hashing**: Backend generates a unique identifier and stores the mapping.
3.  **Redirection**: When someone visits the short link, the backend captures metadata (IP, Agent) and redirects to the target URL instantly.
4.  **Analytics**: Data is processed and displayed on the user's dashboard charts.

#### Secure Sharing Process
1.  **Encryption**: User uploads content and sets a password.
2.  **Storage**: Content is stored securely (images on Cloudinary, metadata in MongoDB).
3.  **Unlocking**: Recipient receives a `#id=...` link. They must enter the correct password to decrypt and view the content.
4.  **Auto-Deletion**: Once the timer or view limit is reached, the backend automatically wipes the content.

---

## 💻 Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Custom Glassmorphism), Tailwind CSS (Logic).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB Atlas.
- **Storage**: Cloudinary (Image handling).
- **Security**: JWT Authentication, Bcrypt Hashing, Express Rate Limiting.
- **Analytics**: GeoIP-lite, UA-Parser.

---

## 🚀 Local Setup

To run this project locally:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/premium-shortener.git
    cd premium-shortener
    ```

2.  **Configure Backend**:
    - Navigate to `/backend`
    - Create a `.env` file with:
        ```env
        PORT=5000
        MONGO_URI=your_mongodb_uri
        JWT_SECRET=your_secret
        CLOUDINARY_CLOUD_NAME=name
        CLOUDINARY_API_KEY=key
        CLOUDINARY_API_SECRET=secret
        FRONTEND_URL=http://localhost:5500
        ```
    - Run `npm install` then `npm start`.

3.  **Configure Frontend**:
    - Update `API_BASE` in `frontend/script.js` and `tool2/frontend/js/tool.js` to `http://localhost:5000`.
    - Open `frontend/index.html` with Live Server.

---

## 🌍 Produciton Deployment

- **Frontend**: Deployed to **Netlify** with a custom `_redirects` file to handle Tool 1 and Tool 2 on the same domain.
- **Backend**: Deployed to **Render.com** with Web Service auto-deploy enabled.

---

## 📜 License
This project is proprietary. All rights reserved.

Created with ❤️ by **Deepmind Team & Mohammad Ehtisham**

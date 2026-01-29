# 🚀 LinkShortner.site - All-in-One Digital Utilities

A consolidated platform for URL shortening and secure data sharing.

## 📁 Project Structure

- **`/backend`**: Node.js/Express API cluster.
- **`/frontend`**: The single, consolidated frontend folder containing all tools.

---

## 🛠️ How to Run Locally

### 1. Start the Backend
1. Open your terminal in the `backend` folder.
2. Install dependencies: `npm install`
3. Start the server: `npm start`
   - *Ensure your `.env` file is configured with your MongoDB and Cloudinary credentials.*

### 2. Run the Frontend
1. Open the **`frontend`** folder in your code editor.
2. Use a local server (like **Live Server** in VS Code) or simply open the HTML files.
3. Access **URL Shortener**: `index.html`
4. Access **Secure Share**: `secure.html`

---

## 🌐 Production Deployment

- **Hosting**: The `frontend` folder is deployed to Netlify.
- **Routing**: `index.html` is the root. `secure.html` handles the Secure Share utility. `_redirects` ensures `linkshortner.site/tool2` still points to the secure tool.
- **Backend**: Hosted on Render.com.

---

## 💎 Features

### 1. URL Shortener (Tool 1)
- Professional link shortening.
- Real-time click analytics & geographic tracking.
- Custom QR Code generation.

### 2. Secure Share (Tool 2)
- Encrypted sharing of Text, Links, and Images.
- Password protection & Self-destructing links.
- View limits and expiry timers.

---

Created with ❤️ by **Deepmind Team & Mohammad Ehtisham**

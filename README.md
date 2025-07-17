# CodeBuddy

> A full-stack AI-powered journaling and mental wellness app powered by Gemini 2.5 and built with the MERN stack.

---

## ✨ Features

- 🧠 Gemini 2.5 integration (via Google GenAI API)
- 📜 Smart content generation and analysis
- 💬 Chat interface with timestamps and collapsible UI
- 📁 Real-time file editing and execution (supports Markdown + code)
- 🎨 Modern React frontend with Tailwind styling
- 🔐 Secure environment setup with proper `.gitignore`

---

## 🔧 Setup Instructions

### 1️⃣ Clone the repo

```bash```
git clone https://github.com/<your-username>/zen-space.git
cd zen-space

2️⃣ Install dependencies
bash
Copy
Edit
# For backend
cd backend
npm install

# For frontend
cd ../frontend
npm install

3️⃣ Setup environment variables
🌱 Create a .env file in both backend/ and frontend/ if needed.
Backend (example)

env
Copy
Edit
PORT=5000
GEMINI_CREDS_BASE64=your_base64_encoded_google_creds

🚀 Running the App
🖥 Backend (Node + Gemini)

```bash```

cd backend
node index.js
🌐 Frontend (React)

```bash```
cd frontend
npm run dev

🧠 Tech Stack
🔗 Frontend: React, TailwindCSS, Vite

🧠 AI: Google GenAI (Gemini 2.5 Flash)

🧾 Backend: Node.js, Express

☁️ Auth: GoogleAuth via service account

📦 Package Managers: npm

🛡 Security
geminiCredentials.json is excluded via .gitignore

Environment variables are injected securely

Never commit secrets — always use .env or platform environment settings


🙌 Acknowledgements
Google GenAI

Monaco Editor

React

Tailwind CSS

Node.js

📬 Contact
Built by Shlok S Shrikhande.
Feel free to open issues or suggestions in the Issues tab.

yaml
---

### Want Extras?

✅ Want me to embed badges, auto-deploy buttons (like for Vercel or Railway), or add a `CONTRIBUTING.md`?  
Just say the word, and I’ll plug it in.

Let me know your GitHub repo name and whether it’s monorepo or split — I’ll adjust paths too.

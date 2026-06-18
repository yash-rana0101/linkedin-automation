# 🚀 Automated LinkedIn Posting Agent

A production-grade TypeScript automation agent that fetches the latest tech/AI news daily, generates a highly engaging LinkedIn post utilizing Hugging Face LLM (Llama 3.1 8B), searches/downloads a relevant stock image from Unsplash, publishes the post directly to LinkedIn with the image, and sends status notifications via Gmail.

Built with a modular, scalable architecture complying with clean code standards. Ready for one-click deployment on Render.

---

## ✨ Features

- **🎭 Multiple Content Modes**: Randomly selects a posting strategy daily (News analysis: 40%, Viral/Opinionated: 25%, Relatable Meme: 15%, Actionable Tip: 20%).
- **🧠 Optimized LLM Generation**: Uses the OpenAI-compatible Hugging Face chat completions API (`Llama-3.1-8B-Instruct`) for fast, cost-efficient generation.
- **✨ Bold/Italic Font Formatter**: Automatically translates markdown bold (`*text*`) and italic (`_text_`) markers into LinkedIn-compatible mathematical Unicode styling (since LinkedIn doesn't natively support markdown formatting).
- **📸 Mandatory Image Fetching**: Uses keyword extraction from the generated post to search Unsplash for high-resolution images. Features a cascading fallback search so that a post is **never** published without an image.
- **🔐 Automatic OAuth Helper**: Built-in script that spins up a local server to complete the 3-step LinkedIn OAuth 2.0 flow and fetch the required `Person URN` and access token.
- **⏳ Token Expiry Safeguards**: Verifies LinkedIn token age on startup and warns/stops if the 60-day token is nearing expiration.
- **📬 Nodemailer Status Reports**: Sends rich HTML email status notifications (via Gmail App Passwords) for both successful posts and pipeline failures.
- **🐳 Render & Docker Ready**: Includes a multi-stage `Dockerfile`, `.dockerignore`, and `render.yaml` Blueprint for instant deployment as a free web service with an active `/health` check server to keep the service running.

---

## 📁 Repository Structure

```text
linkedin-automation/
├── scripts/
│   ├── linkedin-oauth.ts     # Local helper script to get LinkedIn access tokens & URN
│   └── test-run.ts           # Manual single-run pipeline test script
├── src/
│   ├── index.ts              # Entry point & daily cron scheduler (9:00 AM IST)
│   ├── types/
│   │   └── index.ts          # Core TS interface and type declarations
│   ├── constants/
│   │   └── prompts.ts        # LLM system prompts, weights, and configurations
│   ├── services/
│   │   ├── news.service.ts   # Curation service (NewsAPI & GNews fallback)
│   │   ├── llm.service.ts    # Hugging Face chat completions generator
│   │   ├── image.service.ts  # Unsplash image download & fallback resolver
│   │   ├── linkedin.service.ts# LinkedIn UGC (User Generated Content) publisher
│   │   └── mail.service.ts   # Nodemailer success/failure HTML notifier
│   └── utils/
│       ├── healthServer.ts   # HTTP status/health check server for Render
│       ├── logger.ts         # Timestamped console logger
│       ├── runLog.ts         # local run database (prevents duplicate runs)
│       ├── tokenExpiry.ts    # Warnings for LinkedIn access token expiration
│       └── unicodeFormat.ts  # Bold/Italic to LinkedIn Unicode converter
├── Dockerfile                # Production multi-stage Docker build
├── render.yaml               # Render Blueprint configuration file
├── package.json              # NPM scripts and dependencies
└── tsconfig.json             # TypeScript compiler settings
```

---

## 🛠️ Prerequisites

Make sure you have API keys and accounts for the following services:
1. **LinkedIn Developer Account**: Create an app on [LinkedIn Developers Portal](https://www.linkedin.com/developers/apps).
   - Add the **Share on LinkedIn** and **Sign In with LinkedIn (using OpenID Connect)** products.
   - Set authorized redirect URL to: `http://localhost:3000/callback`.
2. **Hugging Face Account**: Generate a User Access Token from your [Hugging Face Settings](https://huggingface.co/settings/tokens).
3. **Unsplash Developer Account**: Register a developer app at [Unsplash Developers](https://unsplash.com/developers) to get your Access & Secret keys.
4. **NewsAPI.org Account**: Create an account and get a free developer key at [NewsAPI](https://newsapi.org/).
5. **GNews.io Account (Optional)**: Backup news provider. Register at [GNews](https://gnews.io/).
6. **Gmail App Password**: To send email notifications, set up an [App Password](https://support.google.com/accounts/answer/185833?hl=en) for your Gmail account.

---

## ⚙️ Installation & Local Setup

### 1. Clone the repository and install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and populate your developer keys:
```bash
cp .env.example .env
```
Open `.env` and fill out all keys. Leave `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN`, and `LINKEDIN_TOKEN_CREATED_AT` empty for now.

### 3. Generate LinkedIn Access Token & Person URN
Run the interactive LinkedIn OAuth helper:
```bash
npx ts-node scripts/linkedin-oauth.ts
```
1. Open the login link printed in your terminal.
2. Authorize the application.
3. Once redirected, copy the generated `.env` variables from the terminal output and paste them into your `.env` file.

---

## 🧪 Testing the Pipeline

To run the automation pipeline once immediately (mocking a daily cron job):
```bash
npx ts-node scripts/test-run.ts
```
This will run the full sequence: select a mode, fetch headlines, query LLM, format text, download the stock image, publish it to LinkedIn, and email you a receipt.

---

## 🚀 Deploying to Render

The repository is pre-configured with a Render Blueprint (`render.yaml`) and a `Dockerfile`.

### Step-by-Step Deployment:
1. Push your repository to a private GitHub repository.
2. Go to the [Render Dashboard](https://dashboard.render.com/).
3. Click **Blueprints** → **New Blueprint Instance**.
4. Connect your GitHub repository.
5. Render will detect `render.yaml` and configure a Dockerized **Web Service** on the Free tier.
6. Enter the required **Environment Variables** in the Render UI prompt (copy the values from your local `.env`).
7. Click **Deploy**.

> [!NOTE]
> Since this project uses Render's **Free Web Service** tier, Render will spin down the container if it does not receive HTTP traffic for 15 minutes. To ensure the daily cron job runs at exactly 9:00 AM IST, set up a free service like **UptimeRobot** or **Better Stack** to ping your Render service's URL (e.g., `https://your-app-name.onrender.com/health`) every 5–10 minutes to keep it active.

---

## 🔍 Health Monitoring

The app hosts a lightweight HTTP server on the port specified by the `PORT` env variable (default `3000` locally, `10000` on Render).

Querying the `/health` or `/` endpoint returns:
```json
{
  "status": "ok",
  "service": "linkedin-automation",
  "uptime": "2583s",
  "lastRun": "2026-06-18T09:00:00.000Z",
  "nextCron": "09:00 AM IST daily",
  "timestamp": "2026-06-18T09:43:02.123Z"
}
```

---

## 📜 Development Scripts

- **`npm run dev`**: Runs the cron scheduler locally.
- **`npm run build`**: Compiles TypeScript files into the `dist/` directory.
- **`npm run start`**: Runs the compiled JS application (`dist/index.js`).

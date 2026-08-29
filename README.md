# 🏙️ CivicPulse — Autonomous Municipal Grievance Redressal & Field Ops Grid

> Transforming urban governance into a sub-second, closed-loop AI triage, GIS dispatch, and civic audit engine.

---

## 📌 Problem Statement & Overview
Conventional municipal grievance portals suffer from manual triage overhead, disconnected field contractors, static ticket queues, and lack of real-time SLA enforcement. **CivicPulse** eliminates routing delays with:
1. **Automated AI Visual Ingestion:** Categorizes hazards, detects severity, and auto-assigns municipal departments from uploaded photos.
2. **Sub-Second Real-Time Synchronization:** Directly bridges citizen mobile submissions with officer tactical desks via live Firestore WebSocket streams.
3. **Closed-Loop Field Verification:** Field contractors submit timestamped proof-of-work, and independent Swachh Survekshan auditors score ward compliance.

---

## 🚀 Key Features

### 📱 Citizen Mobile Portal
* **1-Tap Grievance Logging:** Instant geo-tagged photo submission with client-side HTML5 Canvas compression (<100 KB payload) for offline/low-bandwidth resilience.
* **Live SLA & Ticket Tracking:** Sub-second status timeline (`Assigned` ➔ `In Progress` ➔ `Resolved`) with estimated resolution countdowns.
* **Public Sanitation & SBM Facility Directory:** Dedicated full-screen directory of public restrooms and waste centers with real-time distance calculations, directions, and 5-star cleanliness ratings.
* **Ward Cleanliness Drives & SBM Events:** Citizen volunteer sign-up hub with SBM Karma Points (+50 points per drive).
* **Multilingual Localization:** Zero-dependency, instant switching between English, हिन्दी (Hindi), and తెలుగు (Telugu).

### 🖥️ Municipal Officer GIS Tactical Desk
* **Balanced 3-Column Command Center:**
  * **Left Column:** Live Ward Telemetry, SLA risk metrics, and departmental filters.
  * **Center Column:** Interactive GIS map with real-time pin clustering (Critical P1, Urgent P2, Normal P3, Resolved) and repair trajectory polylines.
  * **Right Column:** Live Incident Action Queue with 1-click crew dispatch, inspector closure proof inspect modal, and ticket resolution management.
* **Zero Manual Triage Overhead:** Automated department routing for Public Works, Sanitation, Water Board, and Electrical response units.

### 🛡️ Enterprise Security & Access Control (RBAC)
* Granular role protection across 5 tiers: `Citizen`, `Field Crew`, `Ward Officer`, `Swachh Survekshan Auditor`, and `Apex Super Admin`.
* Real Firebase Authentication supporting Google Single Sign-On and Mobile Phone OTP.
* Production Firestore security rules enforcing strict document mutation and role boundaries.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technology | Key Architectural Benefit |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript + Vite | Type-safe state management, sub-300ms HMR, responsive mobile/desktop interfaces. |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Minimalist GovTech design system with crisp slate/navy palette. |
| **Edge Hosting** | Cloudflare Pages & Global Edge CDN | Zero-cost serverless deployment with infinite instant concurrency and DDoS protection. |
| **Real-Time Database** | Google Cloud Firestore (`civictracker`) | Sub-second multi-device live synchronization via persistent `onSnapshot` listeners. |
| **Authentication** | Firebase Auth | Role-based credential verification via Google SSO and Phone OTP. |
| **AI Vision Engine** | Google Gemini Multimodal Vision API | Instant hazard category detection, severity scoring, and SLA estimation. |
| **Mapping & GIS** | Google Maps JavaScript API | Spatial pin clustering, street/satellite layer toggle, and routing. |
| **Client-Side Pipeline** | HTML5 Canvas Compression | Sub-second upload optimization (<100 KB base64) preventing database overflow. |

---

## ⚙️ Getting Started & Local Development

### Prerequisites
* Node.js (v18+ recommended)
* npm / yarn / pnpm

### Installation Steps
```bash
# 1. Clone repository
git clone https://github.com/your-username/civicpulse.git
cd civicpulse

# 2. Install dependencies
npm install

# 3. Configure Environment Variables
# Create a .env file at the project root with the following keys:
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# 4. Start Local Development Server
npm run dev
```

---

## 📄 License & Compliance
Built in strict alignment with national civic cleanliness standards (Swachh Bharat Mission Urban 2.0) and open municipal interoperability benchmarks.

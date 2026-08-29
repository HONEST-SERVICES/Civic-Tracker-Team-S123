# CivicPulse — Autonomous Municipal Grievance Redressal

> A production-grade GovTech platform transforming legacy urban grievance management into a sub-second, closed-loop AI triage and automated spatial dispatch grid.

* Live Edge Node: https://civic-pulse-tracker.pages.dev
* Presenters: Avinash Peela, Praveen, Navadeep, Ritul

---

## The Problem vs. The Solution

### Legacy Municipal Portals
* Multi-Day Triage Delays: Manual paper routing and departmental silos cause massive backlog accumulation.
* Static Ticketing Queues: Lack of real-time GPS tracking leaves field repair contractors unmonitored.
* Broken Feedback Loops: Citizens receive zero proof-of-work, leading to duplicate complaints and mistrust.

### The CivicPulse Grid
* Instant AI Hazard Classification: Multimodal Gemini Vision categorizes issues in <1s on upload.
* Live GIS Spatial Dispatch: Dynamic fleet routing and active SLA countdowns enforced at the ward level.
* Closed-Loop Photo Verification: Geo-tagged resolution photos and citizen quality scorecards ensure accountability.

---

## Citizen Interaction Flow

1. 1-Click Auth: Instant sign-in via Google SSO or mobile OTP with zero onboarding friction.
2. Photo Capture: 1-tap camera trigger to capture civic hazards (potholes, open drains, water bursts, illegal garbage piles).
3. GPS Snapping: Grabs high-precision coordinates, snapping issues directly to the corresponding municipal ward and street address.
4. Canvas Compression: Client-side HTML5 engine compresses payloads to <100 KB, guaranteeing sub-second uploads even on poor 3G/4G networks.
5. Live Tracking: Generates a live ticket ID with active SLA timers, crew assignment status, and stage milestones (Assigned -> Fixed).

---

## Core Intelligence: Gemini Vision Triage

* Multimodal Hazard Identification: Uploaded images are ingested via Gemini Vision and categorized by structural hazard type (Public Works, Sanitation, Electrical, Water Supply).
* Zero-Triage Routing: Matches hazard classes directly to designated municipal fleets without manual clerk intervention.

### Automated Severity Scoring & SLA Matrix

| Level | Severity | Description | SLA |
| :--- | :--- | :--- | :--- |
| P1 | Critical | Immediate physical threats (deep potholes, open drains, cave-ins) | 24 Hours |
| P2 | Urgent | High municipal disruptions (water main bursts, broken traffic signals) | 48 Hours |
| P3 | Normal | Routine maintenance (minor cracks, faded signs, street lamps) | 7 Days |

---

## Tactical Command & Field Operations

* Sub-Second Sync (Desk WebSocket Ingestion): Direct Firestore listeners (onSnapshot) eliminate HTTP polling; filings appear instantly on tactical GIS desks.
* Spatial Routing (Field Fleet Dispatch): Ward officers dispatch the nearest available repair fleet using dynamic Google Maps trajectory polylines, density clustering, and turn-by-turn navigation.
* Audit Protocol (Proof-of-Fix Verification): Field contractors must upload timestamped, GPS-verified resolution photos on-site before tickets can transition to resolved status.

---

## 3-Tier Governance & SLA Escalation

[Level 1: Field Contractor / JE]
       | (Standard Resolution Window: P1-24h, P2-48h, P3-7d)
       v (If SLA reaches 75% unassigned)
[Level 2: Ward Sanitary Inspector / AE]
       | (Auto-promotes priority P3 -> P2 -> P1 with dashboard flags)
       v (If SLA is breached)
[Level 3: Municipal Commissioner / Apex HQ]
       └─> Direct escalation; Swachh Survekshan audit points deducted

* Level 1 — Field Contractor / Junior Engineer (JE): Receives push dispatch and trajectory routing; executes physical repair within the SLA window.
* Level 2 — Ward Sanitary Inspector / Assistant Engineer (AE): Automated alert triggers at 75% SLA threshold if unassigned, auto-promoting priority (P3 -> P2 -> P1) with dashboard flags.
* Level 3 — Municipal Commissioner / Apex HQ: Breached tickets bypass ward controls directly to Apex Command, docking Swachh Survekshan audit points.

---

## Architecture & Tech Stack

| System Layer | Selected Stack | Key Technical Advantage |
| :--- | :--- | :--- |
| Edge Frontend | React 18, TypeScript, Tailwind CSS, Vite | Sub-300ms TTI, strictly typed data contracts, mobile-first design |
| Edge Domain | Cloudflare Pages Global Edge | Zero hosting cost, infinite instant concurrency, automated SSL |
| Real-Time DB | Firestore (civictracker) | Sub-second sync via persistent WebSocket listeners with ACID writes |
| Security & Auth | Firebase Auth & Granular RBAC | Role separation for Citizens, Field Crews, Inspectors, Ward Officers, Admins |
| Spatial & GIS | Google Maps API & Spatial Layers | GPS snapping, SBM facility routing, and ward heatmaps |

### Edge Infrastructure Highlights
* Serverless Execution: Eliminates VM maintenance through JAMstack serverless edge distribution.
* Surge Concurrency: Handles high traffic spikes during municipal cleanup drives, monsoons, or emergencies without cold starts or throttling.
* Sub-50ms Global PoPs: Static assets, client bundles, and WASM binaries cache at edge nodes across hundreds of PoPs.

---

## Swachh Bharat Mission (SBM) Public Amenities

* GIS Locator: Full-page interactive directory mapping public toilets, waste segregation centers, and SBM facilities.
* Dynamic Proximity: Calculates real-time walking/driving distance from live coordinates with integrated navigation.
* Cleanliness Scorecards: Crowdsourced ratings and hygiene feedback flow directly into ward evaluation dashboards for contractor accountability.

---

## Impact & Roadmap

* Triage Acceleration: Drops municipal grievance triage time from 3–5 business days to instant AI classification.
* Fiscal Efficiency: Serverless architecture keeps municipal cloud hosting and public software maintenance costs near zero.
* Next-Gen Expansion: Upcoming integrations include smart drain fill-level IoT telemetry, multi-lingual vernacular voice grievance intake, and inter-city cluster analytics.

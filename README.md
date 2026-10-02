# ♿ GatorAccess — SFSU Accessible Campus Navigator & Real-Time Incident Reporting

> **SF Hacks 2026 Hackathon Project**  
> An AI-powered, real-time accessibility navigator and automated facilities maintenance reporting system for San Francisco State University (SFSU).

---

## 🌟 The Problem
Campus navigation is fraught with unexpected barriers for disabled students, manual wheelchair users, and those with temporary injuries. When an elevator in the Cesar Chavez Student Center or library fails, or when construction blocks a ramp, students are stranded without alternative guidance or forced into steep, hazardous slopes (such as the 9.4% grade amphitheater paths). Furthermore, reporting hazards traditionally requires knowing technical jargon, complex facilities portals, or long phone waits.

## 🚀 What GatorAccess Does
1. **Interactive Google Maps Campus Navigator**:
   - Live campus map powered by modern Google Maps Platform (`@vis.gl/react-google-maps`, `DEMO_MAP_ID`, Advanced Markers).
   - Real-time status for all SFSU elevators, accessible power doors, and known ramps.
   - Dynamic barrier detection: if an elevator is marked offline, routes automatically detour around stairs using ADA-compliant ramps (slopes < 8.33%).

2. **Multimodal AI Hazard Scanner (Gemini 3.8 Flash)**:
   - Students upload or snap a photo of any accessibility obstacle (stairs, locked door, blocked ramp, broken blue push plate, elevator error code).
   - Gemini calculates ramp slope grade %, evaluates ADA compliance status, suggests safe detour paths, and auto-generates an official SFSU Facilities Services Work Order draft.

3. **Automated Facilities Dispatch & Priority Grouping**:
   - Submissions instantly create official SFSU Facilities Work Orders (e.g. `SFSU-FAC-2026-0891`).
   - Grouping & community upvoting system allows students to affirm hazards, escalating priority to "Critical" for emergency repair dispatch.

4. **1-Tap Gator Mobility Cart Ride & Physical Escorts**:
   - If an elevator is broken and no shallow ramp exists, students can tap a single button to request an electric golf cart pickup anywhere on campus with live simulated ETA and vehicle tracking.

5. **Direct CAPS Mental Health & Therapy Access**:
   - Lowers barriers to counseling and psychological services with one-click crisis calling to (415) 338-2208, 24/7 Crisis Text Line (Text COURAGE to 741741), and walk-in guidance to Student Services Building Room 205.

6. **Full Universal Accessibility (AAA Design)**:
   - High-contrast mode toggle for low-vision students.
   - Large typography zoom toggle.
   - Visual alerts mode for deaf or hard-of-hearing students.
   - Speech synthesis audio screen reader ("Read Directions Aloud").

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Motion
- **Maps & Geolocation**: Google Maps Platform (`@vis.gl/react-google-maps`, Routes API, AdvancedMarkerElement)
- **Generative AI**: `@google/genai` TypeScript SDK (Server-Side `gemini-3.8-flash`)
- **Backend / API**: Express 4, Node.js / tsx
- **Data & Facilities Queue**: In-memory persistent telemetry synchronized with SFSU DPRC (Disability Programs & Resource Center)

---

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/kimbedded/SFHacks-2026.git
cd SFHacks-2026

# Install dependencies
npm install

# Run the development server
npm run dev

# Or build and run production server
npm run build
npm start
```

### Environment Variables
Copy `.env.example` to `.env`:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
VITE_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
```

---

## 📞 Key SFSU Emergency & Accessibility Contacts
- **SFSU DPRC (Disability Programs & Resource Center)**: (415) 405-3580 • Cesar Chavez Student Center Room 400
- **Gator Mobility Cart Shuttle**: (415) 338-1441
- **CAPS Counseling & Crisis (24/7)**: (415) 338-2208 • Student Services Building Room 205
- **Campus Police & Safety Escort**: (415) 338-5200
- **Facilities Services Work Order Desk**: (415) 338-1568

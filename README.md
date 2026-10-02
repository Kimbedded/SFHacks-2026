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
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
GEMINI_API_KEY="your_gemini_api_key_here"
```

> **Note**: Do not create or commit a real `.env` file containing secrets to GitHub. In Google AI Studio, add secrets via the **Settings > Secrets** panel.

---

## 🗺️ Google Maps Platform Setup & Configuration Guide

GatorAccess features dual-mode campus navigation:
- **Offline / Demo Radar Mode**: Active by default when no API key is set or if credentials have an issue. Uses high-fidelity SVG vector maps with sample SF State campus barrier data, elevators, and routes. The app **never crashes**.
- **Live Google Maps Mode**: Activated automatically when a valid `GOOGLE_MAPS_API_KEY` is provided, loading real street & satellite tiles, Advanced Markers, and accessible route lines.

### Step-by-Step Google Cloud Configuration

To connect live Google Maps tiles, follow these steps:

1. **Create a Google Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com).
   - Click the project dropdown at the top of the page and select **New Project**.
   - Name your project (e.g., `GatorAccess-SFSU`) and click **Create**.

2. **Enable Billing**:
   - Navigate to **Billing** in the Google Cloud navigation menu.
   - Link an active billing account to your project.
   - *Note: Google Cloud provides a recurring $200 USD monthly credit for Google Maps Platform, making prototyping and hackathon usage free for typical development traffic.*

3. **Enable Required APIs**:
   - Navigate to **APIs & Services > Library**.
   - Search for **Maps JavaScript API** and click **Enable**.
   - Search for **Routes API** and click **Enable** (used for route directions).

4. **Create an API Key**:
   - Navigate to **APIs & Services > Credentials**.
   - Click **+ Create Credentials > API Key**.
   - Copy your generated API key.

5. **Restrict Your API Key (Recommended Best Practice)**:
   - In the API key details screen:
     - Under **Set an application restriction**, select **Websites**.
     - Add your application domain(s) (e.g. `*.run.app/*` for AI Studio preview, or `localhost:*` for local testing).
     - Under **API restrictions**, select **Restrict key**, then select:
       - **Maps JavaScript API**
       - **Routes API**
     - Click **Save**.

6. **Add the Key to Google AI Studio**:
   - In Google AI Studio, open the **Secrets / Configuration** dialog.
   - Add a new secret with:
     - **Name**: `GOOGLE_MAPS_API_KEY`
     - **Value**: Your Google Cloud API key
   - Refresh or restart the application. Live Google Maps will load immediately!

---

### 🛡️ Error Handling & Offline Fallback Matrix

GatorAccess includes proactive error handling for common Google Maps configuration states:

| Issue / Error | What Happened | App Behavior | How to Resolve |
| :--- | :--- | :--- | :--- |
| **Missing Key** | No `GOOGLE_MAPS_API_KEY` configured | App continues in **Demo / Offline Radar Mode**. Full campus barriers and elevator data remain interactive. | Add `GOOGLE_MAPS_API_KEY` in AI Studio Secrets. |
| **`ApiProjectMapError`** | Maps JavaScript API is not enabled on your Google Cloud project | Displays friendly alert; gracefully falls back to offline Radar mode without crashing. | Enable **Maps JavaScript API** in Google Cloud Console > APIs & Services > Library. |
| **`BillingNotEnabledMapError`** | Billing account not attached to Google Cloud project | Displays billing notice with link; radar mode remains active. | Attach a billing account in Google Cloud Console > Billing. |
| **`InvalidKeyMapError`** | Key is mistyped, expired, or deleted | Displays invalid key warning; radar mode remains active. | Check the key value in AI Studio Secrets against Google Cloud Console. |
| **`RefererNotAllowedMapError`** | Website domain restriction does not match current URL | Explains domain mismatch and lists allowed domains; radar mode active. | Add current domain or `*.run.app/*` to website restrictions in Google Cloud Console. |
| **`OverQuotaMapError`** | Project usage limit exceeded | Displays quota warning; radar mode active. | Check usage quotas in Google Cloud Console. |

---

## 📷 Camera Permissions & Live Scanner Guide

The **AI Hazard Scanner & Report** tab operates strictly with live device camera capture:

1. **Permission Request**:
   - Camera access (`navigator.mediaDevices.getUserMedia`) is requested **only** after you click the **Open Camera** button.
   - On mobile devices, the app automatically requests the rear-facing camera (`facingMode: { ideal: 'environment' }`).
   - If permission is denied or no camera hardware is present, a clear explanatory prompt is shown along with the **Use Demo Hazard Photo** option.

2. **Still Frame Capture & Privacy**:
   - The browser presents a live viewfinder with a targeting reticle.
   - Clicking **Take Picture** captures exactly one still image on a local `<canvas>` and **immediately terminates the camera stream** (`MediaStream.getTracks().forEach(track => track.stop())`).
   - You can choose **Retake Picture** to reopen the camera or **Use This Picture** to proceed. No images are uploaded until you explicitly review and submit.

3. **Demo Mode**:
   - If camera hardware is unavailable, clicking **Use Demo Hazard Photo** simulates a photo of blocked campus stairs and allows you to test the complete analysis and submission flow.

---

## 🤖 Gemini Multimodal AI Setup & Architecture

1. **API Key Configuration**:
   - Set `GEMINI_API_KEY` in your environment or via AI Studio Secrets.
   - All Gemini calls run strictly server-side (`server/geminiService.ts` via Express `/api/analyze-hazard`). The API key is **never** exposed to client browser code.

2. **Model**:
   - Powered by `@google/genai` TypeScript SDK using `gemini-3.8-flash`.
   - Uses structured JSON response schema to return:
     ```json
     {
       "hazardType": "blocked_walkway",
       "severity": "medium",
       "summary": "The walkway appears to be blocked by construction materials.",
       "accessibilityImpact": "A wheelchair user may not be able to pass safely.",
       "recommendedAction": "Use an alternate entrance and submit a facilities report.",
       "reportCategory": "obstructed_path",
       "confidence": 0.88
     }
     ```

3. **Interactive User Review & Overrides**:
   - After analysis, students inspect the captured image alongside Gemini's suggestions.
   - All fields (Hazard Type, Severity, Campus Location, Summary, Accessibility Impact, Recommended Action) can be directly edited prior to submitting.
   - Prominent disclaimer states: *"Gemini’s analysis is only an aid and not an official accessibility determination. Please verify the result before reporting."*

4. **Complete Test Flow**:
   **Open Camera → Take Picture → Use This Picture → Analyze with Gemini → Review/Edit → Submit Report → Confirmation ID**

---

## 📞 Key SFSU Emergency & Accessibility Contacts
- **SFSU DPRC (Disability Programs & Resource Center)**: (415) 405-3580 • Cesar Chavez Student Center Room 400
- **Gator Mobility Cart Shuttle**: (415) 338-1441
- **CAPS Counseling & Crisis (24/7)**: (415) 338-2208 • Student Services Building Room 205
- **Campus Police & Safety Escort**: (415) 338-5200
- **Facilities Services Work Order Desk**: (415) 338-1568

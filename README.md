# Kinexa — AI-Powered Physical Therapy Companion

**Kinexa** is an intelligent, real-time physical therapy and biomechanics rehabilitation companion. Designed for patients and physical therapists, Kinexa turns any standard webcam into a clinical motion-capture laboratory. It tracks movement kinematics in real time, validates exercise repetitions, provides instant corrective feedback, and leverages Google Gemini to produce clinical notes and downloadable patient reports.

---

## Table of Contents

- [Overview](#overview)
- [Key Capabilities](#key-capabilities)
- [How It Works](#how-it-works)
  - [1. Optical Motion Capture & Pose Estimation](#1-optical-motion-capture--pose-estimation)
  - [2. Biomechanical Angle & Perspective Computation](#2-biomechanical-angle--perspective-computation)
  - [3. Finite State Machine (FSM) Repetition & Form Engine](#3-finite-state-machine-fsm-repetition--form-engine)
  - [4. Generative AI Clinical Analysis](#4-generative-ai-clinical-analysis)
  - [5. Reporting & PDF Generation](#5-reporting--pdf-generation)
- [Supported Exercises](#supported-exercises)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Development Server](#development-server)
  - [Production Build](#production-build)

---

## Overview

Physical rehabilitation often suffers from adherence issues and improper exercise execution at home. Without a physical therapist present, patients may perform exercises with improper form, risking injury or reducing recovery effectiveness.

**Kinexa solves this by providing:**
- **Real-time biomechanical guidance:** Instant visual cues and angle calculations to ensure proper range of motion.
- **Accurate repetition and duration tracking:** State machines prevent cheat reps and reward controlled cadence.
- **Form fault detection:** Dynamic alerts for common issues such as knee valgus in squats or sagging hips in planks.
- **Physiotherapist-grade reporting:** AI-generated clinical summaries detailing joint stability, consistency, and movement patterns for doctors and physical therapists.

---

## Key Capabilities

- **Real-Time Skeleton Visualization:** Live 33-point body landmark rendering overlaid on the patient's webcam feed with 60 FPS performance.
- **Automated Repetition & Hold Timing:** Detects transition states between starting positions, peak contraction points, and return movements.
- **Adaptive Viewpoint Detection:** Automatically discerns between frontal and lateral perspectives (e.g., switching between hip and knee angle tracking for squats).
- **On-Demand AI Snapshot Coaching:** Patients can trigger a photo snapshot during an exercise to receive instant, targeted biomechanical critiques from Gemini.
- **Clinical Observation Summaries:** Generates concise medical observations post-session tailored for healthcare providers.
- **Downloadable Clinical PDF Reports:** Exports formatted clinical records complete with exercise volume tables, duration, accuracy scores, and doctor's notes.
- **Historical Session Dashboard:** Track recovery progress over time with metrics including overall accuracy, session duration, exercises logged, and pain levels.

---

## How It Works

```
 ┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
 │  Webcam Feed    │ ────> │  MediaPipe Pose Model  │ ────> │  Biomechanical Angles  │
 │  (React-Webcam) │       │  (33 3D Keypoints)     │       │  & Vector Geometry     │
 └─────────────────┘       └────────────────────────┘       └────────────────────────┘
                                                                        │
                                                                        ▼
 ┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
 │  Clinical PDF   │ <──── │  Gemini Generative AI  │ <──── │  Exercise State Engine │
 │  & Session View │       │  (Clinical Summaries)  │       │  (FSM Rep & Form Eval) │
 └─────────────────┘       └────────────────────────┘       └────────────────────────┘
```

### 1. Optical Motion Capture & Pose Estimation
The user initiates a session, activating their web camera via `react-webcam`. The video stream is processed frame-by-frame by Google's **MediaPipe Pose** model running directly in the browser via WebAssembly and WebGL. It tracks 33 critical anatomical landmarks—including shoulders, elbows, wrists, hips, knees, and ankles—in 3D space with visibility scores.

### 2. Biomechanical Angle & Perspective Computation
The application applies vector trigonometry (`Math.atan2`) across adjacent joint triples (e.g., shoulder-elbow-wrist for arm flexion, or hip-knee-ankle for leg extension) to compute planar joint angles:
$$\theta = \left| \operatorname{atan2}(C_y - B_y, C_x - B_x) - \operatorname{atan2}(A_y - B_y, A_x - B_x) \right|$$
Additionally, relative shoulder width distance is continuously evaluated to identify whether the user is facing the camera head-on or positioned laterally, dynamically adjusting the reference metric.

### 3. Finite State Machine (FSM) Repetition & Form Engine
Each exercise is governed by an individual state engine:
- **`START` State:** Patient is in neutral/starting extension.
- **`ACTIVE` State:** Patient reaches target flexion depth or threshold angle.
- **Completion Check:** Transition back to `START` verifies minimum time under tension (debounce) to validate complete reps and prevent false positives.
- **Form Fault Checks:** Parallel heuristic rules run on each frame (e.g., knee-to-hip ratio to detect knee valgus).

### 4. Generative AI Clinical Analysis
Upon concluding the exercise session, aggregated performance metrics (exercises performed, repetitions, hold times, and form accuracy) are sent to **Google Gemini** via `@google/genai`. Gemini acts as an expert physiotherapist, producing a focused clinical observation analyzing joint stability, compensatory patterns, and movement consistency for medical record keeping.

### 5. Reporting & PDF Generation
Sessions are summarized on an interactive Report Card. Using `jsPDF` and `jspdf-autotable`, patients can generate and download clinical reports formatted with session metadata, exercise volume tables, and doctor's notes.

---

## Supported Exercises

| Exercise | Primary Biomechanical Metric | Target Criteria | Form Guardrails |
| :--- | :--- | :--- | :--- |
| **Squats** | Knee Angle (Front) / Hip Angle (Lateral) | Active depth $\le 100^\circ - 130^\circ$, return $\ge 160^\circ$ | Knee valgus detection (knees collapsing inward relative to hips) |
| **Pushups** | Elbow Flexion Angle | Active depth $\le 90^\circ$, full extension $\ge 160^\circ$ | Validated depth before counting rep |
| **Lateral Lunge** | Working Knee Flexion Angle | Working knee $\le 110^\circ$, trailing leg static lock $\ge 150^\circ$ | Hip drop threshold validation |
| **Planks** | Shoulder-Hip-Knee Alignment | Linear body line maintained between $165^\circ - 195^\circ$ | Hold timer increments only while alignment criteria are satisfied |

---

## Technical Stack

### Core Frontend & Framework
- **React 18**: Component architecture and UI state management.
- **TypeScript**: Static type safety for biomechanical coordinates and session data.
- **Vite 5**: Fast build tool and module bundler.
- **Tailwind CSS**: Responsive styling and visual layout.
- **Space Grotesk & DM Sans**: Clean typography designed for clinical readability.

### Computer Vision & Kinematics
- **Google MediaPipe Pose (`@mediapipe/pose`)**: Client-side, high-performance ML pose landmark estimation.
- **HTML5 Canvas 2D**: Real-time skeleton overlay rendering.
- **`react-webcam`**: Cross-browser webcam capture and video element streaming.

### Artificial Intelligence & LLM
- **Google GenAI SDK (`@google/genai`)**: Integration with Google Gemini models (`gemini-2.5-flash` / `gemini-3.8-flash`).
- **Multimodal AI Analysis**: On-demand snapshot analysis and automated clinical summary generation.

### Reporting & Cloud Services
- **jsPDF & jsPDF-AutoTable**: Client-side vector PDF generation for medical reports.
- **Firebase (Auth & Firestore)**: Session persistence and user profile management with built-in offline demo fallback.

---

## Project Structure

```
├── components/
│   ├── Button.tsx            # Reusable button component
│   ├── Dashboard.tsx         # Patient dashboard, metrics overview, and history
│   ├── Header.tsx            # Navigation and patient header
│   ├── Login.tsx             # Firebase Google authentication view
│   ├── ReportCard.tsx        # Post-session summary and PDF export
│   └── SessionView.tsx       # Live camera view, MediaPipe tracking, and exercise FSM
├── services/
│   └── firebaseService.ts    # Firestore data querying and authentication helpers
├── firebaseConfig.ts         # Firebase credentials and initialization
├── types.ts                  # Domain models (Session, UserProfile, Exercise)
├── App.tsx                   # Main application flow and state transitions
├── index.html                # Entry HTML with MediaPipe & jsPDF script includes
├── index.tsx                 # React DOM mount point
├── vite.config.ts            # Vite configuration
└── tsconfig.json             # TypeScript compiler settings
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A modern web browser with WebGL and camera access permissions enabled (Chrome, Edge, Firefox, or Safari)

### Installation
Clone the repository and install the dependencies:
```bash
git clone <repository-url>
cd kinetic-rehab
npm install
```

### Environment Configuration
To enable AI clinical observations and snapshot coaching, provide your Gemini API key:
Create a `.env` or `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development Server
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`. Grant camera permissions when prompted.

### Production Build
To create an optimized production build:
```bash
npm run build
```
Preview the built application:
```bash
npm run preview
```

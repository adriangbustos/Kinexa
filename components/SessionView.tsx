import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from './Button';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_KEY_STORAGE, GEMINI_MODEL_STORAGE, DEFAULT_GEMINI_MODEL } from "./SettingsModal";

interface SessionViewProps {
  onExit: () => void;
  onSave: (data: any) => void;
  onOpenSettings?: (msg?: string) => void;
}

const EXERCISE_OPTIONS = [
  'Squats',
  'Pushups',
  'Lateral Lunge',
  'Plank',
];

// --- 4. Threshold Dictionary ---
const EXERCISE_RULES = {
  Squats: {
    type: 'REP',
    metric: 'Angle',
    front: { start: 165, active: 130 },
    lateral: { start: 160, active: 100 }, 
  },
  Pushups: {
    type: 'REP',
    metric: 'Elbow Angle',
    lateral: { start: 160, active: 90 },
    front: { start: 160, active: 90 },
  },
  'Lateral Lunge': {
    type: 'REP',
    metric: 'Working Knee',
    startAngle: 165,    
    workingMax: 110,    
    staticMin: 150,     
    hipDropThreshold: 0.1 
  },
  Plank: {
    type: 'DURATION',
    metric: 'Body Alignment',
    minAngle: 165,
    maxAngle: 195,
  }
};

type ExerciseState = 'START' | 'ACTIVE';

// --- Biomechanical Telemetry Dial ---
interface AngleDialProps {
  angle: number;
  label: string;
  isBadForm: boolean;
  exercise: string;
  viewpoint: 'FRONTAL' | 'LATERAL';
  exerciseState: ExerciseState;
}

const AngleDial: React.FC<AngleDialProps> = ({ 
  angle, 
  label, 
  isBadForm, 
  exercise, 
  viewpoint
}) => {
  const isTargetDepth = () => {
    switch (exercise) {
      case 'Squats':
        return viewpoint === 'LATERAL' ? angle <= 100 : angle <= 130;
      case 'Pushups':
        return angle <= 90;
      case 'Lateral Lunge':
        return angle <= 110;
      case 'Plank':
        return angle >= 165 && angle <= 195;
      default:
        return false;
    }
  };

  const isTarget = isTargetDepth();
  const clampedAngle = Math.max(0, Math.min(180, angle));
  const arcLength = 119.38; // PI * r (r=38)
  const strokeDashoffset = arcLength * (1 - clampedAngle / 180);

  return (
    <div className={`p-4 rounded-2xl backdrop-blur-md transition-all shadow-bevel-subtle border border-black/[0.06] ${
      isBadForm
        ? 'bg-paper/95 text-ink'
        : isTarget
        ? 'bg-paper/95 text-ink'
        : 'bg-paper/95 text-ink'
    }`}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs font-medium text-body-gray">
          {label}
        </span>
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
          isBadForm ? 'bg-[#ffab94]/20 text-[#d95338]' :
          isTarget ? 'bg-[#31ce01]/15 text-[#1e8500]' :
          'bg-cloud text-body-gray'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            isBadForm ? 'bg-coral-signal' : isTarget ? 'bg-recovery-green' : 'bg-metric-blue'
          }`}></span>
          {isBadForm ? 'Fault' : isTarget ? 'Target' : 'Tracking'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-16 h-10 shrink-0 overflow-hidden flex items-end justify-center">
          <svg viewBox="0 0 84 46" className="w-16 h-9">
            <path
              d="M 4 42 A 38 38 0 0 1 80 42"
              fill="none"
              stroke="#ebf0f8"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 4 42 A 38 38 0 0 1 80 42"
              fill="none"
              stroke={isBadForm ? '#ffab94' : isTarget ? '#31ce01' : '#415eee'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-150"
            />
          </svg>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold font-display tabular-nums tracking-[-0.03em] text-ink">
              {angle}°
            </span>
          </div>
          <span className="text-[11px] text-body-gray block -mt-0.5 font-normal">
            {exercise === 'Plank' 
              ? 'Target: 165°–195°' 
              : exercise === 'Squats'
              ? (viewpoint === 'LATERAL' ? 'Target: ≤ 100°' : 'Target: ≤ 130°')
              : 'Target: Depth Flexion'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Global MediaPipe Pose singleton to prevent multiple WASM initializations in React 18
let globalPoseInstance: any = null;
let globalPoseInitPromise: Promise<any> | null = null;

async function getOrCreatePoseInstance(): Promise<any> {
  if (globalPoseInstance) return globalPoseInstance;
  if (globalPoseInitPromise) return globalPoseInitPromise;

  if (typeof window === 'undefined' || !window.Pose) {
    throw new Error('MediaPipe Pose script not loaded yet');
  }

  globalPoseInitPromise = (async () => {
    const pose = new window.Pose({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    if (pose.initialize) {
      await pose.initialize();
    }
    globalPoseInstance = pose;
    return pose;
  })();

  return globalPoseInitPromise;
}

export const SessionView: React.FC<SessionViewProps> = ({ onExit, onSave, onOpenSettings }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseInstanceRef = useRef<any>(null);
  
  // UI State
  const [currentExercise, setCurrentExercise] = useState('Squats');
  const currentExerciseRef = useRef(currentExercise);
  const [repCount, setRepCount] = useState(0);
  const [displayMetric, setDisplayMetric] = useState<number>(0); 
  const [metricLabel, setMetricLabel] = useState('Angle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isBadForm, setIsBadForm] = useState(false);
  const [viewpoint, setViewpoint] = useState<'FRONTAL' | 'LATERAL'>('FRONTAL');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Session Accumulation State
  const accumulatedStats = useRef<Record<string, number>>({});
  
  // State Machine Indicators
  const [exerciseState, setExerciseState] = useState<ExerciseState>('START');
  const [holdTimer, setHoldTimer] = useState(0);

  // Detection & Diagnostics State
  const [modelStatus, setModelStatus] = useState<'INITIALIZING' | 'READY' | 'TRACKING' | 'SEARCHING' | 'ERROR'>('INITIALIZING');
  const [activeFps, setActiveFps] = useState<number>(0);
  const fpsFrameCountRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(Date.now());
  const cameraManagerRef = useRef<any>(null);

  // Analysis & Countdown State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [coachInsight, setCoachInsight] = useState<string | null>(null);

  // Logic Refs
  const startTimeRef = useRef<number>(Date.now());
  const requestRef = useRef<number | null>(null);
  const statsRef = useRef({ goodFrames: 0, totalFrames: 0 });
  const angleSumRef = useRef(0);
  const angleFrameCountRef = useRef(0);

  // Tracking Refs
  const stateRef = useRef<ExerciseState>('START');
  const lastRepTimeRef = useRef<number>(0);
  const activeStartTimeRef = useRef<number>(0);
  const lastTimerTickRef = useRef<number>(0);
  const standingHipYRef = useRef<number>(0);

  // --- Helpers ---
  const calculateAngle = (a: any, b: any, c: any) => {
    if (!a || !b || !c) return 180;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  const getDominantSide = (landmarks: any[]) => {
    const leftVis = landmarks[11].visibility + landmarks[23].visibility + landmarks[25].visibility;
    const rightVis = landmarks[12].visibility + landmarks[24].visibility + landmarks[26].visibility;
    return leftVis > rightVis ? 'LEFT' : 'RIGHT';
  };

  const checkPlankForm = (shoulder: any, hip: any, knee: any) => {
    const angle = calculateAngle(shoulder, hip, knee);
    const rules = EXERCISE_RULES.Plank;
    return angle >= rules.minAngle && angle <= rules.maxAngle;
  };

  // --- Logic to Switch Exercise & Save Stats ---
  const switchExercise = (newExercise: string) => {
    // 1. Save current stats before switching
    const currentValue = currentExercise === 'Plank' ? holdTimer : repCount;
    if (currentValue > 0) {
      accumulatedStats.current[currentExercise] = (accumulatedStats.current[currentExercise] || 0) + currentValue;
    }
    
    // 2. Switch
    setCurrentExercise(newExercise);
  };

  useEffect(() => {
    currentExerciseRef.current = currentExercise;
    // Reset Counters on exercise change
    setRepCount(0);
    setHoldTimer(0);
    setFeedbackMessage('');
    setIsBadForm(false);
    stateRef.current = 'START';
    setExerciseState('START');
    // Note: We do NOT reset accumulatedStats here
    
    // Reset tracking refs specific to exercise mechanics
    standingHipYRef.current = 0;
  }, [currentExercise]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      performCaptureAndAnalysis();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    let isMounted = true;
    let isFrameBusy = false;
    startTimeRef.current = Date.now();

    const onResults = (results: any) => {
      if (!isMounted || !canvasRef.current) return;

      // Update FPS metrics
      fpsFrameCountRef.current++;
      const now = Date.now();
      if (now - lastFpsCalcTimeRef.current >= 1000) {
        setActiveFps(fpsFrameCountRef.current);
        fpsFrameCountRef.current = 0;
        lastFpsCalcTimeRef.current = now;
      }

      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      const video = webcamRef.current?.video;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
        setModelStatus('SEARCHING');
        canvasCtx.restore();
        return;
      }

      setModelStatus('TRACKING');
      const lm = results.poseLandmarks;
      
      const side = getDominantSide(lm);
      const isLeft = side === 'LEFT';
      
      const shoulder = isLeft ? lm[11] : lm[12];
      const hip = isLeft ? lm[23] : lm[24];
      const knee = isLeft ? lm[25] : lm[26];
      const ankle = isLeft ? lm[27] : lm[28];
      const elbow = isLeft ? lm[13] : lm[14];
      const wrist = isLeft ? lm[15] : lm[16];

      const shoulderWidth = Math.abs(lm[11].x - lm[12].x);
      const isLateral = shoulderWidth < 0.15;
      setViewpoint(isLateral ? 'LATERAL' : 'FRONTAL'); 

      let currentMetric = 0;
      let formError = '';
      let isFormGood = true;

      const exercise = currentExerciseRef.current;

      switch(exercise) {
        case 'Squats': {
            const rules = EXERCISE_RULES.Squats;
            if (isLateral) {
                setMetricLabel('Hip Angle');
                currentMetric = calculateAngle(shoulder, hip, knee);
            } else {
                setMetricLabel('Knee Angle');
                currentMetric = calculateAngle(hip, knee, ankle);
            }
            setDisplayMetric(currentMetric);

            const thresholds = isLateral ? rules.lateral : rules.front;

            if (stateRef.current === 'START') {
                if (currentMetric <= thresholds.active) {
                    stateRef.current = 'ACTIVE';
                    setExerciseState('ACTIVE');
                    activeStartTimeRef.current = Date.now();
                }
            } else if (stateRef.current === 'ACTIVE') {
                if (currentMetric >= thresholds.start) {
                    const nowTime = Date.now();
                    const durationInActive = nowTime - activeStartTimeRef.current;
                    const timeSinceLastRep = nowTime - lastRepTimeRef.current;
                    
                    if (durationInActive > 200 && timeSinceLastRep > 1000) {
                        setRepCount(c => c + 1);
                        lastRepTimeRef.current = nowTime;
                    }
                    stateRef.current = 'START';
                    setExerciseState('START');
                }
            }
            
            if (!isLateral) {
                const hipSep = Math.abs(lm[23].x - lm[24].x);
                const kneeSep = Math.abs(lm[25].x - lm[26].x);
                if (kneeSep < hipSep * 0.7) {
                    formError = "Push knees outward";
                    isFormGood = false;
                }
            }
            break;
        }

        case 'Pushups': {
            setMetricLabel('Elbow Angle');
            currentMetric = calculateAngle(shoulder, elbow, wrist);
            setDisplayMetric(currentMetric);

            const rules = EXERCISE_RULES.Pushups;
            const thresholds = rules.lateral;

            if (stateRef.current === 'START') {
                if (currentMetric <= thresholds.active) {
                    stateRef.current = 'ACTIVE';
                    setExerciseState('ACTIVE');
                    activeStartTimeRef.current = Date.now();
                }
            } else if (stateRef.current === 'ACTIVE') {
                if (currentMetric >= thresholds.start) {
                    const nowTime = Date.now();
                    const durationInActive = nowTime - activeStartTimeRef.current;
                    const timeSinceLastRep = nowTime - lastRepTimeRef.current;

                    if (durationInActive > 200 && timeSinceLastRep > 1000) {
                        setRepCount(c => c + 1);
                        lastRepTimeRef.current = nowTime;
                    }
                    stateRef.current = 'START';
                    setExerciseState('START');
                }
            }
            break;
        }

        case 'Lateral Lunge': {
            setMetricLabel('Working Knee');
            const rules = EXERCISE_RULES['Lateral Lunge'];
            
            const lKneeAngle = calculateAngle(lm[23], lm[25], lm[27]);
            const rKneeAngle = calculateAngle(lm[24], lm[26], lm[28]);
            
            const isLeftWorking = lKneeAngle < rKneeAngle;
            const workingKneeAngle = isLeftWorking ? lKneeAngle : rKneeAngle;
            const staticKneeAngle = isLeftWorking ? rKneeAngle : lKneeAngle;
            
            currentMetric = workingKneeAngle;
            setDisplayMetric(currentMetric);

            const currentHipY = isLeftWorking ? lm[23].y : lm[24].y;

            if (stateRef.current === 'START') {
                if (standingHipYRef.current === 0) {
                    if (lKneeAngle > rules.startAngle && rKneeAngle > rules.startAngle) {
                        standingHipYRef.current = currentHipY;
                    }
                }
                const hipDrop = currentHipY - standingHipYRef.current; 
                
                if (workingKneeAngle < rules.workingMax && 
                    staticKneeAngle > rules.staticMin &&
                    hipDrop > rules.hipDropThreshold) {
                        stateRef.current = 'ACTIVE';
                        setExerciseState('ACTIVE');
                        activeStartTimeRef.current = Date.now();
                }
            } else if (stateRef.current === 'ACTIVE') {
                if (lKneeAngle > rules.startAngle && rKneeAngle > rules.startAngle) {
                     const nowTime = Date.now();
                     const durationInActive = nowTime - activeStartTimeRef.current;
                     const timeSinceLastRep = nowTime - lastRepTimeRef.current;

                     if (durationInActive > 300 && timeSinceLastRep > 1000) {
                         setRepCount(c => c + 1);
                         lastRepTimeRef.current = nowTime;
                     }
                     stateRef.current = 'START';
                     setExerciseState('START');
                }
            }
            break;
        }

        case 'Plank': {
            setMetricLabel('Align Angle');
            const alignmentAngle = calculateAngle(shoulder, hip, knee);
            currentMetric = alignmentAngle;
            setDisplayMetric(currentMetric);

            const isAligned = checkPlankForm(shoulder, hip, knee);

            if (isAligned) {
                const nowTime = Date.now();
                if (nowTime - lastTimerTickRef.current >= 1000) {
                    setHoldTimer(t => t + 1);
                    lastTimerTickRef.current = nowTime;
                }
                if (stateRef.current !== 'ACTIVE') {
                    stateRef.current = 'ACTIVE';
                    setExerciseState('ACTIVE');
                }
            } else {
                formError = "Align Hips to Resume";
                isFormGood = false;
                if (stateRef.current !== 'START') {
                    stateRef.current = 'START';
                    setExerciseState('START');
                }
            }
            break;
        }
      }

      if (exercise === 'Squats' && currentMetric > 0) {
        angleSumRef.current += currentMetric;
        angleFrameCountRef.current += 1;
      }
      statsRef.current.totalFrames++;
      if (isFormGood) statsRef.current.goodFrames++;

      setIsBadForm(!isFormGood);
      setFeedbackMessage(formError);

      // Draw real-time skeleton & keypoints
      const skeletonColor = !isFormGood ? '#ffab94' : '#415eee';
      const landmarkColor = !isFormGood ? '#ffab94' : '#31ce01';

      if (window.drawConnectors && window.drawLandmarks) {
        if (!isLateral) {
           window.drawConnectors(canvasCtx, lm, window.POSE_CONNECTIONS,
               { color: skeletonColor, lineWidth: 4 });
           
           window.drawLandmarks(canvasCtx, lm,
               { color: landmarkColor, lineWidth: 2, radius: 4 });
        } else {
           const lateralConnections = isLeft 
              ? [[7, 11], [11, 23], [23, 25], [25, 27], [11, 13], [13, 15]]
              : [[8, 12], [12, 24], [24, 26], [26, 28], [12, 14], [14, 16]];

           const visibleIndices = isLeft 
              ? [7, 11, 13, 15, 23, 25, 27] 
              : [8, 12, 14, 16, 24, 26, 28];
              
           const visibleLandmarks = visibleIndices.map(idx => lm[idx]);

           window.drawConnectors(canvasCtx, lm, lateralConnections,
               { color: skeletonColor, lineWidth: 4 });
           
           window.drawLandmarks(canvasCtx, visibleLandmarks,
               { color: landmarkColor, lineWidth: 4, radius: 6 });
        }
      }

      canvasCtx.restore();
    };

    const processFrame = async () => {
      if (!isMounted || isFrameBusy) return;
      const video = webcamRef.current?.video;
      if (video && video.readyState >= 2 && poseInstanceRef.current) {
        isFrameBusy = true;
        try {
          await poseInstanceRef.current.send({ image: video });
        } catch (err) {
          // Handled frame drop to protect WASM pipeline
        } finally {
          isFrameBusy = false;
        }
      }
    };

    const startCameraLoop = () => {
      const video = webcamRef.current?.video;
      if (!video) {
        setTimeout(startCameraLoop, 200);
        return;
      }

      if (window.Camera && !cameraManagerRef.current) {
        try {
          const camera = new window.Camera(video, {
            onFrame: async () => {
              await processFrame();
            },
            width: 1280,
            height: 720
          });
          cameraManagerRef.current = camera;
          camera.start();
          return;
        } catch (camErr) {
          console.warn("window.Camera start failed, falling back to RAF loop:", camErr);
        }
      }

      const loop = async () => {
        if (!isMounted) return;
        await processFrame();
        if (isMounted) {
          requestRef.current = requestAnimationFrame(loop);
        }
      };
      loop();
    };

    const initPose = async () => {
      if (!window.Pose) {
        setTimeout(initPose, 200);
        return;
      }

      try {
        const pose = await getOrCreatePoseInstance();
        if (!isMounted) return;
        pose.onResults(onResults);
        poseInstanceRef.current = pose;
        setModelStatus('READY');
        startCameraLoop();
      } catch (err) {
        console.error("Global Pose singleton initialization failed:", err);
        if (isMounted) setModelStatus('ERROR');
      }
    };

    initPose();

    return () => {
      isMounted = false;
      if (cameraManagerRef.current) {
        try {
          cameraManagerRef.current.stop();
        } catch (e) {}
        cameraManagerRef.current = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, []);

  const startAnalysisCountdown = () => {
    setIsAnalyzing(true);
    setCoachInsight(null);
    setCountdown(5); 
  };

  const performCaptureAndAnalysis = async () => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    if (!webcamRef.current) return;

    try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setCoachInsight("Camera unavailable.");
            setIsAnalyzing(false);
            return;
        }

        const storedKey = localStorage.getItem(GEMINI_KEY_STORAGE);
        const apiKey = storedKey || process.env.API_KEY;
        if (!apiKey) {
            setCoachInsight("Please configure your Gemini API Key in Settings first.");
            if (onOpenSettings) onOpenSettings("Enter your Gemini API key to enable AI biomechanical feedback.");
            setIsAnalyzing(false);
            return;
        }

        const base64Data = imageSrc.split(',')[1];
        const selectedModel = localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL;
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: selectedModel,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: `Analyze this ${currentExercise} form in one concise clinical sentence. Is the posture correct? Highlight any compensation.` }
                ]
            }
        });
        setCoachInsight(response.text || "Analysis result unavailable.");

    } catch (error) {
        console.error("Analysis failed", error);
        setCoachInsight("Could not analyze image. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleFinish = () => {
    // Save the final active exercise stats
    const currentValue = currentExercise === 'Plank' ? holdTimer : repCount;
    const finalStats: Record<string, number> = { ...accumulatedStats.current };
    
    if (currentValue > 0) {
        finalStats[currentExercise] = (finalStats[currentExercise] || 0) + currentValue;
    }

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const accuracy = statsRef.current.totalFrames > 0 
        ? Math.round((statsRef.current.goodFrames / statsRef.current.totalFrames) * 100) 
        : 100;
        
    // Calculate total reps for legacy field
    const totalReps = Object.entries(finalStats).reduce((acc, [name, val]) => {
        return name === 'Plank' ? acc : acc + val;
    }, 0);

    onSave({
        durationSeconds,
        exercises: Object.keys(finalStats),
        exerciseStats: finalStats, // Pass the detailed map
        painLevel: 2, 
        accuracyScore: accuracy,
        reps: totalReps, 
        averageAngle: Math.round(angleSumRef.current / (angleFrameCountRef.current || 1))
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-paper z-50 flex flex-col h-[100dvh] overflow-hidden text-ink font-sans">
      
      {/* 1. Clinical Telemetry Header Bar */}
      <header className="shrink-0 z-20 px-4 sm:px-6 py-3 flex justify-between items-center bg-paper/90 backdrop-blur-md border-b border-black/[0.05]">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button 
            onClick={onExit}
            aria-label="Exit session"
            className="p-1.5 -ml-1 text-ink-muted hover:text-ink rounded-md hover:bg-surface-subtle transition-colors shrink-0"
            title="Exit Session"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <label htmlFor="exercise-select" className="sr-only">Select Protocol</label>
            <select 
              id="exercise-select"
              value={currentExercise}
              onChange={(e) => switchExercise(e.target.value)}
              className="bg-cloud text-ink font-semibold rounded-full px-3.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-charcoal cursor-pointer transition-colors border-none"
            >
              {EXERCISE_OPTIONS.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>

            {/* Viewpoint Perspective Badge */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cloud text-body-gray">
              <span className="w-1.5 h-1.5 rounded-full bg-clinical"></span>
              {viewpoint === 'LATERAL' ? 'Lateral Profile (Sagittal)' : 'Frontal Plane (Coronal)'}
            </span>

            {/* State Phase Badge */}
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cloud text-body-gray">
              {exerciseState === 'ACTIVE' ? (
                <span className="flex items-center gap-1.5 text-clinical font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-clinical animate-pulse"></span>
                  Active Contraction
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-faint"></span>
                  Neutral Stance
                </span>
              )}
            </span>
          </div>

          <div className="h-4 w-px bg-edge hidden sm:block"></div>
          
          {/* Header Reps/Hold Telemetry */}
          <div className="flex items-baseline gap-1.5 ml-auto sm:ml-0">
            {currentExercise === 'Plank' ? (
              <>
                <span className="text-xl sm:text-2xl font-semibold text-charcoal tabular-nums">{formatTime(holdTimer)}</span>
                <span className="text-xs text-body-gray font-normal">Hold Duration</span>
              </>
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-bold text-clinical tabular-nums">{repCount}</span>
                <span className="text-xs text-ink-muted font-medium">Valid Reps</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          {/* Anatomical Grid Toggle */}
          <button 
            onClick={() => setShowGrid(g => !g)}
            aria-pressed={showGrid}
            className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1.5 font-medium ${
              showGrid 
                ? 'bg-clinical-subtle text-clinical border-clinical/40' 
                : 'bg-surface-subtle text-ink-muted border-edge hover:bg-edge'
            }`}
            title="Toggle anatomical alignment grid"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16M12 4v16"/>
            </svg>
            <span className="hidden sm:inline">Grid: {showGrid ? 'ON' : 'OFF'}</span>
          </button>

          <Button 
            variant="outline" 
            onClick={onExit}
            className="text-xs py-1.5 px-3 min-h-[36px] hidden sm:inline-flex"
          >
            Exit
          </Button>
        </div>
      </header>

      {/* 2. Main Vision Kinematics Viewport */}
      <div className="relative flex-1 bg-surface-subtle overflow-hidden flex flex-col justify-center items-center p-2 sm:p-4">
        <div className="relative w-full h-full max-w-5xl flex items-center justify-center bg-black rounded-lg border border-edge overflow-hidden">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="absolute w-full h-full object-cover"
            videoConstraints={{ facingMode: "user" }}
          />
          <canvas 
            ref={canvasRef} 
            className="absolute w-full h-full object-cover pointer-events-none"
          />
          
          {/* Engineered Anatomical Alignment Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none z-10 select-none">
              {/* Coronal Center Plumb Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px -ml-0.5 border-l border-dashed border-white/25">
                <span className="absolute top-[20%] -left-1 w-2 h-px bg-white/40"></span>
                <span className="absolute top-[35%] -left-1.5 w-3 h-px bg-clinical"></span>
                <span className="absolute top-[50%] -left-2 w-4 h-px bg-white/70"></span>
                <span className="absolute top-[65%] -left-1.5 w-3 h-px bg-clinical"></span>
                <span className="absolute top-[80%] -left-1 w-2 h-px bg-white/40"></span>
              </div>

              {/* Horizontal Anatomical Axis Guides */}
              <div className="absolute top-[35%] left-0 right-0 h-px border-t border-dashed border-white/20">
                <span className="absolute left-3 -top-3 text-[9px] text-white/50 font-mono tracking-wider">
                  SHOULDER GIRDLE AXIS
                </span>
              </div>
              <div className="absolute top-[65%] left-0 right-0 h-px border-t border-dashed border-white/20">
                <span className="absolute left-3 -top-3 text-[9px] text-white/50 font-mono tracking-wider">
                  PELVIC GIRDLE AXIS
                </span>
              </div>

              {/* Optical Precision Corner Brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-clinical/70"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-clinical/70"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-clinical/70"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-clinical/70"></div>
            </div>
          )}

          {showFlash && (
            <div className="absolute inset-0 bg-white z-50 animate-pulse pointer-events-none"></div>
          )}
          
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40 backdrop-blur-sm">
              <div className="text-center text-white space-y-2">
                <p className="text-7xl sm:text-8xl font-bold font-display tabular-nums">{countdown}</p>
                <p className="text-sm sm:text-base text-gray-200 uppercase tracking-widest font-medium">Positioning for snapshot</p>
              </div>
            </div>
          )}

          {/* Real-time Vision Engine HUD Status */}
          <div className="absolute top-3 sm:top-5 right-3 sm:right-5 z-20 pointer-events-none flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-paper/90 backdrop-blur-md shadow-sm border border-black/[0.06] flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                modelStatus === 'TRACKING' ? 'bg-[#31ce01] animate-pulse' :
                modelStatus === 'READY' || modelStatus === 'SEARCHING' ? 'bg-[#ffca00]' :
                modelStatus === 'ERROR' ? 'bg-[#ffab94]' : 'bg-[#747679] animate-pulse'
              }`} />
              <span className="text-[11px] font-medium text-ink tracking-tight font-sans">
                {modelStatus === 'TRACKING' ? `Tracking (33 pts • ${activeFps} FPS)` :
                 modelStatus === 'SEARCHING' ? 'Searching for Subject...' :
                 modelStatus === 'READY' ? 'Camera Ready' :
                 modelStatus === 'ERROR' ? 'Vision Error' : 'Loading Model...'}
              </span>
            </div>
          </div>

          {/* Top-Left Telemetry Dial Widget (Engineered Angle Gauge) */}
          <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 pointer-events-none">
            <AngleDial 
              angle={displayMetric}
              label={metricLabel}
              isBadForm={isBadForm}
              exercise={currentExercise}
              viewpoint={viewpoint}
              exerciseState={exerciseState}
            />
          </div>

          {/* Top-Right Optical Telemetry Pill (Mobile/Tablet view) */}
          <div className="absolute top-3 right-3 z-20 pointer-events-none md:hidden">
            <span className="px-2 py-1 rounded bg-black/70 backdrop-blur-md text-white text-[10px] font-mono border border-white/20">
              {viewpoint === 'LATERAL' ? 'Lateral 14-pt' : 'Frontal 33-pt'}
            </span>
          </div>

          {/* Top-Center Live Fault Alert Banner */}
          {isBadForm && feedbackMessage && (
            <div className="absolute top-3 sm:top-5 left-3 right-3 sm:left-auto sm:right-auto sm:max-w-md mx-auto z-30 pointer-events-none flex justify-center">
              <div className="bg-fault text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2.5 border border-red-700 text-xs sm:text-sm">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span className="font-semibold">{feedbackMessage}</span>
              </div>
            </div>
          )}

          {/* AI Coach Insight Drawer */}
          {coachInsight && (
            <div className="absolute top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-auto sm:max-w-md mx-auto z-40 pointer-events-none">
              <div className="bg-surface-card p-4 rounded-lg shadow-xl border border-edge pointer-events-auto flex items-start gap-3">
                <div className="p-2 bg-clinical-subtle text-clinical rounded-md shrink-0 border border-clinical/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-clinical font-bold text-xs mb-0.5">Biomechanical Snapshot Analysis</p>
                  <p className="text-ink text-xs sm:text-sm leading-relaxed">
                    {coachInsight}
                  </p>
                </div>
                <button 
                  onClick={() => setCoachInsight(null)}
                  className="text-ink-muted hover:text-ink p-1"
                  aria-label="Close insight"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Vision Engine Loading State */}
          {!window.Pose && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-card z-30">
              <div className="text-center p-6 space-y-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-edge border-t-clinical mx-auto"></div>
                <p className="text-ink font-medium text-sm">Calibrating MediaPipe Vision Engine...</p>
                <p className="text-ink-muted text-xs">Accessing 33 body kinematic landmarks at 60 FPS</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Controls */}
      <footer className="shrink-0 z-20 px-4 py-3.5 bg-paper border-t border-black/[0.05]">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <Button 
            fullWidth 
            onClick={startAnalysisCountdown}
            disabled={isAnalyzing || countdown !== null}
            variant="outline"
            icon={
              isAnalyzing ? (
                <div className="animate-spin h-4 w-4 border-2 border-edge border-t-clinical rounded-full"/>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              )
            }
          >
            {countdown !== null ? `Capturing in ${countdown}...` : (isAnalyzing ? "Analyzing Pose..." : "Analyze Posture Snapshot")}
          </Button>
          
          <Button 
            fullWidth 
            variant="primary" 
            onClick={handleFinish}
          >
            Conclude & Generate Report
          </Button>
        </div>
      </footer>
    </div>
  );
};

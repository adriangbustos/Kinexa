import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from './Button';
import { GoogleGenAI } from "@google/genai";

interface SessionViewProps {
  onExit: () => void;
  onSave: (data: any) => void;
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

export const SessionView: React.FC<SessionViewProps> = ({ onExit, onSave }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [currentExercise, setCurrentExercise] = useState('Squats');
  const [repCount, setRepCount] = useState(0);
  const [displayMetric, setDisplayMetric] = useState<number>(0); 
  const [metricLabel, setMetricLabel] = useState('Angle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isBadForm, setIsBadForm] = useState(false);
  
  // Session Accumulation State
  const accumulatedStats = useRef<Record<string, number>>({});
  
  // State Machine Indicators
  const [exerciseState, setExerciseState] = useState<ExerciseState>('START');
  const [holdTimer, setHoldTimer] = useState(0);

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
    let pose: any = null;
    startTimeRef.current = Date.now();

    const onResults = (results: any) => {
      if (!canvasRef.current || !webcamRef.current?.video) return;
      if (!results.poseLandmarks) return;

      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
      
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

      let currentMetric = 0;
      let formError = '';
      let isFormGood = true;

      switch(currentExercise) {
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
                    const now = Date.now();
                    const durationInActive = now - activeStartTimeRef.current;
                    const timeSinceLastRep = now - lastRepTimeRef.current;
                    
                    if (durationInActive > 200 && timeSinceLastRep > 1000) {
                        setRepCount(c => c + 1);
                        lastRepTimeRef.current = now;
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
                    const now = Date.now();
                    if ((now - activeStartTimeRef.current > 200) && (now - lastRepTimeRef.current > 1000)) {
                        setRepCount(c => c + 1);
                        lastRepTimeRef.current = now;
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
            const currentHipY = (lm[23].y + lm[24].y) / 2;
            const workingKneeAngle = Math.min(lKneeAngle, rKneeAngle);
            const staticKneeAngle = Math.max(lKneeAngle, rKneeAngle);
            
            currentMetric = workingKneeAngle;
            setDisplayMetric(currentMetric);

            if (stateRef.current === 'START') {
                if (lKneeAngle > rules.startAngle && rKneeAngle > rules.startAngle) {
                    if (standingHipYRef.current === 0 || currentHipY < standingHipYRef.current) {
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
                     const now = Date.now();
                     const durationInActive = now - activeStartTimeRef.current;
                     const timeSinceLastRep = now - lastRepTimeRef.current;

                     if (durationInActive > 300 && timeSinceLastRep > 1000) {
                         setRepCount(c => c + 1);
                         lastRepTimeRef.current = now;
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
                const now = Date.now();
                if (now - lastTimerTickRef.current >= 1000) {
                    setHoldTimer(t => t + 1);
                    lastTimerTickRef.current = now;
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

      if (currentExercise === 'Squats' && currentMetric > 0) {
        angleSumRef.current += currentMetric;
        angleFrameCountRef.current += 1;
      }
      statsRef.current.totalFrames++;
      if (isFormGood) statsRef.current.goodFrames++;

      setIsBadForm(!isFormGood);
      setFeedbackMessage(formError);

      // --- ADAPTIVE VISUALIZATION LOGIC ---
      
      const skeletonColor = !isFormGood ? '#EF4444' : '#778873'; // Red or Sage
      const landmarkColor = !isFormGood ? '#EF4444' : '#F1F3E0'; // Red or Cream

      if (!isLateral) {
         // --- Mode A: Full Frontal (Draw EVERYTHING) ---
         // When user faces camera, show full body map for high-tech feel
         window.drawConnectors(canvasCtx, lm, window.POSE_CONNECTIONS,
             { color: skeletonColor, lineWidth: 4 });
         
         window.drawLandmarks(canvasCtx, lm,
             { color: landmarkColor, lineWidth: 2, radius: 4 });
      } else {
         // --- Mode B: Lateral Precision (Draw VISIBLE SIDE only) ---
         // Reduces visual noise to focus on alignment
         
         // Define connections for specific sides [start, end]
         // Ear(7/8) -> Shoulder(11/12) -> Hip(23/24) -> Knee(25/26) -> Ankle(27/28)
         // Shoulder -> Elbow(13/14) -> Wrist(15/16)
         const lateralConnections = isLeft 
            ? [[7, 11], [11, 23], [23, 25], [25, 27], [11, 13], [13, 15]] // Left side
            : [[8, 12], [12, 24], [24, 26], [26, 28], [12, 14], [14, 16]]; // Right side

         // Filter landmarks to only draw the visible ones
         const visibleIndices = isLeft 
            ? [7, 11, 13, 15, 23, 25, 27] 
            : [8, 12, 14, 16, 24, 26, 28];
            
         const visibleLandmarks = visibleIndices.map(idx => lm[idx]);

         window.drawConnectors(canvasCtx, lm, lateralConnections,
             { color: skeletonColor, lineWidth: 4 });
         
         window.drawLandmarks(canvasCtx, visibleLandmarks,
             { color: landmarkColor, lineWidth: 4, radius: 6 });
      }

      canvasCtx.restore();
    };

    const initializePose = async () => {
        if (window.Pose) {
            pose = new window.Pose({
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

            pose.onResults(onResults);
            if (pose.initialize) await pose.initialize();
            detect();
        }
    };

    const detect = async () => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4 && pose) {
        await pose.send({ image: webcamRef.current.video });
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    initializePose();

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (pose) pose.close();
    };
  }, [currentExercise]);

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

        const base64Data = imageSrc.split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: `Analyze this ${currentExercise} form in one short sentence. Is the posture correct?` }
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
    <div className="fixed inset-0 bg-white z-50 flex flex-col h-[100dvh]">
      
      {/* 1. Header Bar */}
      <div className="shrink-0 z-20 p-4 flex justify-between items-center bg-white/95 backdrop-blur-sm border-b border-gray-100">
         <div className="flex items-center gap-4 flex-1">
             <select 
                value={currentExercise}
                onChange={(e) => switchExercise(e.target.value)}
                className="bg-white text-[#778873] border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#778873]/50 focus:border-[#778873] cursor-pointer appearance-none shadow-sm transition-all hover:border-[#778873]"
             >
                {EXERCISE_OPTIONS.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                ))}
             </select>

             <div className="w-px h-6 bg-gray-200"></div>
             
             {currentExercise === 'Plank' ? (
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#778873] tabular-nums">{formatTime(holdTimer)}</span>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Hold Time</span>
                </div>
             ) : (
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#778873] tabular-nums">{repCount}</span>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Reps</span>
                </div>
             )}
         </div>
         <button 
            onClick={onExit}
            className="text-slate-400 p-2 bg-gray-50 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors"
         >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
         </button>
      </div>

      {/* 2. Main Vision Area */}
      <div className="relative flex-1 bg-gray-50 overflow-hidden flex flex-col justify-center items-center p-4">
         <div className="relative w-full h-full max-w-5xl max-h-full flex items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden aspect-video md:aspect-auto">
             <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="absolute w-full h-full object-cover md:object-contain"
                videoConstraints={{ facingMode: "user" }}
            />
            <canvas 
                ref={canvasRef} 
                className="absolute w-full h-full object-cover md:object-contain pointer-events-none"
            />
            
            {showFlash && (
                <div className="absolute inset-0 bg-white z-50 animate-pulse pointer-events-none"></div>
            )}
            
            {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40 backdrop-blur-sm">
                    <div className="text-center text-white">
                        <p className="text-8xl font-bold font-display animate-ping">{countdown}</p>
                        <p className="text-xl font-medium mt-4 uppercase tracking-widest">Get into position!</p>
                    </div>
                </div>
            )}
         </div>
         
         {/* Phase Indicator */}
         <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-20">
             <div className="bg-white/90 backdrop-blur px-4 py-1 rounded-full border border-gray-200 shadow-sm">
                 <span className={`font-bold text-xs uppercase tracking-widest ${exerciseState === 'ACTIVE' ? 'text-[#778873]' : 'text-slate-400'}`}>
                    {exerciseState === 'ACTIVE' ? 'Active Phase' : 'Start Phase'}
                 </span>
             </div>
         </div>
         
         {/* Live Feedback Toast */}
         {isBadForm && feedbackMessage && (
          <div className="absolute top-8 left-4 right-4 flex justify-center z-30 pointer-events-none animate-bounce">
             <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-md text-center border border-red-700">
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span className="font-bold text-sm tracking-wide">{feedbackMessage}</span>
             </div>
          </div>
         )}

         {/* Metric Display */}
         <div className="absolute top-8 left-8 z-20 hidden md:block">
             <div className={`
                 backdrop-blur-md p-5 rounded-3xl border shadow-lg transition-all duration-300 min-w-[120px]
                 ${isBadForm ? 'bg-red-50/90 border-red-200' : 'bg-white/90 border-gray-200'}
             `}>
                 <span className={`text-xs font-bold uppercase block mb-1 tracking-wider ${isBadForm ? 'text-red-700' : 'text-slate-500'}`}>
                    {metricLabel}
                 </span>
                 <div className="flex items-center gap-2">
                     <span className={`text-5xl font-bold tracking-tighter ${isBadForm ? 'text-red-600' : 'text-gray-900'}`}>
                         {displayMetric}°
                     </span>
                 </div>
             </div>
         </div>

         {/* Coach Insight */}
         {coachInsight && (
           <div className="absolute top-24 left-4 right-4 flex justify-center z-40 pointer-events-none">
             <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 pointer-events-auto max-w-lg flex items-start gap-4 animate-fade-in-down">
                <div className="p-2.5 bg-[#778873] rounded-xl text-white shrink-0 shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="flex-1">
                    <p className="text-[#778873] font-bold text-xs uppercase tracking-wider mb-1">AI Coach Insight</p>
                    <p className="text-gray-800 text-sm leading-relaxed">
                        {coachInsight}
                    </p>
                </div>
                 <button 
                    onClick={() => setCoachInsight(null)}
                    className="text-slate-400 hover:text-gray-900"
                 >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
             </div>
           </div>
         )}
         
         {!window.Pose && (
             <div className="absolute inset-0 flex items-center justify-center bg-white z-30">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#778873] mx-auto mb-4"></div>
                    <p className="text-gray-900 font-medium">Initializing Vision Engine...</p>
                </div>
             </div>
        )}
      </div>

      <div className="shrink-0 z-20 p-4 bg-white border-t border-gray-200">
          <div className="max-w-xl mx-auto flex flex-col md:flex-row gap-3">
               <Button 
                   fullWidth 
                   onClick={startAnalysisCountdown}
                   disabled={isAnalyzing || countdown !== null}
                   variant="outline"
                   icon={isAnalyzing ? <div className="animate-spin h-5 w-5 border-2 border-[#778873] rounded-full border-t-transparent"/> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
               >
                   {countdown !== null ? `Capturing in ${countdown}...` : (isAnalyzing ? "Analyzing..." : "Analyze Posture")}
               </Button>
               
               <Button 
                   fullWidth 
                   variant="primary" 
                   onClick={handleFinish}
               >
                   End Session
               </Button>
          </div>
      </div>
    </div>
  );
};
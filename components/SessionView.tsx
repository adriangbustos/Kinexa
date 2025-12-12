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
  'Burpees',
  'Lunges',
  'Triceps Dip',
  'Plank',
  'Mountain Climber',
  'Stretches'
];

type ExercisePhase = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING' | 'HOLDING' | 'REST';

export const SessionView: React.FC<SessionViewProps> = ({ onExit, onSave }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [currentExercise, setCurrentExercise] = useState('Squats');
  const [repCount, setRepCount] = useState(0);
  const [displayMetric, setDisplayMetric] = useState<number>(0); 
  const [metricLabel, setMetricLabel] = useState('Angle');
  const [phase, setPhase] = useState<ExercisePhase>('STANDING');
  const [holdTimer, setHoldTimer] = useState(0);
  
  // Feedback State
  const [isBadForm, setIsBadForm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  
  // Deep Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [coachInsight, setCoachInsight] = useState<string | null>(null);

  // Logic Refs
  const startTimeRef = useRef<number>(Date.now());
  const requestRef = useRef<number | null>(null);
  const angleSumRef = useRef(0);
  const angleFrameCountRef = useRef(0);
  
  // State Machine Ref (To avoid stale closures in loop)
  const phaseRef = useRef<ExercisePhase>('STANDING');
  const statsRef = useRef({ goodFrames: 0, totalFrames: 0 });
  const lastHoldTickRef = useRef<number>(0);

  // --- Geometry Helpers ---
  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  const calculateDistanceX = (a: any, b: any) => Math.abs(a.x - b.x);

  useEffect(() => {
    // Reset stats on exercise change
    setRepCount(0);
    setHoldTimer(0);
    statsRef.current = { goodFrames: 0, totalFrames: 0 };
    angleSumRef.current = 0;
    angleFrameCountRef.current = 0;
    phaseRef.current = 'STANDING';
    setPhase('STANDING');
  }, [currentExercise]);

  useEffect(() => {
    let pose: any = null;
    startTimeRef.current = Date.now();

    const onResults = (results: any) => {
      if (!canvasRef.current || !webcamRef.current?.video) return;

      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

      if (results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const leftEar = lm[7];
        const rightEar = lm[8];
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        const leftHip = lm[23];
        const rightHip = lm[24];
        const leftKnee = lm[25];
        const rightKnee = lm[26];
        const leftAnkle = lm[27];
        const rightAnkle = lm[28];

        statsRef.current.totalFrames++;
        let frameBadForm = false;
        let frameMsg = '';

        // Auto Lateral Detection
        const shoulderWidthX = calculateDistanceX(leftShoulder, rightShoulder);
        const isLateral = shoulderWidthX < 0.15; 

        if (isLateral) {
            setMetricLabel('Lateral');
            setDisplayMetric(Math.round(shoulderWidthX * 100));

            const isLeft = leftShoulder.visibility > rightShoulder.visibility;
            const ear = isLeft ? leftEar : rightEar;
            const shoulder = isLeft ? leftShoulder : rightShoulder;
            const hip = isLeft ? leftHip : rightHip;
            const knee = isLeft ? leftKnee : rightKnee;
            const ankle = isLeft ? leftAnkle : rightAnkle;

            // Simple Lateral Squat Logic if Needed
            if (currentExercise === 'Squats') {
                 const angle = calculateAngle(hip, knee, ankle);
                 setDisplayMetric(angle);
            }

            const headOffset = Math.abs(ear.x - shoulder.x);
            if (headOffset > 0.08) {
                frameBadForm = true;
                frameMsg = "Head forward detected.";
            }

            canvasCtx.beginPath();
            canvasCtx.moveTo(ear.x * videoWidth, ear.y * videoHeight);
            canvasCtx.lineTo(hip.x * videoWidth, hip.y * videoHeight);
            canvasCtx.strokeStyle = frameBadForm ? '#EF4444' : '#778873';
            canvasCtx.lineWidth = 3;
            canvasCtx.setLineDash([5, 5]);
            canvasCtx.stroke();
            canvasCtx.setLineDash([]);

        } else {
            switch(currentExercise) {
                case 'Squats': {
                    setMetricLabel('Knee Angle');
                    const angle = calculateAngle(leftHip, leftKnee, leftAnkle);
                    setDisplayMetric(angle);
                    
                    angleSumRef.current += angle;
                    angleFrameCountRef.current += 1;

                    // --- SQUAT STATE MACHINE ---
                    // State A (Standing): > 165
                    // State B (Bottom): < 140
                    const currentPhase = phaseRef.current;
                    let nextPhase = currentPhase;

                    if (currentPhase === 'STANDING') {
                        if (angle < 160) nextPhase = 'DESCENDING';
                    } 
                    else if (currentPhase === 'DESCENDING') {
                        if (angle < 140) nextPhase = 'BOTTOM';
                        else if (angle > 170) nextPhase = 'STANDING'; // Aborted rep
                    }
                    else if (currentPhase === 'BOTTOM') {
                        if (angle > 140) nextPhase = 'ASCENDING';
                    }
                    else if (currentPhase === 'ASCENDING') {
                        if (angle > 165) {
                            nextPhase = 'STANDING';
                            setRepCount(c => c + 1); // SUCCESSFUL REP
                        } else if (angle < 130) {
                            nextPhase = 'BOTTOM'; // Failed to rise, went back down
                        }
                    }

                    if (nextPhase !== currentPhase) {
                        phaseRef.current = nextPhase;
                        setPhase(nextPhase);
                    }

                    const hipSep = Math.abs(leftHip.x - rightHip.x);
                    const kneeSep = Math.abs(leftKnee.x - rightKnee.x);
                    if (kneeSep < (hipSep * 0.75)) {
                        frameBadForm = true;
                        frameMsg = "Knee valgus detected.";
                    }
                    break;
                }
                case 'Plank': {
                    setMetricLabel('Shoulder Level');
                    const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
                    setDisplayMetric(Math.round(shoulderSlope * 100));

                    // Timer Logic
                    // If slope is good (< 0.15) increment hold timer
                    if (shoulderSlope < 0.15) {
                        const now = Date.now();
                        if (now - lastHoldTickRef.current > 1000) {
                            setHoldTimer(t => t + 1);
                            lastHoldTickRef.current = now;
                        }
                        if (phaseRef.current !== 'HOLDING') {
                            phaseRef.current = 'HOLDING';
                            setPhase('HOLDING');
                        }
                    } else {
                         frameBadForm = true;
                         frameMsg = "Keep shoulders level.";
                         if (phaseRef.current !== 'REST') {
                             phaseRef.current = 'REST';
                             setPhase('REST');
                         }
                    }
                    break;
                }
                default:
                    setDisplayMetric(0);
                    setMetricLabel('Tracking');
                    break;
            }
        }

        if (frameBadForm) {
            setIsBadForm(true);
            setFeedbackMessage(frameMsg);
        } else {
            setIsBadForm(false);
            setFeedbackMessage('');
            statsRef.current.goodFrames++;
        }

        const skeletonColor = frameBadForm ? '#EF4444' : '#778873';
        const landmarkColor = frameBadForm ? '#EF4444' : '#D2DCB6';
        
        window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS,
            { color: skeletonColor, lineWidth: 4 });
        
        window.drawLandmarks(canvasCtx, results.poseLandmarks,
            { color: landmarkColor, lineWidth: 2, radius: 4 });
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

  const handleDeepAnalysis = async () => {
    if (!webcamRef.current) return;
    setIsAnalyzing(true);
    setCoachInsight(null);

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
                    { text: `Analyze this ${currentExercise} form. Is the spine neutral? Give one specific correction.` }
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
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const accuracy = statsRef.current.totalFrames > 0 
        ? Math.round((statsRef.current.goodFrames / statsRef.current.totalFrames) * 100) 
        : 100;

    onSave({
        durationSeconds,
        exercises: [currentExercise],
        painLevel: 2, 
        accuracyScore: accuracy,
        reps: currentExercise === 'Plank' ? 0 : repCount, // No reps for plank
        averageAngle: Math.round(angleSumRef.current / (angleFrameCountRef.current || 1))
    });
  };

  // Helper to format seconds to MM:SS
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
             {/* Exercise Dropdown - Professional Style */}
             <select 
                value={currentExercise}
                onChange={(e) => setCurrentExercise(e.target.value)}
                className="bg-white text-[#778873] border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#778873]/50 focus:border-[#778873] cursor-pointer appearance-none shadow-sm transition-all hover:border-[#778873]"
             >
                {EXERCISE_OPTIONS.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                ))}
             </select>

             <div className="w-px h-6 bg-gray-200"></div>
             
             {/* Dynamic Metric: Reps or Timer */}
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
         {/* Webcam Container */}
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
         </div>
         
         {/* Phase Indicator (e.g., "DESCENDING") */}
         <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-20">
             <div className="bg-white/90 backdrop-blur px-4 py-1 rounded-full border border-gray-200 shadow-sm">
                 <span className="text-[#778873] font-bold text-xs uppercase tracking-widest">{phase}</span>
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
                         {displayMetric}{metricLabel === 'Angle' ? '°' : ''}
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
         
         {/* Loading State */}
         {!window.Pose && (
             <div className="absolute inset-0 flex items-center justify-center bg-white z-30">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#778873] mx-auto mb-4"></div>
                    <p className="text-gray-900 font-medium">Initializing Vision Engine...</p>
                </div>
             </div>
        )}
      </div>

      {/* 3. Bottom Controls */}
      <div className="shrink-0 z-20 p-4 bg-white border-t border-gray-200">
          <div className="max-w-xl mx-auto flex flex-col md:flex-row gap-3">
               <Button 
                   fullWidth 
                   onClick={handleDeepAnalysis}
                   disabled={isAnalyzing}
                   variant="outline"
                   icon={isAnalyzing ? <div className="animate-spin h-5 w-5 border-2 border-[#778873] rounded-full border-t-transparent"/> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
               >
                   {isAnalyzing ? "Analyzing..." : "Analyze Posture"}
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
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Coffee, Package, Compass, ChevronRight, CheckCircle2, RefreshCcw, Sparkles, SlidersHorizontal, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Confetti from "react-confetti";
import useWindowSize from "react-use/lib/useWindowSize";

const WIZARD_STEPS = ["Base Selection", "Delivery Options", "Review"];

type PlanType = "curated" | "custom" | null;
type Frequency = "1_week" | "2_weeks" | "4_weeks" | null;
type Grind = "whole" | "espresso" | "filter" | "press" | null;

export default function SubscribePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [planType, setPlanType] = useState<PlanType>(null);
  const [frequency, setFrequency] = useState<Frequency>(null);
  const [grind, setGrind] = useState<Grind>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { width, height } = useWindowSize();

  // Calculation Logic
  const getBasePrice = () => {
     if (planType === "curated") return 45; 
     if (planType === "custom") return 55; 
     return 0;
  };

  const getMultiplier = () => {
    switch(frequency) {
       case "1_week": return 4;   
       case "2_weeks": return 2;  
       case "4_weeks": return 1;  
       default: return 0;
    }
  };

  const calculateTotal = () => {
     if (!planType || !frequency) return 0;
     const base = getBasePrice() * getMultiplier();
     const discount = base * 0.15; 
     return base - discount;
  };

  const monthlyTotal = calculateTotal();
  const savings = getBasePrice() * getMultiplier() - monthlyTotal;

  const canProceed = () => {
     if (currentStep === 0) return planType !== null;
     if (currentStep === 1) return frequency !== null && grind !== null;
     return true;
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
       setCurrentStep(prev => prev + 1);
    } else {
       processSubscription();
    }
  };

  const processSubscription = () => {
    setIsProcessing(true);
    setTimeout(() => {
       setIsProcessing(false);
       setIsSuccess(true);
    }, 2500);
  };

  if (isSuccess) {
     return (
      <div className="page-shell container mx-auto min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <Confetti width={width} height={height} recycle={false} numberOfPieces={500} colors={['#C69C6D', '#2A1C16', '#F5EBE1']} />
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-10 relative border border-primary/20 shadow-2xl"
        >
          <div className="absolute inset-0 rounded-[2rem] border border-primary animate-ping opacity-20" />
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-7xl font-serif font-bold mb-6 text-foreground"
        >
          The <span className="gradient-text italic">Aura Club</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted text-lg max-w-md mx-auto mb-16 leading-relaxed"
        >
          Your artisanal subscription has been activated. The first curated box will be prepared and shipped within 48 hours.
        </motion.p>
        
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.6 }}
        >
          <Link href="/profile" className="bg-primary text-white px-12 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-foreground transition-all inline-flex items-center gap-4 shadow-[0_20px_40px_rgba(198,156,109,0.3)] group">
            Member Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-shell-roomy min-h-screen flex flex-col relative overflow-hidden bg-[#FDFBF8]">
      {/* Background Ornaments */}
      <div className="fixed top-20 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-coffee-light/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="container mx-auto px-6 w-full max-w-6xl flex-1 flex flex-col">
        {/* Header & Progress */}
        <div className="mb-16">
            <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors mb-10 font-bold text-xs uppercase tracking-widest group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Exit Subscription
            </Link>
            
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-12 text-foreground">
              Member <span className="gradient-text italic">Onboarding</span>
            </h1>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-12 relative max-w-2xl">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-black/5 -z-10 rounded-full" />
              <motion.div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-primary -z-10 rounded-full" 
                initial={{ width: "0%" }}
                animate={{ width: `${(currentStep / (WIZARD_STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
              {WIZARD_STEPS.map((step, idx) => (
                <div key={step} className="flex flex-col items-center gap-4 bg-[#FDFBF8] px-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-500 border-4 border-[#FDFBF8]",
                    idx < currentStep ? "bg-primary text-white scale-90" : 
                    idx === currentStep ? "bg-primary text-white shadow-2xl scale-110" : 
                    "bg-black/5 text-muted hover:bg-black/10 transition-colors"
                  )}>
                    {idx < currentStep ? <CheckCircle2 className="w-7 h-7" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] absolute top-16 mt-4 w-40 text-center",
                    idx <= currentStep ? "text-primary" : "text-muted"
                  )}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
        </div>

        {/* Dynamic Canvas */}
        <div className="flex-1 relative mt-16">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Base Selection */}
            {currentStep === 0 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="text-center md:text-left mb-12">
                   <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">Choose Your Ritual Path</h2>
                   <p className="text-muted text-lg">Will you trust our curation, or craft your own journey?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full h-full pb-10">
                   {/* Option A: Curated */}
                   <button 
                     onClick={() => setPlanType("curated")}
                     className={cn(
                       "relative overflow-hidden p-10 rounded-[2.5rem] border-2 text-left flex flex-col justify-between h-80 sm:h-96 group transition-all duration-500 shadow-xl",
                       planType === "curated" 
                         ? "border-primary bg-white shadow-primary/10" 
                         : "border-black/5 bg-white/50 hover:border-primary/20"
                     )}
                   >
                     {planType === "curated" && (
                         <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10" />
                     )}
                     <div className="mb-8">
                       <div className={cn(
                           "w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-8 transition-all shadow-lg",
                           planType === "curated" ? "bg-primary text-white scale-110" : "bg-black/5 text-muted group-hover:bg-primary group-hover:text-white"
                       )}>
                           <Sparkles className="w-8 h-8" />
                       </div>
                       <h3 className="text-3xl font-serif font-bold text-foreground mb-4">Aura AI Curated</h3>
                       <p className={cn("text-base leading-relaxed font-medium transition-colors", planType === "curated" ? "text-foreground" : "text-muted")}>
                          Our algorithm analyzes your sensory preferences to ship a rotation of rare nano-lots matched to your taste profile.
                       </p>
                     </div>
                     <div className="flex items-center justify-between mt-auto">
                        <span className="font-black text-xl text-primary">₹45<span className="text-xs uppercase tracking-widest font-bold ml-1 text-muted">/ Mo</span></span>
                        {planType === "curated" ? <CheckCircle2 className="w-8 h-8 text-primary" /> : <div className="w-8 h-8 rounded-full border-2 border-black/5 group-hover:border-primary/20 transition-colors" />}
                     </div>
                   </button>

                   {/* Option B: Custom */}
                   <button 
                     onClick={() => setPlanType("custom")}
                     className={cn(
                       "relative overflow-hidden p-10 rounded-[2.5rem] border-2 text-left flex flex-col justify-between h-80 sm:h-96 group transition-all duration-500 shadow-xl",
                       planType === "custom" 
                         ? "border-primary bg-white shadow-primary/10" 
                         : "border-black/5 bg-white/50 hover:border-primary/20"
                     )}
                   >
                     {planType === "custom" && (
                         <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10" />
                     )}
                     <div className="mb-8">
                       <div className={cn(
                           "w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-8 transition-all shadow-lg",
                           planType === "custom" ? "bg-primary text-white scale-110" : "bg-black/5 text-muted group-hover:bg-primary group-hover:text-white"
                       )}>
                           <SlidersHorizontal className="w-8 h-8" />
                       </div>
                       <h3 className="text-3xl font-serif font-bold text-foreground mb-4">Artisan Custom</h3>
                       <p className={cn("text-base leading-relaxed font-medium transition-colors", planType === "custom" ? "text-foreground" : "text-muted")}>
                          You hold the reins. Select specific origin, roast level, and frequency. Perfect for those who have found their eternal favorite.
                       </p>
                     </div>
                     <div className="flex items-center justify-between mt-auto">
                        <span className="font-black text-xl text-primary">Custom<span className="text-xs uppercase tracking-widest font-bold ml-1 text-muted">/ Mo</span></span>
                        {planType === "custom" ? <CheckCircle2 className="w-8 h-8 text-primary" /> : <div className="w-8 h-8 rounded-full border-2 border-black/5 group-hover:border-primary/20 transition-colors" />}
                     </div>
                   </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Delivery Options */}
            {currentStep === 1 && (
               <motion.div 
                 key="step2"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-16 pb-20"
               >
                 {/* Frequency */}
                 <div>
                   <h2 className="text-3xl font-serif font-bold text-foreground mb-8">Shipment Cycle</h2>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                     {[
                        { id: "1_week", label: "Every Week", desc: "The Daily Ritualist" },
                        { id: "2_weeks", label: "Fortnightly", desc: "Balanced Discovery" },
                        { id: "4_weeks", label: "Monthly", desc: "Steady Supply" }
                     ].map(freq => (
                        <button 
                          key={freq.id}
                          onClick={() => setFrequency(freq.id as Frequency)}
                          className={cn(
                             "relative p-8 rounded-[1.5rem] border-2 text-left transition-all duration-300 group shadow-lg",
                             frequency === freq.id 
                               ? "border-primary bg-white shadow-primary/10" 
                               : "border-black/5 bg-white/50 hover:border-black/20"
                          )}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className={cn("font-bold text-lg transition-colors", frequency === freq.id ? "text-primary" : "text-foreground group-hover:text-primary")}>{freq.label}</span>
                            <div className={cn(
                               "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                               frequency === freq.id ? "border-primary bg-primary scale-110 shadow-lg" : "border-black/10"
                            )}>
                               {frequency === freq.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                          <p className="text-sm text-muted font-medium">{freq.desc}</p>
                        </button>
                     ))}
                   </div>
                 </div>

                 {/* Grind Size */}
                 <div>
                   <h2 className="text-3xl font-serif font-bold text-foreground mb-8">Preferred Grind</h2>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      {[
                        { id: "whole", label: "Whole", icon: "☕" },
                        { id: "espresso", label: "Espresso", icon: "💨" },
                        { id: "filter", label: "Filter", icon: "⏳" },
                        { id: "press", label: "Press", icon: "🥃" }
                      ].map(g => (
                         <button 
                           key={g.id}
                           onClick={() => setGrind(g.id as Grind)}
                           className={cn(
                              "relative p-8 rounded-[1.5rem] border-2 text-center transition-all duration-300 flex flex-col items-center gap-6 group shadow-lg",
                              grind === g.id 
                                ? "border-primary bg-white shadow-primary/10 scale-105" 
                                : "border-black/5 bg-white/50 hover:border-black/20"
                           )}
                         >
                           <span className="text-5xl group-hover:scale-110 transition-transform">{g.icon}</span>
                           <span className={cn(
                                "font-black text-[10px] uppercase tracking-[0.2em]",
                                grind === g.id ? "text-primary" : "text-muted"
                           )}>{g.label}</span>
                         </button>
                      ))}
                   </div>
                 </div>
               </motion.div>
            )}

            {/* STEP 3: Review */}
            {currentStep === 2 && (
               <motion.div 
                 key="step3"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-10"
               >
                 <div className="text-center md:text-left mb-12">
                   <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Ritual Overview</h2>
                   <p className="text-muted text-lg">Confirm your selection to activate your club benefits.</p>
                 </div>

                 <div className="glass p-10 md:p-14 rounded-[3rem] max-w-2xl relative overflow-hidden border border-black/5 shadow-2xl bg-white/50">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10" />
                    
                    <div className="space-y-10">
                       <div className="flex items-center gap-6 pb-10 border-b border-black/5">
                          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Package className="w-8 h-8" />
                          </div>
                          <div>
                             <h3 className="text-2xl font-serif font-bold text-foreground">
                               {planType === "curated" ? "Aura AI Curator Match" : "Artisan Custom Selection"}
                             </h3>
                             <p className="font-bold text-[10px] uppercase tracking-widest text-primary mt-1">Full Member Access Activated</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-10 pb-10 border-b border-black/5">
                          <div>
                             <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-2">Shipment Cycle</p>
                             <p className="text-lg font-bold text-foreground capitalize">{frequency?.replace('_', ' ')}</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-2">Grind Profile</p>
                             <p className="text-lg font-bold text-foreground capitalize">{grind} Format</p>
                          </div>
                       </div>
                       
                       <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10 flex items-start gap-5">
                          <Compass className="w-7 h-7 text-primary shrink-0" />
                          <div>
                             <h4 className="font-bold text-lg text-foreground mb-2">Club Privileges</h4>
                             <p className="text-sm text-muted leading-relaxed font-medium">
                                Free express shipping, early access to nano-lots, and the ability to skip or pause anytime through your secure dashboard.
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Bottom Bar / Calculator */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-2xl border-t border-black/5 py-6 px-6 md:px-12 z-40 shadow-[0_-20px_60px_rgba(0,0,0,0.05)]">
         <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 max-w-6xl">
            {/* Status */}
            <div className="flex items-center gap-10">
               <div className="hidden md:block">
                 <p className="text-muted tracking-[0.2em] uppercase text-[9px] font-black mb-1.5 opacity-60">Selected Ritual</p>
                 <p className="font-serif font-bold text-lg text-foreground">
                    {planType === "curated" ? "AI Curator Match" : planType === "custom" ? "Artisan Custom Box" : "Awaiting Selection"}
                 </p>
               </div>
               
               {planType && frequency && (
                   <div className="hidden md:flex flex-col border-l border-black/10 pl-10 text-left">
                      <p className="text-primary tracking-[0.2em] uppercase text-[9px] font-black mb-1.5 animate-pulse">Club Benefit Applied</p>
                      <p className="text-green-600 font-black text-lg">15% Lifetime Savings</p>
                   </div>
               )}
            </div>

            {/* Total and Actions */}
            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
               <div className="text-right">
                  <p className="text-muted tracking-[0.2em] uppercase text-[9px] font-black mb-1.5 opacity-60">Investment Total</p>
                  <p className="text-3xl md:text-4xl font-black text-primary">
                    ₹{monthlyTotal.toFixed(2)}<span className="text-sm font-bold text-muted ml-1 uppercase tracking-widest">/ Mo</span>
                  </p>
               </div>
               <button 
                  onClick={handleNext}
                  disabled={!canProceed() || isProcessing}
                  className="bg-primary text-white px-10 py-4.5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-foreground transition-all duration-300 flex items-center gap-3 shadow-[0_20px_40px_rgba(198,156,109,0.3)] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
               >
                  {isProcessing ? "Syncing..." : currentStep === WIZARD_STEPS.length - 1 ? "Activate Membership" : "Continue"} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

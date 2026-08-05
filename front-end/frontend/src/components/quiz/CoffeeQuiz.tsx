"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, Coffee, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { getProducts, type ProductRecord } from "@/lib/data";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuizProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUESTIONS = [
  {
    id: "brew_method",
    title: "How do you usually brew your coffee?",
    options: [
      { id: "espresso", label: "Espresso / Moka Pot", icon: "☕", trait: "body" },
      { id: "filter", label: "Pour Over / Drip", icon: "🫖", trait: "acidity" },
      { id: "press", label: "French Press", icon: "🥃", trait: "body" },
    ]
  },
  {
    id: "flavor_profile",
    title: "What flavors excite you the most?",
    options: [
      { id: "fruity", label: "Fruity & Floral", icon: "🫐", trait: "acidity" },
      { id: "chocolate", label: "Chocolate & Nuts", icon: "🍫", trait: "sweetness" },
      { id: "earthy", label: "Earthy & Spicy", icon: "🌿", trait: "body" },
    ]
  },
  {
    id: "intensity",
    title: "How do you like your roast?",
    options: [
      { id: "light", label: "Light & Bright", icon: "☀️", category: "Light Roast" },
      { id: "medium", label: "Smooth & Balanced", icon: "⛅", category: "Medium Roast" },
      { id: "dark", label: "Dark & Bold", icon: "🌙", category: "Dark Roast" },
    ]
  }
];

export default function CoffeeQuiz({ isOpen, onClose }: QuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [recommendation, setRecommendation] = useState<ProductRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts({ limit: 100 });
        setProducts(response.items);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };
    fetchProducts();
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      calculateResult();
    }
  };

  const calculateResult = () => {
    setIsCalculating(true);
    setCurrentStep(currentStep + 1); // Move to 'calculating' screen

    // Simulate thinking time for effect
    setTimeout(() => {
      const prefCategory = answers.intensity === "light" ? "Light Roast" 
                         : answers.intensity === "medium" ? "Medium Roast" 
                         : "Dark Roast";
      
      const prefTrait = answers.flavor_profile === "fruity" ? "acidity" 
                      : answers.flavor_profile === "chocolate" ? "sweetness" 
                      : "body";

      // Simple scoring algorithm: Find coffees in preferred category, then sort by preferred trait
      let matches = products.filter(p => p.category === prefCategory);
      
      // Fallback if no category matches (shouldn't happen with our data)
      if (matches.length === 0) matches = products;

      matches.sort((a, b) => {
        const valA = a.stats ? a.stats[prefTrait as keyof typeof a.stats] : 3;
        const valB = b.stats ? b.stats[prefTrait as keyof typeof b.stats] : 3;
        return valB - valA; // Sort descending (highest trait first)
      });

      setRecommendation(matches[0]);
      setIsCalculating(false);
    }, 2500);
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers({});
    setRecommendation(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{ minHeight: "500px" }}
        >
          {/* Decorative background blur inside modal */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10 pointer-events-none" />
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <Coffee className="w-5 h-5 text-primary" /> Coffee Matchmaker
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 flex flex-col justify-center relative">
            <AnimatePresence mode="wait">
              {/* QUESTIONS */}
              {currentStep < QUESTIONS.length && (
                <motion.div 
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex-1 flex flex-col justify-center"
                >
                  <p className="text-primary text-sm font-bold tracking-widest uppercase mb-4">Question {currentStep + 1} of {QUESTIONS.length}</p>
                  <h3 className="text-3xl md:text-4xl font-serif font-bold text-white mb-10 leading-tight">
                    {QUESTIONS[currentStep].title}
                  </h3>
                  
                  <div className="grid gap-4">
                    {QUESTIONS[currentStep].options.map((opt) => {
                      const isSelected = answers[QUESTIONS[currentStep].id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelect(QUESTIONS[currentStep].id, opt.id)}
                          className={cn(
                            "flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left group",
                            isSelected 
                              ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(198,156,109,0.15)]" 
                              : "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{opt.icon}</span>
                            <span className={cn(
                              "text-lg font-medium transition-colors",
                              isSelected ? "text-white" : "text-muted group-hover:text-white"
                            )}>
                              {opt.label}
                            </span>
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected ? "border-primary bg-primary" : "border-muted group-hover:border-white"
                          )}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* CALCULATING STATE */}
              {currentStep === QUESTIONS.length && isCalculating && (
                <motion.div 
                  key="calculating"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full flex-1 flex flex-col items-center justify-center text-center space-y-8"
                >
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }} 
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-4 border-4 border-dotted border-white/20 rounded-full"
                    />
                    <Coffee className="w-12 h-12 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white mb-2">Analyzing Profile...</h3>
                    <p className="text-muted">Finding your perfect roast match.</p>
                  </div>
                </motion.div>
              )}

              {/* RESULT STATE */}
              {currentStep === QUESTIONS.length && !isCalculating && recommendation && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex-1 flex flex-col justify-center"
                >
                  <p className="text-primary text-sm font-bold tracking-widest uppercase mb-2 text-center">Your Perfect Match</p>
                  <h3 className="text-4xl md:text-5xl font-serif font-bold text-white mb-8 text-center">
                    {recommendation.name}
                  </h3>

                  <div className="bg-black/40 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-coffee-dark/50 border border-primary/20 flex items-center justify-center shrink-0 shadow-[0_0_50px_rgba(198,156,109,0.15)]">
                      <Coffee className="w-16 h-16 md:w-24 md:h-24 text-primary" />
                    </div>
                    <div>
                      <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary font-bold text-xs tracking-wider uppercase mb-3">
                        {recommendation.category}
                      </div>
                      <p className="text-muted leading-relaxed mb-4 line-clamp-3">
                        {recommendation.description}
                      </p>
                      <p className="text-white font-medium mb-6 flex items-center gap-2">
                        <span className="text-primary">Notes:</span> {recommendation.notes}
                      </p>
                      <Link 
                        href={`/shop/${recommendation.id}`}
                        onClick={onClose}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dark transition-all inline-flex items-center gap-2"
                      >
                        View Roast Details <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          {currentStep < QUESTIONS.length && (
            <div className="px-8 py-6 bg-black/40 border-t border-white/5 flex justify-between items-center">
               
               <div className="flex gap-2">
                 {QUESTIONS.map((_, i) => (
                   <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-4 bg-primary/50" : "w-4 bg-white/10")} />
                 ))}
               </div>

               <button
                 onClick={handleNext}
                 disabled={!answers[QUESTIONS[currentStep].id]}
                 className="bg-white text-black px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-colors flex items-center gap-2"
               >
                 {currentStep === QUESTIONS.length - 1 ? "Find My Match" : "Next"} <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          )}

          {currentStep === QUESTIONS.length && !isCalculating && (
             <div className="px-8 py-6 bg-black/40 border-t border-white/5 flex justify-center">
                <button
                 onClick={resetQuiz}
                 className="text-muted hover:text-white font-medium transition-colors flex items-center gap-2 text-sm"
               >
                 <RotateCcw className="w-4 h-4" /> Retake Quiz
               </button>
             </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

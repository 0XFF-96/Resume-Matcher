import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, FileSearch, Loader2, Sparkles } from "lucide-react";
import { useGetAnalysisStatus } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0, title: "Extracting Text", desc: "Reading PDF and JD contents" },
  { id: 1, title: "Parsing Resume", desc: "Identifying skills and experience" },
  { id: 2, title: "Parsing JD", desc: "Extracting core requirements" },
  { id: 3, title: "Analyzing Fit", desc: "Cross-referencing attributes" },
  { id: 4, title: "Generating Insights", desc: "Creating actionable recommendations" },
];

export default function Processing() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const analysisId = Number(id);

  // Poll status every 2 seconds
  const { data, error, isLoading } = useGetAnalysisStatus(analysisId, {
    query: {
      queryKey: [`/api/analyses/${analysisId}/status`],
      refetchInterval: (query) => {
        // Stop polling if completed or failed
        const status = query.state.data?.status;
        if (status === "completed" || status === "failed") return false;
        return 2000;
      },
    }
  });

  useEffect(() => {
    if (data?.status !== "completed") return;

    // Small delay for smooth transition
    const timer = setTimeout(() => {
      setLocation(`/analyses/${id}/results`);
    }, 1000);

    return () => clearTimeout(timer);
  }, [data?.status, id, setLocation]);

  if (error || data?.status === "failed") {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Failed</h2>
          <p className="text-slate-500 mb-8">{data?.error || "An unexpected error occurred during processing."}</p>
          <button 
            onClick={() => setLocation("/analyze")}
            className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = data?.stepIndex ?? 0;
  const progressPercent = Math.min(100, Math.max(0, ((currentStepIndex + 0.5) / STEPS.length) * 100));

  return (
    <div className="min-h-screen pt-24 flex items-center justify-center bg-slate-50 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100"
      >
        <div className="flex flex-col items-center text-center mb-12">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-primary animate-pulse">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900">AI is Analyzing</h1>
          <p className="text-slate-500 mt-2 text-lg">Please wait while we crunch the numbers.</p>
        </div>

        {/* Progress Bar Container */}
        <div className="relative mb-12">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-6">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex || data?.status === "completed";
            const isActive = idx === currentStepIndex && data?.status !== "completed";
            
            return (
              <div key={step.id} className="flex items-start gap-4">
                <div className="mt-1">
                  {isCompleted ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-accent">
                      <CheckCircle2 className="w-6 h-6" />
                    </motion.div>
                  ) : isActive ? (
                    <div className="text-primary">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="text-slate-300">
                      <Circle className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className={cn(
                  "transition-colors duration-300",
                  isCompleted ? "text-slate-700" : isActive ? "text-slate-900" : "text-slate-400"
                )}>
                  <h4 className={cn("text-lg font-semibold", isActive && "text-primary")}>
                    {step.title}
                  </h4>
                  <p className="text-sm mt-0.5 opacity-80">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

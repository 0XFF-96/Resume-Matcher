import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, FileText, Zap, Shield } from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  const { isAuthenticated, openAuthModal, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/analyze");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading || isAuthenticated) return null;

  const features = [
    { icon: FileText, title: "Smart Extraction", desc: "Instantly parses PDF resumes and complex job descriptions." },
    { icon: Zap, title: "AI-Powered Matching", desc: "Uses deep semantic analysis to find your true alignment score." },
    { icon: CheckCircle, title: "Actionable Insights", desc: "Get missing keywords, interview prep, and rewrite suggestions." },
    { icon: Shield, title: "Private & Secure", desc: "Your data stays private. Securely analyzed and stored." }
  ];

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-28 overflow-hidden">
        
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_16%,rgba(99,102,241,0.26),transparent_34%),radial-gradient(circle_at_22%_84%,rgba(139,92,246,0.18),transparent_42%),radial-gradient(circle_at_95%_72%,rgba(16,185,129,0.12),transparent_36%),linear-gradient(160deg,#f8f9ff_0%,#f3f5ff_38%,#f9f7ff_100%)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/55" />
          <motion.div
            aria-hidden
            className="absolute -top-20 -left-12 w-56 h-56 rounded-full bg-indigo-400/25 blur-3xl will-change-transform"
            animate={prefersReducedMotion ? undefined : { x: [0, 8, 0], y: [0, -6, 0], scale: [1, 1.03, 1] }}
            transition={prefersReducedMotion ? undefined : { duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute top-20 -right-8 w-64 h-64 rounded-full bg-violet-400/25 blur-3xl will-change-transform"
            animate={prefersReducedMotion ? undefined : { x: [0, -10, 0], y: [0, 7, 0], scale: [1, 0.98, 1] }}
            transition={prefersReducedMotion ? undefined : { duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl will-change-transform"
            animate={prefersReducedMotion ? undefined : { x: [0, 6, 0], y: [0, -5, 0] }}
            transition={prefersReducedMotion ? undefined : { duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-indigo-100 text-primary text-sm font-semibold mb-4 shadow-sm">
            <Zap className="w-4 h-4" />
            <span>The ultimate job application co-pilot</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 leading-tight tracking-tight">
            Stop Guessing. <br />
            <span className="text-gradient">Start Matching.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload your resume, paste a job description, and let our AI engine calculate your true fit. Discover exactly what you're missing before you apply.
          </p>
          
          <div className="pt-6">
            <button
              onClick={openAuthModal}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-white font-semibold text-lg shadow-[0_16px_34px_-18px_rgba(79,70,229,0.9)] hover:bg-primary/90 transition-colors duration-300"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-4 text-sm text-slate-500 font-medium">No credit card required</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 pt-2">
            <span className="rounded-full border border-indigo-100 bg-white/70 backdrop-blur px-3 py-1 text-xs sm:text-sm font-medium text-slate-700">AI Match Score</span>
            <span className="rounded-full border border-indigo-100 bg-white/70 backdrop-blur px-3 py-1 text-xs sm:text-sm font-medium text-slate-700">Keyword Gaps</span>
            <span className="rounded-full border border-indigo-100 bg-white/70 backdrop-blur px-3 py-1 text-xs sm:text-sm font-medium text-slate-700">Interview Focus</span>
          </div>
        </motion.div>
      </div>

      <div className="bg-white py-24 border-t border-slate-100">
        <div className="pw-section">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="p-6 rounded-3xl bg-white border border-slate-200/70 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.4)] hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)] transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary border border-indigo-100 flex items-center justify-center text-primary mb-6 group-hover:scale-105 transition-all duration-300">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

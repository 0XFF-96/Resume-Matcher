import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import { Link, useLocation } from "wouter";
import { ArrowRight, CheckCircle, FileText, Zap, Shield } from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  const { isAuthenticated, login, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-20 overflow-hidden">
        
        {/* Background Image & Effects */}
        <div className="absolute inset-0 -z-10 bg-slate-50">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-abstract.png`}
            alt="Hero Background"
            className="w-full h-full object-cover opacity-60 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-primary text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" />
            <span>The ultimate job application co-pilot</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-slate-900 leading-tight">
            Stop Guessing. <br />
            <span className="text-gradient">Start Matching.</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload your resume, paste a job description, and let our AI engine calculate your true fit. Discover exactly what you're missing before you apply.
          </p>
          
          <div className="pt-8">
            <button
              onClick={login}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-white font-semibold text-lg shadow-lg shadow-primary/25 hover:-translate-y-1 hover:shadow-xl hover:bg-primary/90 transition-all duration-300"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-4 text-sm text-slate-500 font-medium">No credit card required</p>
          </div>
        </motion.div>
      </div>

      <div className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:bg-white transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
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

import { useParams, Link } from "wouter";
import { useGetAnalysis } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, 
  Target, PenTool, Lightbulb, User, LayoutTemplate
} from "lucide-react";
import { MatchScoreRing } from "@/components/ui/MatchScoreRing";
import { cn } from "@/lib/utils";

export default function Results() {
  const { id } = useParams();
  const { data: analysis, isLoading, error } = useGetAnalysis(Number(id));

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center bg-slate-50 text-center px-4">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Analysis Not Found</h2>
        <p className="text-slate-500 mt-2 mb-6">We couldn't load the requested analysis.</p>
        <Link href="/history" className="text-primary font-medium hover:underline">Return to History</Link>
      </div>
    );
  }

  const score = analysis.matchScore || 0;
  
  // Helpers for recommendations
  const getRecIcon = (type: string) => {
    switch (type) {
      case 'resume_rewrite': return <PenTool className="w-5 h-5" />;
      case 'keyword': return <Target className="w-5 h-5" />;
      case 'interview_prep': return <Lightbulb className="w-5 h-5" />;
      case 'pitch': return <User className="w-5 h-5" />;
      default: return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  const getRecTitle = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Hero Header */}
      <div className="bg-slate-900 text-white pt-24 pb-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #4f46e5 0%, transparent 70%)' }}></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <Link href="/history" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Link>
          
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-sm font-medium mb-6">
                <LayoutTemplate className="w-4 h-4" />
                <span>Analysis Complete</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                {analysis.jobTitle || "Job Position"}
              </h1>
              <p className="text-xl text-slate-300 flex items-center justify-center md:justify-start gap-2">
                at <span className="font-semibold text-white">{analysis.companyName || "Company"}</span>
              </p>
            </div>

            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="bg-slate-800/50 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md flex flex-col items-center text-center"
            >
              <MatchScoreRing score={score} size="lg" className="mb-4" />
              <div className="mt-2 text-xl font-bold tracking-tight">
                {analysis.decisionHint || "Match Score"}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-20 relative z-20">
        
        {/* Summaries Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-primary flex items-center justify-center"><User className="w-4 h-4" /></span>
              Resume Summary
            </h3>
            <p className="text-slate-600 leading-relaxed">{analysis.resumeSummary || "No summary available."}</p>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Briefcase className="w-4 h-4" /></span>
              Job Description Summary
            </h3>
            <p className="text-slate-600 leading-relaxed">{analysis.jdSummary || "No summary available."}</p>
          </motion.div>
        </div>

        {/* Deep Dive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Strengths & Gaps */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-accent" /> Areas of Strength
                </h3>
                <div className="space-y-4">
                  {analysis.strengths.map((s, i) => (
                    <div key={i} className="flex gap-4 items-start bg-green-50/50 p-4 rounded-2xl border border-green-100">
                      <div className="mt-1 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-slate-900">{s.skill}</h4>
                        <p className="text-slate-600 text-sm mt-1">{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Gaps */}
            {analysis.gaps && analysis.gaps.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500" /> Skill Gaps & Weaknesses
                </h3>
                <div className="space-y-4">
                  {analysis.gaps.map((g, i) => (
                    <div key={i} className={cn(
                      "flex gap-4 items-start p-4 rounded-2xl border",
                      g.severity === 'high' ? "bg-red-50/50 border-red-100" : "bg-amber-50/50 border-amber-100"
                    )}>
                      <div className={cn(
                        "mt-1 flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        g.severity === 'high' ? "bg-destructive text-white" : "bg-amber-500 text-white"
                      )}>
                        {g.severity}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{g.skill}</h4>
                        <p className="text-slate-600 text-sm mt-1">{g.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-8 shadow-sm border border-indigo-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" /> Action Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3 text-primary">
                        {getRecIcon(rec.type)}
                        <h4 className="font-semibold text-sm">{getRecTitle(rec.type)}</h4>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{rec.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Tags & Focus */}
          <div className="space-y-8">
            
            {/* Missing Keywords */}
            {analysis.missingKeywords && analysis.missingKeywords.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-lg font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Interview Prep */}
            {analysis.interviewFocusAreas && analysis.interviewFocusAreas.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" /> Interview Focus
                </h3>
                <ul className="space-y-3">
                  {analysis.interviewFocusAreas.map((area, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300 items-start">
                      <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

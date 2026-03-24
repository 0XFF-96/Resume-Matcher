import { useParams, Link } from "wouter";
import { useGetAnalysis } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, 
  Target, PenTool, Lightbulb, User, LayoutTemplate, 
  Briefcase, Sparkles, ChevronRight
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
  const scoreTone =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
      : score >= 50
        ? "bg-amber-500/15 text-amber-100 border-amber-400/30"
        : "bg-rose-500/15 text-rose-100 border-rose-400/30";
  
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_36%),#f8f9ff] pb-14 sm:pb-20">
      
      {/* Hero Header */}
      <div className="bg-slate-900 text-white pt-20 sm:pt-24 pb-24 sm:pb-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #6366f1 0%, transparent 70%)' }}></div>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_25%,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(99,102,241,0.25),transparent_34%)]" />
        <div className="pw-section relative z-10">
          <Link href="/history" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-5 sm:mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Link>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 sm:gap-10 md:gap-20">
            <div className="flex-1 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-sm font-medium mb-4 sm:mb-6">
                <LayoutTemplate className="w-4 h-4" />
                <span>Analysis Complete</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-3 sm:mb-4 leading-tight">
                {analysis.jobTitle || "Job Position"}
              </h1>
              <p className="text-base sm:text-xl text-slate-300 flex items-center justify-start gap-2">
                at <span className="font-semibold text-white">{analysis.companyName || "Company"}</span>
              </p>
              <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2.5">
                <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm font-semibold", scoreTone)}>
                  Fit Score {score}/100
                </span>
                <span className="inline-flex items-center rounded-full bg-white/10 text-slate-200 px-3 py-1 text-xs sm:text-sm">
                  AI Summary Included
                </span>
              </div>
            </div>

            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-full max-w-[14rem] sm:max-w-[16rem] bg-white/10 p-5 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] border border-white/20 backdrop-blur-md flex flex-col items-center text-center shadow-[0_24px_60px_-30px_rgba(99,102,241,0.7)]"
            >
              <MatchScoreRing score={score} size="hero" className="mb-2 sm:mb-4" />
              <div className="mt-1 sm:mt-2 text-lg sm:text-xl font-bold tracking-tight">
                {analysis.decisionHint || "Match Score"}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pw-section -mt-12 sm:-mt-16 relative z-20">
        
        {/* Summaries Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 mb-5 sm:mb-8">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="pw-card p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-primary flex items-center justify-center border border-indigo-100"><User className="w-4 h-4" /></span>
              Resume Summary
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{analysis.resumeSummary || "No summary available."}</p>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="pw-card p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100"><Briefcase className="w-4 h-4" /></span>
              Job Description Summary
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{analysis.jdSummary || "No summary available."}</p>
          </motion.div>
        </div>

        {/* Deep Dive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
          
          {/* Left Column: Strengths & Gaps */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-8 order-2 lg:order-1">
            
            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="pw-card p-5 sm:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-accent" /> Areas of Strength
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {analysis.strengths.map((s, i) => (
                    <div key={i} className="flex gap-3 sm:gap-4 items-start bg-green-50/60 p-3.5 sm:p-4 rounded-2xl border border-green-100">
                      <div className="mt-0.5 sm:mt-1 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base text-slate-900">{s.skill}</h4>
                        <p className="text-slate-600 text-sm mt-1">{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Gaps */}
            {analysis.gaps && analysis.gaps.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="pw-card p-5 sm:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> Skill Gaps & Weaknesses
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {analysis.gaps.map((g, i) => (
                    <div key={i} className={cn(
                      "flex gap-3 sm:gap-4 items-start p-3.5 sm:p-4 rounded-2xl border",
                      g.severity === 'high' ? "bg-red-50/50 border-red-100" : "bg-amber-50/50 border-amber-100"
                    )}>
                      <div className={cn(
                        "mt-0.5 sm:mt-1 flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        g.severity === 'high' ? "bg-destructive text-white" : "bg-amber-500 text-white"
                      )}>
                        {g.severity}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base text-slate-900">{g.skill}</h4>
                        <p className="text-slate-600 text-sm mt-1">{g.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-3xl p-5 sm:p-8 border border-indigo-100 bg-gradient-to-br from-secondary to-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.3)]">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Action Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-100/70 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3 text-primary">
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
          <div className="space-y-5 sm:space-y-8 order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
            
            {/* Missing Keywords */}
            {analysis.missingKeywords && analysis.missingKeywords.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="pw-card p-5 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 bg-secondary border border-indigo-100 text-slate-700 text-xs sm:text-sm rounded-full font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Interview Prep */}
            {analysis.interviewFocusAreas && analysis.interviewFocusAreas.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-3xl p-5 sm:p-6 shadow-xl text-white bg-gradient-to-br from-slate-900 to-indigo-950">
                <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" /> Interview Focus
                </h3>
                <ul className="space-y-2.5 sm:space-y-3">
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

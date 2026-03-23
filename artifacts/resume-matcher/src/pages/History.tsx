import { Link } from "wouter";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, FileText, ChevronRight, AlertCircle, PlusCircle } from "lucide-react";
import { useListAnalyses, useDeleteAnalysis } from "@workspace/api-client-react";
import { MatchScoreRing } from "@/components/ui/MatchScoreRing";
import { cn } from "@/lib/utils";

export default function History() {
  const { data, isLoading } = useListAnalyses();
  const { mutate: deleteAnalysis } = useDeleteAnalysis();

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const analyses = data?.analyses || [];

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-2">Analysis History</h1>
            <p className="text-slate-500">Review your past job matches and insights.</p>
          </div>
          <Link 
            href="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            New Match
          </Link>
        </div>

        {analyses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/60 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No history yet</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">You haven't run any resume matches yet. Upload your first resume and job description to get started.</p>
            <Link 
              href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
            >
              Analyze Resume
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {analyses.map((analysis, idx) => (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative flex flex-col h-full cursor-pointer overflow-hidden"
                >
                  <Link href={`/analyses/${analysis.id}/results`} className="absolute inset-0 z-10" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 pr-4">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2 mb-1">
                        {analysis.jobTitle || "Untitled Position"}
                      </h3>
                      <p className="text-slate-500 text-sm font-medium">
                        {analysis.companyName || "Unknown Company"}
                      </p>
                    </div>
                    {analysis.status === "completed" && analysis.matchScore != null ? (
                      <div className="relative z-20">
                         <MatchScoreRing score={analysis.matchScore} size="sm" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center text-slate-400 bg-slate-50 relative z-20">
                        {analysis.status === "failed" ? <AlertCircle className="w-6 h-6 text-destructive" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-100 relative z-20">
                    <div className="text-xs text-slate-400 font-medium">
                      {format(new Date(analysis.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if(confirm("Are you sure you want to delete this analysis?")) {
                            deleteAnalysis({ id: analysis.id });
                          }
                        }}
                        className="p-2 text-slate-300 hover:text-destructive hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-2 text-primary bg-primary/5 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File, X, ChevronRight, Briefcase, Building2, AlignLeft, Loader2 } from "lucide-react";
import { useUploadAnalysis } from "@/hooks/use-upload";
import { cn } from "@/lib/utils";

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { mutate: uploadAnalysis, isPending } = useUploadAnalysis();
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    if (selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      alert("Please upload a PDF file.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobDescription.trim()) return;

    uploadAnalysis(
      { resume: file, jobDescription, jobTitle, companyName },
      {
        onSuccess: (data) => {
          setLocation(`/analyses/${data.id}/processing`);
        }
      }
    );
  };

  const isFormValid = file && jobDescription.trim().length > 50;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900">New Analysis</h1>
          <p className="mt-3 text-slate-500 text-lg">Upload your resume and the job description to reveal your match score.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Resume Upload Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">1</span>
              Upload Resume
            </h2>
            
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload-zone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200",
                    isDragging ? "border-primary bg-primary/5" : "border-slate-300 hover:border-primary/50 hover:bg-slate-50"
                  )}
                >
                  <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Click or drag PDF to upload</h3>
                  <p className="text-sm text-slate-500">Max file size 5MB. PDF format only.</p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="file-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                      <File className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{file.name}</h4>
                      <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-2 text-slate-400 hover:text-destructive hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Job Details Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">2</span>
              Job Description
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" /> Job Title <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Company Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-slate-400" /> Job Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={8}
                className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              />
            </div>
          </motion.div>

          {/* Submit Action */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-end"
          >
            <button
              type="submit"
              disabled={!isFormValid || isPending}
              className={cn(
                "inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300",
                isFormValid && !isPending
                  ? "bg-primary text-white shadow-lg shadow-primary/25 hover:-translate-y-1 hover:shadow-xl"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  Run Analysis Match
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
            </button>
          </motion.div>

        </form>
      </div>
    </div>
  );
}

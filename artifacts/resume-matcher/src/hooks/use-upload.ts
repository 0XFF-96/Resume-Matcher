import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AnalysisSummary } from "@workspace/api-client-react";

export interface UploadAnalysisVariables {
  resume: File;
  jobDescription: string;
  jobTitle?: string;
  companyName?: string;
}

export function useUploadAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UploadAnalysisVariables): Promise<AnalysisSummary> => {
      const formData = new FormData();
      formData.append("resume", data.resume);
      formData.append("jobDescription", data.jobDescription);
      
      if (data.jobTitle) {
        formData.append("jobTitle", data.jobTitle);
      }
      if (data.companyName) {
        formData.append("companyName", data.companyName);
      }

      const res = await fetch("/api/analyses", {
        method: "POST",
        body: formData,
        // Browser sets Content-Type to multipart/form-data with boundary automatically
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create analysis");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
    },
  });
}

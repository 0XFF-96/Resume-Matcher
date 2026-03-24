import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAnalysisAccepted } from "@workspace/api-client-react";
import { withAppBase } from "@/lib/api-base";

export interface UploadAnalysisVariables {
  resume: File;
  jobDescription: string;
  jobTitle?: string;
  companyName?: string;
}

export function useUploadAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UploadAnalysisVariables): Promise<CreateAnalysisAccepted> => {
      const formData = new FormData();
      formData.append("resume", data.resume);
      formData.append("jobDescription", data.jobDescription);
      
      if (data.jobTitle) {
        formData.append("jobTitle", data.jobTitle);
      }
      if (data.companyName) {
        formData.append("companyName", data.companyName);
      }

      const res = await fetch(withAppBase("/api/analyses"), {
        method: "POST",
        credentials: "include",
        body: formData,
        // Browser sets Content-Type to multipart/form-data with boundary automatically
      });

      const text = await res.text();
      let body: { error?: string } = {};
      if (text.trim()) {
        try {
          body = JSON.parse(text) as { error?: string };
        } catch {
          body = { error: text.slice(0, 200) };
        }
      }

      if (!res.ok) {
        throw new Error(
          body.error ||
            (text.trim()
              ? "Failed to create analysis"
              : "API not reachable (empty response). Start the backend and use dev proxy for /api."),
        );
      }

      return JSON.parse(text) as CreateAnalysisAccepted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
    },
  });
}

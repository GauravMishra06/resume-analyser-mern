// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get auth headers if token exists
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Upload resume file and get analysis
 */
export async function uploadResume(file, targetJob) {
  const formData = new FormData();
  formData.append('file', file);
  if (targetJob?.trim()) {
    formData.append('target_job', targetJob.trim());
  }

  const response = await fetch(`${API_BASE_URL}/resume/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to upload resume');
  }

  if (!data.data) {
    throw new Error('No upload response data');
  }

  return data.data;
}

/**
 * Analyze resume text (legacy support)
 */
export async function analyzeResumeText(resumeText, targetJob) {
  const response = await fetch(`${API_BASE_URL}/resume/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ resume_text: resumeText, target_job: targetJob }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to analyze resume');
  }

  if (!data.data) {
    throw new Error('No analysis data returned');
  }

  return data.data;
}

export async function analyzeJobMatch(resumeText, jobDescription, targetJob) {
  const response = await fetch(`${API_BASE_URL}/resume/jd-match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      resume_text: resumeText,
      job_description: jobDescription,
      target_job: targetJob,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.message || data.error || 'Failed to generate job match map');
  }
  return data.data;
}

export async function generateRewriteStudio(resumeText, targetJob) {
  const response = await fetch(`${API_BASE_URL}/resume/rewrite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      resume_text: resumeText,
      target_job: targetJob,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.message || data.error || 'Failed to generate rewrite suggestions');
  }
  return data.data;
}

export async function generateInterviewReadinessReport(resumeText, targetJob) {
  const response = await fetch(`${API_BASE_URL}/resume/interview-readiness`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      resume_text: resumeText,
      target_job: targetJob,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.message || data.error || 'Failed to generate interview readiness report');
  }
  return data.data;
}

export async function getResumeVersions() {
  const response = await fetch(`${API_BASE_URL}/resume/versions`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch resume versions');
  }
  return data.data;
}

export async function saveResumeVersion(payload) {
  const response = await fetch(`${API_BASE_URL}/resume/versions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Failed to save resume version');
  }
  return data.data;
}

export async function searchActiveJobs(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error('Search query is required');
  }

  const response = await fetch(`${API_BASE_URL}/jobs/search?q=${encodeURIComponent(trimmedQuery)}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to search active jobs');
  }

  return data.data ?? [];
}

export async function exportResumeDocx(finalResumeText) {
  const response = await fetch(`${API_BASE_URL}/resume/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      final_resume_text: finalResumeText,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to export DOCX';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Ignore parse errors and use fallback message.
    }
    throw new Error(errorMessage);
  }

  return response.blob();
}

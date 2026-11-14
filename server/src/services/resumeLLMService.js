const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { logger } = require('../utils/logger');
const { AppError, ErrorCode } = require('../types/errors');

let geminiClient = null;

function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'GEMINI_API_KEY is not configured',
        'Please set GEMINI_API_KEY in environment variables'
      );
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

const TEXT_MODEL = 'gemini-2.5-flash-lite';
const VISION_MODEL = 'gemini-2.5-flash-lite';

const generationConfig = {
  temperature: 0.2,
  maxOutputTokens: 2500,
  topP: 0.95,
  topK: 40,
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const SYSTEM_PROMPT = `You are an expert AI resume analyst specializing in job-role-specific resume evaluation.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no commentary, no extra text
2. Be deterministic and objective
3. Provide actionable, specific feedback
4. Analyze against the target job role when provided
5. Score fairly using the FULL 1-10 range. Avoid clustering around 5-7.
6. Do NOT default to the same score. Differentiate between resumes.
7. If the document is NOT a resume, set score to 1 and explain in potential_problems.

ANALYSIS REQUIREMENTS:
- Identify skill gaps specific to the target role
- Detect missing or weak experience
- Assess resume structure and ATS compatibility
- Flag role-specific risks (e.g. "backend role but no databases mentioned")
- Provide realistic, actionable encouragement

ENCOURAGEMENT GUIDELINES:
- Focus on skills that can be learned quickly (1-3 months)
- Suggest specific projects the candidate can build
- Recommend relevant certifications or tools
- Be realistic and specific, NOT generic motivational fluff

OUTPUT SCHEMA (return exactly this JSON structure):
{
  "job_role": "string - the target role being analyzed for (use provided target or detect from resume)",
  "suitability": "Strong Fit" | "Partial Fit" | "Weak Fit",
  "score": number (1-10, use decimals for precision like 6.5 or 7.2),
  "strengths": ["array of 3-5 specific strengths relevant to the role"],
  "missing_skills": ["array of specific skills missing for this role"],
  "potential_problems": ["array of issues: skill gaps, weak experience, resume problems, ATS issues, role-specific risks"],
  "improvements": ["array of 3-5 specific, actionable improvements to make"],
  "encouragement": "A paragraph of realistic, actionable encouragement focusing on quick wins, projects to build, and skills to learn"
}`;

const VISION_PROMPT = `You are an expert resume analyzer.
A resume file is attached as image(s).

Read and understand the entire document regardless of format, layout, or quality.
The document may be a scanned PDF, image-based resume, or text-based file.

If the document is scanned or partially unreadable:
- Extract as much information as possible
- Make reasonable assumptions where needed
- Note uncertainty in potential_problems

Analyze the resume and return ONLY valid JSON with the structure specified in the system message.`;

function buildTextPrompt(resumeText, targetJob) {
  let prompt = '';

  if (targetJob?.trim()) {
    prompt += `TARGET JOB ROLE: ${targetJob.trim()}\n\n`;
    prompt += `Analyze this resume specifically for the "${targetJob.trim()}" role.\n\n`;
  } else {
    prompt += `TARGET JOB ROLE: Detect from resume content (general job market analysis)\n\n`;
  }

  prompt += `RESUME CONTENT:\n${resumeText}\n\n`;
  prompt += `Analyze this resume and return ONLY the JSON response as specified. Be specific and actionable.`;

  return prompt;
}

function parseJsonObject(content) {
  let jsonStr = content.trim();

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('No valid JSON object found in response');
  }

  return JSON.parse(jsonStr.substring(startIdx, endIdx + 1));
}

function parseResponse(content, targetJob) {
  let jsonStr = content.trim();

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('No valid JSON object found in response');
  }

  jsonStr = jsonStr.substring(startIdx, endIdx + 1);
  const parsed = JSON.parse(jsonStr);

  let score = Number(parsed.score);
  if (isNaN(score) || score < 1 || score > 10) {
    if (parsed.normalized_score !== undefined) {
      const normalizedScore = Number(parsed.normalized_score);
      if (!isNaN(normalizedScore) && normalizedScore >= -1 && normalizedScore <= 1) {
        score = ((normalizedScore + 1) / 2) * 9 + 1;
      }
    }
    if (isNaN(score) || score < 1 || score > 10) {
      score = 5;
      logger.warn('Invalid score in LLM response, defaulting to 5');
    }
  }

  let suitability = 'Partial Fit';
  if (parsed.suitability === 'Strong Fit' || parsed.suitability === 'Partial Fit' || parsed.suitability === 'Weak Fit') {
    suitability = parsed.suitability;
  } else {
    if (score >= 7) suitability = 'Strong Fit';
    else if (score >= 4) suitability = 'Partial Fit';
    else suitability = 'Weak Fit';
  }

  const jobRole = parsed.job_role || parsed.job_detected || targetJob || 'Unknown';

  const response = {
    job_role: jobRole,
    suitability,
    score: Math.round(score * 10) / 10,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
    potential_problems: Array.isArray(parsed.potential_problems) ? parsed.potential_problems : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    encouragement: parsed.encouragement || '',
    job_detected: jobRole,
    suitability_score: score,
    weaknesses: Array.isArray(parsed.potential_problems) ? parsed.potential_problems : (Array.isArray(parsed.weaknesses) ? parsed.weaknesses : []),
    resume_fixes: Array.isArray(parsed.improvements) ? parsed.improvements : (Array.isArray(parsed.resume_fixes) ? parsed.resume_fixes : []),
    overall_feedback: parsed.encouragement || parsed.overall_feedback || '',
    confidence_score: 0.8,
    warnings: [],
  };

  return response;
}

async function generateStructuredJson(prompt) {
  const model = getGeminiClient().getGenerativeModel({
    model: TEXT_MODEL,
    generationConfig,
    safetySettings,
  });

  const result = await model.generateContent(prompt);
  const content = result.response.text();

  if (!content) {
    throw new Error('Empty response from LLM');
  }

  return parseJsonObject(content);
}

async function analyzeJobDescriptionMatch(resumeText, jobDescription, targetJob) {
  const role = targetJob?.trim() || 'Target Role';
  const prompt = `You are an expert recruiting analyst.
Return ONLY valid JSON.

Schema:
{
  "target_job": "string",
  "overall_match": number,
  "matched_requirements": ["string"],
  "weak_requirements": ["string"],
  "missing_requirements": ["string"],
  "top_actions": ["string"]
}

Rules:
- overall_match must be 0-100 integer
- Keep each array concise and actionable
- Focus on ATS and recruiter expectations

Target job: ${role}

Job Description:
${jobDescription}

Resume:
${resumeText}`;

  const parsed = await generateStructuredJson(prompt);
  const overallRaw = Number(parsed.overall_match);

  return {
    target_job: String(parsed.target_job || role),
    overall_match: Number.isFinite(overallRaw) ? Math.max(0, Math.min(100, Math.round(overallRaw))) : 50,
    matched_requirements: Array.isArray(parsed.matched_requirements) ? parsed.matched_requirements.map(String) : [],
    weak_requirements: Array.isArray(parsed.weak_requirements) ? parsed.weak_requirements.map(String) : [],
    missing_requirements: Array.isArray(parsed.missing_requirements) ? parsed.missing_requirements.map(String) : [],
    top_actions: Array.isArray(parsed.top_actions) ? parsed.top_actions.map(String) : [],
  };
}

async function generateRewriteSuggestions(resumeText, targetJob) {
  const role = targetJob?.trim() || 'Target Role';
  const prompt = `You are an elite resume editor.
Return ONLY valid JSON.

Schema:
{
  "target_job": "string",
  "suggestions": [
    {
      "id": "string",
      "section": "string",
      "original": "string",
      "rewritten": "string",
      "rationale": "string",
      "impact": "high|medium|low"
    }
  ]
}

Rules:
- Produce 4-8 suggestions max
- Rewrite for measurable impact and ATS clarity
- Keep rewritten text realistic and not fabricated

Target job: ${role}

Resume:
${resumeText}`;

  const parsed = await generateStructuredJson(prompt);
  const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  const suggestions = suggestionsRaw
    .map((item, index) => {
      const value = item || {};
      const impactValue = String(value.impact || 'medium').toLowerCase();
      const impact = impactValue === 'high' || impactValue === 'low' ? impactValue : 'medium';

      return {
        id: String(value.id || `rw-${index + 1}`),
        section: String(value.section || 'Experience'),
        original: String(value.original || ''),
        rewritten: String(value.rewritten || ''),
        rationale: String(value.rationale || 'Improves clarity and relevance.'),
        impact,
      };
    })
    .filter((item) => item.original.trim() && item.rewritten.trim());

  return {
    target_job: String(parsed.target_job || role),
    suggestions,
  };
}

async function generateInterviewReadiness(resumeText, targetJob) {
  const role = targetJob?.trim() || 'Target Role';
  const prompt = `You are a hiring manager and interview coach.
Return ONLY valid JSON.

Schema:
{
  "target_job": "string",
  "readiness_score": number,
  "likely_questions": ["string"],
  "vulnerable_claims": ["string"],
  "preparation_plan": ["string"]
}

Rules:
- readiness_score must be 0-100 integer
- likely_questions: 6-10 realistic interview questions
- vulnerable_claims: resume claims likely challenged in interview
- preparation_plan: concise and practical preparation steps

Target job: ${role}

Resume:
${resumeText}`;

  const parsed = await generateStructuredJson(prompt);
  const readinessRaw = Number(parsed.readiness_score);

  return {
    target_job: String(parsed.target_job || role),
    readiness_score: Number.isFinite(readinessRaw)
      ? Math.max(0, Math.min(100, Math.round(readinessRaw)))
      : 55,
    likely_questions: Array.isArray(parsed.likely_questions) ? parsed.likely_questions.map(String) : [],
    vulnerable_claims: Array.isArray(parsed.vulnerable_claims) ? parsed.vulnerable_claims.map(String) : [],
    preparation_plan: Array.isArray(parsed.preparation_plan) ? parsed.preparation_plan.map(String) : [],
  };
}

async function analyzeResume(request) {
  if (request.images && request.images.length > 0) {
    return analyzeResumeWithVision(request.images, request.target_job);
  }

  if (!request.resume_text) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'No resume content provided',
      'Either resume_text or images must be provided'
    );
  }

  const startTime = Date.now();
  const userPrompt = buildTextPrompt(request.resume_text, request.target_job);

  logger.info('LLM Request', {
    model: TEXT_MODEL,
    promptLength: userPrompt.length,
    targetJob: request.target_job,
  });

  try {
    const model = getGeminiClient().getGenerativeModel({
      model: TEXT_MODEL,
      generationConfig,
      safetySettings,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const latencyMs = Date.now() - startTime;

    logger.info('LLM Response', {
      model: TEXT_MODEL,
      responseLength: content.length,
      latencyMs,
    });

    const parsedResponse = parseResponse(content, request.target_job);
    return parsedResponse;
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    logger.error('LLM Error', {
      model: TEXT_MODEL,
      latencyMs,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    throw new AppError(
      ErrorCode.AI_ANALYSIS_ERROR,
      'Resume analysis failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function analyzeResumeWithVision(images, targetJob) {
  const startTime = Date.now();

  logger.info('Vision LLM Request', {
    model: VISION_MODEL,
    imageCount: images.length,
    targetJob,
  });

  try {
    const model = getGeminiClient().getGenerativeModel({
      model: VISION_MODEL,
      generationConfig,
      safetySettings,
      systemInstruction: SYSTEM_PROMPT,
    });

    const imageParts = images.map((base64) => ({
      inlineData: {
        mimeType: 'image/png',
        data: base64,
      },
    }));

    let textPrompt = VISION_PROMPT;
    if (targetJob?.trim()) {
      textPrompt = `TARGET JOB ROLE: ${targetJob.trim()}\n\nAnalyze this resume specifically for the "${targetJob.trim()}" role.\n\n${textPrompt}`;
    }

    const contentParts = [
      { text: textPrompt },
      ...imageParts,
    ];

    const result = await model.generateContent(contentParts);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('Empty response from vision LLM');
    }

    const latencyMs = Date.now() - startTime;

    logger.info('Vision LLM Response', {
      model: VISION_MODEL,
      responseLength: content.length,
      latencyMs,
    });

    const parsedResponse = parseResponse(content, targetJob);
    return parsedResponse;
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    logger.error('Vision LLM Error', {
      model: VISION_MODEL,
      latencyMs,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    throw new AppError(
      ErrorCode.AI_ANALYSIS_ERROR,
      'Vision model analysis failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function generateResumeHtml(resumeText) {
  const prompt = `You are a professional resume formatter.
Take the provided resume text and format it into clean, semantic HTML.
Rules:
- DO NOT wrap the response in \`\`\`html or any markdown blocks. Return pure HTML only.
- DO NOT invent or remove any information. Only rely on the provided text.
- Use <h1> for the name.
- Use <p> for contact information.
- Use <h2> for section headers (e.g., Experience, Education, Skills).
- Use <h3> for job titles or degrees.
- Use <ul> and <li> for bullet points.
- Use <p> for descriptions.
- Keep the HTML markup clean and well-structured, without CSS or inline styles.

Resume Text:
${resumeText}`;

  const model = getGeminiClient().getGenerativeModel({
    model: TEXT_MODEL,
    generationConfig,
    safetySettings,
  });

  try {
    const result = await model.generateContent(prompt);
    let content = result.response.text() || '';

    if (content.startsWith('```html') && content.endsWith('```')) {
      content = content.replace(/^```html\n?/, '').replace(/\n?```$/, '');
    } else if (content.startsWith('```') && content.endsWith('```')) {
      content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return content.trim();
  } catch (error) {
    logger.error('Failed to generate HTML from LLM', error);
    throw new AppError(
      ErrorCode.AI_ANALYSIS_ERROR,
      'HTML formatting failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

module.exports = {
  analyzeResume,
  analyzeResumeWithVision,
  analyzeJobDescriptionMatch,
  generateRewriteSuggestions,
  generateInterviewReadiness,
  generateResumeHtml,
};

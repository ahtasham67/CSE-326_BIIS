const { GoogleGenerativeAI } = require('@google/generative-ai');

// Strong indicators for hall allocation
const STRONG_KEYWORDS = [
  'medical', 'health', 'disability', 'financial', 'hardship', 'poverty',
  'remote', 'distance', 'emergency', 'orphan', 'scholarship', 'crisis',
  'chronic', 'surgery', 'treatment', 'low-income', 'underprivileged'
];

const MODERATE_KEYWORDS = [
  'commute', 'transport', 'early', 'morning', 'safety', 'security',
  'academic', 'research', 'lab', 'library', 'study', 'convenience',
  'far', 'travel', 'hour', 'bus'
];

function ruleBasedAnalysis(application) {
  const reason = (application.reason || '').toLowerCase();
  let score = 0;

  // Check for strong keywords
  const strongMatches = STRONG_KEYWORDS.filter(k => reason.includes(k));
  score += strongMatches.length * 3;

  // Check for moderate keywords
  const moderateMatches = MODERATE_KEYWORDS.filter(k => reason.includes(k));
  score += moderateMatches.length * 1.5;

  // Reason length (more detailed = more serious)
  if (reason.length > 300) score += 3;
  else if (reason.length > 150) score += 2;
  else if (reason.length > 50) score += 1;

  // Has supporting document
  if (application.document_url) score += 3;

  // Determine recommendation
  let recommendation;
  if (score >= 8) recommendation = 'strong';
  else if (score >= 4) recommendation = 'moderate';
  else recommendation = 'weak';

  // Generate summary
  const parts = [];
  parts.push(`Applicant: ${application.student_name || 'Student'}`);
  if (application.department) parts.push(`(${application.department}, Year ${application.year || 'N/A'})`);
  
  if (strongMatches.length > 0) {
    parts.push(`Application mentions ${strongMatches.join(', ')} concerns.`);
  } else if (moderateMatches.length > 0) {
    parts.push(`Application cites ${moderateMatches.join(', ')} as reasons.`);
  } else {
    parts.push('Application provides general reasons for accommodation.');
  }

  parts.push(application.document_url ? 'Supporting documents attached.' : 'No supporting documents provided.');

  return {
    summary: parts.join(' '),
    recommendation
  };
}

async function geminiAnalysis(application) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an assistant helping a university hall provost evaluate seat allocation applications.

Analyze this application and provide:
1. A concise 2-3 sentence summary
2. A recommendation classification: "strong", "moderate", or "weak"

Classification criteria:
- STRONG: Clear academic, medical, or financial need with supporting evidence
- MODERATE: Reasonable justification but limited documentation  
- WEAK: Vague reasons, no supporting documents

Application Details:
- Student: ${application.student_name || 'Unknown'}
- Department: ${application.department || 'Not specified'}
- Year: ${application.year || 'Not specified'}
- Reason: ${application.reason}
- Has Documents: ${application.document_url ? 'Yes' : 'No'}

Respond in JSON format only:
{"summary": "...", "recommendation": "strong|moderate|weak"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (['strong', 'moderate', 'weak'].includes(parsed.recommendation)) {
        return parsed;
      }
    }
    throw new Error('Invalid AI response format');
  } catch (err) {
    console.error('Gemini API error, falling back to rule-based:', err.message);
    return ruleBasedAnalysis(application);
  }
}

async function analyzeApplication(application) {
  if (process.env.GEMINI_API_KEY) {
    return await geminiAnalysis(application);
  }
  return ruleBasedAnalysis(application);
}

module.exports = { analyzeApplication };

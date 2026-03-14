const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const generateTriageBrief = async (personData) => {
  const {
    caseType, flags, firstName, lastName,
    originCountry, displacementCause,
    persecutionGrounds, asylumNarrative, translatedNarrative,
    languages, dateOfBirth
  } = personData;

  const age = dateOfBirth
    ? Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : 'Unknown';

  const categoryContext = {
    REFUGEE:       'formally recognized refugee — focus on service entitlements, family reunification, secondary displacement risk.',
    ASYLUM_SEEKER: 'asylum seeker with pending claim — focus on legal aid urgency, detention risk, claim credibility.',
    IDP:           'internally displaced person — focus on return feasibility, domestic service access, transition risk.'
  };

  const activeFlags = [];
  if (flags?.medicalEmergency) activeFlags.push('Medical Emergency');
  if (flags?.unaccompaniedMinor) activeFlags.push('Unaccompanied Minor');
  if (flags?.traffickingIndicator) activeFlags.push('Trafficking Indicator');
  if (flags?.familySeparated) activeFlags.push('Family Separated');

  const narrativeText = translatedNarrative || asylumNarrative || 'No narrative provided.';

  const prompt = `You are an expert humanitarian triage officer at a border crossing.
Using the following refugee case file data, generate a concise AI triage summary in clear, human-understandable English for a border officer. Highlight key risks, humanitarian concerns, and recommended next steps.

PERSON PROFILE:
- Name: ${firstName} ${lastName || ''}
- Case Type: ${caseType} — ${categoryContext[caseType]}
- Age: ${age}
- Origin: ${originCountry || 'Unknown'}
- Languages: ${languages?.join(', ') || 'Unknown'}
${activeFlags.length > 0 ? `- Protection Flags: ${activeFlags.join(', ')}` : '- Protection Flags: None'}

CASE HISTORY (English Translation):
${narrativeText}

Provide your assessment matching this exact JSON format. Respond ONLY with the JSON object, no markdown formatting (like \`\`\`json):
{
  "priorityLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "Concise 2-3 sentence summary of the situation, risks, and most urgent humanitarian needs based directly on the narrative.",
  "topNeeds": ["specific urgent need 1", "specific urgent need 2", "specific urgent need 3"],
  "recommendedSteps": ["actionable step 1", "actionable step 2", "actionable step 3"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn(`[GEMINI UNAVAILABLE - USING OFFLINE LOGIC FALLBACK]: ${err.message}`);
    
    // Offline Rule-Based Fallback Generator 
    // Generates a proper assessment locally if the external API fails.
    
    let priorityLevel = 'LOW';
    let priorityScore = 0;
    const topNeeds = [];
    const recommendedSteps = [];
    
    let baseType = caseType?.toLowerCase().replace('_', ' ') || 'individual';
    let summaryText = `Case involves a ${age === 'Unknown' ? '' : age + '-year-old '} ${baseType} from ${originCountry || 'an unknown region'}. `;

    if (flags?.medicalEmergency) {
      priorityScore += 3;
      topNeeds.push('Immediate medical assessment');
      recommendedSteps.push('Refer to on-site medical staff immediately');
      summaryText += 'Presents with an urgent medical emergency requiring immediate attention. ';
    }
    if (flags?.unaccompaniedMinor) {
      priorityScore += 3;
      topNeeds.push('Child protection services');
      recommendedSteps.push('Assign specialized case worker for unaccompanied minors');
      summaryText += 'This case involves an unaccompanied minor, making them highly vulnerable to exploitation. ';
    }
    if (flags?.traffickingIndicator) {
      priorityScore += 2;
      topNeeds.push('Anti-trafficking screening');
      recommendedSteps.push('Conduct specialized trafficking indicator interview');
      summaryText += 'Potential signs of human trafficking are indicated. ';
    }
    if (flags?.familySeparated) {
      priorityScore += 1;
      topNeeds.push('Family tracing assistance');
      recommendedSteps.push('Initiate family tracing protocols');
      summaryText += 'The individual has been separated from family members. ';
    }

    if (priorityScore >= 3) priorityLevel = 'CRITICAL';
    else if (priorityScore === 2) priorityLevel = 'HIGH';
    else if (priorityScore === 1) priorityLevel = 'MEDIUM';

    if (topNeeds.length === 0) {
      topNeeds.push('Standard intake processing', 'Document verification', 'Service referral mapping');
      recommendedSteps.push('Complete standard registration', 'Assign general case officer', 'Connect to basic services');
      summaryText += 'Standard processing procedures apply. No immediate acute risks based on flags. Review narrative history for specifics.';
    }

    return {
      priorityLevel,
      summary: summaryText.trim(),
      topNeeds: topNeeds.slice(0, 3), // Ensure max 3 elements
      recommendedSteps: recommendedSteps.slice(0, 3) 
    };
  }
};

const translateAndSummarize = async (rawText) => {
  const prompt = `The following text may be in any language.

1. Detect the language
2. Translate it fully to English
3. Summarize the key asylum claim in 3-4 sentences

Text: ${rawText}

Respond ONLY with JSON, no markdown, no extra text:
{
  "detectedLanguage": "language name",
  "translatedText": "full english translation",
  "summary": "3-4 sentence summary of asylum claim"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    
    console.log("Gemini translate raw response:", clean);
    return JSON.parse(clean);
  } catch (err) {
    console.error('=== GEMINI TRANSLATE ERROR ===');
    console.error(err);
    console.error('==============================');
    return {
      detectedLanguage: 'Unknown',
      translatedText: rawText,
      summary: rawText
    };
  }
};

module.exports = { generateTriageBrief, translateAndSummarize };
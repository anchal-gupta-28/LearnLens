const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

dotenv.config();

const AI_PROVIDER = (process.env.AI_PROVIDER || 'google').toLowerCase();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let googleClient = null;
let openaiClient = null;

if (AI_PROVIDER === 'google') {
  if (!GOOGLE_API_KEY) {
    throw new Error('Missing GOOGLE_API_KEY. Set GOOGLE_API_KEY in Backend/.env to use Gemini.');
  }
  googleClient = new GoogleGenerativeAI(GOOGLE_API_KEY);
} else if (AI_PROVIDER === 'openai') {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY. Set OPENAI_API_KEY in Backend/.env to use OpenAI.');
  }
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  throw new Error('Unsupported AI_PROVIDER. Set AI_PROVIDER=google or AI_PROVIDER=openai in Backend/.env.');
}

const tutorSystemPrompt = `You are LearnLens AI Tutor, a friendly and patient educational tutor. Your task is to answer student questions clearly, explain concepts step-by-step, provide examples, and help the student learn. Keep the tone supportive, concise, and accurate. If the student asks about school subjects, explain with clarity and use simple analogies when helpful.`;

const buildChatHistoryForGoogle = (chatHistory) => {
  return chatHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
};

const buildChatHistoryForOpenAI = (chatHistory) => {
  const history = chatHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  return [{ role: 'system', content: tutorSystemPrompt }, ...history];
};

const analyzeLearningGaps = async (performanceData) => {
  try {
    let text = '';
    const prompt = `As an expert educational psychologist and data analyst, analyze the following student quiz performance data:\n${JSON.stringify(performanceData)}\n\nIdentify:\n1. Specific weak topics (where accuracy is low).\n2. Potential conceptual gaps based on the topics.\n3. A confidence score (0-100) reflecting their mastery.\n4. Actionable, encouraging feedback for the student.\n5. Three specific recommended actions (e.g., "Revise trigonometry identities", "Practice 10 linear equations").\n\nReturn the analysis in STRICT JSON format:\n{\n  "weakTopics": ["Topic 1", "Topic 2"],\n  "weakConcepts": ["Concept A", "Concept B"],\n  "confidenceScore": 85,\n  "aiFeedback": "Your encouraging feedback here...",\n  "recommendedActions": ["Action 1", "Action 2", "Action 3"],\n  "riskLevel": "Low" | "Medium" | "High"\n}`;

    if (AI_PROVIDER === 'openai') {
      const completion = await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      text = completion.choices?.[0]?.message?.content?.trim();
    } else {
      const model = googleClient.getGenerativeModel({ model: GOOGLE_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      text = response.text();
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse AI response for learning gaps.');
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return null;
  }
};

const getTutorResponse = async (chatHistory, newUserMessage) => {
  try {
    if (AI_PROVIDER === 'openai') {
      const messages = [...buildChatHistoryForOpenAI(chatHistory), { role: 'user', content: newUserMessage }];
      const completion = await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        max_tokens: 500,
      });
      return completion.choices?.[0]?.message?.content?.trim() || 'I could not create a response. Please try again.';
    }
    const model = googleClient.getGenerativeModel({
      model: GOOGLE_MODEL,
      systemInstruction: tutorSystemPrompt
    });
    const history = buildChatHistoryForGoogle(chatHistory);
    const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 500 } });
    const result = await chat.sendMessage(newUserMessage);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('AI Tutor Error:', error);

    if (AI_PROVIDER === 'openai' && (error.code === 'insufficient_quota' || error.status === 429)) {
      if (googleClient) {
        try {
          const model = googleClient.getGenerativeModel({
            model: GOOGLE_MODEL,
            systemInstruction: tutorSystemPrompt
          });
          const history = buildChatHistoryForGoogle(chatHistory || []);
          const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 500 } });
          const result = await chat.sendMessage(newUserMessage);
          const response = await result.response;
          return response.text().trim();
        } catch (gErr) {
          console.error('Fallback to Google failed:', gErr);
          return 'AI tutor error: OpenAI quota exceeded and Google fallback failed. Check API keys or try again later.';
        }
      }
      return 'AI tutor error: OpenAI quota exceeded or rate limited. Check your OpenAI billing/usage or switch to Google Gemini (set AI_PROVIDER=google).';
    }

    if (AI_PROVIDER === 'openai' && (error.status === 401 || /invalid api key/i.test(error.message || '')) ) {
      return 'AI tutor error: OpenAI API key invalid or unauthorized. Verify OPENAI_API_KEY in Backend/.env.';
    }

    if (AI_PROVIDER === 'google' && error.message?.includes('Missing GOOGLE_API_KEY')) {
      return 'AI tutor is not configured. Please set the required GOOGLE_API_KEY in Backend/.env.';
    }

    return 'I am sorry, I am having trouble connecting to my brain right now. Please try again later.';
  }
};

const generateQuizQuestions = async (subject, topic, difficulty, count) => {
  try {
    const prompt = `
      You are an expert educator creating a diagnostic quiz for senior secondary students (Class 10–12).
      Generate exactly ${count} multiple-choice questions on the topic "${topic}" in subject "${subject}" at "${difficulty}" difficulty.

      Rules:
      - Each question must have exactly 4 options.
      - correctOption is a 0-based index (0, 1, 2, or 3) of the correct answer.
      - Include a brief explanation for the correct answer.
      - Questions must be distinct and educational.
      - Difficulty "${difficulty}": Easy = conceptual recall, Medium = application, Hard = analysis/synthesis.

      Return STRICT valid JSON only — no markdown, no extra text:
      {
        "questions": [
          {
            "questionText": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctOption": 0,
            "explanation": "Brief explanation of why Option A is correct.",
            "topic": "${topic}"
          }
        ]
      }
    `;

    let text = '';
    if (AI_PROVIDER === 'openai') {
      const completion = await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      });
      text = completion.choices?.[0]?.message?.content?.trim();
    } else {
      const model = googleClient.getGenerativeModel({ model: GOOGLE_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      text = response.text().trim();
    }

    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.questions || [];
    }
    throw new Error('Could not parse AI quiz response');
  } catch (error) {
    console.error('AI Quiz Generation Error:', error);
    return null;
  }
};

module.exports = { analyzeLearningGaps, getTutorResponse, generateQuizQuestions };

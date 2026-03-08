/**
 * AI Chat Service
 * ===============
 * Handles AI conversation for clients and trainers.
 * Uses the same multi-provider approach as workout generation
 * but for general conversational AI (macro logging, form tips, etc.)
 *
 * Provider priority: OpenAI -> Anthropic -> Gemini -> Venice
 */
import logger from '../utils/logger.mjs';

const SYSTEM_PROMPTS = {
  client: {
    general: `You are SwanStudios AI Assistant, a helpful fitness and wellness companion for personal training clients. You help with:
- Answering fitness and nutrition questions
- Providing exercise form tips and suggestions
- Motivation and encouragement
- General wellness advice
Keep responses concise and actionable. You are NOT a medical professional — always recommend consulting a doctor for medical concerns.`,

    macro_logging: `You are SwanStudios Macro Logger, a nutrition tracking assistant. When a user describes food they ate:
1. Parse the food items and quantities
2. Estimate calories, protein, carbs, fat, fiber, sugar, sodium
3. Return a structured response with the breakdown
4. Ask for clarification if portions are unclear
Format macro data as JSON in a code block when providing nutritional breakdowns.
Example: "I had 2 eggs and toast" -> parse and return macros.`,

    form_tips: `You are SwanStudios Form Coach, providing exercise technique guidance. You help clients:
- Understand proper form for exercises
- Identify common mistakes
- Suggest modifications for injuries or limitations
- Explain muscle engagement and breathing patterns
Always emphasize safety. Recommend working with their trainer for complex movements.`,

    workout_suggestions: `You are SwanStudios Workout Advisor, helping clients plan effective workouts. You can:
- Suggest exercises based on goals and available equipment
- Recommend warm-up and cool-down routines
- Provide workout structure guidance
- Suggest training splits and progression strategies
Consider the client's fitness level and goals. Always recommend proper warm-up.`,
  },

  trainer: {
    general: `You are SwanStudios AI Assistant for personal trainers. You help with:
- Client program design and periodization
- Exercise selection and progression planning
- Nutrition guidance for client recommendations
- Business and client management tips
- NASM-aligned training protocols
You have expanded permissions compared to client assistants.`,

    workout_generation: `You are SwanStudios Workout Generator for trainers. Help create structured workout plans by:
- Designing workouts based on client goals, fitness level, and equipment
- Following NASM OPT model phases when appropriate
- Including sets, reps, rest periods, and tempo
- Suggesting progressions and regressions
Format workouts in clear, structured format.`,

    client_review: `You are SwanStudios Client Review Assistant for trainers. Help analyze:
- Client progress data and trends
- Form analysis results and improvement areas
- Workout adherence and consistency patterns
- Nutrition logging compliance
- Recommendations for program adjustments
Provide data-driven insights to help trainers optimize client outcomes.`,
  },

  admin: {
    general: `You are SwanStudios AI Assistant for platform administrators. You have full access to help with:
- Platform analytics and business insights
- Client and trainer management guidance
- System health and performance analysis
- Feature planning and optimization
- Revenue and growth strategy
You are the most capable version of the assistant with no permission restrictions.`,
  },
};

/**
 * Get the system prompt for a given role and context.
 */
export function getSystemPrompt(role, context) {
  const rolePrompts = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.client;
  return rolePrompts[context] || rolePrompts.general;
}

/**
 * Build the messages array for the AI provider.
 * Takes conversation history and adds the system prompt.
 */
export function buildPromptMessages(systemPrompt, conversationMessages, newMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history (last 20 messages to stay within context limits)
  const recentMessages = conversationMessages.slice(-20);
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  // Add the new user message
  messages.push({ role: 'user', content: newMessage });

  return messages;
}

/**
 * Send a chat message to an AI provider.
 * Tries providers in order: OpenAI -> Anthropic -> Gemini
 */
export async function sendChatMessage(messages, options = {}) {
  const { maxTokens = 1500, temperature = 0.7 } = options;
  const providers = getAvailableProviders();
  const failoverTrace = [];

  for (const provider of providers) {
    try {
      const result = await callProvider(provider, messages, { maxTokens, temperature });
      failoverTrace.push(`${provider.name}:success`);
      return {
        ok: true,
        content: result.content,
        provider: provider.name,
        model: result.model,
        tokenUsage: result.tokenUsage,
        failoverTrace,
      };
    } catch (err) {
      failoverTrace.push(`${provider.name}:${err.message}`);
      logger.warn(`[AIChatService] ${provider.name} failed: ${err.message}`);
      continue;
    }
  }

  return {
    ok: false,
    content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
    provider: 'fallback',
    failoverTrace,
  };
}

function getAvailableProviders() {
  const providers = [];

  // Gemini first — primary provider (user has Gemini 3.1 API key)
  if (process.env.GEMINI_API_KEY) {
    providers.push({ name: 'gemini', key: process.env.GEMINI_API_KEY });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: 'openai', key: process.env.OPENAI_API_KEY });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({ name: 'anthropic', key: process.env.ANTHROPIC_API_KEY });
  }
  if (process.env.VENICE_API_KEY) {
    providers.push({ name: 'venice', key: process.env.VENICE_API_KEY });
  }

  return providers;
}

async function callProvider(provider, messages, options) {
  const { maxTokens, temperature } = options;

  switch (provider.name) {
    case 'openai':
      return callOpenAI(provider.key, messages, maxTokens, temperature);
    case 'anthropic':
      return callAnthropic(provider.key, messages, maxTokens, temperature);
    case 'gemini':
      return callGemini(provider.key, messages, maxTokens, temperature);
    case 'venice':
      return callVenice(provider.key, messages, maxTokens, temperature);
    default:
      throw new Error(`Unknown provider: ${provider.name}`);
  }
}

async function callOpenAI(apiKey, messages, maxTokens, temperature) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    tokenUsage: {
      inputTokens: data.usage?.prompt_tokens || null,
      outputTokens: data.usage?.completion_tokens || null,
      totalTokens: data.usage?.total_tokens || null,
    },
  };
}

async function callAnthropic(apiKey, messages, maxTokens, temperature) {
  // Extract system message
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemMsg?.content || '',
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    model: data.model,
    tokenUsage: {
      inputTokens: data.usage?.input_tokens || null,
      outputTokens: data.usage?.output_tokens || null,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || null,
    },
  };
}

async function callGemini(apiKey, messages, maxTokens, temperature) {
  // Convert messages to Gemini format
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    content: text,
    model: 'gemini-2.0-flash',
    tokenUsage: {
      inputTokens: data.usageMetadata?.promptTokenCount || null,
      outputTokens: data.usageMetadata?.candidatesTokenCount || null,
      totalTokens: data.usageMetadata?.totalTokenCount || null,
    },
  };
}

async function callVenice(apiKey, messages, maxTokens, temperature) {
  const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Venice ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model || 'llama-3.3-70b',
    tokenUsage: {
      inputTokens: data.usage?.prompt_tokens || null,
      outputTokens: data.usage?.completion_tokens || null,
      totalTokens: data.usage?.total_tokens || null,
    },
  };
}

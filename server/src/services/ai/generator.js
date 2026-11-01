import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const schema = z.object({ title: z.string().min(3).max(80), description: z.string().min(15), suspects: z.array(z.object({ name: z.string(), age: z.number().int().min(18).max(100), occupation: z.string(), description: z.string(), relationship: z.string(), motive: z.string(), alibi: z.string(), personality: z.string() })).min(3).max(7), culpritIndex: z.number().int().nonnegative(), motive: z.string(), crimeMethod: z.string(), solutionExplanation: z.string(), evidence: z.array(z.object({ title: z.string(), category: z.enum(['WhatsApp Conversations','Images and Photographs','CCTV Recordings','Witness Statements','Documents','Call Records','Physical Evidence','Timeline Records']), description: z.string(), content: z.string(), relatedSuspectIndexes: z.array(z.number().int().nonnegative()), discoveryTime: z.string(), clueType: z.enum(['clue','red-herring','statement','record']) })).min(5).max(18), timeline: z.array(z.object({time:z.string(),event:z.string(),relatedSuspect:z.string().optional()})).min(3) });

const counts = { Easy: { suspects: 3, evidence: '5 to 7' }, Medium: { suspects: '4 or 5', evidence: '8 to 12' }, Hard: { suspects: '5 to 7', evidence: '12 to 18' } };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export function isTransientProviderError(error) {
  const status = Number(error?.status ?? error?.code);
  return [408, 429, 500, 502, 503, 504].includes(status) || /high demand|temporar|unavailable|resource_exhausted|rate.?limit/i.test(error?.message || '');
}

export async function generateMystery({ scenario, title, difficulty }) {
  if (!process.env.GEMINI_API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const target = counts[difficulty] || counts.Medium;
  const prompt = `Create a complete, logically solvable, entirely fictional detective game case. Follow the user premise without graphic detail. Difficulty ${difficulty}: ${target.suspects} suspects and ${target.evidence} evidence items. Pick exactly one culprit before play; clue evidence must include at least two independent clues supporting that culprit. Red herrings must be fair. Evidence and timeline timestamps must agree. Keep evidence content explicitly fictional and avoid real people, organizations, or locations. Return only JSON matching: {"title":string,"description":string,"suspects":[{"name":string,"age":number,"occupation":string,"description":string,"relationship":string,"motive":string,"alibi":string,"personality":string}],"culpritIndex":number,"motive":string,"crimeMethod":string,"solutionExplanation":string,"evidence":[{"title":string,"category":"WhatsApp Conversations"|"Images and Photographs"|"CCTV Recordings"|"Witness Statements"|"Documents"|"Call Records"|"Physical Evidence"|"Timeline Records","description":string,"content":string,"relatedSuspectIndexes":number[],"discoveryTime":string,"clueType":"clue"|"red-herring"|"statement"|"record"}],"timeline":[{"time":string,"event":string,"relatedSuspect":string}]}. Ensure all indexes are in range. User scenario: ${scenario}${title ? ` User title: ${title}` : ''}`;
  let lastError;
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
      const parsed = schema.parse(JSON.parse(result.text));
      if (parsed.culpritIndex >= parsed.suspects.length || parsed.evidence.some(e => e.relatedSuspectIndexes.some(i => i >= parsed.suspects.length))) throw new Error('Generated case contains invalid suspect references.');
      const limits = { Easy: [3,3,5,7], Medium: [4,5,8,12], Hard: [5,7,12,18] }[difficulty];
      if (parsed.suspects.length < limits[0] || parsed.suspects.length > limits[1] || parsed.evidence.length < limits[2] || parsed.evidence.length > limits[3]) throw new Error('Generated case counts do not match the selected difficulty.');
      const culpritClues = parsed.evidence.filter(e => e.clueType === 'clue' && e.relatedSuspectIndexes.includes(parsed.culpritIndex)).length;
      if (culpritClues < 2) throw new Error('Generated case does not contain two independent clues for the culprit.');
      return parsed;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        const retryAfter = Number(error?.headers?.['retry-after'] || error?.response?.headers?.['retry-after']);
        const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 1000 * (2 ** attempt);
        if (isTransientProviderError(error)) console.warn(`Gemini temporarily unavailable; retrying in ${delay}ms (attempt ${attempt + 2}/${maxAttempts}).`);
        await pause(delay);
      }
    }
  }
  throw lastError;
}

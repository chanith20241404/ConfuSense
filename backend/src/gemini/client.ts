import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const genai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const CONFUSION_PROMPT = `You are a Facial Action Coding System (FACS) analyzer. Analyze this webcam image of a student during an online class.

Look specifically for signs of CONFUSION in their facial expression:
- Brow Lowerer (AU4): eyebrows pulled down/together — strong confusion indicator
- Lid Tightener (AU7): squinting or narrowed eyes — concentration/confusion
- Lip Corner Depressor (AU15): frown or downturned mouth
- Head tilt or lean forward — trying to understand
- Puzzled or lost expression, furrowed brow, squinting at screen

Do NOT flag these as confusion:
- Simply looking away briefly (distraction, not confusion)
- Eyes closed (drowsiness, not confusion)
- Neutral relaxed face (normal attentiveness)
- Smiling or laughing (engaged, not confused)

Rate the student's confusion level from 0.0 to 1.0:
- 0.0 = not confused at all (relaxed, attentive, or smiling)
- 0.3 = mild uncertainty (slight brow furrow)
- 0.6 = moderately confused (clear brow furrow + squinting or frown)
- 1.0 = very confused (strong brow furrow + frown + head tilt, visibly lost)

Also rate their overall engagement from 0.0 to 1.0.

Respond ONLY with valid JSON:
{"confusionScore": <number>, "engagementScore": <number|}`;

const BATCH_CONFUSION_PROMPT = `You are a Facial Action Coding System (FACS) analyzer. You are given a sequence of webcam frames captured over ~20 seconds (1 frame per second) of a student during an online class. Analyze the TEMPORAL PROGRESSION of their facial expressions across ALL frames.

Look for SUSTAINED or INCREASING signs of confusion across multiple frames:
- Brow Lowerer (AU4): eyebrows pulled down/together — strong confusion indicator
- Lid Tightener (AU7): squinting or narrowed eyes — concentration/confusion
- Lip Corner Depressor (AU15): frown or downturned mouth
- Head tilt or lean forward — trying to understand
- Puzzled or lost expression, furrowed brow, squinting at screen
- Micro-expressions: brief flashes of confusion (rapid brow furrow, lip press) even if face returns to neutral

Do NOT flag these as confusion:
- A single frame where they look away briefly (momentary distraction)
- Eyes closed in one frame (blink or brief drowsiness)
- Neutral relaxed face throughout (normal attentiveness)
- Smiling or laughing (engaged, not confused)

IMPORTANT: Look at the overall pattern across all frames, not just individual frames.
- If confusion appears in only 1-2 frames out of 20, the student is likely NOT confused (momentary expression).
- If confusion is visible in 5+ frames, especially consecutive ones, the student is likely confused.
- Weight recent frames (later in the sequence) more heavily than earlier ones.

Rate the student's SUSTAINED confusion level from 0.0 to 1.0:
- 0.0 = not confused at all across the sequence
- 0.3 = mild uncertainty in a few frames
- 0.5 = moderate confusion in several frames
- 0.7 = clear sustained confusion across many frames
- 1.0 = very confused throughout most of the sequence

Also rate their overall engagement from 0.0 to 1.0 based on the full sequence.

Respond ONLY with valid JSON:
{"confusionScore": <number>, "engagementScore": <number>}`;

const MAX_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GeminiScore {
  confusionScore: number;
  engagementScore: number;
}

export async function scoreEngagement(base64Jpeg: string): Promise<number> {
  const result = await scoreConfusion(base64Jpeg);
  return result.engagementScore;
}

export async function scoreBatchConfusion(frames: string[]): Promise<GeminiScore> {
  let lastError: unknown;

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];
  for (let i = 0; i < frames.length; i++) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frames[i] } });
  }
  parts.push({ text: BATCH_CONFUSION_PROMPT });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await genai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts }],
      });

      const text = response.text ?? '';
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error(`No JSON in response: ${text}`);


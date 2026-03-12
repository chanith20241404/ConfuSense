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

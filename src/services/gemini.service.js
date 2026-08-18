const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function analyzeWaterQuality({
  deviceId,
  ph,
  tds,
  turbidity,
  temperature,
  status,
  question,
}) {
  const prompt = `
You are AquaControl AI, an assistant for a water quality monitoring system.

Your job is to explain sensor readings clearly and cautiously.

Current sensor reading:

Device: ${deviceId}
pH: ${ph}
TDS: ${tds} ppm
Turbidity: ${turbidity} NTU
Temperature: ${temperature} °C
System turbidity status: ${status}

User question:
${question || 'Analyze the current water quality.'}

Rules:
- Only discuss water quality, water monitoring, sensor readings, maintenance,
  filtration, calibration, and related water-quality topics.
- Do not claim the water is safe to drink solely from these sensors.
- Explain that biological contaminants, heavy metals, chemicals, and other
  hazards may require laboratory testing.
- Do not invent measurements that are not provided.
- Distinguish measured values from interpretation.
- Keep the answer concise and useful for a mobile application.
- If readings appear unusual, recommend checking sensor calibration before
  assuming the water itself is the cause.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  });

  return response.text;
}

module.exports = {
  analyzeWaterQuality,
};
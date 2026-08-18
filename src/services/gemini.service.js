const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const waterAnalysisSchema = {
  type: Type.OBJECT,

  properties: {
    summary: {
      type: Type.STRING,
      description:
        'Short plain-language summary of the current water condition.',
    },

    overall_status: {
      type: Type.STRING,
      enum: [
        'GOOD',
        'ATTENTION',
        'WARNING',
        'UNKNOWN',
      ],
    },

    observations: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          parameter: {
            type: Type.STRING,
          },

          value: {
            type: Type.STRING,
          },

          status: {
            type: Type.STRING,
            enum: [
              'NORMAL',
              'ATTENTION',
              'WARNING',
              'UNKNOWN',
            ],
          },

          message: {
            type: Type.STRING,
          },
        },

        required: [
          'parameter',
          'value',
          'status',
          'message',
        ],
      },
    },

    recommendations: {
      type: Type.ARRAY,

      items: {
        type: Type.STRING,
      },
    },

    warnings: {
      type: Type.ARRAY,

      items: {
        type: Type.STRING,
      },
    },
  },

  required: [
    'summary',
    'overall_status',
    'observations',
    'recommendations',
    'warnings',
  ],
};

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

Current device:
${deviceId}

Measured readings:
- pH: ${ph}
- TDS: ${tds} ppm
- Turbidity: ${turbidity} NTU
- Temperature: ${temperature} °C
- AquaControl turbidity classification: ${status}

AquaControl configured turbidity thresholds:
- 0 to 199 NTU: CLEAR
- 200 to 299 NTU: CLOUDY
- 300 NTU and above: DIRTY

User request:
${question || 'Analyze the current water condition.'}

Rules:

1. Respect AquaControl's configured classifications.
2. Do not redefine CLEAR, CLOUDY, or DIRTY using external thresholds.
3. You may explain that external standards can differ, but do not present
   those standards as AquaControl's configured rules.
4. Never claim water is safe to drink based only on these sensors.
5. Do not invent sensor readings.
6. Mention calibration if values appear unusual or inconsistent.
7. Focus only on:
   - water quality
   - sensor readings
   - sensor calibration
   - monitoring
   - filtration
   - maintenance
8. Keep responses concise and suitable for a mobile application.
9. Do not use Markdown formatting.
10. Return only information matching the provided JSON structure.
`;

  const response =
    await ai.models.generateContent({
      model: 'gemini-3.6-flash',

      contents: prompt,

      config: {
        responseMimeType:
          'application/json',

        responseSchema:
          waterAnalysisSchema,
      },
    });

  if (!response.text) {
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error(
      'Gemini JSON parse error:',
      response.text
    );

    throw new Error(
      'Gemini returned invalid JSON.'
    );
  }
}

module.exports = {
  analyzeWaterQuality,
};
const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const usageSchema = {
  type: Type.OBJECT,

  properties: {
    overall_status: {
      type: Type.STRING,
      enum: [
        'SUITABLE',
        'CAUTION',
        'NOT_RECOMMENDED',
        'INSUFFICIENT_DATA',
      ],
    },

    summary: {
      type: Type.STRING,
      description:
        'A short descriptive summary of the current water usage safety based only on available sensor readings.',
    },

    usage_summary: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          title: {
            type: Type.STRING,
          },

          status: {
            type: Type.STRING,
            enum: [
              'SUITABLE',
              'CAUTION',
              'NOT_RECOMMENDED',
              'INSUFFICIENT_DATA',
            ],
          },

          description: {
            type: Type.STRING,
          },
        },

        required: [
          'title',
          'status',
          'description',
        ],
      },
    },

    recommendation: {
      type: Type.STRING,
    },
  },

  required: [
    'overall_status',
    'summary',
    'usage_summary',
    'recommendation',
  ],
};

async function analyzeWaterQuality({
  deviceId,
  ph,
  tds,
  turbidity,
  temperature,
  status,
}) {
  const prompt = `
You are AquaControl AI.

Your job is to assess how the water may currently be used based only on the available sensor readings.

Device:
${deviceId}

Current readings:
- pH: ${ph}
- TDS: ${tds} ppm
- Turbidity: ${turbidity} NTU
- Temperature: ${temperature} °C
- AquaControl turbidity classification: ${status}

AquaControl configured turbidity classification:
- 0 to 199 NTU = CLEAR
- 200 to 299 NTU = CLOUDY
- 300 NTU and above = DIRTY

Assess these four usage categories only:

1. Human Consumption
2. Animals
3. Irrigation
4. General Cleaning

Allowed statuses:
- SUITABLE
- CAUTION
- NOT_RECOMMENDED
- INSUFFICIENT_DATA

Important rules:

- Base the assessment only on the sensor readings provided.
- Never claim drinking water is confirmed safe from pH, TDS, turbidity, and temperature alone.
- For human consumption, use NOT_RECOMMENDED or INSUFFICIENT_DATA when biological or chemical safety cannot be confirmed.
- Do not invent contaminants or sensor measurements.
- Respect AquaControl's configured turbidity classification.
- Keep each usage description short and descriptive.
- The main summary should be 2 to 3 short sentences.
- The recommendation should be 1 to 2 sentences.
- Do not use Markdown.
- Do not produce a medical or laboratory certification.
- Return exactly four usage_summary items.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-preview',

    contents: prompt,

    config: {
      responseMimeType: 'application/json',
      responseSchema: usageSchema,
      temperature: 0.2,
      maxOutputTokens: 700,
    },
  });

  if (!response.text) {
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  return JSON.parse(response.text);
}

module.exports = {
  analyzeWaterQuality,
};
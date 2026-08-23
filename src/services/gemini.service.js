const {
  GoogleGenAI,
  Type,
} = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const ALLOWED_STATUSES = [
  'SUITABLE',
  'CAUTION',
  'NOT_RECOMMENDED',
  'INSUFFICIENT_DATA',
];

const usageSchema = {
  type: Type.OBJECT,

  properties: {
    overall_status: {
      type: Type.STRING,
      enum: ALLOWED_STATUSES,
      description:
        'Overall water usage assessment based strictly on the available sensor measurements.',
    },

    summary: {
      type: Type.STRING,
      description:
        'A concise, technically accurate but readable overall interpretation of the current physicochemical water condition. Do not label this as a technical summary.',
    },

    usage_summary: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          title: {
            type: Type.STRING,
            enum: [
              'Human Consumption',
              'Animals',
              'Irrigation',
              'General Cleaning',
            ],
          },

          status: {
            type: Type.STRING,
            enum: ALLOWED_STATUSES,
          },

          description: {
            type: Type.STRING,
            description:
              'A short plain-language explanation of whether the water appears appropriate for this specific use based only on available measurements.',
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
      description:
        'One or two concise recommended next actions based on the current measurements and their limitations.',
    },
  },

  required: [
    'overall_status',
    'summary',
    'usage_summary',
    'recommendation',
  ],
};

function normalizeNumber(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeStatus(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return 'UNKNOWN';
  }

  return value
    .trim()
    .toUpperCase();
}

function validateInput({
  deviceId,
  ph,
  tds,
  turbidity,
  temperature,
}) {
  if (!deviceId) {
    throw new Error(
      'deviceId is required for water quality analysis.'
    );
  }

  const readings = {
    ph: normalizeNumber(ph),
    tds: normalizeNumber(tds),
    turbidity:
      normalizeNumber(turbidity),
    temperature:
      normalizeNumber(temperature),
  };

  const hasAnyReading =
    readings.ph !== null ||
    readings.tds !== null ||
    readings.turbidity !== null ||
    readings.temperature !== null;

  if (!hasAnyReading) {
    throw new Error(
      'No valid sensor readings were provided.'
    );
  }

  return readings;
}

function validateAnalysisResult(
  analysis
) {
  if (
    !analysis ||
    typeof analysis !== 'object'
  ) {
    throw new Error(
      'Gemini returned an invalid analysis object.'
    );
  }

  if (
    !ALLOWED_STATUSES.includes(
      analysis.overall_status
    )
  ) {
    throw new Error(
      'Gemini returned an invalid overall_status.'
    );
  }

  if (
    typeof analysis.summary !==
      'string' ||
    !analysis.summary.trim()
  ) {
    throw new Error(
      'Gemini returned an invalid summary.'
    );
  }

  if (
    !Array.isArray(
      analysis.usage_summary
    ) ||
    analysis.usage_summary.length !==
      4
  ) {
    throw new Error(
      'Gemini must return exactly four usage_summary items.'
    );
  }

  const expectedTitles = [
    'Human Consumption',
    'Animals',
    'Irrigation',
    'General Cleaning',
  ];

  for (
    let i = 0;
    i < expectedTitles.length;
    i++
  ) {
    const item =
      analysis.usage_summary[i];

    if (
      !item ||
      item.title !==
        expectedTitles[i]
    ) {
      throw new Error(
        `Gemini returned an invalid usage category at index ${i}.`
      );
    }

    if (
      !ALLOWED_STATUSES.includes(
        item.status
      )
    ) {
      throw new Error(
        `Gemini returned an invalid status for ${item.title}.`
      );
    }

    if (
      typeof item.description !==
        'string' ||
      !item.description.trim()
    ) {
      throw new Error(
        `Gemini returned an invalid description for ${item.title}.`
      );
    }
  }

  if (
    typeof analysis.recommendation !==
      'string' ||
    !analysis.recommendation.trim()
  ) {
    throw new Error(
      'Gemini returned an invalid recommendation.'
    );
  }

  return analysis;
}

async function analyzeWaterQuality({
  deviceId,
  ph,
  tds,
  turbidity,
  temperature,
  status,
}) {
  const readings =
    validateInput({
      deviceId,
      ph,
      tds,
      turbidity,
      temperature,
    });

  const normalizedStatus =
    normalizeStatus(status);

  const prompt = `
You are AquaControl AI, a water-quality interpretation assistant.

Your role is to interpret the current water condition and possible uses based strictly on the measurements provided by AquaControl.

Device:
${deviceId}

Current sensor measurements:
- pH: ${
    readings.ph !== null
      ? readings.ph
      : 'Unavailable'
  }
- TDS: ${
    readings.tds !== null
      ? `${readings.tds} ppm`
      : 'Unavailable'
  }
- Turbidity: ${
    readings.turbidity !== null
      ? `${readings.turbidity} NTU`
      : 'Unavailable'
  }
- Temperature: ${
    readings.temperature !== null
      ? `${readings.temperature} °C`
      : 'Unavailable'
  }
- AquaControl turbidity classification: ${normalizedStatus}

AquaControl turbidity classification rules:
- 0 to 199 NTU = CLEAR
- 200 to 299 NTU = CLOUDY
- 300 NTU and above = DIRTY

You must assess exactly these four usage categories, in this exact order:
1. Human Consumption
2. Animals
3. Irrigation
4. General Cleaning

Allowed statuses:
- SUITABLE
- CAUTION
- NOT_RECOMMENDED
- INSUFFICIENT_DATA

CORE INTERPRETATION RULES

1. Use only the supplied measurements:
   - pH
   - TDS
   - turbidity
   - temperature

2. These sensors describe the current physicochemical condition of the water.

3. These sensors do NOT directly detect:
   - bacteria
   - E. coli
   - coliforms
   - viruses
   - parasites
   - pesticides
   - heavy metals
   - specific dissolved chemicals
   - toxins
   - other unmeasured contaminants

4. Never claim that any specific contaminant, microorganism, pathogen, toxin, or chemical has been detected unless it is directly measured. None of those are directly measured here.

5. Never claim:
   - pathogen detected
   - bacteria detected
   - bacterial contamination detected
   - virus detected
   - microbiologically safe
   - laboratory certified
   - safe to drink
   - potable
   solely from these four sensor readings.

6. You may state that a measured parameter is elevated, reduced, abnormal, near neutral, or otherwise notable when supported by the readings.

7. You may state that additional microbiological or chemical testing is needed when the available measurements are insufficient.

8. Respect AquaControl's configured turbidity classification exactly.
Do not override CLEAR, CLOUDY, or DIRTY using a different generic turbidity standard.

9. Do not invent measurements, thresholds, contaminants, causes, diagnoses, or laboratory results.

OVERALL SUMMARY RULES

10. The "summary" must be a polished overall assessment containing approximately 2 to 4 sentences.

11. The summary should be technically accurate but still readable by a non-specialist.

12. Appropriate terminology may include:
   - physicochemical condition
   - dissolved solids
   - turbidity
   - near-neutral pH
   - temperature-compensated measurement
   - measured parameters
   - microbiological safety cannot be established
   - comprehensive chemical safety cannot be established

13. Do not include labels such as:
   - Technical Summary
   - In Simple Terms
   - Layman's Explanation

14. Do not turn the summary into a laboratory report.

15. Briefly explain the meaning of the combined readings rather than merely repeating every numerical value.

SPECIFIC USAGE RULES

16. Each usage_summary description must be written in simple, plain language.

17. Each usage description should usually be 1 to 2 short sentences.

18. Do not use unnecessarily technical terminology in the four individual usage descriptions.

19. Do not repeat the full overall summary in every usage item.

20. Each usage status must be based only on what can reasonably be concluded from the available readings.

HUMAN CONSUMPTION

21. Never use SUITABLE for Human Consumption based only on these four sensors.

22. Human Consumption should normally be:
   - INSUFFICIENT_DATA when the measured values themselves do not clearly indicate rejection but drinking-water safety cannot be established, or
   - NOT_RECOMMENDED when the current measured condition itself provides a reason not to recommend drinking.

23. The Human Consumption description should clearly explain that the sensors cannot confirm drinking-water safety and that microbiological and/or additional chemical testing may still be required.

ANIMALS

24. Do not automatically mark water as SUITABLE for animals simply because the readings appear normal.

25. Consider the current measured water condition while acknowledging that these sensors do not detect every potential hazard.

26. Use CAUTION when the available measurements appear generally acceptable but complete safety cannot be established.

IRRIGATION

27. Assess irrigation using only the available pH, TDS, turbidity, and temperature information.

28. Do not claim suitability for every crop, soil type, or agricultural system.

29. If appropriate, phrase the description as suitable for general irrigation based on the current measured parameters.

GENERAL CLEANING

30. Assess this as non-potable general cleaning.

31. Do not imply that suitability for cleaning means suitability for drinking, food preparation, medical use, or sterilization.

OVERALL STATUS

32. overall_status should represent the overall practical interpretation across all four usage categories.

33. Do not automatically make overall_status SUITABLE simply because irrigation or cleaning is suitable.

34. If drinking-water safety cannot be established but other non-potable uses appear reasonable, CAUTION will often be the appropriate overall status.

RECOMMENDATION

35. The recommendation must be concise, approximately 1 to 2 sentences.

36. Recommend practical next steps such as:
   - continued monitoring
   - checking for significant sensor changes
   - additional laboratory testing for sensitive uses
   - avoiding human consumption when measurements indicate poor water condition

37. Do not provide medical advice.

38. Do not claim regulatory certification or compliance.

OUTPUT RULES

39. Return exactly four usage_summary items.

40. The titles must be exactly:
   - Human Consumption
   - Animals
   - Irrigation
   - General Cleaning

41. Keep them in that exact order.

42. Do not use Markdown.

43. Return only the JSON structure defined by the response schema.
`;

  const response =
    await ai.models.generateContent({
      model:
        'gemini-3.1-flash-lite-preview',

      contents:
        prompt,

      config: {
        responseMimeType:
          'application/json',

        responseSchema:
          usageSchema,

        temperature:
          0.15,

        maxOutputTokens:
          900,
      },
    });

  if (
    !response.text
  ) {
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(
        response.text
      );
  } catch (error) {
    console.error(
      'Failed to parse Gemini response:',
      response.text
    );

    throw new Error(
      'Gemini returned invalid JSON.'
    );
  }

  return validateAnalysisResult(
    parsed
  );
}

module.exports = {
  analyzeWaterQuality,
};
const {
  DEFAULT_THRESHOLDS,
  getThresholdsByDeviceCode,
  saveThresholds,
} = require('../services/threshold.service');

function isFiniteNumber(
  value
) {
  return Number.isFinite(
    Number(value)
  );
}

function validateThresholds(
  thresholds
) {
  if (!thresholds) {
    return 'Threshold configuration is required.';
  }

  const {
    ph,
    tds,
    turbidity,
    temperature,
  } = thresholds;

  if (
    !ph ||
    !tds ||
    !turbidity ||
    !temperature
  ) {
    return 'All sensor threshold groups are required.';
  }

  const values = [
    ph.normalMin,
    ph.normalMax,
    ph.criticalMin,
    ph.criticalMax,

    tds.caution,
    tds.critical,

    turbidity.caution,
    turbidity.critical,

    temperature.caution,
    temperature.critical,
  ];

  if (
    values.some(
      (value) =>
        !isFiniteNumber(value)
    )
  ) {
    return 'All threshold values must be valid numbers.';
  }

  if (
    !(
      Number(ph.criticalMin) <
        Number(ph.normalMin) &&
      Number(ph.normalMin) <
        Number(ph.normalMax) &&
      Number(ph.normalMax) <
        Number(ph.criticalMax)
    )
  ) {
    return (
      'pH thresholds must follow: ' +
      'criticalMin < normalMin < normalMax < criticalMax.'
    );
  }

  if (
    Number(tds.caution) >=
    Number(tds.critical)
  ) {
    return (
      'TDS caution threshold must be lower ' +
      'than the critical threshold.'
    );
  }

  if (
    Number(
      turbidity.caution
    ) >=
    Number(
      turbidity.critical
    )
  ) {
    return (
      'Turbidity caution threshold must be lower ' +
      'than the critical threshold.'
    );
  }

  if (
    Number(
      temperature.caution
    ) >=
    Number(
      temperature.critical
    )
  ) {
    return (
      'Temperature caution threshold must be lower ' +
      'than the critical threshold.'
    );
  }

  return null;
}

async function getThresholds(
  req,
  res
) {
  try {
    const {
      deviceId,
    } = req.params;

    const result =
      await getThresholdsByDeviceCode(
        deviceId
      );

    if (!result) {
      return res
        .status(404)
        .json({
          message:
            'Device not registered.',
        });
    }

    return res.json({
      deviceId,

      thresholds:
        result.thresholds,
    });
  } catch (error) {
    console.error(
      'getThresholds error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Internal server error.',
      });
  }
}

async function updateThresholds(
  req,
  res
) {
  try {
    const {
      deviceId,
    } = req.params;

    const thresholds =
      req.body?.thresholds ??
      req.body;

    const validationError =
      validateThresholds(
        thresholds
      );

    if (validationError) {
      return res
        .status(400)
        .json({
          message:
            validationError,
        });
    }

    const result =
      await getThresholdsByDeviceCode(
        deviceId
      );

    if (!result) {
      return res
        .status(404)
        .json({
          message:
            'Device not registered.',
        });
    }

    const normalized = {
      ph: {
        normalMin: Number(
          thresholds.ph.normalMin
        ),

        normalMax: Number(
          thresholds.ph.normalMax
        ),

        criticalMin: Number(
          thresholds.ph
            .criticalMin
        ),

        criticalMax: Number(
          thresholds.ph
            .criticalMax
        ),
      },

      tds: {
        caution: Number(
          thresholds.tds.caution
        ),

        critical: Number(
          thresholds.tds
            .critical
        ),
      },

      turbidity: {
        caution: Number(
          thresholds.turbidity
            .caution
        ),

        critical: Number(
          thresholds.turbidity
            .critical
        ),
      },

      temperature: {
        caution: Number(
          thresholds.temperature
            .caution
        ),

        critical: Number(
          thresholds.temperature
            .critical
        ),
      },
    };

    await saveThresholds(
      result.deviceId,
      normalized
    );

    return res.json({
      message:
        'Alert thresholds updated successfully.',

      deviceId,

      thresholds:
        normalized,
    });
  } catch (error) {
    console.error(
      'updateThresholds error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Internal server error.',
      });
  }
}

async function restoreDefaultThresholds(
  req,
  res
) {
  try {
    const {
      deviceId,
    } = req.params;

    const result =
      await getThresholdsByDeviceCode(
        deviceId
      );

    if (!result) {
      return res
        .status(404)
        .json({
          message:
            'Device not registered.',
        });
    }

    await saveThresholds(
      result.deviceId,
      DEFAULT_THRESHOLDS
    );

    return res.json({
      message:
        'Default AquaControl thresholds restored.',

      deviceId,

      thresholds:
        DEFAULT_THRESHOLDS,
    });
  } catch (error) {
    console.error(
      'restoreDefaultThresholds error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Internal server error.',
      });
  }
}

module.exports = {
  getThresholds,
  updateThresholds,
  restoreDefaultThresholds,
};
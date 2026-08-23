const SEVERITY = {
  NORMAL: 'NORMAL',
  CAUTION: 'CAUTION',
  CRITICAL: 'CRITICAL',
};

function evaluateWaterAlert({
  ph,
  tds,
  turbidity,
  temperature,
}) {
  const reasons = [];

  let severity =
    SEVERITY.NORMAL;

  const escalate = (
    newSeverity,
    reason
  ) => {
    reasons.push(reason);

    if (
      newSeverity ===
      SEVERITY.CRITICAL
    ) {
      severity =
        SEVERITY.CRITICAL;

      return;
    }

    if (
      newSeverity ===
        SEVERITY.CAUTION &&
      severity ===
        SEVERITY.NORMAL
    ) {
      severity =
        SEVERITY.CAUTION;
    }
  };

  // =====================================
  // pH
  // =====================================

  if (
    ph !== null &&
    ph !== undefined
  ) {
    const value =
      Number(ph);

    if (
      value < 6.0 ||
      value > 9.0
    ) {
      escalate(
        SEVERITY.CRITICAL,
        `pH is outside the critical AquaControl range (${value.toFixed(2)}).`
      );
    }

    else if (
      value < 6.5 ||
      value > 8.5
    ) {
      escalate(
        SEVERITY.CAUTION,
        `pH is outside the preferred AquaControl range (${value.toFixed(2)}).`
      );
    }
  }

  // =====================================
  // TDS
  // =====================================

  if (
    tds !== null &&
    tds !== undefined
  ) {
    const value =
      Number(tds);

    if (
      value > 800
    ) {
      escalate(
        SEVERITY.CRITICAL,
        `TDS is elevated (${value.toFixed(0)} ppm).`
      );
    }

    else if (
      value > 500
    ) {
      escalate(
        SEVERITY.CAUTION,
        `TDS is above the AquaControl preferred level (${value.toFixed(0)} ppm).`
      );
    }
  }

  // =====================================
  // TURBIDITY
  // =====================================

  if (
    turbidity !== null &&
    turbidity !== undefined
  ) {
    const value =
      Number(turbidity);

    if (
      value >= 300
    ) {
      escalate(
        SEVERITY.CRITICAL,
        `Turbidity is classified as DIRTY (${value.toFixed(0)} NTU).`
      );
    }

    else if (
      value >= 200
    ) {
      escalate(
        SEVERITY.CAUTION,
        `Turbidity is classified as CLOUDY (${value.toFixed(0)} NTU).`
      );
    }
  }

  // =====================================
  // TEMPERATURE
  // =====================================

  if (
    temperature !== null &&
    temperature !== undefined
  ) {
    const value =
      Number(temperature);

    if (
      value > 45
    ) {
      escalate(
        SEVERITY.CRITICAL,
        `Water temperature is unusually high (${value.toFixed(1)} °C).`
      );
    }

    else if (
      value > 35
    ) {
      escalate(
        SEVERITY.CAUTION,
        `Water temperature is elevated (${value.toFixed(1)} °C).`
      );
    }
  }

  return {
    active:
      severity !==
      SEVERITY.NORMAL,

    severity,

    reasons,

    reason:
      reasons.length > 0
        ? reasons.join(' ')
        : 'Current readings are within AquaControl operational thresholds.',
  };
}

module.exports = {
  evaluateWaterAlert,
  SEVERITY,
};
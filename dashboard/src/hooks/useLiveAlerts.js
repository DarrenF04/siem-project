import { useState, useEffect, useRef } from "react";

/**
 * Gentle Web Audio oscillator beep for live security alerts.
 * Non-blocking, wrapped in try-catch; fails silently if autoplay is restricted.
 */
function playAlertBeep(isCritical = false) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    // Higher frequency for Critical, warm tone for High
    osc.frequency.setValueAtTime(isCritical ? 880 : 587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Autoplay restrictions or headless environment — ignore silently
  }
}

/**
 * Custom hook to monitor incidents for live attacks and risk escalations.
 *
 * Rules:
 * 1. Initial Load: Silently establishes current incident state as baseline (0 alerts for historical data).
 * 2. Subsequent Polls:
 *    - Completely NEW incident -> triggers live alert.
 *    - Existing incident risk score increases (e.g. 40 -> 60 -> 90) -> triggers escalation alert.
 *    - Existing incident severity or attack type changes -> triggers escalation alert.
 * 3. Prevents duplicate alerts via stable change key: `id-attack_type-risk_score-severity`.
 * 4. Dismiss action removes alert from dashboard view without modifying database/status.
 */
export function useLiveAlerts(incidents = [], initialLoading = false) {
  const [alerts, setAlerts] = useState([]);
  const isBaselineSetRef = useRef(false);
  const knownIncidentsRef = useRef(new Map());
  const seenAlertKeysRef = useRef(new Set());

  useEffect(() => {
    // Wait until the first API fetch completes
    if (initialLoading) return;
    if (!incidents) return;

    // 1. INITIAL BASELINE ESTABLISHMENT
    // Record all existing incidents silently so historical data never triggers alerts on load/refresh.
    if (!isBaselineSetRef.current) {
      incidents.forEach((inc) => {
        knownIncidentsRef.current.set(inc.id, {
          risk_score: inc.risk_score ?? 0,
          severity: inc.severity || "INFO",
          attack_type: inc.attack_type || "UNKNOWN",
        });

        const initialKey = `${inc.id}-${inc.attack_type || "UNKNOWN"}-${inc.risk_score ?? 0}-${inc.severity || "INFO"}`;
        seenAlertKeysRef.current.add(initialKey);
      });
      isBaselineSetRef.current = true;
      return;
    }

    // 2. SUBSEQUENT POLLS: Detect NEW incidents or STATE/RISK ESCALATIONS
    const newAlertsToAdd = [];
    let hasCritical = false;

    incidents.forEach((inc) => {
      const incidentId = inc.id;
      const attackType = inc.attack_type || "UNKNOWN";
      const riskScore = inc.risk_score ?? 0;
      const severity = inc.severity || "INFO";
      const alertKey = `${incidentId}-${attackType}-${riskScore}-${severity}`;

      // Prevent duplicate notifications for the exact same state
      if (seenAlertKeysRef.current.has(alertKey)) {
        return;
      }

      const prev = knownIncidentsRef.current.get(incidentId);

      if (!prev) {
        // CASE A: Brand NEW Incident detected!
        seenAlertKeysRef.current.add(alertKey);
        knownIncidentsRef.current.set(incidentId, {
          risk_score: riskScore,
          severity: severity,
          attack_type: attackType,
        });

        if (severity === "CRITICAL" || riskScore >= 80) {
          hasCritical = true;
        }

        newAlertsToAdd.push({
          id: alertKey,
          incidentId,
          attackType,
          sourceIp: inc.source_ip,
          country: inc.country,
          latitude: inc.latitude,
          longitude: inc.longitude,
          riskScore,
          severity,
          timestamp: inc.updated_at || inc.created_at || inc.timestamp || new Date().toISOString(),
          isEscalation: false,
          incident: inc,
          createdAt: new Date(),
        });
      } else {
        // CASE B / C: Existing incident state changed (risk escalated, attack re-classified, or severity increased)
        const riskChanged = riskScore !== prev.risk_score;
        const sevChanged = severity !== prev.severity;
        const attackChanged = attackType !== prev.attack_type;

        if (riskChanged || sevChanged || attackChanged) {
          seenAlertKeysRef.current.add(alertKey);
          knownIncidentsRef.current.set(incidentId, {
            risk_score: riskScore,
            severity: severity,
            attack_type: attackType,
          });

          if (severity === "CRITICAL" || riskScore >= 80) {
            hasCritical = true;
          }

          newAlertsToAdd.push({
            id: alertKey,
            incidentId,
            attackType,
            sourceIp: inc.source_ip,
            country: inc.country,
            latitude: inc.latitude,
            longitude: inc.longitude,
            riskScore,
            severity,
            timestamp: inc.updated_at || inc.created_at || inc.timestamp || new Date().toISOString(),
            isEscalation: true,
            prevRiskScore: prev.risk_score,
            prevAttackType: prev.attack_type,
            incident: inc,
            createdAt: new Date(),
          });
        }
      }
    });

    if (newAlertsToAdd.length > 0) {
      playAlertBeep(hasCritical);

      setAlerts((prevAlerts) => {
        const updated = [...prevAlerts];

        newAlertsToAdd.forEach((newAlert) => {
          // If there's an existing un-dismissed alert for this same incident, replace it with the escalated one at top
          const existingIdx = updated.findIndex((a) => a.incidentId === newAlert.incidentId);
          if (existingIdx !== -1) {
            updated.splice(existingIdx, 1);
          }
          updated.unshift(newAlert);
        });

        // Cap queue to 5 alerts to keep dashboard cleanly readable
        return updated.slice(0, 5);
      });
    }
  }, [incidents, initialLoading]);

  const dismissAlert = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const dismissAllAlerts = () => {
    setAlerts([]);
  };

  return {
    alerts,
    dismissAlert,
    dismissAllAlerts,
  };
}

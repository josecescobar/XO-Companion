import { Injectable } from '@nestjs/common';

@Injectable()
export class SummaryService {
  summarizeDailyLog(log: any): string {
    const parts: string[] = [];
    const dateStr = new Date(log.logDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    parts.push(
      `Daily Log for ${dateStr}. Report #${log.reportNumber ?? 'N/A'}. Status: ${log.status}.`,
    );

    if (log.notes) {
      parts.push(`Notes: ${log.notes}`);
    }

    // Weather
    if (log.weather) {
      const w = log.weather;
      let text = `Weather: ${w.conditions?.join(', ') || 'not recorded'}.`;
      if (w.tempHigh != null || w.tempLow != null) {
        text += ` Temperature ${w.tempLow ?? '?'}°F to ${w.tempHigh ?? '?'}°F.`;
      }
      if (w.windSpeed != null) text += ` Wind ${w.windSpeed} mph.`;
      if (w.precipitation) text += ` Precipitation: ${w.precipitation}.`;
      if (w.delayMinutes > 0) text += ` Weather delay: ${w.delayMinutes} minutes.`;
      parts.push(text);
    }

    // Workforce
    if (log.workforce?.length > 0) {
      const totalWorkers = log.workforce.reduce(
        (s: number, w: any) => s + w.workerCount,
        0,
      );
      const totalHours = log.workforce.reduce(
        (s: number, w: any) => s + w.workerCount * w.hoursWorked,
        0,
      );
      parts.push(
        `Workforce: ${totalWorkers} workers on site, ${totalHours} total man-hours.`,
      );
      for (const wf of log.workforce) {
        let entry = `${wf.workerCount} ${wf.trade} from ${wf.company}, ${wf.hoursWorked}hrs`;
        if (wf.overtimeHours > 0) entry += ` (${wf.overtimeHours}hrs OT)`;
        if (wf.foreman) entry += `, foreman: ${wf.foreman}`;
        parts.push(`  - ${entry}.`);
      }
    }

    // Equipment
    if (log.equipment?.length > 0) {
      parts.push(`Equipment on site:`);
      for (const eq of log.equipment) {
        parts.push(
          `  - ${eq.equipmentType}: ${eq.operatingHours}hrs operating, ${eq.idleHours}hrs idle. Condition: ${eq.condition}.`,
        );
      }
    }

    // Work Completed
    if (log.workCompleted?.length > 0) {
      parts.push(`Work completed:`);
      for (const wc of log.workCompleted) {
        let entry = `${wc.description} at ${wc.location}`;
        if (wc.csiCode) entry += ` (CSI ${wc.csiCode})`;
        if (wc.percentComplete != null) entry += `, ${wc.percentComplete}% complete`;
        if (wc.quantity != null && wc.unit) entry += `, ${wc.quantity} ${wc.unit}`;
        parts.push(`  - ${entry}.`);
      }
    }

    // Materials
    if (log.materials?.length > 0) {
      parts.push(`Materials delivered:`);
      for (const mat of log.materials) {
        let entry = mat.material;
        if (mat.quantity != null) entry += `, qty: ${mat.quantity}`;
        if (mat.unit) entry += ` ${mat.unit}`;
        if (mat.supplier) entry += ` from ${mat.supplier}`;
        if (mat.condition && mat.condition !== 'GOOD') entry += ` (${mat.condition})`;
        parts.push(`  - ${entry}.`);
      }
    }

    // Safety
    if (log.safety) {
      const s = log.safety;
      let text = `Safety:`;
      if (s.toolboxTalks?.length > 0)
        text += ` Toolbox talks: ${s.toolboxTalks.join(', ')}.`;
      if (s.inspections?.length > 0)
        text += ` Inspections: ${s.inspections.join(', ')}.`;
      if (s.incidents?.length > 0)
        text += ` Incidents: ${s.incidents.join(', ')}.`;
      if (s.oshaRecordable) text += ' OSHA recordable incident.';
      if (s.nearMisses > 0) text += ` ${s.nearMisses} near miss(es).`;
      parts.push(text);
    }

    // Delays
    if (log.delays?.length > 0) {
      parts.push(`Delays:`);
      for (const d of log.delays) {
        let entry = `${d.cause}: ${d.description}, ${d.durationMinutes} minutes`;
        if (d.impactedTrades?.length > 0)
          entry += `. Impacted: ${d.impactedTrades.join(', ')}`;
        parts.push(`  - ${entry}.`);
      }
    }

    return parts.join('\n');
  }

  summarizeVoiceTranscript(voiceNote: any, logDate: Date): string {
    const dateStr = new Date(logDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `Voice note transcript from ${dateStr}:\n${voiceNote.transcript}`;
  }
}

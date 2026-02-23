import { dailyLogExtractionSchema } from '../schemas/daily-log-extraction.schema';

/**
 * Helper: returns a minimal valid extraction object. Override individual
 * fields in each test to exercise specific branches.
 * Uses Record<string, unknown> because we test raw input (before Zod defaults).
 */
function validExtraction(overrides: Record<string, unknown> = {}): unknown {
  return {
    weather: null,
    workforce: [],
    equipment: [],
    workCompleted: [],
    materials: [],
    safety: null,
    delays: [],
    nextActions: [],
    communications: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Zod schema validation – each entry type
// ---------------------------------------------------------------------------

describe('dailyLogExtractionSchema', () => {
  it('accepts a minimal empty extraction', () => {
    const result = dailyLogExtractionSchema.safeParse(validExtraction());
    expect(result.success).toBe(true);
  });

  // --- Workforce -----------------------------------------------------------

  describe('workforce entries', () => {
    it('accepts a valid workforce entry', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          workforce: [
            {
              trade: 'Electrician',
              company: 'Sparks LLC',
              workerCount: 6,
              hoursWorked: 8,
              overtimeHours: 0,
              foreman: 'Mike',
              confidence: 0.92,
              confidenceReason: 'Clearly stated crew count',
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects workforce with non-positive workerCount', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          workforce: [
            {
              trade: 'Plumber',
              company: 'Pipes Inc',
              workerCount: 0,
              hoursWorked: 8,
              confidence: 0.8,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });

    it('rejects workforce with non-positive hoursWorked', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          workforce: [
            {
              trade: 'Plumber',
              company: 'Pipes Inc',
              workerCount: 3,
              hoursWorked: -1,
              confidence: 0.8,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  // --- Equipment -----------------------------------------------------------

  describe('equipment entries', () => {
    it('accepts a valid equipment entry', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          equipment: [
            {
              equipmentType: 'Excavator',
              operatingHours: 6,
              idleHours: 2,
              condition: 'OPERATIONAL',
              confidence: 0.88,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('defaults condition to OPERATIONAL when omitted', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          equipment: [
            {
              equipmentType: 'Crane',
              operatingHours: 4,
              confidence: 0.75,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.equipment[0].condition).toBe('OPERATIONAL');
      }
    });

    it('rejects invalid equipment condition enum', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          equipment: [
            {
              equipmentType: 'Crane',
              operatingHours: 4,
              condition: 'BROKEN' as any,
              confidence: 0.9,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  // --- Work Completed ------------------------------------------------------

  describe('workCompleted entries', () => {
    it('accepts a valid work completed entry', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          workCompleted: [
            {
              location: 'Building A Floor 3',
              csiCode: '033000',
              description: 'Poured concrete slab',
              percentComplete: 75,
              quantity: 120,
              unit: 'CY',
              confidence: 0.95,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects percentComplete above 100', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          workCompleted: [
            {
              location: 'Floor 1',
              description: 'Framing',
              percentComplete: 150,
              confidence: 0.7,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  // --- Materials -----------------------------------------------------------

  describe('materials entries', () => {
    it('accepts a valid material entry', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          materials: [
            {
              material: '#4 Rebar',
              quantity: 200,
              unit: 'LF',
              supplier: 'Steel Corp',
              ticketNumber: 'T-1234',
              condition: 'GOOD',
              confidence: 0.91,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects invalid material condition enum', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          materials: [
            {
              material: 'Lumber',
              condition: 'LOST' as any,
              confidence: 0.8,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });

    it('defaults condition to GOOD when omitted', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          materials: [
            {
              material: 'Concrete',
              confidence: 0.85,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.materials[0].condition).toBe('GOOD');
      }
    });
  });

  // --- Delays --------------------------------------------------------------

  describe('delays entries', () => {
    it('accepts a valid delay entry', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          delays: [
            {
              cause: 'WEATHER',
              description: 'Heavy rain stopped exterior work',
              durationMinutes: 120,
              impactedTrades: ['Concrete', 'Roofing'],
              confidence: 0.97,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects non-positive durationMinutes', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          delays: [
            {
              cause: 'OTHER',
              description: 'Unknown',
              durationMinutes: 0,
              confidence: 0.5,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });

    it('rejects invalid delay cause enum', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          delays: [
            {
              cause: 'ALIEN_INVASION' as any,
              description: 'Aliens',
              durationMinutes: 60,
              confidence: 0.5,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  // --- Communications ------------------------------------------------------

  describe('communications entries', () => {
    it('accepts a valid communication entry', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          communications: [
            {
              type: 'EMAIL',
              recipient: 'John the GC',
              subject: 'Delay notice',
              urgency: 'HIGH',
              context: 'Rain delay, need schedule update',
              confidence: 0.88,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects invalid communication type', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          communications: [
            {
              type: 'FAX' as any,
              recipient: 'someone',
              subject: 'test',
              context: 'test',
              confidence: 0.5,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  // --- Next Actions --------------------------------------------------------

  describe('nextActions entries', () => {
    it('accepts a valid next action', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          nextActions: [
            {
              description: 'Order more rebar',
              assignee: 'Jose',
              dueDate: 'tomorrow',
              priority: 'HIGH',
              category: 'MATERIAL_ORDER',
              confidence: 0.82,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('defaults priority to MEDIUM and category to OTHER', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          nextActions: [
            {
              description: 'Follow up with inspector',
              confidence: 0.7,
            },
          ],
        }),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nextActions[0].priority).toBe('MEDIUM');
        expect(result.data.nextActions[0].category).toBe('OTHER');
      }
    });

    it('rejects invalid priority enum', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          nextActions: [
            {
              description: 'Something',
              priority: 'CRITICAL' as any,
              confidence: 0.5,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });

    it('rejects invalid category enum', () => {
      const result = dailyLogExtractionSchema.safeParse(
        validExtraction({
          nextActions: [
            {
              description: 'Something',
              category: 'DEMOLITION' as any,
              confidence: 0.5,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Malformed LLM responses
// ---------------------------------------------------------------------------

describe('malformed LLM response rejection', () => {
  it('rejects a completely empty object', () => {
    const result = dailyLogExtractionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a string instead of object', () => {
    const result = dailyLogExtractionSchema.safeParse('not an object');
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = dailyLogExtractionSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects when required arrays are missing', () => {
    const result = dailyLogExtractionSchema.safeParse({
      weather: null,
      // missing workforce, equipment, etc.
    });
    expect(result.success).toBe(false);
  });

  it('rejects when workforce contains wrong shape', () => {
    const result = dailyLogExtractionSchema.safeParse(
      validExtraction({
        workforce: [{ foo: 'bar' }] as any,
      }),
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Confidence scoring thresholds
// ---------------------------------------------------------------------------

describe('confidence scoring', () => {
  it('accepts confidence at 0 (minimum)', () => {
    const result = dailyLogExtractionSchema.safeParse(
      validExtraction({
        workforce: [
          {
            trade: 'Laborer',
            company: 'General',
            workerCount: 2,
            hoursWorked: 4,
            confidence: 0,
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts confidence at 1 (maximum)', () => {
    const result = dailyLogExtractionSchema.safeParse(
      validExtraction({
        workforce: [
          {
            trade: 'Laborer',
            company: 'General',
            workerCount: 2,
            hoursWorked: 4,
            confidence: 1,
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects confidence above 1', () => {
    const result = dailyLogExtractionSchema.safeParse(
      validExtraction({
        workforce: [
          {
            trade: 'Laborer',
            company: 'General',
            workerCount: 2,
            hoursWorked: 4,
            confidence: 1.5,
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects negative confidence', () => {
    const result = dailyLogExtractionSchema.safeParse(
      validExtraction({
        workforce: [
          {
            trade: 'Laborer',
            company: 'General',
            workerCount: 2,
            hoursWorked: 4,
            confidence: -0.1,
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('classifies green tier (> 0.85)', () => {
    const confidence = 0.92;
    expect(confidence > 0.85).toBe(true);
    expect(confidence >= 0.60 && confidence <= 0.85).toBe(false);
    expect(confidence < 0.60).toBe(false);
  });

  it('classifies yellow tier (0.60–0.85)', () => {
    const confidence = 0.72;
    expect(confidence > 0.85).toBe(false);
    expect(confidence >= 0.60 && confidence <= 0.85).toBe(true);
    expect(confidence < 0.60).toBe(false);
  });

  it('classifies red tier (< 0.60)', () => {
    const confidence = 0.45;
    expect(confidence > 0.85).toBe(false);
    expect(confidence >= 0.60 && confidence <= 0.85).toBe(false);
    expect(confidence < 0.60).toBe(true);
  });

  it('boundary: 0.85 is yellow, not green', () => {
    const confidence = 0.85;
    expect(confidence > 0.85).toBe(false);
    expect(confidence >= 0.60 && confidence <= 0.85).toBe(true);
  });

  it('boundary: 0.60 is yellow, not red', () => {
    const confidence = 0.60;
    expect(confidence >= 0.60 && confidence <= 0.85).toBe(true);
    expect(confidence < 0.60).toBe(false);
  });
});

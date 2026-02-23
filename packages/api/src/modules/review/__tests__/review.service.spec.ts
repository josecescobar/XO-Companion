import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReviewAction, RejectionCode } from '@prisma/client';
import { ReviewService } from '../review.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplianceService } from '../../compliance/compliance.service';

// ---------------------------------------------------------------------------
// ENTITY_TABLE_MAP must resolve to real PrismaClient delegate names.
// Copied here so the test stays in sync with the source.
// ---------------------------------------------------------------------------

const ENTITY_TABLE_MAP: Record<string, string> = {
  weather: 'weatherEntry',
  workforce: 'workforceEntry',
  equipment: 'equipmentEntry',
  workCompleted: 'workCompletedEntry',
  material: 'materialEntry',
  safety: 'safetyEntry',
  delay: 'delayEntry',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOG_ID = '00000000-0000-0000-0000-000000000001';
const PROJECT_ID = '00000000-0000-0000-0000-000000000002';
const REVIEWER_ID = '00000000-0000-0000-0000-000000000003';
const ENTITY_ID = '00000000-0000-0000-0000-000000000010';

function makeEntry(overrides: Record<string, any> = {}) {
  return {
    id: ENTITY_ID,
    dailyLogId: LOG_ID,
    aiConfidence: 0.82,
    aiConfidenceReason: 'test',
    reviewStatus: 'PENDING_REVIEW',
    aiGenerated: true,
    ...overrides,
  };
}

function makeMockDelegate(entries: any[] = [makeEntry()]) {
  return {
    findUnique: jest.fn(({ where }: any) =>
      Promise.resolve(entries.find((e) => e.id === where.id) ?? null),
    ),
    findMany: jest.fn(() => Promise.resolve(entries)),
    update: jest.fn(({ where, data }: any) =>
      Promise.resolve({ ...entries.find((e) => e.id === where.id), ...data }),
    ),
  };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: Record<string, any>;
  let complianceService: { handleSafetyEntryApproved: jest.Mock };

  beforeEach(async () => {
    const defaultDelegate = makeMockDelegate();

    prisma = {
      dailyLog: {
        findFirst: jest.fn(() => Promise.resolve({ id: LOG_ID, projectId: PROJECT_ID })),
        findMany: jest.fn(() => Promise.resolve([{ id: LOG_ID }])),
      },
      weatherEntry: {
        ...makeMockDelegate([]),
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
      safetyEntry: {
        ...makeMockDelegate([]),
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
      workforceEntry: defaultDelegate,
      equipmentEntry: makeMockDelegate([]),
      workCompletedEntry: makeMockDelegate([]),
      materialEntry: makeMockDelegate([]),
      delayEntry: makeMockDelegate([]),
      reviewEntry: {
        create: jest.fn(({ data }: any) =>
          Promise.resolve({
            id: 'review-1',
            ...data,
            reviewer: { id: REVIEWER_ID, firstName: 'Test', lastName: 'User', role: 'FOREMAN' },
          }),
        ),
        findMany: jest.fn(() => Promise.resolve([])),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    complianceService = {
      handleSafetyEntryApproved: jest.fn(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AI_CONFIDENCE_THRESHOLD') return '0.85';
              return undefined;
            }),
          },
        },
        { provide: ComplianceService, useValue: complianceService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  // -------------------------------------------------------------------------
  // ENTITY_TABLE_MAP validation
  // -------------------------------------------------------------------------

  describe('ENTITY_TABLE_MAP', () => {
    it('maps every entity type to a valid PrismaService delegate', () => {
      for (const [entityType, delegateName] of Object.entries(ENTITY_TABLE_MAP)) {
        expect(prisma[delegateName]).toBeDefined();
        expect(typeof prisma[delegateName].findUnique).toBe('function');
        expect(typeof prisma[delegateName].findMany).toBe('function');
        expect(typeof prisma[delegateName].update).toBe('function');
      }
    });

    it('contains all 7 expected entity types', () => {
      const expected = ['weather', 'workforce', 'equipment', 'workCompleted', 'material', 'safety', 'delay'];
      expect(Object.keys(ENTITY_TABLE_MAP).sort()).toEqual(expected.sort());
    });
  });

  // -------------------------------------------------------------------------
  // Invalid / unmapped table name
  // -------------------------------------------------------------------------

  describe('invalid entity type handling', () => {
    it('throws BadRequestException for unmapped entity type', async () => {
      await expect(
        service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
          entityId: ENTITY_ID,
          entityType: 'nonexistent',
          action: ReviewAction.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('error message includes the invalid entity type name', async () => {
      await expect(
        service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
          entityId: ENTITY_ID,
          entityType: 'foobar',
          action: ReviewAction.APPROVED,
        }),
      ).rejects.toThrow(/foobar/);
    });
  });

  // -------------------------------------------------------------------------
  // Single entry approval
  // -------------------------------------------------------------------------

  describe('submitReview – APPROVED', () => {
    it('approves an entry and sets confidence to 1.0', async () => {
      const result = await service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entityId: ENTITY_ID,
        entityType: 'workforce',
        action: ReviewAction.APPROVED,
      });

      expect(prisma.workforceEntry.update).toHaveBeenCalledWith({
        where: { id: ENTITY_ID },
        data: { aiConfidence: 1.0, reviewStatus: 'APPROVED' },
      });
      expect(result.action).toBe('APPROVED');
      expect(result.entityType).toBe('workforce');
    });

    it('records previousValue and newValue in the review entry', async () => {
      await service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entityId: ENTITY_ID,
        entityType: 'workforce',
        action: ReviewAction.APPROVED,
      });

      const createCall = prisma.reviewEntry.create.mock.calls[0][0].data;
      expect(createCall.previousValue).toEqual({
        aiConfidence: 0.82,
        reviewStatus: 'PENDING_REVIEW',
      });
      expect(createCall.newValue).toEqual({
        aiConfidence: 1.0,
        reviewStatus: 'APPROVED',
      });
    });

    it('triggers compliance hook when safety entry is approved', async () => {
      prisma.safetyEntry = makeMockDelegate();

      await service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entityId: ENTITY_ID,
        entityType: 'safety',
        action: ReviewAction.APPROVED,
      });

      expect(complianceService.handleSafetyEntryApproved).toHaveBeenCalledWith(ENTITY_ID);
    });
  });

  // -------------------------------------------------------------------------
  // Rejection with reason codes
  // -------------------------------------------------------------------------

  describe('submitReview – REJECTED', () => {
    it('rejects an entry with a structured reason code', async () => {
      const result = await service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entityId: ENTITY_ID,
        entityType: 'workforce',
        action: ReviewAction.REJECTED,
        reasonCode: RejectionCode.WRONG_COUNT,
        comment: 'Only 4 workers, not 6',
      });

      expect(prisma.workforceEntry.update).toHaveBeenCalledWith({
        where: { id: ENTITY_ID },
        data: { reviewStatus: 'REJECTED' },
      });
      expect(result.reasonCode).toBe('WRONG_COUNT');
      expect(result.comment).toBe('Only 4 workers, not 6');
    });

    it('sets reviewStatus to REJECTED', async () => {
      await service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entityId: ENTITY_ID,
        entityType: 'workforce',
        action: ReviewAction.REJECTED,
      });

      const createCall = prisma.reviewEntry.create.mock.calls[0][0].data;
      expect(createCall.newValue).toEqual({ reviewStatus: 'REJECTED' });
    });
  });

  // -------------------------------------------------------------------------
  // Field-level modification with previousValue/newValue tracking
  // -------------------------------------------------------------------------

  describe('submitReview – MODIFIED', () => {
    it('updates specific fields and tracks previous values', async () => {
      const entry = makeEntry({ workerCount: 6, trade: 'Electrician' });
      prisma.workforceEntry = makeMockDelegate([entry]);

      await service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entityId: ENTITY_ID,
        entityType: 'workforce',
        action: ReviewAction.MODIFIED,
        fieldName: 'workerCount',
        newValue: { workerCount: 4 },
      });

      // Should update the specific field + set approved
      expect(prisma.workforceEntry.update).toHaveBeenCalledWith({
        where: { id: ENTITY_ID },
        data: { workerCount: 4, aiConfidence: 1.0, reviewStatus: 'APPROVED' },
      });

      // previousValue should capture original field values
      const createCall = prisma.reviewEntry.create.mock.calls[0][0].data;
      expect(createCall.previousValue.workerCount).toBe(6);
      expect(createCall.previousValue.reviewStatus).toBe('PENDING_REVIEW');
      expect(createCall.newValue.workerCount).toBe(4);
      expect(createCall.newValue.reviewStatus).toBe('APPROVED');
    });

    it('throws when newValue is empty for MODIFIED action', async () => {
      await expect(
        service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
          entityId: ENTITY_ID,
          entityType: 'workforce',
          action: ReviewAction.MODIFIED,
          newValue: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when newValue is undefined for MODIFIED action', async () => {
      await expect(
        service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
          entityId: ENTITY_ID,
          entityType: 'workforce',
          action: ReviewAction.MODIFIED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // Batch approval
  // -------------------------------------------------------------------------

  describe('batchApprove', () => {
    it('approves multiple entries by explicit IDs', async () => {
      const entry1 = makeEntry({ id: 'e1' });
      const entry2 = makeEntry({ id: 'e2' });
      prisma.workforceEntry = makeMockDelegate([entry1, entry2]);

      const result = await service.batchApprove(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entryIds: [
          { entityType: 'workforce', entityId: 'e1' },
          { entityType: 'workforce', entityId: 'e2' },
        ],
      });

      expect(result.approved).toBe(2);
      expect(result.reviewEntries).toHaveLength(2);
    });

    it('returns zero when no entries match', async () => {
      const result = await service.batchApprove(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entryIds: [],
      });

      expect(result.approved).toBe(0);
      expect(result.reviewEntries).toEqual([]);
    });

    it('skips entries with unknown entity types', async () => {
      const result = await service.batchApprove(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entryIds: [
          { entityType: 'nonexistent', entityId: ENTITY_ID },
        ],
      });

      expect(result.approved).toBe(0);
    });

    it('fires compliance hook for batch-approved safety entries', async () => {
      prisma.safetyEntry = makeMockDelegate();

      await service.batchApprove(LOG_ID, PROJECT_ID, REVIEWER_ID, {
        entryIds: [
          { entityType: 'safety', entityId: ENTITY_ID },
        ],
      });

      expect(complianceService.handleSafetyEntryApproved).toHaveBeenCalledWith(ENTITY_ID);
    });
  });

  // -------------------------------------------------------------------------
  // Not found cases
  // -------------------------------------------------------------------------

  describe('not found handling', () => {
    it('throws NotFoundException when daily log does not exist', async () => {
      prisma.dailyLog.findFirst = jest.fn(() => Promise.resolve(null));

      await expect(
        service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
          entityId: ENTITY_ID,
          entityType: 'workforce',
          action: ReviewAction.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when entity does not exist', async () => {
      prisma.workforceEntry.findUnique = jest.fn(() => Promise.resolve(null));

      await expect(
        service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
          entityId: 'nonexistent-id',
          entityType: 'workforce',
          action: ReviewAction.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when entry belongs to different log', async () => {
      prisma.workforceEntry.findUnique = jest.fn(() =>
        Promise.resolve(makeEntry({ dailyLogId: 'other-log-id' })),
      );

      await expect(
        service.submitReview(LOG_ID, PROJECT_ID, REVIEWER_ID, {
          entityId: ENTITY_ID,
          entityType: 'workforce',
          action: ReviewAction.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

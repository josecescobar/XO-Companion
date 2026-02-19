import {
  PrismaClient,
  Role,
  DailyLogStatus,
  WeatherCondition,
  EquipmentCondition,
  DelayCause,
  GlossaryCategory,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // ─── Organization ───
  const org = await prisma.organization.upsert({
    where: { slug: 'real-elite-contracting' },
    update: {},
    create: {
      name: 'Real Elite Contracting',
      slug: 'real-elite-contracting',
    },
  });
  console.log(`Organization: ${org.name}`);

  // ─── Users ───
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@realelite.com' },
    update: {},
    create: {
      email: 'admin@realelite.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: Role.SUPER_ADMIN,
      organizationId: org.id,
    },
  });

  const pm = await prisma.user.upsert({
    where: { email: 'pm@realelite.com' },
    update: {},
    create: {
      email: 'pm@realelite.com',
      passwordHash,
      firstName: 'David',
      lastName: 'Martinez',
      role: Role.PROJECT_MANAGER,
      organizationId: org.id,
    },
  });

  const super1 = await prisma.user.upsert({
    where: { email: 'super@realelite.com' },
    update: {},
    create: {
      email: 'super@realelite.com',
      passwordHash,
      firstName: 'Tom',
      lastName: 'Williams',
      role: Role.SUPERINTENDENT,
      organizationId: org.id,
    },
  });

  const foreman = await prisma.user.upsert({
    where: { email: 'foreman@realelite.com' },
    update: {},
    create: {
      email: 'foreman@realelite.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Johnson',
      role: Role.FOREMAN,
      organizationId: org.id,
    },
  });

  const safety = await prisma.user.upsert({
    where: { email: 'safety@realelite.com' },
    update: {},
    create: {
      email: 'safety@realelite.com',
      passwordHash,
      firstName: 'Lisa',
      lastName: 'Park',
      role: Role.SAFETY_OFFICER,
      organizationId: org.id,
    },
  });

  const fieldWorker = await prisma.user.upsert({
    where: { email: 'worker@realelite.com' },
    update: {},
    create: {
      email: 'worker@realelite.com',
      passwordHash,
      firstName: 'James',
      lastName: 'Rivera',
      role: Role.FIELD_WORKER,
      organizationId: org.id,
    },
  });

  console.log('Users: 6 created (admin, pm, super, foreman, safety, worker)');

  // ─── Projects ───
  const project1 = await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'REC-2026-001' } },
    update: {},
    create: {
      name: 'Riverside Medical Center',
      code: 'REC-2026-001',
      address: '4500 Riverside Dr',
      city: 'Austin',
      state: 'TX',
      zipCode: '78741',
      organizationId: org.id,
      startDate: new Date('2026-01-06'),
      endDate: new Date('2027-06-30'),
    },
  });

  const project2 = await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'REC-2026-002' } },
    update: {},
    create: {
      name: 'Downtown Loft Conversion',
      code: 'REC-2026-002',
      address: '812 Congress Ave',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      organizationId: org.id,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-09-15'),
    },
  });

  console.log('Projects: 2 created');

  // ─── Project Members ───
  const memberPairs = [
    { projectId: project1.id, userId: pm.id, role: Role.PROJECT_MANAGER },
    { projectId: project1.id, userId: super1.id, role: Role.SUPERINTENDENT },
    { projectId: project1.id, userId: foreman.id, role: Role.FOREMAN },
    { projectId: project1.id, userId: safety.id, role: Role.SAFETY_OFFICER },
    { projectId: project1.id, userId: fieldWorker.id, role: Role.FIELD_WORKER },
    { projectId: project2.id, userId: pm.id, role: Role.PROJECT_MANAGER },
    { projectId: project2.id, userId: foreman.id, role: Role.FOREMAN },
  ];
  for (const m of memberPairs) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: m.projectId, userId: m.userId } },
      update: {},
      create: m,
    });
  }
  console.log('Project Members: 7 assignments');

  // ─── Daily Logs for Project 1 ───
  // Day 1: Approved log with full data
  const log1 = await prisma.dailyLog.upsert({
    where: { projectId_logDate: { projectId: project1.id, logDate: new Date('2026-02-16') } },
    update: {},
    create: {
      projectId: project1.id,
      createdById: foreman.id,
      logDate: new Date('2026-02-16'),
      status: DailyLogStatus.APPROVED,
      reportNumber: 1,
      notes: 'Good progress on foundation work. Concrete pour completed on schedule.',
    },
  });

  // Weather for log1
  await prisma.weatherEntry.upsert({
    where: { dailyLogId: log1.id },
    update: {},
    create: {
      dailyLogId: log1.id,
      conditions: [WeatherCondition.CLEAR],
      tempHigh: 72,
      tempLow: 48,
      windSpeed: 8,
      delayMinutes: 0,
    },
  });

  // Workforce for log1
  await prisma.workforceEntry.createMany({
    data: [
      {
        dailyLogId: log1.id,
        trade: 'Concrete',
        company: 'Austin Concrete Co.',
        workerCount: 8,
        hoursWorked: 10,
        overtimeHours: 2,
        foreman: 'Carlos Mendez',
      },
      {
        dailyLogId: log1.id,
        trade: 'Iron Workers',
        company: 'Texas Rebar Inc.',
        workerCount: 4,
        hoursWorked: 8,
        overtimeHours: 0,
        foreman: 'Bill Thompson',
      },
      {
        dailyLogId: log1.id,
        trade: 'General Labor',
        company: 'Real Elite Contracting',
        workerCount: 6,
        hoursWorked: 8,
        overtimeHours: 0,
        foreman: 'Mike Johnson',
      },
    ],
    skipDuplicates: true,
  });

  // Equipment for log1
  await prisma.equipmentEntry.createMany({
    data: [
      {
        dailyLogId: log1.id,
        equipmentType: 'Concrete Pump Truck',
        operatingHours: 6,
        idleHours: 2,
        condition: EquipmentCondition.OPERATIONAL,
      },
      {
        dailyLogId: log1.id,
        equipmentType: 'Excavator CAT 320',
        operatingHours: 4,
        idleHours: 4,
        condition: EquipmentCondition.OPERATIONAL,
      },
    ],
    skipDuplicates: true,
  });

  // Work completed for log1
  await prisma.workCompletedEntry.createMany({
    data: [
      {
        dailyLogId: log1.id,
        location: 'Building A - Foundation',
        csiCode: '03 30 00',
        description: 'Poured 45 CY of 4000 PSI concrete for foundation slab section A-1 through A-4',
        percentComplete: 100,
        quantity: 45,
        unit: 'CY',
      },
      {
        dailyLogId: log1.id,
        location: 'Building A - Foundation',
        csiCode: '03 20 00',
        description: 'Placed #5 rebar grid at 12" OC both ways for sections A-5 through A-8',
        percentComplete: 60,
        quantity: 2400,
        unit: 'LF',
      },
    ],
    skipDuplicates: true,
  });

  // Safety for log1
  await prisma.safetyEntry.upsert({
    where: { dailyLogId: log1.id },
    update: {},
    create: {
      dailyLogId: log1.id,
      toolboxTalks: ['Concrete Pour Safety', 'Heat Stress Prevention'],
      inspections: ['Pre-pour formwork inspection', 'Rebar placement inspection'],
      incidents: [],
      oshaRecordable: false,
      nearMisses: 0,
    },
  });

  // Day 2: Draft log with AI-generated data (pending review)
  const log2 = await prisma.dailyLog.upsert({
    where: { projectId_logDate: { projectId: project1.id, logDate: new Date('2026-02-17') } },
    update: {},
    create: {
      projectId: project1.id,
      createdById: foreman.id,
      logDate: new Date('2026-02-17'),
      status: DailyLogStatus.DRAFT,
      reportNumber: 2,
      notes: 'Rain delay in morning. Resumed work at 10 AM.',
    },
  });

  // Weather for log2
  await prisma.weatherEntry.upsert({
    where: { dailyLogId: log2.id },
    update: {},
    create: {
      dailyLogId: log2.id,
      conditions: [WeatherCondition.RAIN, WeatherCondition.OVERCAST],
      tempHigh: 65,
      tempLow: 52,
      precipitation: '0.8 inches',
      windSpeed: 15,
      delayMinutes: 120,
      aiGenerated: true,
      aiConfidence: 0.92,
    },
  });

  // AI-generated workforce with varying confidence
  await prisma.workforceEntry.createMany({
    data: [
      {
        dailyLogId: log2.id,
        trade: 'Electrician',
        company: 'Lone Star Electric',
        workerCount: 5,
        hoursWorked: 6,
        overtimeHours: 0,
        foreman: 'Ray Cooper',
        aiGenerated: true,
        aiConfidence: 0.88,
      },
      {
        dailyLogId: log2.id,
        trade: 'Plumber',
        company: 'Austin Plumbing Pros',
        workerCount: 3,
        hoursWorked: 6,
        overtimeHours: 0,
        aiGenerated: true,
        aiConfidence: 0.72,
      },
      {
        dailyLogId: log2.id,
        trade: 'General Labor',
        company: 'Real Elite Contracting',
        workerCount: 4,
        hoursWorked: 6,
        overtimeHours: 0,
        foreman: 'Mike Johnson',
        aiGenerated: true,
        aiConfidence: 0.95,
      },
    ],
    skipDuplicates: true,
  });

  // AI-generated work completed
  await prisma.workCompletedEntry.createMany({
    data: [
      {
        dailyLogId: log2.id,
        location: 'Building A - First Floor',
        csiCode: '26 05 00',
        description: 'Ran conduit for electrical rough-in on first floor east wing',
        percentComplete: 35,
        quantity: 800,
        unit: 'LF',
        aiGenerated: true,
        aiConfidence: 0.78,
      },
      {
        dailyLogId: log2.id,
        location: 'Building A - First Floor',
        csiCode: '22 10 00',
        description: 'Installed 2" copper supply lines for restroom group B',
        percentComplete: 50,
        quantity: 200,
        unit: 'LF',
        aiGenerated: true,
        aiConfidence: 0.65,
      },
    ],
    skipDuplicates: true,
  });

  // AI-generated delay
  await prisma.delayEntry.createMany({
    data: [
      {
        dailyLogId: log2.id,
        cause: DelayCause.WEATHER,
        description: 'Morning rain caused 2-hour delay for all outdoor trades',
        durationMinutes: 120,
        impactedTrades: ['Concrete', 'General Labor', 'Electrician', 'Plumber'],
        aiGenerated: true,
        aiConfidence: 0.91,
      },
    ],
    skipDuplicates: true,
  });

  // AI-generated safety
  await prisma.safetyEntry.upsert({
    where: { dailyLogId: log2.id },
    update: {},
    create: {
      dailyLogId: log2.id,
      toolboxTalks: ['Wet Weather Working Conditions'],
      inspections: ['Trench shoring after rain'],
      incidents: [],
      oshaRecordable: false,
      nearMisses: 1,
      aiGenerated: true,
      aiConfidence: 0.83,
    },
  });

  console.log('Daily Logs: 2 created (1 approved, 1 draft with AI data)');

  // ─── Signature on approved log ───
  await prisma.signature.upsert({
    where: { dailyLogId_userId: { dailyLogId: log1.id, userId: foreman.id } },
    update: {},
    create: {
      dailyLogId: log1.id,
      userId: foreman.id,
      role: Role.FOREMAN,
      signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  });

  await prisma.signature.upsert({
    where: { dailyLogId_userId: { dailyLogId: log1.id, userId: pm.id } },
    update: {},
    create: {
      dailyLogId: log1.id,
      userId: pm.id,
      role: Role.PROJECT_MANAGER,
      signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  });

  console.log('Signatures: 2 on approved log');

  // ─── Glossary Terms ───
  const glossaryEntries: { term: string; aliases: string[]; category: GlossaryCategory }[] = [
    // Trades (key = slang alias, value = standard term)
    { term: 'Electrician', aliases: ['sparkies', 'sparky'], category: GlossaryCategory.TRADE },
    { term: 'Sheet Metal Worker', aliases: ['tin knockers'], category: GlossaryCategory.TRADE },
    { term: 'Drywall Finisher', aliases: ['mud men', 'tapers'], category: GlossaryCategory.TRADE },
    { term: 'Ironworker (Rebar)', aliases: ['rod busters'], category: GlossaryCategory.TRADE },
    { term: 'Plumber', aliases: ['pipe fitters'], category: GlossaryCategory.TRADE },
    { term: 'Concrete Finisher', aliases: ['flatwork guys'], category: GlossaryCategory.TRADE },
    { term: 'Carpenter', aliases: ['framers'], category: GlossaryCategory.TRADE },
    { term: 'Roofer', aliases: ['roofers'], category: GlossaryCategory.TRADE },
    { term: 'Painter', aliases: ['painters'], category: GlossaryCategory.TRADE },
    { term: 'Mason', aliases: ['masons', 'block layers'], category: GlossaryCategory.TRADE },
    { term: 'HVAC Technician', aliases: ['HVAC guys'], category: GlossaryCategory.TRADE },
    { term: 'Insulation Worker', aliases: ['insulators'], category: GlossaryCategory.TRADE },
    { term: 'Glazier', aliases: ['glaziers'], category: GlossaryCategory.TRADE },
    { term: 'Ironworker', aliases: ['ironworkers'], category: GlossaryCategory.TRADE },
    { term: 'Heavy Equipment Operator', aliases: ['operators'], category: GlossaryCategory.TRADE },
    { term: 'General Laborer', aliases: ['laborers'], category: GlossaryCategory.TRADE },
    // Equipment
    { term: 'Excavator', aliases: ['track hoe', 'trackhoe'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Skid Steer Loader', aliases: ['bobcat', 'skid steer'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Front End Loader', aliases: ['loader'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Bulldozer', aliases: ['dozer'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Backhoe Loader', aliases: ['backhoe'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Aerial Lift', aliases: ['man lift'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Scissor Lift', aliases: ['scissor lift'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Boom Lift', aliases: ['boom lift'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Forklift', aliases: ['forklift'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Dump Truck', aliases: ['dump truck'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Concrete Pump', aliases: ['concrete pump'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Crane', aliases: ['crane'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Compactor', aliases: ['compactor'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Mini Excavator', aliases: ['mini ex'], category: GlossaryCategory.EQUIPMENT },
    { term: 'Generator', aliases: ['generator'], category: GlossaryCategory.EQUIPMENT },
    // Units
    { term: 'LF', aliases: ['linear feet', 'lineal feet'], category: GlossaryCategory.UNIT },
    { term: 'SF', aliases: ['square feet', 'square foot'], category: GlossaryCategory.UNIT },
    { term: 'CY', aliases: ['cubic yards', 'cubic yard'], category: GlossaryCategory.UNIT },
    { term: 'EA', aliases: ['each'], category: GlossaryCategory.UNIT },
    { term: 'TON', aliases: ['tons'], category: GlossaryCategory.UNIT },
    { term: 'LB', aliases: ['pounds'], category: GlossaryCategory.UNIT },
    { term: 'GAL', aliases: ['gallons'], category: GlossaryCategory.UNIT },
    { term: 'BAG', aliases: ['bags'], category: GlossaryCategory.UNIT },
    { term: 'SHT', aliases: ['sheets'], category: GlossaryCategory.UNIT },
    { term: 'ROLL', aliases: ['rolls'], category: GlossaryCategory.UNIT },
    { term: 'PC', aliases: ['pieces'], category: GlossaryCategory.UNIT },
    { term: 'BDL', aliases: ['bundles'], category: GlossaryCategory.UNIT },
    // Abbreviations
    { term: 'Concrete Masonry Unit', aliases: ['CMU'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Slab On Grade', aliases: ['SOG'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Time and Materials', aliases: ['T&M'], category: GlossaryCategory.ABBREVIATION },
    { term: 'General Contractor', aliases: ['GC'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Subcontractor', aliases: ['Sub'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Request for Information', aliases: ['RFI'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Change Order', aliases: ['CO'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Punch List', aliases: ['punch list'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Rough-In (first fix)', aliases: ['rough in'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Trim-Out (second fix)', aliases: ['trim out'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Structural completion', aliases: ['top out'], category: GlossaryCategory.ABBREVIATION },
    { term: 'Weather-tight enclosure', aliases: ['dry in'], category: GlossaryCategory.ABBREVIATION },
  ];

  for (const entry of glossaryEntries) {
    await prisma.glossaryTerm.upsert({
      where: { term_organizationId: { term: entry.term, organizationId: org.id } },
      update: {},
      create: {
        term: entry.term,
        aliases: entry.aliases,
        category: entry.category,
        source: 'seed',
        organizationId: org.id,
      },
    });
  }
  console.log(`Glossary Terms: ${glossaryEntries.length} seeded`);

  // ─── Summary ───
  console.log('\n--- Seed Summary ---');
  console.log('Organization: Real Elite Contracting');
  console.log('Users: 6 (all password: password123)');
  console.log('  - admin@realelite.com   (SUPER_ADMIN)');
  console.log('  - pm@realelite.com      (PROJECT_MANAGER)');
  console.log('  - super@realelite.com   (SUPERINTENDENT)');
  console.log('  - foreman@realelite.com (FOREMAN)');
  console.log('  - safety@realelite.com  (SAFETY_OFFICER)');
  console.log('  - worker@realelite.com  (FIELD_WORKER)');
  console.log('Projects: 2');
  console.log('  - Riverside Medical Center (5 members)');
  console.log('  - Downtown Loft Conversion (2 members)');
  console.log('Daily Logs: 2 for Riverside Medical Center');
  console.log('  - Feb 16: APPROVED, full manual data');
  console.log('  - Feb 17: DRAFT, AI-generated data (some below confidence threshold)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

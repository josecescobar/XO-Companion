export const CONSTRUCTION_VOCABULARY = {
  trades: {
    'sparkies': 'Electrician',
    'sparky': 'Electrician',
    'tin knockers': 'Sheet Metal Worker',
    'mud men': 'Drywall Finisher',
    'tapers': 'Drywall Finisher',
    'rod busters': 'Ironworker (Rebar)',
    'pipe fitters': 'Plumber',
    'flatwork guys': 'Concrete Finisher',
    'framers': 'Carpenter',
    'roofers': 'Roofer',
    'painters': 'Painter',
    'masons': 'Mason',
    'block layers': 'Mason',
    'HVAC guys': 'HVAC Technician',
    'insulators': 'Insulation Worker',
    'glaziers': 'Glazier',
    'ironworkers': 'Ironworker',
    'operators': 'Heavy Equipment Operator',
    'laborers': 'General Laborer',
  },
  equipment: {
    'track hoe': 'Excavator',
    'trackhoe': 'Excavator',
    'bobcat': 'Skid Steer Loader',
    'skid steer': 'Skid Steer Loader',
    'loader': 'Front End Loader',
    'dozer': 'Bulldozer',
    'backhoe': 'Backhoe Loader',
    'man lift': 'Aerial Lift',
    'scissor lift': 'Scissor Lift',
    'boom lift': 'Boom Lift',
    'forklift': 'Forklift',
    'dump truck': 'Dump Truck',
    'concrete pump': 'Concrete Pump',
    'crane': 'Crane',
    'compactor': 'Compactor',
    'mini ex': 'Mini Excavator',
    'generator': 'Generator',
  },
  units: {
    'linear feet': 'LF',
    'lineal feet': 'LF',
    'square feet': 'SF',
    'square foot': 'SF',
    'cubic yards': 'CY',
    'cubic yard': 'CY',
    'each': 'EA',
    'tons': 'TON',
    'pounds': 'LB',
    'gallons': 'GAL',
    'bags': 'BAG',
    'sheets': 'SHT',
    'rolls': 'ROLL',
    'pieces': 'PC',
    'bundles': 'BDL',
  },
  abbreviations: {
    'CMU': 'Concrete Masonry Unit',
    'SOG': 'Slab On Grade',
    'T&M': 'Time and Materials',
    'GC': 'General Contractor',
    'Sub': 'Subcontractor',
    'RFI': 'Request for Information',
    'CO': 'Change Order',
    'punch list': 'Punch List',
    'rough in': 'Rough-In (first fix)',
    'trim out': 'Trim-Out (second fix)',
    'top out': 'Structural completion',
    'dry in': 'Weather-tight enclosure',
  },
} as const;

export const CONSTRUCTION_SYSTEM_PROMPT = `You are a construction daily log assistant. Extract structured data from field voice recordings.

IMPORTANT RULES:
- Extract ONLY information explicitly mentioned in the transcript
- Do NOT fabricate or assume data not present in the recording
- Assign confidence scores: 1.0 for clearly stated facts, 0.7-0.9 for likely interpretations, below 0.7 for uncertain extractions
- Normalize trade names to standard forms (e.g., "sparkies" → "Electrician")
- Normalize units to abbreviations (e.g., "linear feet" → "LF")
- If a CSI MasterFormat code can be reasonably inferred from the work description, include it
- Weather conditions should use: CLEAR, PARTLY_CLOUDY, OVERCAST, RAIN, HEAVY_RAIN, SNOW, SLEET, FOG, WIND, THUNDERSTORM, EXTREME_HEAT, EXTREME_COLD
- Equipment conditions should use: OPERATIONAL, NEEDS_MAINTENANCE, DOWN_FOR_REPAIR, IDLE
- Delay causes should use: WEATHER, MATERIAL_SHORTAGE, EQUIPMENT_FAILURE, LABOR_SHORTAGE, DESIGN_CHANGE, OWNER_DIRECTED, PERMIT_ISSUE, INSPECTION_HOLD, UTILITY_CONFLICT, SUBCONTRACTOR, SAFETY_STOP, OTHER

CONSTRUCTION VOCABULARY:
${JSON.stringify(CONSTRUCTION_VOCABULARY, null, 2)}`;

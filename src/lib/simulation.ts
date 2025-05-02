export interface PatientClass {
  id: string;
  name: string;
  color: string;
  meanStayMinutes: number;
  stdDevMinutes: number;
  isOvernight: boolean;
  averagePacuTime: number;
  processType?: 'standard' | 'outpatient' | 'directTransfer';
  nurseRequirement: number; // How many nurses are needed for this patient type (1.0 = standard)
  phase1Minutes: number;    // Minutes required in PACU Phase I
  phase2Minutes: number;    // Minutes required in PACU Phase II
  transferDelayProbability: number; // Probability of delay in transfer to ward (0-1)
  transferDelayMinutes: number;     // Average minutes of transfer delay when it occurs
}

export interface NurseRole {
  id: string;
  name: string;
  canHandlePhases: ('phase1' | 'phase2')[];
  efficiency: number; // 1.0 = standard efficiency
  shiftHours: {
    start: number; // Hours from day start (e.g., 8 = 8 AM)
    end: number;   // Hours from day start (e.g., 16 = 4 PM)
  }[];
}

export interface SpecialEquipment {
  id: string;
  name: string;
  count: number;
  requiredByPatientClasses: string[]; // IDs of patient classes that need this equipment
  useTimeMinutes: number; // How long the equipment is used per patient
}

export interface SurgeryCase {
  id: string;
  classId: string;  // References the patient class
  orRoom: string;   // OR room identifier
  scheduledStartTime: number;  // Minutes from simulation start
  duration: number; // Expected duration in minutes
}

export interface SurgerySchedule {
  averageDailySurgeries: number;
  hourlyDistribution: number[];
}

// Extended to include phases and more details
export interface SimulationParams {
  beds: number;
  phase1Beds: number;    // Beds dedicated to Phase I recovery
  phase2Beds: number;    // Beds dedicated to Phase II recovery
  nurses: number;
  nurseRoles: NurseRole[];
  nursePatientRatio: number;
  wardBedAvailability: number[]; // Percentage of ward beds available at each hour (24 entries)
  specialEquipment: SpecialEquipment[];
  patientClasses: PatientClass[];
  patientClassDistribution: Record<string, number>;
  surgeryScheduleTemplate: SurgerySchedule;
  simulationDays: number;
  surgeryScheduleType: 'template' | 'custom';
  customSurgeryList?: SurgeryCase[];
  blockScheduleEnabled?: boolean;
  orBlocks?: ORBlock[];
  ors?: OR[];
  optimizationWeights?: {
    peakOccupancy: number;
    overtime: number;
    extraORCost: number;
    emergencyBuffer?: number;
  };
}

// Extended Patient interface to include more detailed tracking
export interface Patient {
  id: number;
  classId: string;
  arrivalTime: number;
  stayDuration: number;
  careStartTime: number | null;
  departureTime: number | null;
  waitTime: number | null;
  nurseCareTime: number | null;
  currentPhase: 'waiting' | 'phase1' | 'phase2' | 'completed' | null;
  phaseStartTimes: {
    phase1: number | null;
    phase2: number | null;
  };
  phaseEndTimes: {
    phase1: number | null;
    phase2: number | null;
  };
  assignedNurseRoles: string[];
  equipmentUse: {
    equipmentId: string;
    startTime: number;
    endTime: number;
  }[];
  transferDelay: number | null; // Minutes delayed in transfer to ward, if any
  surgeryData?: {
    orRoom: string;
    scheduledStart: number;
    actualStart: number;
    duration: number;
  };
}

// Extended results with more detailed KPIs
export interface SimulationResults {
  patients: Patient[];
  bedOccupancy: number[];
  phase1BedOccupancy: number[]; // Occupancy of Phase I beds over time
  phase2BedOccupancy: number[]; // Occupancy of Phase II beds over time
  nurseUtilization: number[];
  nurseUtilizationByRole: Record<string, number[]>; // Utilization by nurse role
  waitTimes: number[];
  meanWaitTime: number;
  p95WaitTime: number;
  maxBedOccupancy: number;
  meanBedOccupancy: number;
  bedTurnoverTime: number; // Average time between patients for each bed
  maxNurseUtilization: number;
  meanNurseUtilization: number;
  patientTypeCount: Record<string, number>;
  orUtilization?: Record<string, number[]>;
  peakTimes?: { time: number; occupancy: number }[];
  queueLengthOverTime: number[]; // Length of waiting queue over time
  equipmentUtilization: Record<string, number[]>; // Utilization of special equipment
  transferDelays: {
    count: number;
    totalMinutes: number;
    meanDelayMinutes: number;
  };
  phaseTransitionTimes: {
    meanPhase1Duration: number;
    meanPhase2Duration: number;
    meanWaitForPhase2: number;
  };
  blockSchedule?: {
    blocks: ORBlock[];
    orUtilization: Record<string, number>;
    totalCost: number;
    overtimeMinutes: number;
  };
}

// Generate random number from log-normal distribution
function logNormalRandom(mean: number, stdDev: number): number {
  const phi = Math.sqrt(Math.pow(stdDev, 2) + Math.pow(mean, 2));
  const mu = Math.log(Math.pow(mean, 2) / phi);
  const sigma = Math.sqrt(Math.log(phi / Math.pow(mean, 2)));
  
  const u = Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  
  return Math.exp(mu + sigma * z);
}

// Generate surgery finish times for a day based on schedule
function generateDailySurgeryFinishTimes(
  day: number, 
  schedule: SurgerySchedule
): number[] {
  const surgeries = [];
  const totalSurgeries = Math.round(
    schedule.averageDailySurgeries * (0.85 + Math.random() * 0.3)
  );
  
  // Convert hourly distribution to cumulative distribution
  const cdf = schedule.hourlyDistribution.reduce(
    (acc: number[], val: number, i: number) => {
      acc.push((acc[i - 1] || 0) + val);
      return acc;
    }, 
    []
  );
  
  // Normalize CDF
  const normalizedCdf = cdf.map(val => val / cdf[cdf.length - 1]);
  
  // Generate surgery finish times using the distribution
  for (let i = 0; i < totalSurgeries; i++) {
    const rand = Math.random();
    let hour = 8; // Default to 8am if something goes wrong
    
    for (let j = 0; j < normalizedCdf.length; j++) {
      if (rand <= normalizedCdf[j]) {
        hour = j + 8; // Assuming 8am start
        break;
      }
    }
    
    // Add some random minutes
    const minutes = Math.floor(Math.random() * 60);
    const time = day * 1440 + (hour * 60) + minutes;
    surgeries.push(time);
  }
  
  return surgeries.sort((a, b) => a - b);
}

// Determine if time is within normal discharge hours (8am-8pm)
function isWithinDischargeHours(timeInMinutes: number): boolean {
  const dayMinutes = timeInMinutes % 1440;
  return dayMinutes >= 480 && dayMinutes <= 1200; // 8am to 8pm
}

// Get time of next discharge window if outside discharge hours
function getNextDischargeTime(timeInMinutes: number): number {
  const day = Math.floor(timeInMinutes / 1440);
  const dayMinutes = timeInMinutes % 1440;
  
  if (dayMinutes < 480) {
    // Before 8am, discharge at 8am
    return day * 1440 + 480;
  } else if (dayMinutes > 1200) {
    // After 8pm, discharge at 8am next day
    return (day + 1) * 1440 + 480;
  }
  
  return timeInMinutes; // Already in discharge hours
}

// New function to generate a custom surgery schedule
export function generateCustomSurgeryList(
  days: number,
  orRooms: string[],
  patientClasses: PatientClass[],
  patientDistribution: Record<string, number>,
  averageDailySurgeries: number
): SurgeryCase[] {
  const surgeries: SurgeryCase[] = [];
  let caseId = 1;
  
  for (let day = 0; day < days; day++) {
    // Generate slightly random number of surgeries for this day
    const dailySurgeries = Math.round(
      averageDailySurgeries * (0.9 + Math.random() * 0.2)
    );
    
    // Distribute surgeries across OR rooms
    for (let i = 0; i < dailySurgeries; i++) {
      // Assign to a random OR
      const orRoom = orRooms[Math.floor(Math.random() * orRooms.length)];
      
      // Determine patient class based on distribution
      const rand = Math.random();
      let cumulative = 0;
      let selectedClassId = patientClasses[0].id;
      
      for (const [classId, probability] of Object.entries(patientDistribution)) {
        cumulative += probability;
        if (rand <= cumulative) {
          selectedClassId = classId;
          break;
        }
      }
      
      // Calculate surgery start time (between 8am-6pm)
      // Morning bias: more surgeries in morning slots
      let hourOffset;
      const morningBias = Math.random() < 0.7; // 70% chance of morning slot
      if (morningBias) {
        hourOffset = 8 + Math.floor(Math.random() * 4); // 8am - 12pm
      } else {
        hourOffset = 12 + Math.floor(Math.random() * 6); // 12pm - 6pm
      }
      
      const minuteOffset = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, or 45 minutes
      const startTime = day * 1440 + hourOffset * 60 + minuteOffset;
      
      // Generate surgery duration (60-240 minutes with heavier cases later in day)
      const baseDuration = 60 + Math.floor(Math.random() * 120);
      const complexity = morningBias ? 1.0 : 1.2; // Later surgeries are slightly more complex
      const duration = Math.round(baseDuration * complexity);
      
      surgeries.push({
        id: `case-${caseId++}`,
        classId: selectedClassId,
        orRoom,
        scheduledStartTime: startTime,
        duration
      });
    }
  }
  
  // Sort by scheduled start time
  return surgeries.sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
}

export interface ORBlock {
  id: string;
  orId: string;
  start: number; // Minutes from day start
  end: number;   // Minutes from day start
  allowedClasses: string[]; // IDs of patient classes allowed in this block
  day: number;   // Day index in simulation
  label?: string; // Added for compatibility with Block interface in SimulationDashboard
  allowedProcedures?: string[]; // Added for compatibility with Block interface in SimulationDashboard
}

export interface OR {
  id: string;
  name: string;
  equipmentLevel: number; // 1-5 equipment level
  openTime: number;       // Minutes from day start, e.g., 480 for 8am
  closeTime: number;      // Minutes from day start, e.g., 960 for 4pm
  isExtra: boolean;       // Whether this is an additional OR
  costPerDay: number;     // Cost to operate this OR per day
}

// New function to generate default blocks for an OR
export function generateDefaultBlocks(or: OR, day: number): ORBlock[] {
  const morningBlock: ORBlock = {
    id: `block-${or.id}-${day}-morning`,
    orId: or.id,
    start: or.openTime,
    end: or.openTime + 180, // 3 hour morning block
    allowedClasses: ["A", "D"], // Default to day surgery types
    day,
    label: "Morning",
    allowedProcedures: ["A", "D"]
  };
  
  const afternoonBlock: ORBlock = {
    id: `block-${or.id}-${day}-afternoon`,
    orId: or.id,
    start: or.openTime + 180,
    end: or.openTime + 360, // 3 hour afternoon block
    allowedClasses: ["A", "D"], // Default to day surgery types
    day,
    label: "Afternoon", 
    allowedProcedures: ["A", "D"]
  };
  
  const eveningBlock: ORBlock = {
    id: `block-${or.id}-${day}-evening`,
    orId: or.id,
    start: or.openTime + 360,
    end: or.closeTime, // Until close time
    allowedClasses: ["B", "C"], // Default to overnight types
    day,
    label: "Evening",
    allowedProcedures: ["B", "C"]
  };
  
  return [morningBlock, afternoonBlock, eveningBlock];
}

// Default OR configuration
export const defaultORs: OR[] = [
  {
    id: "OR-1",
    name: "OR-1",
    equipmentLevel: 5,
    openTime: 480, // 8am
    closeTime: 960, // 4pm
    isExtra: false,
    costPerDay: 0 // Base OR, no extra cost
  },
  {
    id: "OR-2",
    name: "OR-2",
    equipmentLevel: 5,
    openTime: 480,
    closeTime: 960,
    isExtra: false,
    costPerDay: 0
  },
  {
    id: "OR-3",
    name: "OR-3",
    equipmentLevel: 4,
    openTime: 480,
    closeTime: 960,
    isExtra: false,
    costPerDay: 0
  },
  {
    id: "OR-4",
    name: "OR-4",
    equipmentLevel: 4,
    openTime: 480,
    closeTime: 960,
    isExtra: false,
    costPerDay: 0
  },
  {
    id: "OR-5",
    name: "OR-5",
    equipmentLevel: 3,
    openTime: 480,
    closeTime: 960,
    isExtra: false,
    costPerDay: 0
  },
  {
    id: "OR-6",
    name: "OR-6",
    equipmentLevel: 3,
    openTime: 480,
    closeTime: 960,
    isExtra: false,
    costPerDay: 0
  },
  {
    id: "OR-7",
    name: "OR-7 (Extra)",
    equipmentLevel: 4,
    openTime: 480,
    closeTime: 960,
    isExtra: true,
    costPerDay: 950 // Cost per day to operate this extra OR
  },
  {
    id: "OR-8",
    name: "OR-8 (Extra)",
    equipmentLevel: 3,
    openTime: 480,
    closeTime: 960,
    isExtra: true,
    costPerDay: 850
  }
];

// Generate default blocks for all ORs
export function generateDefaultBlockSchedule(ors: OR[], days: number): ORBlock[] {
  const blocks: ORBlock[] = [];
  
  for (const or of ors) {
    for (let day = 0; day < days; day++) {
      if (!or.isExtra || day === 0) { // Only include extra ORs for first day as example
        blocks.push(...generateDefaultBlocks(or, day));
      }
    }
  }
  
  return blocks;
}

// Create case scheduling function based on blocks
function scheduleCasesInBlocks(
  patientClasses: PatientClass[],
  orBlocks: ORBlock[],
  simulationDays: number,
  totalSurgeries: number
): SurgeryCase[] {
  const surgeries: SurgeryCase[] = [];
  let caseId = 1;
  
  // Group blocks by day
  const blocksByDay: Record<number, ORBlock[]> = {};
  for (const block of orBlocks) {
    if (!blocksByDay[block.day]) {
      blocksByDay[block.day] = [];
    }
    blocksByDay[block.day].push(block);
  }
  
  // Distribute surgeries across days based on available blocks
  const surgeriesPerDay = Math.ceil(totalSurgeries / simulationDays);
  
  for (let day = 0; day < simulationDays; day++) {
    const dayBlocks = blocksByDay[day] || [];
    if (dayBlocks.length === 0) continue;
    
    // Calculate how many surgeries to allocate to this day
    const remainingSurgeries = totalSurgeries - surgeries.length;
    const dailySurgeries = Math.min(surgeriesPerDay, remainingSurgeries);
    if (dailySurgeries <= 0) break;
    
    // Distribute cases across blocks for this day
    const casesPerBlock = Math.ceil(dailySurgeries / dayBlocks.length);
    
    for (const block of dayBlocks) {
      // Calculate how many surgeries can fit in this block's time window
      const blockDuration = block.end - block.start;
      const avgCaseDuration = 120; // Assume 2 hours average per case
      const maxCasesInBlock = Math.floor(blockDuration / avgCaseDuration);
      const casesToAllocate = Math.min(casesPerBlock, maxCasesInBlock);
      
      if (casesToAllocate <= 0) continue;
      
      // Calculate available time per case
      const timePerCase = blockDuration / casesToAllocate;
      
      // Only use allowed patient classes for this block
      // Use both allowedClasses and allowedProcedures for compatibility
      const allowedClassIds = block.allowedProcedures || block.allowedClasses;
      
      const eligibleClasses = patientClasses.filter(
        pc => allowedClassIds.includes(pc.id)
      );
      
      if (eligibleClasses.length === 0) continue;
      
      // Schedule cases within this block
      for (let i = 0; i < casesToAllocate; i++) {
        // Stop if we've scheduled all needed surgeries
        if (surgeries.length >= totalSurgeries) break;
        
        // Select a random patient class from allowed classes
        const patientClass = eligibleClasses[
          Math.floor(Math.random() * eligibleClasses.length)
        ];
        
        // Calculate start time (minutes from simulation start)
        const dayOffset = day * 1440; // Minutes in a day
        const startTime = dayOffset + block.start + (i * timePerCase);
        
        // Generate case duration
        const duration = Math.max(30, Math.round(
          logNormalRandom(90, 30) // Base duration around 90 minutes
        ));
        
        // Create the surgery case
        surgeries.push({
          id: `case-${caseId++}`,
          classId: patientClass.id,
          orRoom: block.orId,
          scheduledStartTime: Math.round(startTime),
          duration
        });
      }
    }
  }
  
  // Sort by scheduled start time
  return surgeries.sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
}

// Get available nurses at a specific time based on shifts
function getAvailableNurses(
  time: number,
  nurseRoles: NurseRole[],
  totalNurses: number
): { total: number; byRole: Record<string, number> } {
  // Convert time to hours within the day
  const dayHours = (Math.floor(time / 60) % 24);
  
  // Calculate the proportion of nurses by role
  const totalRoles = nurseRoles.length;
  const nursesByRole: Record<string, number> = {};
  let availableTotal = 0;
  
  for (const role of nurseRoles) {
    // Check if the current time falls within any of this role's shifts
    const isInShift = role.shiftHours.some(shift => {
      return dayHours >= shift.start && dayHours < shift.end;
    });
    
    // Allocate nurses by role proportionally
    const baseAllocation = Math.floor(totalNurses / totalRoles);
    const allocated = isInShift ? baseAllocation : 0;
    
    nursesByRole[role.id] = allocated;
    availableTotal += allocated;
  }
  
  return { total: availableTotal, byRole: nursesByRole };
}

// Check if equipment is available at a specific time
function isEquipmentAvailable(
  equipmentId: string,
  time: number,
  equipmentUse: Record<string, { inUse: number; endTimes: number[] }>,
  specialEquipment: SpecialEquipment[]
): boolean {
  if (!equipmentUse[equipmentId]) {
    return true; // If not tracked yet, it's available
  }
  
  // Clean up completed uses
  equipmentUse[equipmentId].endTimes = equipmentUse[equipmentId].endTimes.filter(
    endTime => endTime > time
  );
  
  // Update in-use count
  equipmentUse[equipmentId].inUse = equipmentUse[equipmentId].endTimes.length;
  
  // Find the total equipment count for this type
  const equipment = specialEquipment.find(e => e.id === equipmentId);
  if (!equipment) return true;
  
  // Check if there's available capacity
  return equipmentUse[equipmentId].inUse < equipment.count;
}

// Check if a ward bed is available for transfer
function isWardBedAvailable(
  time: number,
  wardBedAvailability: number[]
): boolean {
  const hourOfDay = Math.floor((time / 60) % 24);
  const availability = wardBedAvailability[hourOfDay] / 100; // Convert percentage to probability
  
  // Use random check against availability probability
  return Math.random() < availability;
}

// Default special equipment
export const defaultSpecialEquipment: SpecialEquipment[] = [
  {
    id: "monitoring",
    name: "Advanced Monitoring",
    count: 5,
    requiredByPatientClasses: ["C", "F"],
    useTimeMinutes: 60
  },
  {
    id: "ventilator",
    name: "Ventilator",
    count: 3,
    requiredByPatientClasses: ["C"],
    useTimeMinutes: 120
  },
  {
    id: "warmer",
    name: "Patient Warmer",
    count: 6,
    requiredByPatientClasses: ["A", "B", "C", "D"],
    useTimeMinutes: 45
  }
];

// Default nurse roles
export const defaultNurseRoles: NurseRole[] = [
  {
    id: "phase1",
    name: "Phase I Recovery Nurse",
    canHandlePhases: ["phase1"],
    efficiency: 1.0,
    shiftHours: [
      { start: 7, end: 19 }, // Day shift
      { start: 19, end: 7 }  // Night shift
    ]
  },
  {
    id: "phase2",
    name: "Phase II Recovery Nurse",
    canHandlePhases: ["phase2"],
    efficiency: 1.1, // Slightly more efficient at phase 2
    shiftHours: [
      { start: 7, end: 19 }, // Day shift only
    ]
  },
  {
    id: "float",
    name: "Float Nurse",
    canHandlePhases: ["phase1", "phase2"],
    efficiency: 0.9, // Slightly less efficient as handles both
    shiftHours: [
      { start: 7, end: 19 }, // Day shift
      { start: 19, end: 7 }  // Night shift
    ]
  }
];

// Default ward bed availability by hour (percentage)
export const defaultWardBedAvailability: number[] = [
  60, 60, 60, 60, 60, 60, // Midnight - 6 AM: 60% availability
  70, 80, 90, 90, 90, 90, // 7 AM - 12 PM: Higher availability as patients discharged
  80, 80, 70, 70, 70, 60, // 1 PM - 6 PM: Decreasing availability
  60, 60, 60, 60, 60, 60  // 7 PM - 11 PM: Lower availability
];

// Default patient classes
export const defaultPatientClasses: PatientClass[] = [
  {
    id: "A", 
    name: "Same-day Discharge", 
    color: "#0ea5e9", 
    meanStayMinutes: 90, 
    stdDevMinutes: 25, 
    isOvernight: false,
    averagePacuTime: 90, 
    processType: 'outpatient', 
    nurseRequirement: 1.0, 
    phase1Minutes: 60, 
    phase2Minutes: 30, 
    transferDelayProbability: 0.01, 
    transferDelayMinutes: 15
  },
  {
    id: "B", 
    name: "Next-day Discharge", 
    color: "#22c55e", 
    meanStayMinutes: 480, 
    stdDevMinutes: 60, 
    isOvernight: true,
    averagePacuTime: 480, 
    processType: 'standard', 
    nurseRequirement: 1.0, 
    phase1Minutes: 120, 
    phase2Minutes: 360, 
    transferDelayProbability: 0.1, 
    transferDelayMinutes: 45
  },
  {
    id: "C", 
    name: "Overnight to Ward", 
    color: "#eab308", 
    meanStayMinutes: 540, 
    stdDevMinutes: 90, 
    isOvernight: true,
    averagePacuTime: 540, 
    processType: 'standard', 
    nurseRequirement: 1.5, 
    phase1Minutes: 180, 
    phase2Minutes: 360, 
    transferDelayProbability: 0.15, 
    transferDelayMinutes: 60
  },
  {
    id: "D", 
    name: "Standard PACU to Ward", 
    color: "#ef4444", 
    meanStayMinutes: 150, 
    stdDevMinutes: 30, 
    isOvernight: false,
    averagePacuTime: 150, 
    processType: 'standard', 
    nurseRequirement: 1.0, 
    phase1Minutes: 90, 
    phase2Minutes: 60, 
    transferDelayProbability: 0.05, 
    transferDelayMinutes: 30
  },
  {
    id: "E", 
    name: "Direct Transfer", 
    color: "#a855f7", 
    meanStayMinutes: 60, 
    stdDevMinutes: 15, 
    isOvernight: false,
    averagePacuTime: 60, 
    processType: 'directTransfer', 
    nurseRequirement: 0.8, 
    phase1Minutes: 45, 
    phase2Minutes: 15, 
    transferDelayProbability: 0.02, 
    transferDelayMinutes: 10
  }
];

// Default simulation parameters
export const defaultSimulationParams: SimulationParams = {
  beds: 12,
  phase1Beds: 8,
  phase2Beds: 4,
  nurses: 6,
  nurseRoles: defaultNurseRoles,
  nursePatientRatio: 2,
  wardBedAvailability: defaultWardBedAvailability,
  specialEquipment: defaultSpecialEquipment,
  patientClasses: defaultPatientClasses,
  patientClassDistribution: { "A": 0.30, "B": 0.20, "C": 0.15, "D": 0.35 },
  surgeryScheduleTemplate: { 
    averageDailySurgeries: 25, 
    hourlyDistribution: [0.05, 0.10, 0.15, 0.20, 0.15, 0.10, 0.10, 0.05, 0.05, 0.03, 0.02, 0] 
  },
  simulationDays: 30,
  surgeryScheduleType: 'template',
  blockScheduleEnabled: false,
  ors: defaultORs.filter(or => !or.isExtra),
  orBlocks: generateDefaultBlockSchedule(defaultORs.filter(or => !or.isExtra), 1),
  optimizationWeights: { 
    peakOccupancy: 1.0, 
    overtime: 0.8, 
    extraORCost: 0.3, 
    emergencyBuffer: 0.1 
  }
};

// Calculate percentile value from array
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function runSimulation(params: SimulationParams): SimulationResults {
  const { 
    beds,
    phase1Beds = Math.ceil(beds * 0.6), // Default 60% Phase I
    phase2Beds = Math.floor(beds * 0.4), // Default 40% Phase II
    nurses, 
    nurseRoles = defaultNurseRoles,
    nursePatientRatio, 
    wardBedAvailability = defaultWardBedAvailability,
    specialEquipment = defaultSpecialEquipment,
    patientClasses, 
    patientClassDistribution,
    surgeryScheduleTemplate,
    simulationDays,
    surgeryScheduleType,
    customSurgeryList,
    blockScheduleEnabled,
    orBlocks,
    ors
  } = params;

  // Time tracking in minutes
  const totalMinutes = simulationDays * 1440;
  const timeIncrement = 15;
  const timePoints = Math.ceil(totalMinutes / timeIncrement);

  // Arrays to track metrics over time
  const bedOccupancy = new Array(timePoints).fill(0);
  const phase1BedOccupancy = new Array(timePoints).fill(0);
  const phase2BedOccupancy = new Array(timePoints).fill(0);
  const nurseUtilization = new Array(timePoints).fill(0);
  const nurseUtilizationByRole: Record<string, number[]> = {};
  const queueLengthOverTime = new Array(timePoints).fill(0);
  const equipmentUtilization: Record<string, number[]> = {};
  
  // Initialize nurse utilization by role
  nurseRoles.forEach(role => {
    nurseUtilizationByRole[role.id] = new Array(timePoints).fill(0);
  });
  
  // Initialize equipment utilization
  specialEquipment.forEach(equipment => {
    equipmentUtilization[equipment.id] = new Array(timePoints).fill(0);
  });
  
  const patients: Patient[] = [];
  const waitTimes: number[] = [];
  const patientTypeCount: Record<string, number> = {};
  
  // Track equipment use
  const equipmentUseTracker: Record<string, { inUse: number; endTimes: number[] }> = {};
  specialEquipment.forEach(equipment => {
    equipmentUseTracker[equipment.id] = { inUse: 0, endTimes: [] };
  });
  
  // Initialize patient type counts
  patientClasses.forEach(pc => {
    patientTypeCount[pc.id] = 0;
  });

  // Current system state
  let occupiedBeds = 0;
  let occupiedPhase1Beds = 0;
  let occupiedPhase2Beds = 0;
  let assignedNurses = 0;
  let assignedNursesByRole: Record<string, number> = {};
  nurseRoles.forEach(role => {
    assignedNursesByRole[role.id] = 0;
  });
  
  let patientId = 0;

  // Track bed turnover data
  const bedLastDeparture: number[] = new Array(beds).fill(-1);
  const bedTurnoverTimes: number[] = [];

  // Queues for different phases
  const arrivalQueue: Patient[] = []; // Queue for initial arrival
  const phase1Queue: Patient[] = [];  // Queue for Phase I

export interface PatientClass {
  id: string;
  name: string;
  color: string;
  meanStayMinutes: number;
  stdDevMinutes: number;
  isOvernight: boolean;
  averagePacuTime: number; // Add this property for PACU time calculation
  processType?: 'standard' | 'outpatient' | 'directTransfer'; // New property for process types
}

export interface SimulationParams {
  beds: number;
  nurses: number;
  nursePatientRatio: number;
  patientClasses: PatientClass[];
  patientClassDistribution: Record<string, number>;
  surgeryScheduleTemplate: SurgerySchedule;
  simulationDays: number;
  surgeryScheduleType: 'template' | 'custom';
  customSurgeryList?: SurgeryCase[]; // Optional custom surgery list
  blockScheduleEnabled?: boolean;
  orBlocks?: ORBlock[];
  ors?: OR[];
  optimizationWeights?: {
    peakOccupancy: number;  // α - weight for peak occupancy optimization
    overtime: number;       // β - weight for overtime minimization
    extraORCost: number;    // γ - weight for extra OR costs
    emergencyBuffer?: number; // Buffer time for emergency cases
  };
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

export interface Patient {
  id: number;
  classId: string;
  arrivalTime: number;
  stayDuration: number;
  careStartTime: number | null;
  departureTime: number | null;
  waitTime: number | null;
  nurseCareTime: number | null;
  surgeryData?: {   // Optional surgery details
    orRoom: string;
    scheduledStart: number;
    actualStart: number; // Removed the question mark from here
    duration: number;
  };
}

export interface SimulationResults {
  patients: Patient[];
  bedOccupancy: number[];
  nurseUtilization: number[];
  waitTimes: number[];
  meanWaitTime: number;
  p95WaitTime: number;
  maxBedOccupancy: number;
  meanBedOccupancy: number;
  maxNurseUtilization: number;
  meanNurseUtilization: number;
  patientTypeCount: Record<string, number>;
  orUtilization?: Record<string, number[]>; // Added OR utilization tracking
  peakTimes?: { time: number; occupancy: number }[]; // Peak occupancy times
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

export function runSimulation(params: SimulationParams): SimulationResults {
  const { 
    beds, 
    nurses, 
    nursePatientRatio, 
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
  const totalMinutes = simulationDays * 1440; // days * minutes in day
  const timeIncrement = 15; // Evaluate system state every 15 minutes
  const timePoints = Math.ceil(totalMinutes / timeIncrement);

  // Arrays to track metrics over time
  const bedOccupancy = new Array(timePoints).fill(0);
  const nurseUtilization = new Array(timePoints).fill(0);
  const patients: Patient[] = [];
  const waitTimes: number[] = [];
  const patientTypeCount: Record<string, number> = {};
  
  // Track OR utilization if using custom surgery list
  const orUtilization: Record<string, number[]> = {};
  
  // Initialize patient type counts
  patientClasses.forEach(pc => {
    patientTypeCount[pc.id] = 0;
  });

  // Current system state
  let occupiedBeds = 0;
  let assignedNurses = 0;
  let patientId = 0;

  // Queue of patients waiting for admission
  const admissionQueue: Patient[] = [];
  
  // Active patients in PACU
  const activePacuPatients: Patient[] = [];
  
  // Generate all surgery finish times (PACU arrivals)
  let allArrivals: number[] = [];
  
  // Variable to store scheduled cases if using block scheduling
  let blockScheduledCases: SurgeryCase[] = [];
  
  // Use custom surgery list or generate from template
  if (blockScheduleEnabled && orBlocks && orBlocks.length > 0) {
    // Use blocks to schedule surgeries
    const activeORs = ors?.filter(or => orBlocks.some(block => block.orId === or.id)) || [];
    
    // Calculate total OR cost
    const orCosts = activeORs.reduce((total, or) => total + (or.isExtra ? or.costPerDay : 0), 0);
    
    // Schedule cases based on blocks
    const averageDaily = surgeryScheduleTemplate.averageDailySurgeries;
    const totalSurgeries = Math.round(averageDaily * simulationDays);
    
    blockScheduledCases = scheduleCasesInBlocks(
      patientClasses, 
      orBlocks, 
      simulationDays,
      totalSurgeries
    );
    
    // Calculate surgery finish times from scheduled cases
    allArrivals = blockScheduledCases.map(surgery => {
      // Surgery finish time = start + duration
      return surgery.scheduledStartTime + surgery.duration;
    });
    
    // Calculate OR utilization
    const orIds = [...new Set(blockScheduledCases.map(s => s.orRoom))];
    orIds.forEach(orId => {
      orUtilization[orId] = new Array(timePoints).fill(0);
      
      // Mark time slots where OR is in use
      blockScheduledCases.forEach(surgery => {
        if (surgery.orRoom === orId) {
          const startSlot = Math.floor(surgery.scheduledStartTime / timeIncrement);
          const endSlot = Math.floor((surgery.scheduledStartTime + surgery.duration) / timeIncrement);
          
          for (let slot = startSlot; slot <= endSlot && slot < timePoints; slot++) {
            orUtilization[orId][slot] = 1;
          }
        }
      });
    });
    
    // Calculate overtime (time used outside regular hours)
    let overtimeMinutes = 0;
    for (const or of activeORs) {
      const orCases = blockScheduledCases.filter(s => s.orRoom === or.id);
      for (const surgeryCase of orCases) {
        const dayOfSurgery = Math.floor(surgeryCase.scheduledStartTime / 1440);
        const dayStartMinute = dayOfSurgery * 1440;
        const surgeryEnd = surgeryCase.scheduledStartTime + surgeryCase.duration;
        const dayCloseTime = dayStartMinute + or.closeTime;
        
        if (surgeryEnd > dayCloseTime) {
          overtimeMinutes += (surgeryEnd - dayCloseTime);
        }
      }
    }
    
    // Add block scheduling results
    const blockScheduleResults = {
      blocks: orBlocks,
      orUtilization: Object.fromEntries(
        Object.entries(orUtilization).map(([orId, slots]) => {
          // Calculate utilization percentage
          const usedSlots = slots.filter(s => s > 0).length;
          return [orId, usedSlots / slots.length];
        })
      ),
      totalCost: orCosts,
      overtimeMinutes
    };
    
    // Sort arrivals
    allArrivals.sort((a, b) => a - b);
  } else {
    // Use existing methods for surgery scheduling
    if (surgeryScheduleType === 'custom' && customSurgeryList && customSurgeryList.length > 0) {
      // Initialize OR tracking
      const orRooms = [...new Set(customSurgeryList.map(s => s.orRoom))];
      orRooms.forEach(room => {
        orUtilization[room] = new Array(timePoints).fill(0);
      });
      
      // Generate from custom list
      customSurgeryList.forEach((surgery) => {
        // Surgery finish time = start + duration
        const finishTime = surgery.scheduledStartTime + surgery.duration;
        allArrivals.push(finishTime);
        
        // Track OR utilization
        const startSlot = Math.floor(surgery.scheduledStartTime / timeIncrement);
        const endSlot = Math.floor(finishTime / timeIncrement);
        
        for (let slot = startSlot; slot <= endSlot && slot < timePoints; slot++) {
          orUtilization[surgery.orRoom][slot] = 1;
        }
      });
    } else {
      // Use template-based generation
      for (let day = 0; day < simulationDays; day++) {
        const dailyArrivals = generateDailySurgeryFinishTimes(day, surgeryScheduleTemplate);
        allArrivals.push(...dailyArrivals);
      }
    }

    allArrivals.sort((a, b) => a - b);
  }
  
  // Generate patients with their arrival times
  const allPatients: Patient[] = allArrivals.map((arrivalTime, index) => {
    // Determine patient class based on distribution
    const rand = Math.random();
    let cumulative = 0;
    let selectedClassId = patientClasses[0].id;
    
    // If using custom list or block schedule, get the patient class from the case
    if ((surgeryScheduleType === 'custom' && customSurgeryList) || 
        (blockScheduleEnabled && blockScheduledCases.length > 0)) {
      
      const surgeryCase = blockScheduleEnabled 
        ? blockScheduledCases.find(s => s.scheduledStartTime + s.duration === arrivalTime)
        : customSurgeryList?.find(s => s.scheduledStartTime + s.duration === arrivalTime);
        
      if (surgeryCase) {
        selectedClassId = surgeryCase.classId;
        
        // Create a patient with surgery data
        patientTypeCount[selectedClassId]++;
        const patientClass = patientClasses.find(pc => pc.id === selectedClassId)!;
        const stayDuration = Math.max(30, Math.round(
          logNormalRandom(patientClass.meanStayMinutes, patientClass.stdDevMinutes)
        ));
        
        return {
          id: patientId++,
          classId: selectedClassId,
          arrivalTime,
          stayDuration,
          careStartTime: null,
          departureTime: null,
          waitTime: null,
          nurseCareTime: null,
          surgeryData: {
            orRoom: surgeryCase.orRoom,
            scheduledStart: surgeryCase.scheduledStartTime,
            actualStart: surgeryCase.scheduledStartTime, // Fixed: removed question mark
            duration: surgeryCase.duration
          }
        };
      }
    }
    
    // Otherwise use the distribution
    for (const [classId, probability] of Object.entries(patientClassDistribution)) {
      cumulative += probability;
      if (rand <= cumulative) {
        selectedClassId = classId;
        break;
      }
    }
    
    patientTypeCount[selectedClassId]++;
    const patientClass = patientClasses.find(pc => pc.id === selectedClassId)!;
    
    // Generate stay duration using log-normal distribution
    const stayDuration = Math.max(30, Math.round(
      logNormalRandom(patientClass.meanStayMinutes, patientClass.stdDevMinutes)
    ));
    
    return {
      id: patientId++,
      classId: selectedClassId,
      arrivalTime,
      stayDuration,
      careStartTime: null,
      departureTime: null,
      waitTime: null,
      nurseCareTime: null
    };
  });
  
  // Track peak occupancy times
  const peakTimes: { time: number; occupancy: number }[] = [];

  // Process each time step
  for (let t = 0; t < totalMinutes; t += timeIncrement) {
    // Add new arrivals to queue
    while (allPatients.length > 0 && allPatients[0].arrivalTime <= t) {
      const patient = allPatients.shift()!;
      admissionQueue.push(patient);
    }
    
    // Process departures
    for (let i = activePacuPatients.length - 1; i >= 0; i--) {
      const patient = activePacuPatients[i];
      const patientClass = patientClasses.find(pc => pc.id === patient.classId)!;
      const careEndTime = patient.careStartTime! + patient.stayDuration;
      
      if (careEndTime <= t) {
        // Patient's care is complete
        
        // For overnight patients, only discharge during discharge hours
        if (patientClass.isOvernight) {
          const dischargeTime = getNextDischargeTime(careEndTime);
          if (dischargeTime <= t) {
            patient.departureTime = t;
            occupiedBeds--;
            
            // Remove from active patients
            activePacuPatients.splice(i, 1);
            patients.push(patient);
          }
        } else {
          // For non-overnight patients, discharge immediately
          patient.departureTime = t;
          occupiedBeds--;
          assignedNurses -= 1 / nursePatientRatio;
          
          // Remove from active patients
          activePacuPatients.splice(i, 1);
          patients.push(patient);
        }
      } else if (careEndTime - patient.nurseCareTime! <= t && assignedNurses > 0) {
        // Nurse care is complete but patient still needs to stay
        assignedNurses -= 1 / nursePatientRatio;
      }
    }
    
    // Try to admit patients from queue
    while (
      admissionQueue.length > 0 && 
      occupiedBeds < beds && 
      assignedNurses + (1 / nursePatientRatio) <= nurses
    ) {
      const patient = admissionQueue.shift()!;
      patient.careStartTime = t;
      patient.waitTime = t - patient.arrivalTime;
      
      waitTimes.push(patient.waitTime);
      
      // Determine nurse care time (typically shorter than total stay)
      const patientClass = patientClasses.find(pc => pc.id === patient.classId)!;
      patient.nurseCareTime = patientClass.isOvernight 
        ? Math.min(180, patient.stayDuration) // Maximum 3 hours of direct nurse care for overnight
        : patient.stayDuration; // Full stay for same-day discharge
      
      occupiedBeds++;
      assignedNurses += 1 / nursePatientRatio;
      
      activePacuPatients.push(patient);
    }
    
    // Record metrics at this time point
    const timeIndex = Math.floor(t / timeIncrement);
    if (timeIndex < bedOccupancy.length) {
      const currentBedOccupancy = occupiedBeds / beds;
      bedOccupancy[timeIndex] = currentBedOccupancy;
      nurseUtilization[timeIndex] = Math.min(1, assignedNurses / nurses);
      
      // Track peak times when occupancy is higher than 80%
      if (currentBedOccupancy > 0.8) {
        peakTimes.push({
          time: t,
          occupancy: currentBedOccupancy
        });
      }
    }
  }

  // Calculate summary statistics
  const meanWaitTime = waitTimes.length > 0 
    ? waitTimes.reduce((sum, val) => sum + val, 0) / waitTimes.length 
    : 0;
  
  waitTimes.sort((a, b) => a - b);
  const p95Index = Math.floor(waitTimes.length * 0.95);
  const p95WaitTime = waitTimes.length > 0 ? waitTimes[p95Index] || waitTimes[waitTimes.length - 1] : 0;
  
  const maxBedOccupancy = Math.max(...bedOccupancy);
  const meanBedOccupancy = bedOccupancy.reduce((sum, val) => sum + val, 0) / bedOccupancy.length;
  
  const maxNurseUtilization = Math.max(...nurseUtilization);
  const meanNurseUtilization = nurseUtilization.reduce((sum, val) => sum + val, 0) / nurseUtilization.length;

  const results: SimulationResults = {
    patients,
    bedOccupancy,
    nurseUtilization,
    waitTimes,
    meanWaitTime,
    p95WaitTime,
    maxBedOccupancy,
    meanBedOccupancy,
    maxNurseUtilization,
    meanNurseUtilization,
    patientTypeCount,
    orUtilization: Object.keys(orUtilization).length > 0 ? orUtilization : undefined,
    peakTimes: peakTimes.length > 0 ? peakTimes : undefined
  };
  
  if (blockScheduleEnabled && orBlocks && ors) {
    // Calculate utilization for each OR
    const orUtilizationSummary: Record<string, number> = {};
    for (const orId in orUtilization) {
      const slots = orUtilization[orId];
      const usedSlots = slots.filter(s => s > 0).length;
      orUtilizationSummary[orId] = usedSlots / slots.length;
    }
    
    // Calculate overtime
    let overtimeMinutes = 0;
    const activeORs = ors.filter(or => orBlocks.some(block => block.orId === or.id));
    for (const or of activeORs) {
      const orCases = blockScheduledCases.filter(s => s.orRoom === or.id);
      for (const surgeryCase of orCases) {
        const dayOfSurgery = Math.floor(surgeryCase.scheduledStartTime / 1440);
        const dayStartMinute = dayOfSurgery * 1440;
        const surgeryEnd = surgeryCase.scheduledStartTime + surgeryCase.duration;
        const dayCloseTime = dayStartMinute + or.closeTime;
        
        if (surgeryEnd > dayCloseTime) {
          overtimeMinutes += (surgeryEnd - dayCloseTime);
        }
      }
    }
    
    // Calculate total OR cost
    const orCost = activeORs.reduce((total, or) => {
      return total + (or.isExtra ? or.costPerDay : 0);
    }, 0);
    
    // Add block scheduling results
    results.blockSchedule = {
      blocks: orBlocks,
      orUtilization: orUtilizationSummary,
      totalCost: orCost,
      overtimeMinutes
    };
  }
  
  return results;
}

// Default patient classes
export const defaultPatientClasses: PatientClass[] = [
  {
    id: "A",
    name: "Same-day kotiutus",
    color: "#0ea5e9", // blue
    meanStayMinutes: 90,
    stdDevMinutes: 25,
    isOvernight: false,
    averagePacuTime: 90,
    processType: 'standard'
  },
  {
    id: "B",
    name: "Next-day kotiutus",
    color: "#22c55e", // green
    meanStayMinutes: 480, // 8 hours
    stdDevMinutes: 60,
    isOvernight: true,
    averagePacuTime: 480,
    processType: 'standard'
  },
  {
    id: "C",
    name: "Overnight → ward",
    color: "#eab308", // yellow
    meanStayMinutes: 540, // 9 hours
    stdDevMinutes: 90,
    isOvernight: true,
    averagePacuTime: 540,
    processType: 'standard'
  },
  {
    id: "D",
    name: "Standard PACU → ward",
    color: "#ef4444", // red
    meanStayMinutes: 150,
    stdDevMinutes: 30,
    isOvernight: false,
    averagePacuTime: 150,
    processType: 'standard'
  },
  {
    id: "E",
    name: "Polikliininen (ei heräämöä)",
    color: "#8b5cf6", // purple
    meanStayMinutes: 0, // No PACU stay
    stdDevMinutes: 0,
    isOvernight: false,
    averagePacuTime: 0,
    processType: 'outpatient'
  },
  {
    id: "F",
    name: "Suora siirto osastolle/teho",
    color: "#ec4899", // pink
    meanStayMinutes: 0, // No PACU stay
    stdDevMinutes: 0,
    isOvernight: false,
    averagePacuTime: 0,
    processType: 'directTransfer'
  }
];

// Default OR rooms
export const defaultOrRooms: string[] = ["OR-1", "OR-2", "OR-3", "OR-4", "OR-5", "OR-6"];

// Default distribution of patient classes
export const defaultPatientDistribution: Record<string, number> = {
  "A": 0.25,
  "B": 0.15,
  "C": 0.15,
  "D": 0.25,
  "E": 0.10,
  "F": 0.10
};

// Default surgery schedule
export const defaultSurgerySchedule: SurgerySchedule = {
  averageDailySurgeries: 25,
  hourlyDistribution: [
    0.05, 0.10, 0.15, 0.20, 0.15, 0.10, 0.10, 0.05, 0.05, 0.03, 0.02, 0
  ] // 8am to 8pm
};

// Default simulation parameters
export const defaultSimulationParams: SimulationParams = {
  beds: 12,
  nurses: 6,
  nursePatientRatio: 2,
  patientClasses: defaultPatientClasses,
  patientClassDistribution: defaultPatientDistribution,
  surgeryScheduleTemplate: defaultSurgerySchedule,
  simulationDays: 30,
  surgeryScheduleType: 'template',
  blockScheduleEnabled: false,
  ors: defaultORs.filter(or => !or.isExtra), // Include only non-extra ORs by default
  orBlocks: generateDefaultBlockSchedule(defaultORs.filter(or => !or.isExtra), 1), // Generate blocks for first day only
  optimizationWeights: {
    peakOccupancy: 1.0,
    overtime: 0.8,
    extraORCost: 0.3
  }
};

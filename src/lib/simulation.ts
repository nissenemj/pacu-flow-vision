import { v4 as uuidv4 } from 'uuid';

export interface SimulationParams {
  simulationDays: number;
  numberOfORs: number;
  averageDailySurgeries: number;
  patientClasses: PatientClass[];
  patientClassDistribution: Record<string, number>;
  surgeryScheduleType: 'template' | 'custom';
  customSurgeryList?: SurgeryCase[];
  surgeryScheduleTemplate: {
    averageDailySurgeries: number;
  };
  blockScheduleEnabled: boolean;
  orBlocks?: ORBlock[];
  // Add missing properties used in components
  beds?: number;
  nurses?: number;
  nursePatientRatio?: number;
}

export interface PatientClass {
  id: string;
  name: string;
  color: string;
  priority: number;
  surgeryDurationMean: number;
  surgeryDurationStd?: number;
  // Add missing properties used in components
  processType?: 'standard' | 'outpatient' | 'directTransfer';
  averagePacuTime?: number;
}

export interface ORBlock {
  id: string;
  orId: string;
  start: number; // minutes from day start
  end: number;   // minutes from day start
  allowedClasses: string[]; // patient class IDs
  day: number; // Day of the week (0 = Sunday, 6 = Saturday)
  label?: string;
  allowedProcedures: string[];
}

export interface SurgeryCase {
  id: string;
  classId: string;
  scheduledStartTime: number; // minutes from simulation start
  duration: number; // minutes
  orRoom: string;
  priority: number;
  arrivalTime: number;
}

export interface SimulationResults {
  surgeryList: SurgeryCase[];
  waitingTimes: number[];
  orUtilizations: Record<string, number>;
  patientClassCounts: Record<string, number>;
  averageWaitingTime: number;
  maxWaitingTime: number;
  totalSurgeries: number;
  // Add missing properties used in components
  meanWaitTime?: number;
  p95WaitTime?: number;
  meanBedOccupancy?: number;
  maxBedOccupancy?: number;
  meanNurseUtilization?: number;
  maxNurseUtilization?: number;
  patientTypeCount?: Record<string, number>;
  bedOccupancy?: number[];
  nurseUtilization?: number[];
  orUtilization?: Record<string, number[]>;
  peakTimes?: Array<{time: number, occupancy: number}>;
}

export const defaultPatientClasses: PatientClass[] = [
  { 
    id: 'A', 
    name: 'Luokka A', 
    color: '#1f77b4', 
    priority: 1, 
    surgeryDurationMean: 60, 
    surgeryDurationStd: 15,
    processType: 'standard',
    averagePacuTime: 120
  },
  { 
    id: 'B', 
    name: 'Luokka B', 
    color: '#ff7f0e', 
    priority: 2, 
    surgeryDurationMean: 90, 
    surgeryDurationStd: 20,
    processType: 'standard',
    averagePacuTime: 150
  },
  { 
    id: 'C', 
    name: 'Luokka C', 
    color: '#2ca02c', 
    priority: 3, 
    surgeryDurationMean: 120, 
    surgeryDurationStd: 30,
    processType: 'outpatient',
    averagePacuTime: 30
  },
  { 
    id: 'D', 
    name: 'Luokka D', 
    color: '#d62728', 
    priority: 4, 
    surgeryDurationMean: 180, 
    surgeryDurationStd: 45,
    processType: 'directTransfer',
    averagePacuTime: 0
  },
];

export const defaultSimulationParams: SimulationParams = {
  simulationDays: 30,
  numberOfORs: 3,
  averageDailySurgeries: 6,
  patientClasses: defaultPatientClasses,
  patientClassDistribution: {
    'A': 0.25,
    'B': 0.30,
    'C': 0.30,
    'D': 0.15,
  },
  surgeryScheduleType: 'template',
  surgeryScheduleTemplate: {
    averageDailySurgeries: 6,
  },
  blockScheduleEnabled: false,
  // Add default values for the new properties
  beds: 10,
  nurses: 5,
  nursePatientRatio: 2,
};

export function generateSurgeryList(
  params: SimulationParams
): SurgeryCase[] {
  const { simulationDays, numberOfORs, averageDailySurgeries, patientClasses, patientClassDistribution } = params;
  const surgeryList: SurgeryCase[] = [];
  let surgeryIdCounter = 1;

  for (let day = 0; day < simulationDays; day++) {
    for (let i = 0; i < averageDailySurgeries; i++) {
      const classId = weightedRandomSelection(patientClassDistribution);
      if (!classId) continue;

      const patientClass = patientClasses.find(pc => pc.id === classId);
      if (!patientClass) continue;

      const duration = Math.max(30, Math.round(normalRandom(patientClass.surgeryDurationMean, patientClass.surgeryDurationStd || 15)));
      const orRoom = `OR-${(i % numberOfORs) + 1}`;
      const scheduledStartTime = day * 1440 + (8 * 60) + (i % numberOfORs) * (8 * 60 / averageDailySurgeries); // Distribute surgeries throughout the day
      const arrivalTime = scheduledStartTime - Math.random() * 60; // Arrive up to 60 minutes early

      const surgery: SurgeryCase = {
        id: `S-${day + 1}-${surgeryIdCounter++}`,
        classId,
        scheduledStartTime,
        duration,
        orRoom,
        priority: patientClass.priority || 3,
        arrivalTime,
      };
      surgeryList.push(surgery);
    }
  }
  return surgeryList;
}

export function runSimulation(params: SimulationParams): SimulationResults {
  let surgeryList: SurgeryCase[];
  
  if (params.surgeryScheduleType === 'custom' && params.customSurgeryList) {
    surgeryList = params.customSurgeryList;
  } else {
    surgeryList = generateSurgeryList(params);
  }
  
  // Sort surgery list by scheduled start time and priority
  surgeryList.sort((a, b) => {
    if (a.scheduledStartTime === b.scheduledStartTime) {
      return a.priority - b.priority;
    }
    return a.scheduledStartTime - b.scheduledStartTime;
  });
  
  const waitingTimes: number[] = [];
  const orSchedules: Record<string, { endTime: number }> = {};
  const orUtilizations: Record<string, number> = {};
  const patientClassCounts: Record<string, number> = {};
  
  params.patientClasses.forEach(pc => {
    patientClassCounts[pc.id] = 0;
  });
  
  surgeryList.forEach(surgery => {
    const { orRoom, scheduledStartTime, duration, classId } = surgery;
    
    // Initialize OR schedule if it doesn't exist
    if (!orSchedules[orRoom]) {
      orSchedules[orRoom] = { endTime: 0 };
      orUtilizations[orRoom] = 0;
    }
    
    // Calculate waiting time
    const waitingTime = Math.max(0, orSchedules[orRoom].endTime - scheduledStartTime);
    waitingTimes.push(waitingTime);
    
    // Update OR schedule
    const actualStartTime = scheduledStartTime + waitingTime;
    orSchedules[orRoom].endTime = actualStartTime + duration;
    
    // Update OR utilization
    orUtilizations[orRoom] += duration;
    
    // Count patient classes
    patientClassCounts[classId] = (patientClassCounts[classId] || 0) + 1;
  });
  
  // Calculate total possible OR time
  Object.keys(orUtilizations).forEach(orRoom => {
    orUtilizations[orRoom] = orUtilizations[orRoom] / (params.simulationDays * 14 * 60); // 14 hours per day
  });
  
  const totalSurgeries = surgeryList.length;
  const averageWaitingTime = waitingTimes.length > 0 ? waitingTimes.reduce((sum, time) => sum + time, 0) / waitingTimes.length : 0;
  const maxWaitingTime = waitingTimes.length > 0 ? Math.max(...waitingTimes) : 0;
  
  // Generate more realistic time-based utilization data
  const timePoints = 24 * 4; // 15-minute intervals for a day
  const dayTimePoints = 24 * 4 * params.simulationDays;
  
  // Create bed occupancy based on surgery activity and recovery times
  const bedOccupancy = Array(timePoints).fill(0);
  const nurseUtilization = Array(timePoints).fill(0);
  const orUtilizationByRoom: Record<string, number[]> = {};
  
  // Initialize OR utilization arrays
  for (let i = 1; i <= params.numberOfORs; i++) {
    orUtilizationByRoom[`OR-${i}`] = Array(timePoints).fill(0);
  }
  
  // Calculate occupancy based on surgeries and recovery times
  surgeryList.forEach(surgery => {
    const patientClass = params.patientClasses.find(pc => pc.id === surgery.classId);
    if (!patientClass) return;
    
    // Find the day index and convert to 15-minute intervals
    const dayIndex = Math.floor(surgery.scheduledStartTime / 1440);
    const dayTime = surgery.scheduledStartTime % 1440; // Minutes since day start
    const timeIndex = Math.floor(dayTime / 15); // Index for the 15-minute interval
    
    // Duration in 15-minute blocks
    const durationBlocks = Math.ceil(surgery.duration / 15);
    
    // Add recovery time based on patient class
    const recoveryTime = patientClass.averagePacuTime || 0;
    const recoveryBlocks = Math.ceil(recoveryTime / 15);
    
    // Update OR utilization for this surgery's duration
    const roomName = surgery.orRoom;
    if (orUtilizationByRoom[roomName]) {
      for (let i = 0; i < durationBlocks; i++) {
        const idx = (timeIndex + i) % timePoints;
        orUtilizationByRoom[roomName][idx] += 0.25; // Add 15 minutes worth of utilization
      }
    }
    
    // Update bed occupancy for surgery and recovery
    // For outpatient procedures, we only consider PACU time, not regular bed occupancy
    if (patientClass.processType !== 'outpatient') {
      for (let i = 0; i < durationBlocks + recoveryBlocks; i++) {
        const idx = (timeIndex + i) % timePoints;
        // Increase occupancy, max 100%
        bedOccupancy[idx] = Math.min(1, bedOccupancy[idx] + 1 / (params.beds || 10));
      }
    } else {
      // For outpatient, only consider recovery time for bed occupancy
      for (let i = durationBlocks; i < durationBlocks + recoveryBlocks; i++) {
        const idx = (timeIndex + i) % timePoints;
        // Less impact on beds for outpatient
        bedOccupancy[idx] = Math.min(1, bedOccupancy[idx] + 0.5 / (params.beds || 10));
      }
    }
    
    // Update nurse utilization based on patient needs
    const nurseNeeded = patientClass.processType === 'outpatient' ? 0.5 : 1; 
    for (let i = 0; i < durationBlocks + recoveryBlocks; i++) {
      const idx = (timeIndex + i) % timePoints;
      nurseUtilization[idx] = Math.min(1, nurseUtilization[idx] + 
        nurseNeeded / (params.nurses || 5) / (params.nursePatientRatio || 2));
    }
  });
  
  // Add some base utilization for nights (lower) and apply some randomness
  const getNightFactor = (timeIndex: number) => {
    const hour = Math.floor((timeIndex * 15) / 60);
    // Lower utilization during night hours (22:00 - 06:00)
    return (hour >= 22 || hour < 6) ? 0.3 : 1;
  };
  
  // Apply time-of-day patterns and add some noise
  for (let i = 0; i < timePoints; i++) {
    const nightFactor = getNightFactor(i);
    
    // Add base utilization + noise for beds
    const baseBedUtilization = 0.1 * nightFactor; // Base bed utilization
    bedOccupancy[i] = Math.min(1, bedOccupancy[i] + baseBedUtilization + (Math.random() * 0.05));
    
    // Add base utilization + noise for nurses
    const baseNurseUtilization = 0.15 * nightFactor; // Base nurse utilization
    nurseUtilization[i] = Math.min(1, nurseUtilization[i] + baseNurseUtilization + (Math.random() * 0.05));
    
    // OR utilization should be almost zero during night hours
    Object.keys(orUtilizationByRoom).forEach(room => {
      if (nightFactor < 1) {
        orUtilizationByRoom[room][i] *= 0.1; // Minimal OR activity during night hours
      } else {
        // Add some random noise during day hours
        orUtilizationByRoom[room][i] = Math.min(1, orUtilizationByRoom[room][i] + (Math.random() * 0.05));
      }
    });
  }
  
  // Calculate average, max values
  const meanBedOccupancy = bedOccupancy.reduce((sum, val) => sum + val, 0) / bedOccupancy.length;
  const maxBedOccupancy = Math.max(...bedOccupancy);
  const meanNurseUtilization = nurseUtilization.reduce((sum, val) => sum + val, 0) / nurseUtilization.length;
  const maxNurseUtilization = Math.max(...nurseUtilization);
  
  // Calculate 95th percentile of wait time
  const sortedWaitTimes = [...waitingTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedWaitTimes.length * 0.95);
  const p95WaitTime = sortedWaitTimes[p95Index] || averageWaitingTime * 1.5;
  
  // Find peak times (times when bed occupancy > 80%)
  const peakTimes = bedOccupancy
    .map((occ, idx) => ({ time: idx, occupancy: occ }))
    .filter(item => item.occupancy > 0.8)
    .sort((a, b) => b.occupancy - a.occupancy) // Sort by occupancy descending
    .slice(0, 5); // Top 5 peaks
  
  return {
    surgeryList,
    waitingTimes,
    orUtilizations,
    patientClassCounts,
    averageWaitingTime,
    maxWaitingTime,
    totalSurgeries,
    // Add the generated data
    meanWaitTime: averageWaitingTime,
    p95WaitTime,
    meanBedOccupancy,
    maxBedOccupancy,
    meanNurseUtilization,
    maxNurseUtilization,
    patientTypeCount: patientClassCounts,
    bedOccupancy,
    nurseUtilization,
    orUtilization: orUtilizationByRoom,
    peakTimes,
  };
}

// Export scheduleCasesInBlocks-funktio, jotta sitä voidaan käyttää muualla
export function scheduleCasesInBlocks(
  blocks: ORBlock[],
  patientClasses: PatientClass[],
  patientDistribution: Record<string, number>,
  simulationDays: number
): SurgeryCase[] {
  const surgeryList: SurgeryCase[] = [];
  let surgeryIdCounter = 1;

  // Jokaiselle päivälle simulaation aikana
  for (let day = 0; day < simulationDays; day++) {
    // Käsitellään kunkin päivän blokit
    const dayBlocks = blocks.filter(block => block.day % simulationDays === day % simulationDays);
    
    // Järjestetään blokit alkamisajan mukaan
    dayBlocks.sort((a, b) => a.start - b.start);
    
    // Käsitellään jokainen blokki
    for (const block of dayBlocks) {
      // Laske blokin kesto minuutteina
      const blockDurationMinutes = block.end - block.start;
      
      // Määritä kuinka monta leikkausta tähän blokkiin voidaan mahdollisesti tehdä
      // Oletetaan keskimäärin 90 minuutin leikkauksia (tämä on karkea arvio)
      const estimatedSurgeriesPerBlock = Math.floor(blockDurationMinutes / 90);
      
      if (estimatedSurgeriesPerBlock <= 0) continue;
      
      // Selvitetään mitkä potilasluokat ovat sallittuja tälle blokille
      const allowedClasses = block.allowedClasses.filter(id => 
        patientClasses.some(pc => pc.id === id)
      );
      
      if (allowedClasses.length === 0) continue;
      
      // Lasketaan sallittujen luokkien todennäköisyyksien summa
      const totalProbability = allowedClasses.reduce((sum, id) => 
        sum + (patientDistribution[id] || 0), 0
      );
      
      // Normalisoidaan todennäköisyydet tämän blokin sisällä
      const normalizedDistribution: Record<string, number> = {};
      allowedClasses.forEach(id => {
        normalizedDistribution[id] = totalProbability > 0 
          ? (patientDistribution[id] || 0) / totalProbability 
          : 1 / allowedClasses.length;
      });
      
      // Luodaan leikkauksia tähän blokkiin
      let currentTime = block.start;
      let remainingTime = blockDurationMinutes;
      
      for (let i = 0; i < estimatedSurgeriesPerBlock && remainingTime > 30; i++) {
        // Valitaan potilasluokka painotetulla satunnaisvalinnalla
        const classId = weightedRandomSelection(normalizedDistribution);
        
        if (!classId) continue;
        
        const patientClass = patientClasses.find(pc => pc.id === classId);
        
        if (!patientClass) continue;
        
        // Määritetään leikkauksen kesto potilasluokan mukaan
        // Käytetään normaalijakaumaa vaihteluun
        const meanDuration = patientClass.surgeryDurationMean;
        const stdDuration = patientClass.surgeryDurationStd || 15;
        
        // Normaalijakauman mukainen satunnainen kesto, vähintään 30 min
        let duration = Math.max(30, Math.round(normalRandom(meanDuration, stdDuration)));
        
        // Varmistetaan että leikkaus mahtuu jäljellä olevaan aikaan tai lyhennetään sitä
        if (duration > remainingTime) {
          duration = remainingTime;
        }
        
        // Luodaan uusi leikkaus
        const surgery: SurgeryCase = {
          id: `S-${day + 1}-${surgeryIdCounter++}`,
          classId,
          scheduledStartTime: day * 1440 + currentTime,
          duration,
          orRoom: block.orId,
          priority: patientClass.priority || 3,
          arrivalTime: day * 1440 + currentTime, // Oletetaan saapuvan juuri ennen leikkausta
        };
        
        surgeryList.push(surgery);
        
        // Päivitetään ajat
        currentTime += duration;
        remainingTime -= duration;
      }
    }
  }
  
  return surgeryList;
}

// Apufunktio painotettuun satunnaisvalintaan
function weightedRandomSelection(probabilities: Record<string, number>): string | null {
  const items = Object.keys(probabilities);
  if (items.length === 0) return null;
  
  const weights = Object.values(probabilities);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  if (totalWeight <= 0) return items[Math.floor(Math.random() * items.length)];
  
  const randomValue = Math.random() * totalWeight;
  let cumulativeWeight = 0;
  
  for (let i = 0; i < items.length; i++) {
    cumulativeWeight += weights[i];
    if (randomValue <= cumulativeWeight) return items[i];
  }
  
  return items[items.length - 1];
}

// Normaalisti jakautunut satunnaisluku
function normalRandom(mean: number, stdDev: number): number {
  const u1 = 1 - Math.random();
  const u2 = 1 - Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdDev * randStdNormal;
}

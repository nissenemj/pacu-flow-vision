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
}

export interface PatientClass {
  id: string;
  name: string;
  color: string;
  priority: number;
  surgeryDurationMean: number;
  surgeryDurationStd?: number;
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
}

export const defaultPatientClasses: PatientClass[] = [
  { id: 'A', name: 'Luokka A', color: '#1f77b4', priority: 1, surgeryDurationMean: 60, surgeryDurationStd: 15 },
  { id: 'B', name: 'Luokka B', color: '#ff7f0e', priority: 2, surgeryDurationMean: 90, surgeryDurationStd: 20 },
  { id: 'C', name: 'Luokka C', color: '#2ca02c', priority: 3, surgeryDurationMean: 120, surgeryDurationStd: 30 },
  { id: 'D', name: 'Luokka D', color: '#d62728', priority: 4, surgeryDurationMean: 180, surgeryDurationStd: 45 },
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
  
  return {
    surgeryList,
    waitingTimes,
    orUtilizations,
    patientClassCounts,
    averageWaitingTime,
    maxWaitingTime,
    totalSurgeries,
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

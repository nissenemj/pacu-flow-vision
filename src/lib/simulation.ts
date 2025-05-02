
export interface PatientClass {
  id: string;
  name: string;
  color: string;
  meanStayMinutes: number;
  stdDevMinutes: number;
  isOvernight: boolean;
}

export interface SimulationParams {
  beds: number;
  nurses: number;
  nursePatientRatio: number;
  patientClasses: PatientClass[];
  patientClassDistribution: Record<string, number>;
  surgeryScheduleTemplate: SurgerySchedule;
  simulationDays: number;
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

export function runSimulation(params: SimulationParams): SimulationResults {
  const { 
    beds, 
    nurses, 
    nursePatientRatio, 
    patientClasses, 
    patientClassDistribution,
    surgeryScheduleTemplate,
    simulationDays
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
  const allArrivals: number[] = [];
  for (let day = 0; day < simulationDays; day++) {
    const dailyArrivals = generateDailySurgeryFinishTimes(day, surgeryScheduleTemplate);
    allArrivals.push(...dailyArrivals);
  }

  allArrivals.sort((a, b) => a - b);
  
  // Generate patients with their arrival times
  const allPatients: Patient[] = allArrivals.map((arrivalTime, index) => {
    // Determine patient class based on distribution
    const rand = Math.random();
    let cumulative = 0;
    let selectedClassId = patientClasses[0].id;
    
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
      bedOccupancy[timeIndex] = occupiedBeds / beds;
      nurseUtilization[timeIndex] = Math.min(1, assignedNurses / nurses);
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

  return {
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
    patientTypeCount
  };
}

// Default patient classes
export const defaultPatientClasses: PatientClass[] = [
  {
    id: "A",
    name: "Same-day kotiutus",
    color: "#0ea5e9", // blue
    meanStayMinutes: 90,
    stdDevMinutes: 25,
    isOvernight: false
  },
  {
    id: "B",
    name: "Next-day kotiutus",
    color: "#22c55e", // green
    meanStayMinutes: 480, // 8 hours
    stdDevMinutes: 60,
    isOvernight: true
  },
  {
    id: "C",
    name: "Overnight → ward",
    color: "#eab308", // yellow
    meanStayMinutes: 540, // 9 hours
    stdDevMinutes: 90,
    isOvernight: true
  },
  {
    id: "D",
    name: "Standard PACU → ward",
    color: "#ef4444", // red
    meanStayMinutes: 150,
    stdDevMinutes: 30,
    isOvernight: false
  }
];

// Default distribution of patient classes
export const defaultPatientDistribution: Record<string, number> = {
  "A": 0.30,
  "B": 0.20,
  "C": 0.15,
  "D": 0.35
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
  simulationDays: 30
};

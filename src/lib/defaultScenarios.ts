import { v4 as uuidv4 } from "uuid";
import { 
  SimulationParams, 
  defaultPatientClasses, 
  defaultNurseSkills, 
  defaultNurseShifts, 
  defaultCostParams,
  SurgeryCaseInput,
  ORBlock,
  runSimulation
} from "./simulation";
import { OptimizationParams } from "./optimizer";

// Define a realistic OR block schedule
export const realisticORBlocks: ORBlock[] = [
  // Monday blocks
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 480, // 8:00 AM
    end: 720, // 12:00 PM
    allowedClasses: ["HERKO", "PAIKI"],
    day: 0, // Monday
    label: "Aamupäivä HERKO/PÄIKI",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 720, // 12:00 PM
    end: 960, // 16:00 PM
    allowedClasses: ["PAIKI"],
    day: 0, // Monday
    label: "Iltapäivä PÄIKI",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-2",
    start: 480, // 8:00 AM
    end: 960, // 16:00 PM
    allowedClasses: ["OSASTO"],
    day: 0, // Monday
    label: "Koko päivä OSASTO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-3",
    start: 480, // 8:00 AM
    end: 720, // 12:00 PM
    allowedClasses: ["PKL"],
    day: 0, // Monday
    label: "Aamupäivä PKL",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-3",
    start: 720, // 12:00 PM
    end: 960, // 16:00 PM
    allowedClasses: ["HERKO"],
    day: 0, // Monday
    label: "Iltapäivä HERKO",
  },

  // Tuesday blocks
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 480, // 8:00 AM
    end: 960, // 16:00 PM
    allowedClasses: ["PAIKI"],
    day: 1, // Tuesday
    label: "Koko päivä PÄIKI",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-2",
    start: 480, // 8:00 AM
    end: 720, // 12:00 PM
    allowedClasses: ["HERKO"],
    day: 1, // Tuesday
    label: "Aamupäivä HERKO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-2",
    start: 720, // 12:00 PM
    end: 960, // 16:00 PM
    allowedClasses: ["OSASTO"],
    day: 1, // Tuesday
    label: "Iltapäivä OSASTO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-3",
    start: 480, // 8:00 AM
    end: 960, // 16:00 PM
    allowedClasses: ["PKL", "HERKO"],
    day: 1, // Tuesday
    label: "Koko päivä PKL/HERKO",
  },

  // Wednesday blocks
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 480, // 8:00 AM
    end: 720, // 12:00 PM
    allowedClasses: ["OSASTO"],
    day: 2, // Wednesday
    label: "Aamupäivä OSASTO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 720, // 12:00 PM
    end: 960, // 16:00 PM
    allowedClasses: ["HERKO"],
    day: 2, // Wednesday
    label: "Iltapäivä HERKO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-2",
    start: 480, // 8:00 AM
    end: 960, // 16:00 PM
    allowedClasses: ["PAIKI"],
    day: 2, // Wednesday
    label: "Koko päivä PÄIKI",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-3",
    start: 480, // 8:00 AM
    end: 960, // 16:00 PM
    allowedClasses: ["PKL"],
    day: 2, // Wednesday
    label: "Koko päivä PKL",
  },

  // Thursday blocks
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 480, // 8:00 AM
    end: 960, // 16:00 PM
    allowedClasses: ["HERKO", "PAIKI"],
    day: 3, // Thursday
    label: "Koko päivä HERKO/PÄIKI",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-2",
    start: 480, // 8:00 AM
    end: 960, // 16:00 PM
    allowedClasses: ["OSASTO"],
    day: 3, // Thursday
    label: "Koko päivä OSASTO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-3",
    start: 480, // 8:00 AM
    end: 720, // 12:00 PM
    allowedClasses: ["PKL"],
    day: 3, // Thursday
    label: "Aamupäivä PKL",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-3",
    start: 720, // 12:00 PM
    end: 960, // 16:00 PM
    allowedClasses: ["PAIKI"],
    day: 3, // Thursday
    label: "Iltapäivä PÄIKI",
  },

  // Friday blocks
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 480, // 8:00 AM
    end: 720, // 12:00 PM
    allowedClasses: ["PAIKI"],
    day: 4, // Friday
    label: "Aamupäivä PÄIKI",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-1",
    start: 720, // 12:00 PM
    end: 900, // 15:00 PM (shorter Friday)
    allowedClasses: ["HERKO"],
    day: 4, // Friday
    label: "Iltapäivä HERKO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-2",
    start: 480, // 8:00 AM
    end: 900, // 15:00 PM (shorter Friday)
    allowedClasses: ["OSASTO"],
    day: 4, // Friday
    label: "Koko päivä OSASTO",
  },
  {
    id: `block-${uuidv4().substring(0, 8)}`,
    orId: "OR-3",
    start: 480, // 8:00 AM
    end: 900, // 15:00 PM (shorter Friday)
    allowedClasses: ["PKL", "PAIKI"],
    day: 4, // Friday
    label: "Koko päivä PKL/PÄIKI",
  },
];

// Define realistic simulation parameters
export const realisticSimulationParams: SimulationParams = {
  simulationDays: 5, // One work week
  numberOfORs: 3,
  patientClasses: defaultPatientClasses,
  patientClassDistribution: { 
    HERKO: 0.30, 
    OSASTO: 0.25, 
    PAIKI: 0.35, 
    PKL: 0.10 
  },
  surgeryScheduleType: "custom", // Use custom surgery list generated from blocks
  surgeryScheduleTemplate: { averageDailySurgeries: 8 }, // Higher than default
  blockScheduleEnabled: true,
  orBlocks: realisticORBlocks,
  pacuParams: { 
    phase1Beds: 6, // More phase 1 beds
    phase2Beds: 8  // More phase 2 beds
  },
  wardParams: { 
    totalBeds: 24  // More ward beds
  },
  staffParams: {
    totalNurses: 12, // More nurses
    phase1NurseRatio: 1,
    phase2NurseRatio: 2,
    useEnhancedNurseModel: true, // Use enhanced nurse model
    nurseSkills: defaultNurseSkills,
    nurseShifts: defaultNurseShifts,
    overtimeMultiplier: 1.5,
  },
  emergencyParams: {
    enabled: true,
    arrivalRateMeanPerDay: 1.5, // Slightly higher emergency rate
    patientClassDistribution: { HERKO: 0.4, OSASTO: 0.6 },
  },
  costParams: {
    ...defaultCostParams,
    costPerORMinute: 12.0, // Higher OR cost
    costPerCancellation: 600.0, // Higher cancellation cost
  },
  // Legacy properties
  beds: 24,
  nurses: 12,
  nursePatientRatio: 2,
};

// Define realistic optimization parameters
export const realisticOptimizationParams: OptimizationParams = {
  alpha: 1.2, // Higher weight for peak occupancy
  beta: 0.8,  // Higher weight for nurse utilization
  gamma: 0.3, // Higher weight for cost
  maxIterations: 800, // More iterations for better results
  initialTemperature: 1200,
  coolingRate: 0.97, // Slower cooling for more exploration
};

// Generate a realistic surgery list from the blocks
export function generateRealisticSurgeryList(): SurgeryCaseInput[] {
  // This will be populated by the simulation when loading the scenario
  return [];
}

// Run the simulation with realistic parameters to get results
export function generateRealisticResults() {
  try {
    return runSimulation(realisticSimulationParams);
  } catch (error) {
    console.error("Error generating realistic results:", error);
    return null;
  }
}

// Create a complete realistic scenario
export const realisticScenario = {
  id: `scenario-realistic-${uuidv4().substring(0, 8)}`,
  name: "Realistinen PACU-malli",
  description: "Realistinen malli PACU-virtauksen simulointiin ja optimointiin. Sisältää blokkiaikataulun ja parannellun hoitajamallin.",
  date: new Date().toISOString(),
  params: realisticSimulationParams,
  results: null, // Will be populated when loaded
  optParams: realisticOptimizationParams,
  blocks: realisticORBlocks,
  surgeryList: [], // Will be populated when loaded
  scheduleType: "custom" as const,
  tags: ["realistinen", "blokit", "hoitajamalli", "optimointi"],
};

// Local storage key for scenarios
export const SCENARIOS_STORAGE_KEY = 'pacu-simulator-scenarios';

// Function to initialize the default scenario in local storage
export function initializeDefaultScenario() {
  try {
    // Check if scenarios already exist in local storage
    const savedScenarios = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    let scenarios = [];
    
    if (savedScenarios) {
      scenarios = JSON.parse(savedScenarios);
      
      // Check if the realistic scenario already exists
      const exists = scenarios.some(s => s.name === realisticScenario.name);
      if (exists) {
        console.log("Realistic scenario already exists in local storage");
        return;
      }
    }
    
    // Add the realistic scenario to the list
    scenarios.push(realisticScenario);
    
    // Save the updated list to local storage
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
    console.log("Realistic scenario added to local storage");
  } catch (error) {
    console.error("Error initializing default scenario:", error);
  }
}

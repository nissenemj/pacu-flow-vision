import { v4 as uuidv4 } from 'uuid';

// --- Utility Functions ---

class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];
  enqueue(element: T, priority: number): void {
    const queueElement = { element, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].priority > queueElement.priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }
    if (!added) this.items.push(queueElement);
  }
  dequeue(): T | undefined { return this.items.shift()?.element; }
  isEmpty(): boolean { return this.items.length === 0; }
  peek(): T | undefined { return this.items[0]?.element; }
  get length(): number { return this.items.length; }
}

function normalRandom(mean: number, stdDev: number): number {
  if (stdDev <= 0) return mean;
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, mean + stdDev * z);
}

function weightedRandomSelection(distribution: Record<string, number>): string | null {
  const totalWeight = Object.values(distribution).reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return null;
  let random = Math.random() * totalWeight;
  for (const id in distribution) {
    if (random < distribution[id]) return id;
    random -= distribution[id];
  }
  return Object.keys(distribution).pop() || null;
}

function exponentialRandom(rate: number): number {
    if (rate <= 0) return Infinity;
    return -Math.log(1.0 - Math.random()) / rate;
}

// --- Interfaces ---

export interface WardParams {
  totalBeds: number;
}

export interface StaffParams {
  totalNurses: number;
  phase1NurseRatio: number;
  phase2NurseRatio: number;
}

export interface PacuParams {
  phase1Beds: number;
  phase2Beds: number;
}

export interface EmergencyParams {
  enabled: boolean;
  arrivalRateMeanPerDay?: number;
  patientClassDistribution?: Record<string, number>;
}

// Add Cost Parameters Interface
export interface CostParams {
    costPerORMinute: number;
    costPerPACU1BedMinute: number;
    costPerPACU2BedMinute: number;
    costPerNurseMinute: number;
    costPerWardBedMinute: number; // Optional, if ward costs are tracked
    costPerCancellation?: number; // Optional
    // Add other relevant costs (e.g., overtime multiplier)
}

export interface SimulationParams {
  simulationDays: number;
  numberOfORs: number;
  patientClasses: PatientClass[];
  patientClassDistribution: Record<string, number>;
  surgeryScheduleType: 'template' | 'custom';
  customSurgeryList?: SurgeryCaseInput[];
  surgeryScheduleTemplate: { averageDailySurgeries: number };
  blockScheduleEnabled: boolean;
  orBlocks?: ORBlock[];
  pacuParams: PacuParams;
  wardParams: WardParams;
  staffParams: StaffParams;
  emergencyParams: EmergencyParams;
  costParams: CostParams; // Added cost parameters
  // Legacy properties for backward compatibility
  beds?: number;
  nurses?: number;
  nursePatientRatio?: number;
  averageDailySurgeries?: number;
}

export interface PatientClass {
  id: string;
  name: string;
  color: string;
  priority: number;
  surgeryDurationMean: number;
  surgeryDurationStd: number;
  processType: 'standard' | 'outpatient' | 'directTransfer';
  pacuPhase1DurationMean: number;
  pacuPhase1DurationStd: number;
  pacuPhase2DurationMean: number;
  pacuPhase2DurationStd: number;
  // Legacy property for backward compatibility
  averagePacuTime?: number;
}

export interface ORBlock {
  id: string;
  orId: string;
  start: number;
  end: number;
  allowedClasses: string[];
  day: number;
  label?: string;
  allowedProcedures?: string[];
}

export interface SurgeryCaseInput {
  id?: string;
  classId: string;
  scheduledStartTime: number;
  duration?: number;
  orRoom: string;
  priority?: number;
  actualArrivalTime?: number;
}

// For backward compatibility with existing code
export type SurgeryCase = SurgeryCaseInput & {
  id: string;
  caseType?: 'elective' | 'emergency';
  actualArrivalTime: number;
  duration: number;
  priority: number;
  orStartTime?: number;
  orEndTime?: number;
  pacuPhase1StartTime?: number;
  pacuPhase1EndTime?: number;
  pacuPhase2StartTime?: number;
  pacuPhase2EndTime?: number;
  readyForWardTime?: number;
  wardArrivalTime?: number;
  dischargeTime?: number;
  pacuPhase1BedId?: string;
  pacuPhase2BedId?: string;
  wardBedId?: string;
  assignedNurseId?: string;
  currentState?: 'scheduled' | 'arrived' | 'waiting_or' | 'in_or' | 'waiting_pacu1' | 'in_pacu1' | 'waiting_pacu2' | 'in_pacu2' | 'waiting_ward' | 'in_ward' | 'discharged' | 'cancelled';
  wardTransferDelay?: number;
  orWaitingTime?: number;
  arrivalTime?: number; // For backwards compatibility
}

export interface SimulationEvent {
  time: number;
  type: 'PATIENT_ARRIVAL' | 'OR_AVAILABLE' | 'SURGERY_END' | 'PACU1_END' | 'PACU2_END' | 'WARD_BED_AVAILABLE' | 'DISCHARGE_CRITERIA_MET' | 'NURSE_AVAILABLE' | 'EMERGENCY_ARRIVAL' | 'SIMULATION_END_CHECK';
  patientId?: string;
  resourceId?: string;
}

export interface ResourceState {
    id: string;
    isBusy: boolean;
    busyUntil: number;
    assignedPatientId?: string;
    // Cost tracking per resource
    totalBusyTime: number;
    lastBusyStartTime: number;
}

export interface SimulationResults {
  completedSurgeries: SurgeryCase[];
  cancelledSurgeries: SurgeryCase[];
  meanORWaitingTime: number;
  p95ORWaitingTime: number;
  meanPacuTime: number;
  meanWardTransferDelay: number;
  p95WardTransferDelay: number;
  pacuBlockedTimeRatio: number;
  orUtilization: Record<string, number>;
  meanPacuPhase1BedOccupancy: number;
  meanPacuPhase2BedOccupancy: number;
  meanWardBedOccupancy: number;
  peakPacuPhase1BedOccupancy: number;
  peakPacuPhase2BedOccupancy: number;
  peakWardBedOccupancy: number;
  meanNurseUtilization: number;
  peakNurseUtilization: number;
  overtimeHours: number;
  pacuPhase1OccupancyData: Array<{ time: number; count: number }>;
  pacuPhase2OccupancyData: Array<{ time: number; count: number }>;
  wardOccupancyData: Array<{ time: number; count: number }>;
  nurseUtilizationData: Array<{ time: number; busyCount: number }>;
  wardTransferDelayDistribution: number[];
  orWaitingTimeDistribution: number[];
  totalCost: number;
  costBreakdown: {
      orCost: number;
      pacu1Cost: number;
      pacu2Cost: number;
      nurseCost: number;
      wardCost: number;
      cancellationCost: number;
  };
  
  // Legacy properties for backward compatibility with existing components
  surgeryList?: SurgeryCase[];
  waitingTimes?: number[];
  orUtilizations?: Record<string, number>;
  patientClassCounts?: Record<string, number>;
  averageWaitingTime?: number;
  maxWaitingTime?: number;
  totalSurgeries?: number;
  meanWaitTime?: number;
  p95WaitTime?: number;
  meanBedOccupancy?: number;
  maxBedOccupancy?: number;
  maxNurseUtilization?: number;
  patientTypeCount?: Record<string, number>;
  bedOccupancy?: number[];
  nurseUtilization?: number[];
  peakTimes?: Array<{time: number, occupancy: number}>;
}

// --- Default Values ---

export const defaultPatientClasses: PatientClass[] = [
  { 
    id: 'A', 
    name: 'Luokka A', 
    color: '#1f77b4', 
    priority: 1, 
    surgeryDurationMean: 60, 
    surgeryDurationStd: 15, 
    processType: 'standard', 
    pacuPhase1DurationMean: 60, 
    pacuPhase1DurationStd: 15, 
    pacuPhase2DurationMean: 60, 
    pacuPhase2DurationStd: 15,
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
    pacuPhase1DurationMean: 75, 
    pacuPhase1DurationStd: 20, 
    pacuPhase2DurationMean: 75, 
    pacuPhase2DurationStd: 20,
    averagePacuTime: 150
  },
  { 
    id: 'C', 
    name: 'Luokka C (Päiki)', 
    color: '#2ca02c', 
    priority: 3, 
    surgeryDurationMean: 120, 
    surgeryDurationStd: 30, 
    processType: 'outpatient', 
    pacuPhase1DurationMean: 45, 
    pacuPhase1DurationStd: 10, 
    pacuPhase2DurationMean: 90, 
    pacuPhase2DurationStd: 25,
    averagePacuTime: 30
  },
  { 
    id: 'D', 
    name: 'Luokka D (Suora)', 
    color: '#d62728', 
    priority: 4, 
    surgeryDurationMean: 180, 
    surgeryDurationStd: 45, 
    processType: 'directTransfer', 
    pacuPhase1DurationMean: 0, 
    pacuPhase1DurationStd: 0, 
    pacuPhase2DurationMean: 0, 
    pacuPhase2DurationStd: 0,
    averagePacuTime: 0
  },
];

export const defaultCostParams: CostParams = {
    costPerORMinute: 10.0,
    costPerPACU1BedMinute: 2.0,
    costPerPACU2BedMinute: 1.5,
    costPerNurseMinute: 1.0,
    costPerWardBedMinute: 0.5,
    costPerCancellation: 500.0,
};

export const defaultSimulationParams: SimulationParams = {
  simulationDays: 5,
  numberOfORs: 3,
  patientClasses: defaultPatientClasses,
  patientClassDistribution: { 'A': 0.25, 'B': 0.30, 'C': 0.30, 'D': 0.15 },
  surgeryScheduleType: 'template',
  surgeryScheduleTemplate: { averageDailySurgeries: 6 },
  blockScheduleEnabled: false,
  pacuParams: { phase1Beds: 4, phase2Beds: 6 },
  wardParams: { totalBeds: 20 },
  staffParams: { totalNurses: 10, phase1NurseRatio: 1, phase2NurseRatio: 2 },
  emergencyParams: { enabled: true, arrivalRateMeanPerDay: 1, patientClassDistribution: { 'A': 0.4, 'B': 0.6 } },
  costParams: defaultCostParams,
  // Legacy properties
  beds: 10,
  nurses: 5,
  nursePatientRatio: 2,
};

// --- Discrete Event Simulation Logic ---

export function runSimulation(params: SimulationParams): SimulationResults {
  // --- Initialization ---
  let currentTime = 0;
  const simulationEndTime = params.simulationDays * 24 * 60;
  const eventQueue = new PriorityQueue<SimulationEvent>();
  const patients: Record<string, SurgeryCase> = {};
  let emergencyCounter = 0;

  // Resource Pools with cost tracking
  const createResourcePool = (prefix: string, count: number): Record<string, ResourceState> => {
      const pool: Record<string, ResourceState> = {};
      for (let i = 1; i <= count; i++) {
          pool[`${prefix}-${i}`] = { id: `${prefix}-${i}`, isBusy: false, busyUntil: 0, totalBusyTime: 0, lastBusyStartTime: 0 };
      }
      return pool;
  };
  const orResources = createResourcePool('OR', params.numberOfORs);
  const pacu1Beds = createResourcePool('P1', params.pacuParams?.phase1Beds || 0);
  const pacu2Beds = createResourcePool('P2', params.pacuParams?.phase2Beds || 0);
  const wardBeds = createResourcePool('W', params.wardParams?.totalBeds || params.beds || 10);
  const nurses = createResourcePool('N', params.staffParams?.totalNurses || params.nurses || 5);

  // Waiting Queues
  const orWaitingQueue = new PriorityQueue<string>();
  const pacu1WaitingQueue = new PriorityQueue<string>();
  const pacu2WaitingQueue = new PriorityQueue<string>();
  const wardWaitingQueue = new PriorityQueue<string>();
  const nurseWaitingQueue = new PriorityQueue<{ patientId: string, phase: 'pacu1' | 'pacu2' }>();

  // Statistics & Cost Collection
  const completedSurgeries: SurgeryCase[] = [];
  const cancelledSurgeries: SurgeryCase[] = [];
  const wardTransferDelays: number[] = [];
  const orWaitingTimes: number[] = [];
  const occupancyData = {
      pacu1: [{ time: 0, count: 0 }],
      pacu2: [{ time: 0, count: 0 }],
      ward: [{ time: 0, count: 0 }],
      nurse: [{ time: 0, busyCount: 0 }],
  };
  let totalPacuBlockedTime = 0;
  let lastStatsUpdateTime = 0;
  // Initialize costs
  let totalORCost = 0;
  let totalPACU1Cost = 0;
  let totalPACU2Cost = 0;
  let totalNurseCost = 0;
  let totalWardCost = 0;
  let totalCancellationCost = 0;

  // --- Helper Functions within Simulation Scope ---

  const findAvailableResource = (pool: Record<string, ResourceState>): ResourceState | null => {
    for (const id in pool) {
      if (!pool[id].isBusy) return pool[id];
    }
    return null;
  };

  const addEvent = (time: number, type: SimulationEvent['type'], data?: Omit<SimulationEvent, 'time' | 'type'>) => {
    if (time < currentTime) time = currentTime;
    if (time >= simulationEndTime && type !== 'SIMULATION_END_CHECK') return;
    eventQueue.enqueue({ time, type, ...data }, time);
  };

  const getPatient = (patientId: string): SurgeryCase | null => patients[patientId] || null;
  const getPatientClass = (patient: SurgeryCase): PatientClass | null => params.patientClasses.find(p => p.id === patient.classId) || null;

  // Helper to update resource busy time and cost
  const updateResourceUsage = (resource: ResourceState, isEnding: boolean, time: number) => {
      if (isEnding && resource.isBusy) {
          const duration = time - resource.lastBusyStartTime;
          if (duration > 0) {
              resource.totalBusyTime += duration;
              // Accumulate cost based on resource type
              if (resource.id.startsWith('OR')) totalORCost += duration * (params.costParams?.costPerORMinute || 0);
              else if (resource.id.startsWith('P1')) totalPACU1Cost += duration * (params.costParams?.costPerPACU1BedMinute || 0);
              else if (resource.id.startsWith('P2')) totalPACU2Cost += duration * (params.costParams?.costPerPACU2BedMinute || 0);
              else if (resource.id.startsWith('N')) totalNurseCost += duration * (params.costParams?.costPerNurseMinute || 0);
              else if (resource.id.startsWith('W')) totalWardCost += duration * (params.costParams?.costPerWardBedMinute || 0);
          }
          resource.isBusy = false;
          resource.assignedPatientId = undefined;
      } else if (!isEnding && !resource.isBusy) {
          resource.isBusy = true;
          resource.lastBusyStartTime = time;
      }
  };

  const updateStats = (time: number) => {
    const duration = time - lastStatsUpdateTime;
    if (duration <= 0) return;

    const p1Busy = Object.values(pacu1Beds).filter(b => b.isBusy).length;
    const p2Busy = Object.values(pacu2Beds).filter(b => b.isBusy).length;
    const wardBusy = Object.values(wardBeds).filter(b => b.isBusy).length;
    const nurseBusy = Object.values(nurses).filter(n => n.isBusy).length;
    const waitingWardCount = wardWaitingQueue.length;

    if (occupancyData.pacu1[occupancyData.pacu1.length - 1].count !== p1Busy) occupancyData.pacu1.push({ time, count: p1Busy });
    if (occupancyData.pacu2[occupancyData.pacu2.length - 1].count !== p2Busy) occupancyData.pacu2.push({ time, count: p2Busy });
    if (occupancyData.ward[occupancyData.ward.length - 1].count !== wardBusy) occupancyData.ward.push({ time, count: wardBusy });
    if (occupancyData.nurse[occupancyData.nurse.length - 1].busyCount !== nurseBusy) occupancyData.nurse.push({ time, busyCount: nurseBusy });

    const totalPacuBeds = params.pacuParams.phase1Beds + params.pacuParams.phase2Beds;
    if (totalPacuBeds > 0) {
        totalPacuBlockedTime += (waitingWardCount / totalPacuBeds) * duration;
    }

    lastStatsUpdateTime = time;
  };

  const tryAssignNurse = (patientId: string, phase: 'pacu1' | 'pacu2'): boolean => {
      const patient = getPatient(patientId);
      if (!patient) return false;
      const availableNurse = findAvailableResource(nurses);
      if (availableNurse) {
          updateResourceUsage(availableNurse, false, currentTime); // Mark nurse as busy
          availableNurse.assignedPatientId = patientId;
          patient.assignedNurseId = availableNurse.id;
          console.log(`Time ${currentTime.toFixed(2)}: Nurse ${availableNurse.id} assigned to Patient ${patientId} for ${phase}.`);
          return true;
      } else {
          console.log(`Time ${currentTime.toFixed(2)}: Patient ${patientId} waiting for Nurse for ${phase}. Queue size: ${nurseWaitingQueue.length + 1}`);
          nurseWaitingQueue.enqueue({ patientId, phase }, patient.priority);
          return false;
      }
  };

  const releaseNurse = (nurseId: string | undefined) => {
      if (!nurseId || !nurses[nurseId]) return;
      const nurse = nurses[nurseId];
      console.log(`Time ${currentTime.toFixed(2)}: Nurse ${nurseId} released.`);
      updateResourceUsage(nurse, true, currentTime); // Mark nurse as free and update cost
      nurse.busyUntil = 0; // Reset busyUntil

      if (!nurseWaitingQueue.isEmpty()) {
          const waitingPatientInfo = nurseWaitingQueue.dequeue();
          if (waitingPatientInfo) {
              const waitingPatient = getPatient(waitingPatientInfo.patientId);
              if (waitingPatient && waitingPatientInfo.phase === 'pacu1' && waitingPatient.currentState === 'waiting_pacu1') {
                  addEvent(currentTime, 'SURGERY_END', { patientId: waitingPatient.id });
              } else if (waitingPatient && waitingPatientInfo.phase === 'pacu2' && waitingPatient.currentState === 'waiting_pacu2') {
                  addEvent(currentTime, 'PACU1_END', { patientId: waitingPatient.id });
              }
          }
      }
  };

  // --- Generate Initial Events ---
  let initialSurgeryList: SurgeryCaseInput[];
  if (params.surgeryScheduleType === 'custom' && params.customSurgeryList) {
    initialSurgeryList = params.customSurgeryList;
  } else if (params.blockScheduleEnabled && params.orBlocks) {
    initialSurgeryList = scheduleCasesInBlocks(params.orBlocks, params.patientClasses, params.patientClassDistribution, params.simulationDays);
  } else {
    initialSurgeryList = generateSurgeryListTemplate(params);
  }

  initialSurgeryList.forEach((s) => {
    const patientClass = params.patientClasses.find(pc => pc.id === s.classId);
    if (!patientClass) return;
    const patientId = s.id || `S-${uuidv4()}`;
    const arrivalTime = s.actualArrivalTime ?? s.scheduledStartTime - 30;
    const duration = s.duration ?? Math.max(15, Math.round(normalRandom(patientClass.surgeryDurationMean, patientClass.surgeryDurationStd)));
    const priority = s.priority ?? patientClass.priority;
    patients[patientId] = { ...s, id: patientId, caseType: 'elective', actualArrivalTime: arrivalTime, duration: duration, priority: priority, currentState: 'scheduled', wardTransferDelay: 0, orWaitingTime: 0 };
    addEvent(arrivalTime, 'PATIENT_ARRIVAL', { patientId });
  });

  if (params.emergencyParams?.enabled && params.emergencyParams?.arrivalRateMeanPerDay && params.emergencyParams?.arrivalRateMeanPerDay > 0) {
      const meanArrivalsPerMinute = params.emergencyParams.arrivalRateMeanPerDay / (24 * 60);
      const timeToFirstArrival = exponentialRandom(meanArrivalsPerMinute);
      addEvent(timeToFirstArrival, 'EMERGENCY_ARRIVAL');
  }
  addEvent(simulationEndTime, 'SIMULATION_END_CHECK');

  // --- Main Simulation Loop ---
  while (!eventQueue.isEmpty()) {
    const currentEvent = eventQueue.dequeue();
    if (!currentEvent) break;

    if (currentEvent.time > currentTime) {
        updateStats(currentEvent.time);
        currentTime = currentEvent.time;
    }
    if (currentTime >= simulationEndTime && currentEvent.type !== 'SIMULATION_END_CHECK') continue;

    const patient = currentEvent.patientId ? getPatient(currentEvent.patientId) : null;
    const patientClass = patient ? getPatientClass(patient) : null;

    switch (currentEvent.type) {
      case 'PATIENT_ARRIVAL':
        if (!patient) break;
        patient.currentState = 'arrived';
        console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} (${patient.caseType}) arrived.`);
        const availableOR = findAvailableResource(orResources);
        if (availableOR) {
            updateResourceUsage(availableOR, false, currentTime); // Mark OR busy
            availableOR.assignedPatientId = patient.id;
            patient.orRoom = availableOR.id; patient.orStartTime = currentTime;
            patient.orWaitingTime = Math.max(0, currentTime - patient.actualArrivalTime);
            orWaitingTimes.push(patient.orWaitingTime);
            patient.currentState = 'in_or';
            const surgeryEndTime = currentTime + patient.duration;
            availableOR.busyUntil = surgeryEndTime;
            addEvent(surgeryEndTime, 'SURGERY_END', { patientId: patient.id, resourceId: availableOR.id });
            console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} started surgery in ${availableOR.id}. Ends at ${surgeryEndTime.toFixed(2)}.`);
        } else {
            patient.currentState = 'waiting_or';
            orWaitingQueue.enqueue(patient.id, patient.priority);
            console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} waiting for OR. Queue size: ${orWaitingQueue.length}`);
        }
        break;

      case 'OR_AVAILABLE':
        const orId = currentEvent.resourceId;
        if (!orId || !orResources[orId]) break;
        console.log(`Time ${currentTime.toFixed(2)}: OR ${orId} available.`);
        updateResourceUsage(orResources[orId], true, currentTime); // Mark OR free, update cost
        orResources[orId].busyUntil = 0;

        if (!orWaitingQueue.isEmpty()) {
            const nextPatientId = orWaitingQueue.dequeue();
            if (nextPatientId) {
                 const nextPatient = getPatient(nextPatientId);
                 if (nextPatient && nextPatient.currentState === 'waiting_or') {
                    updateResourceUsage(orResources[orId], false, currentTime); // Mark OR busy
                    orResources[orId].assignedPatientId = nextPatient.id;
                    nextPatient.orRoom = orId; nextPatient.orStartTime = currentTime;
                    nextPatient.orWaitingTime = Math.max(0, currentTime - nextPatient.actualArrivalTime);
                    orWaitingTimes.push(nextPatient.orWaitingTime);
                    nextPatient.currentState = 'in_or';
                    const surgeryEndTime = currentTime + nextPatient.duration;
                    orResources[orId].busyUntil = surgeryEndTime;
                    addEvent(surgeryEndTime, 'SURGERY_END', { patientId: nextPatient.id, resourceId: orId });
                    console.log(`Time ${currentTime.toFixed(2)}: Patient ${nextPatient.id} (from queue) started surgery in ${orId}. Ends at ${surgeryEndTime.toFixed(2)}.`);
                 } else if (nextPatient) {
                     console.warn(`Patient ${nextPatientId} from OR queue was not in waiting_or state (${nextPatient.currentState}). Re-queueing OR_AVAILABLE.`);
                     addEvent(currentTime, 'OR_AVAILABLE', { resourceId: orId });
                 }
            }
        }
        break;

      case 'SURGERY_END':
        if (!patient || !patientClass) break;
        const endedOrId = currentEvent.resourceId;
        console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} finished surgery in ${endedOrId || patient.orRoom}.`);
        patient.orEndTime = currentTime;
        // OR release is now handled by OR_AVAILABLE event triggered below
        if (endedOrId && orResources[endedOrId]) addEvent(currentTime, 'OR_AVAILABLE', { resourceId: endedOrId });
        else if (patient.orRoom && orResources[patient.orRoom]) addEvent(currentTime, 'OR_AVAILABLE', { resourceId: patient.orRoom });

        if (patientClass.processType === 'directTransfer') {
            patient.currentState = 'discharged'; patient.dischargeTime = currentTime;
            completedSurgeries.push(patient);
            console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} (Direct Transfer) discharged/transferred.`);
        } else {
            const availableP1Bed = findAvailableResource(pacu1Beds);
            if (availableP1Bed && tryAssignNurse(patient.id, 'pacu1')) {
                updateResourceUsage(availableP1Bed, false, currentTime); // Mark P1 bed busy
                availableP1Bed.assignedPatientId = patient.id;
                patient.pacuPhase1BedId = availableP1Bed.id; patient.pacuPhase1StartTime = currentTime;
                patient.currentState = 'in_pacu1';
                const p1Duration = Math.max(10, Math.round(normalRandom(patientClass.pacuPhase1DurationMean, patientClass.pacuPhase1DurationStd)));
                const p1EndTime = currentTime + p1Duration;
                availableP1Bed.busyUntil = p1EndTime;
                if (patient.assignedNurseId && nurses[patient.assignedNurseId]) nurses[patient.assignedNurseId].busyUntil = p1EndTime;
                addEvent(p1EndTime, 'PACU1_END', { patientId: patient.id, resourceId: availableP1Bed.id });
                console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} entered PACU Phase 1 in ${availableP1Bed.id}. Ends at ${p1EndTime.toFixed(2)}.`);
            } else {
                patient.currentState = 'waiting_pacu1';
                pacu1WaitingQueue.enqueue(patient.id, patient.priority);
                console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} waiting for PACU Phase 1 bed/nurse. BedQ: ${pacu1WaitingQueue.length}, NurseQ: ${nurseWaitingQueue.length}`);
            }
        }
        break;

      case 'PACU1_END':
        if (!patient || !patientClass || !patient.pacuPhase1BedId) break;
        const p1BedId = currentEvent.resourceId;
        console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} finished PACU Phase 1 in ${p1BedId || patient.pacuPhase1BedId}.`);
        patient.pacuPhase1EndTime = currentTime;
        releaseNurse(patient.assignedNurseId);
        patient.assignedNurseId = undefined;

        if (p1BedId && pacu1Beds[p1BedId]) {
            updateResourceUsage(pacu1Beds[p1BedId], true, currentTime); // Mark P1 bed free, update cost
            pacu1Beds[p1BedId].busyUntil = 0;

            if (!pacu1WaitingQueue.isEmpty()) {
                const nextPatientId = pacu1WaitingQueue.dequeue();
                if (nextPatientId) {
                    const nextPatient = getPatient(nextPatientId);
                    if (nextPatient && nextPatient.currentState === 'waiting_pacu1') {
                         if (tryAssignNurse(nextPatient.id, 'pacu1')) {
                            updateResourceUsage(pacu1Beds[p1BedId], false, currentTime); // Mark P1 bed busy
                            pacu1Beds[p1BedId].assignedPatientId = nextPatient.id;
                            nextPatient.pacuPhase1BedId = p1BedId; nextPatient.pacuPhase1StartTime = currentTime;
                            nextPatient.currentState = 'in_pacu1';
                            const pc = getPatientClass(nextPatient);
                            const p1Duration = pc ? Math.max(10, Math.round(normalRandom(pc.pacuPhase1DurationMean, pc.pacuPhase1DurationStd))) : 60;
                            const p1EndTime = currentTime + p1Duration;
                            pacu1Beds[p1BedId].busyUntil = p1EndTime;
                            if (nextPatient.assignedNurseId && nurses[nextPatient.assignedNurseId]) nurses[nextPatient.assignedNurseId].busyUntil = p1EndTime;
                            addEvent(p1EndTime, 'PACU1_END', { patientId: nextPatient.id, resourceId: p1BedId });
                            console.log(`Time ${currentTime.toFixed(2)}: Patient ${nextPatient.id} (from queue) entered PACU Phase 1 in ${p1BedId}. Ends at ${p1EndTime.toFixed(2)}.`);
                         } else {
                             pacu1WaitingQueue.enqueue(nextPatient.id, nextPatient.priority);
                         }
                    } else if (nextPatient) {
                         console.warn(`Patient ${nextPatientId} from PACU1 queue was not in waiting_pacu1 state (${nextPatient.currentState}).`);
                    }
                }
            }
        }

        if (patientClass.pacuPhase2DurationMean > 0) {
             const availableP2Bed = findAvailableResource(pacu2Beds);
             if (availableP2Bed && tryAssignNurse(patient.id, 'pacu2')) {
                updateResourceUsage(availableP2Bed, false, currentTime); // Mark P2 bed busy
                availableP2Bed.assignedPatientId = patient.id;
                patient.pacuPhase2BedId = availableP2Bed.id; patient.pacuPhase2StartTime = currentTime;
                patient.currentState = 'in_pacu2';
                const p2Duration = Math.max(10, Math.round(normalRandom(patientClass.pacuPhase2DurationMean, patientClass.pacuPhase2DurationStd)));
                const p2EndTime = currentTime + p2Duration;
                availableP2Bed.busyUntil = p2EndTime;
                if (patient.assignedNurseId && nurses[patient.assignedNurseId]) nurses[patient.assignedNurseId].busyUntil = p2EndTime;
                addEvent(p2EndTime, 'PACU2_END', { patientId: patient.id, resourceId: availableP2Bed.id });
                console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} entered PACU Phase 2 in ${availableP2Bed.id}. Ends at ${p2EndTime.toFixed(2)}.`);
             } else {
                patient.currentState = 'waiting_pacu2';
                pacu2WaitingQueue.enqueue(patient.id, patient.priority);
                console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} waiting for PACU Phase 2 bed/nurse. BedQ: ${pacu2WaitingQueue.length}, NurseQ: ${nurseWaitingQueue.length}`);
             }
        } else {
            addEvent(currentTime, 'DISCHARGE_CRITERIA_MET', { patientId: patient.id });
        }
        break;

      case 'PACU2_END':
         if (!patient || !patientClass || !patient.pacuPhase2BedId) break;
         const p2BedId = currentEvent.resourceId;
         console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} finished PACU Phase 2 in ${p2BedId || patient.pacuPhase2BedId}.`);
         patient.pacuPhase2EndTime = currentTime;
         releaseNurse(patient.assignedNurseId);
         patient.assignedNurseId = undefined;

         if (p2BedId && pacu2Beds[p2BedId]) {
            updateResourceUsage(pacu2Beds[p2BedId], true, currentTime); // Mark P2 bed free, update cost
            pacu2Beds[p2BedId].busyUntil = 0;

            if (!pacu2WaitingQueue.isEmpty()) {
                const nextPatientId = pacu2WaitingQueue.dequeue();
                if (nextPatientId) {
                    const nextPatient = getPatient(nextPatientId);
                    if (nextPatient && nextPatient.currentState === 'waiting_pacu2') {
                        if (tryAssignNurse(nextPatient.id, 'pacu2')) {
                            updateResourceUsage(pacu2Beds[p2BedId], false, currentTime); // Mark P2 bed busy
                            pacu2Beds[p2BedId].assignedPatientId = nextPatient.id;
                            nextPatient.pacuPhase2BedId = p2BedId; nextPatient.pacuPhase2StartTime = currentTime;
                            nextPatient.currentState = 'in_pacu2';
                            const pc = getPatientClass(nextPatient);
                            const p2Duration = pc ? Math.max(10, Math.round(normalRandom(pc.pacuPhase2DurationMean, pc.pacuPhase2DurationStd))) : 60;
                            const p2EndTime = currentTime + p2Duration;
                            pacu2Beds[p2BedId].busyUntil = p2EndTime;
                            if (nextPatient.assignedNurseId && nurses[nextPatient.assignedNurseId]) nurses[nextPatient.assignedNurseId].busyUntil = p2EndTime;
                            addEvent(p2EndTime, 'PACU2_END', { patientId: nextPatient.id, resourceId: p2BedId });
                            console.log(`Time ${currentTime.toFixed(2)}: Patient ${nextPatient.id} (from queue) entered PACU Phase 2 in ${p2BedId}. Ends at ${p2EndTime.toFixed(2)}.`);
                        } else {
                            pacu2WaitingQueue.enqueue(nextPatient.id, nextPatient.priority);
                        }
                    } else if (nextPatient) {
                         console.warn(`Patient ${nextPatientId} from PACU2 queue was not in waiting_pacu2 state (${nextPatient.currentState}).`);
                    }
                }
            }
         }
         addEvent(currentTime, 'DISCHARGE_CRITERIA_MET', { patientId: patient.id });
         break;

      case 'DISCHARGE_CRITERIA_MET':
        if (!patient || !patientClass) break;
        console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} met discharge criteria.`);
        patient.readyForWardTime = currentTime;

        if (patientClass.processType === 'outpatient') {
            patient.currentState = 'discharged'; patient.dischargeTime = currentTime;
            completedSurgeries.push(patient);
            console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} (Outpatient) discharged home.`);
        } else {
            const availableWardBed = findAvailableResource(wardBeds);
            if (availableWardBed) {
                updateResourceUsage(availableWardBed, false, currentTime); // Mark Ward bed busy
                availableWardBed.assignedPatientId = patient.id;
                patient.wardBedId = availableWardBed.id; patient.wardArrivalTime = currentTime;
                patient.currentState = 'in_ward';
                patient.wardTransferDelay = 0;
                wardTransferDelays.push(0);
                patient.dischargeTime = currentTime; // Simplified ward stay
                completedSurgeries.push(patient);
                console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} transferred to Ward Bed ${availableWardBed.id}.`);
                // Simplified: Release ward bed almost immediately for cost calculation
                const wardEndTime = currentTime + 1; 
                availableWardBed.busyUntil = wardEndTime;
                addEvent(wardEndTime, 'WARD_BED_AVAILABLE', { resourceId: availableWardBed.id });
            } else {
                patient.currentState = 'waiting_ward';
                wardWaitingQueue.enqueue(patient.id, patient.priority);
                console.log(`Time ${currentTime.toFixed(2)}: Patient ${patient.id} waiting for Ward Bed. Queue size: ${wardWaitingQueue.length}. PACU BLOCKING.`);
            }
        }
        break;

      case 'WARD_BED_AVAILABLE':
        const wardBedId = currentEvent.resourceId;
        if (!wardBedId || !wardBeds[wardBedId]) break;
        console.log(`Time ${currentTime.toFixed(2)}: Ward Bed ${wardBedId} available.`);
        updateResourceUsage(wardBeds[wardBedId], true, currentTime); // Mark Ward bed free, update cost
        wardBeds[wardBedId].busyUntil = 0;

        if (!wardWaitingQueue.isEmpty()) {
            const nextPatientId = wardWaitingQueue.dequeue();
            if (nextPatientId) {
                const nextPatient = getPatient(nextPatientId);
                if (nextPatient && nextPatient.currentState === 'waiting_ward' && nextPatient.readyForWardTime !== undefined) {
                    updateResourceUsage(wardBeds[wardBedId], false, currentTime); // Mark Ward bed busy
                    wardBeds[wardBedId].assignedPatientId = nextPatient.id;
                    nextPatient.wardBedId = wardBedId; nextPatient.wardArrivalTime = currentTime;
                    nextPatient.currentState = 'in_ward';
                    nextPatient.wardTransferDelay = currentTime - nextPatient.readyForWardTime;
                    wardTransferDelays.push(nextPatient.wardTransferDelay);
                    nextPatient.dischargeTime = currentTime; // Simplified
                    completedSurgeries.push(nextPatient);
                    console.log(`Time ${currentTime.toFixed(2)}: Patient ${nextPatient.id} (from queue) transferred to Ward Bed ${wardBedId}. Delay: ${nextPatient.wardTransferDelay.toFixed(2)} mins.`);
                    const wardEndTime = currentTime + 1;
                    wardBeds[wardBedId].busyUntil = wardEndTime;
                    addEvent(wardEndTime, 'WARD_BED_AVAILABLE', { resourceId: wardBedId });
                } else if (nextPatient) {
                    console.warn(`Patient ${nextPatientId} from Ward queue was not in waiting_ward state (${nextPatient.currentState}). Re-queueing WARD_BED_AVAILABLE.`);
                    addEvent(currentTime, 'WARD_BED_AVAILABLE', { resourceId: wardBedId });
                }
            }
        }
        break;

      case 'EMERGENCY_ARRIVAL':
        console.log(`Time ${currentTime.toFixed(2)}: Processing potential emergency arrival.`);
        const emergencyClassId = weightedRandomSelection(params.emergencyParams?.patientClassDistribution || params.patientClassDistribution);
        if (!emergencyClassId) break;
        const emergencyClass = params.patientClasses.find(pc => pc.id === emergencyClassId);
        if (!emergencyClass) break;
        const emergencyPatientId = `E-${++emergencyCounter}`;
        const emergencyDuration = Math.max(15, Math.round(normalRandom(emergencyClass.surgeryDurationMean, emergencyClass.surgeryDurationStd)));
        const emergencyPriority = 0;
        patients[emergencyPatientId] = { id: emergencyPatientId, caseType: 'emergency', classId: emergencyClassId, scheduledStartTime: currentTime, actualArrivalTime: currentTime, duration: emergencyDuration, orRoom: '', priority: emergencyPriority, currentState: 'scheduled', wardTransferDelay: 0, orWaitingTime: 0 };
        console.log(`Time ${currentTime.toFixed(2)}: Generated Emergency Case ${emergencyPatientId} (Class ${emergencyClassId}).`);
        addEvent(currentTime, 'PATIENT_ARRIVAL', { patientId: emergencyPatientId });
        if (params.emergencyParams?.enabled && params.emergencyParams?.arrivalRateMeanPerDay && params.emergencyParams?.arrivalRateMeanPerDay > 0) {
            const meanArrivalsPerMinute = params.emergencyParams.arrivalRateMeanPerDay / (24 * 60);
            const timeToNextArrival = exponentialRandom(meanArrivalsPerMinute);
            addEvent(currentTime + timeToNextArrival, 'EMERGENCY_ARRIVAL');
            console.log(`Time ${currentTime.toFixed(2)}: Next emergency arrival scheduled at ${(currentTime + timeToNextArrival).toFixed(2)}.`);
        }
        break;

      case 'SIMULATION_END_CHECK':
          console.log(`Time ${currentTime.toFixed(2)}: Simulation end check.`);
          updateStats(currentTime);
          // Ensure any ongoing resource usage is accounted for up to simulation end time
          Object.values(orResources).forEach(r => { if (r.isBusy) updateResourceUsage(r, true, currentTime); });
          Object.values(pacu1Beds).forEach(r => { if (r.isBusy) updateResourceUsage(r, true, currentTime); });
          Object.values(pacu2Beds).forEach(r => { if (r.isBusy) updateResourceUsage(r, true, currentTime); });
          Object.values(wardBeds).forEach(r => { if (r.isBusy) updateResourceUsage(r, true, currentTime); });
          Object.values(nurses).forEach(r => { if (r.isBusy) updateResourceUsage(r, true, currentTime); });
          break;
    }
  } // End of simulation loop

  // --- Post-Simulation Analysis ---
  console.log("Simulation loop finished. Calculating results...");
  if (lastStatsUpdateTime < simulationEndTime) updateStats(simulationEndTime);

  const calculatePercentile = (data: number[], percentile: number): number => {
    if (data.length === 0) return 0;
    data.sort((a, b) => a - b);
    const index = Math.min(data.length - 1, Math.floor(data.length * percentile));
    return data[index] || 0;
  };

  const meanORWaitingTime = orWaitingTimes.length > 0 ? orWaitingTimes.reduce((s, t) => s + t, 0) / orWaitingTimes.length : 0;
  const p95ORWaitingTime = calculatePercentile(orWaitingTimes, 0.95);
  const meanWardTransferDelay = wardTransferDelays.length > 0 ? wardTransferDelays.reduce((s, t) => s + t, 0) / wardTransferDelays.length : 0;
  const p95WardTransferDelay = calculatePercentile(wardTransferDelays, 0.95);
  const pacuTimes = completedSurgeries.map(p => (p.pacuPhase2EndTime ?? p.pacuPhase1EndTime ?? 0) - (p.pacuPhase1StartTime ?? p.pacuPhase2StartTime ?? 0)).filter(t => t > 0);
  const meanPacuTime = pacuTimes.length > 0 ? pacuTimes.reduce((s, t) => s + t, 0) / pacuTimes.length : 0;
  const pacuBlockedTimeRatio = simulationEndTime > 0 ? totalPacuBlockedTime / simulationEndTime : 0;

  const calculateTimeSeriesStats = (data: Array<{ time: number; count?: number; busyCount?: number }>, totalResource: number, simTime: number) => {
      if (data.length <= 1 || totalResource <= 0 || simTime <= 0) return { mean: 0, peak: 0, totalBusyTime: 0 };
      let totalWeightedCount = 0;
      let peakCount = 0;
      for (let i = 1; i < data.length; i++) {
          const duration = data[i].time - data[i-1].time;
          const count = data[i-1].count ?? data[i-1].busyCount ?? 0;
          if (duration > 0) totalWeightedCount += count * duration;
          peakCount = Math.max(peakCount, count);
      }
      const lastDuration = simTime - data[data.length - 1].time;
      const lastCount = data[data.length - 1].count ?? data[data.length - 1].busyCount ?? 0;
      if (lastDuration > 0) totalWeightedCount += lastCount * lastDuration;
      peakCount = Math.max(peakCount, lastCount);
      const meanCount = totalWeightedCount / simTime;
      return { mean: meanCount / totalResource, peak: peakCount / totalResource, totalBusyTime: totalWeightedCount };
  };

  const pacu1Stats = calculateTimeSeriesStats(occupancyData.pacu1, params.pacuParams?.phase1Beds || 1, simulationEndTime);
  const pacu2Stats = calculateTimeSeriesStats(occupancyData.pacu2, params.pacuParams?.phase2Beds || 1, simulationEndTime);
  const wardStats = calculateTimeSeriesStats(occupancyData.ward, params.wardParams?.totalBeds || params.beds || 10, simulationEndTime);
  const nurseStats = calculateTimeSeriesStats(occupancyData.nurse, params.staffParams?.totalNurses || params.nurses || 5, simulationEndTime);

  // Calculate OR Utilization based on total busy time
  const orUtilization: Record<string, number> = {};
  let totalORBusyTime = 0;
  Object.values(orResources).forEach(or => {
      orUtilization[or.id] = simulationEndTime > 0 ? or.totalBusyTime / simulationEndTime : 0;
      totalORBusyTime += or.totalBusyTime;
  });

  // Final cost calculation
  totalCancellationCost = cancelledSurgeries.length * (params.costParams?.costPerCancellation || 0);
  const totalCost = totalORCost + totalPACU1Cost + totalPACU2Cost + totalNurseCost + totalWardCost + totalCancellationCost;

  // TODO: Calculate Overtime Hours (requires shift definitions)
  const overtimeHours = 0;
  
  // Create time-of-day data for compatibility with current visualization components
  const timePoints = 24 * 4; // 15-minute intervals for a day
  const bedOccupancy: number[] = new Array(timePoints).fill(0);
  const nurseUtilization: number[] = new Array(timePoints).fill(0);
  const orUtilizationByRoom: Record<string, number[]> = {};
  
  // Initialize OR utilization arrays for compatibility
  for (let i = 1; i <= params.numberOfORs; i++) {
    orUtilizationByRoom[`OR-${i}`] = new Array(timePoints).fill(0);
  }
  
  // Convert occupancy data to time-of-day data
  const truncateTimePoints = (data: Array<{ time: number; count: number }>, maxPoints: number): Array<{ time: number; count: number }> => {
    return data.filter(d => d.time < 1440);
  };
  
  const truncatedWardData = truncateTimePoints(occupancyData.ward, timePoints);
  const truncatedNurseData = occupancyData.nurse.filter(d => d.time < 1440);
  
  // Add nurse utilization data based on time blocks
  if (truncatedNurseData.length > 0) {
    let lastTimeIndex = 0;
    for (const entry of truncatedNurseData) {
      const timeIndex = Math.min(timePoints - 1, Math.floor((entry.time % 1440) / 15));
      if (timeIndex >= 0) {
        // Fill in any gaps since last recorded time
        for (let i = lastTimeIndex; i <= timeIndex; i++) {
          nurseUtilization[i] = entry.busyCount / (params.staffParams?.totalNurses || params.nurses || 5);
        }
        lastTimeIndex = timeIndex + 1;
      }
    }
  }
  
  // Add bed occupancy data based on time blocks
  if (truncatedWardData.length > 0) {
    let lastTimeIndex = 0;
    for (const entry of truncatedWardData) {
      const timeIndex = Math.min(timePoints - 1, Math.floor((entry.time % 1440) / 15));
      if (timeIndex >= 0) {
        // Fill in any gaps since last recorded time
        for (let i = lastTimeIndex; i <= timeIndex; i++) {
          bedOccupancy[i] = entry.count / (params.wardParams?.totalBeds || params.beds || 10);
        }
        lastTimeIndex = timeIndex + 1;
      }
    }
  }
  
  // Find peak times (times when bed occupancy > 80%)
  const peakTimes = bedOccupancy
    .map((occ, idx) => ({ time: idx * 15, occupancy: occ }))
    .filter(item => item.occupancy > 0.8)
    .sort((a, b) => b.occupancy - a.occupancy)
    .slice(0, 5);
  
  // Calculate patient class counts
  const patientClassCounts: Record<string, number> = {};
  completedSurgeries.forEach(surgery => {
    patientClassCounts[surgery.classId] = (patientClassCounts[surgery.classId] || 0) + 1;
  });

  console.log(`Simulation complete. Completed: ${completedSurgeries.length}, Cancelled: ${cancelledSurgeries.length}`);
  console.log(`Total Costs - OR: ${totalORCost.toFixed(2)}, P1: ${totalPACU1Cost.toFixed(2)}, P2: ${totalPACU2Cost.toFixed(2)}, Nurse: ${totalNurseCost.toFixed(2)}, Ward: ${totalWardCost.toFixed(2)}, Cancel: ${totalCancellationCost.toFixed(2)}, TOTAL: ${totalCost.toFixed(2)}`);

  // Create complete results object including legacy fields for compatibility
  return {
    completedSurgeries, 
    cancelledSurgeries,
    meanORWaitingTime, 
    p95ORWaitingTime,
    meanPacuTime, 
    meanWardTransferDelay, 
    p95WardTransferDelay,
    pacuBlockedTimeRatio,
    orUtilization,
    meanPacuPhase1BedOccupancy: pacu1Stats.mean, 
    peakPacuPhase1BedOccupancy: pacu1Stats.peak,
    meanPacuPhase2BedOccupancy: pacu2Stats.mean, 
    peakPacuPhase2BedOccupancy: pacu2Stats.peak,
    meanWardBedOccupancy: wardStats.mean, 
    peakWardBedOccupancy: wardStats.peak,
    meanNurseUtilization: nurseStats.mean, 
    peakNurseUtilization: nurseStats.peak,
    overtimeHours,
    pacuPhase1OccupancyData: occupancyData.pacu1,
    pacuPhase2OccupancyData: occupancyData.pacu2,
    wardOccupancyData: occupancyData.ward,
    nurseUtilizationData: occupancyData.nurse,
    wardTransferDelayDistribution: wardTransferDelays,
    orWaitingTimeDistribution: orWaitingTimes,
    totalCost,
    costBreakdown: {
        orCost: totalORCost,
        pacu1Cost: totalPACU1Cost,
        pacu2Cost: totalPACU2Cost,
        nurseCost: totalNurseCost,
        wardCost: totalWardCost,
        cancellationCost: totalCancellationCost,
    },
    // Legacy fields for compatibility
    surgeryList: [...completedSurgeries, ...cancelledSurgeries],
    waitingTimes: orWaitingTimes,
    orUtilizations: orUtilization,
    patientClassCounts: patientClassCounts,
    averageWaitingTime: meanORWaitingTime,
    maxWaitingTime: Math.max(...orWaitingTimes, 0),
    totalSurgeries: completedSurgeries.length + cancelledSurgeries.length,
    meanWaitTime: meanORWaitingTime,
    p95WaitTime: p95ORWaitingTime,
    meanBedOccupancy: wardStats.mean,
    maxBedOccupancy: wardStats.peak,
    maxNurseUtilization: nurseStats.peak,
    patientTypeCount: patientClassCounts,
    bedOccupancy: bedOccupancy,
    nurseUtilization: nurseUtilization,
    peakTimes: peakTimes,
  };
}

// --- Helper Functions for Scheduling ---

export function generateSurgeryListTemplate(params: SimulationParams): SurgeryCaseInput[] {
  const { simulationDays, numberOfORs, patientClasses, patientClassDistribution } = params;
  const avgDaily = params.surgeryScheduleTemplate?.averageDailySurgeries || params.averageDailySurgeries || 6;
  const surgeryList: SurgeryCaseInput[] = [];
  const surgeriesPerDay = Math.max(1, Math.round(avgDaily));

  for (let day = 0; day < simulationDays; day++) {
    const surgeriesToday = surgeriesPerDay;
    const timeBetweenStarts = Math.floor(480 / Math.max(1, Math.ceil(surgeriesToday / numberOfORs)));
    let orIndex = 0; let timeOffset = 0;
    for (let i = 0; i < surgeriesToday; i++) {
      const classId = weightedRandomSelection(patientClassDistribution);
      if (!classId) continue;
      const orRoom = `OR-${(orIndex % numberOfORs) + 1}`;
      const scheduledStartTime = day * 1440 + 480 + timeOffset;
      surgeryList.push({ classId, scheduledStartTime, orRoom });
      orIndex++;
      if (orIndex % numberOfORs === 0) timeOffset += timeBetweenStarts;
    }
  }
  return surgeryList;
}

export function scheduleCasesInBlocks(blocks: ORBlock[], patientClasses: PatientClass[], patientDistribution: Record<string, number>, simulationDays: number): SurgeryCaseInput[] {
  const surgeryList: SurgeryCaseInput[] = [];
  
  for (let day = 0; day < simulationDays; day++) {
    const dayBlocks = blocks.filter(block => block.day % simulationDays === day % simulationDays).sort((a, b) => a.start - b.start);
    
    for (const block of dayBlocks) {
      const blockDurationMinutes = block.end - block.start;
      const allowedClasses = block.allowedClasses.filter(id => patientClasses.some(pc => pc.id === id));
      
      if (allowedClasses.length === 0) continue;
      
      const totalProbability = allowedClasses.reduce((sum, id) => sum + (patientDistribution[id] || 0), 0);
      const normalizedDistribution: Record<string, number> = {};
      
      allowedClasses.forEach(id => { 
        normalizedDistribution[id] = totalProbability > 0 
          ? (patientDistribution[id] || 0) / totalProbability 
          : 1 / allowedClasses.length; 
      });
      
      let currentTimeInBlock = block.start;
      let remainingTime = blockDurationMinutes;
      
      while (remainingTime > 30) {
        const classId = weightedRandomSelection(normalizedDistribution);
        if (!classId) break;
        
        const patientClass = patientClasses.find(pc => pc.id === classId);
        if (!patientClass) continue;
        
        let duration = Math.max(30, Math.round(normalRandom(patientClass.surgeryDurationMean, patientClass.surgeryDurationStd)));
        const turnoverTime = (currentTimeInBlock > block.start) ? 15 : 0;
        
        if (duration + turnoverTime > remainingTime) {
          if (remainingTime - turnoverTime < 30) break;
          duration = remainingTime - turnoverTime;
          if (duration < 30) break;
        }
        
        const scheduledStartTime = day * 1440 + currentTimeInBlock + turnoverTime;
        surgeryList.push({ classId, scheduledStartTime, duration, orRoom: block.orId });
        
        currentTimeInBlock += duration + turnoverTime;
        remainingTime -= (duration + turnoverTime);
      }
    }
  }
  
  return surgeryList;
}

// --- Legacy function for backward compatibility ---

export function generateSurgeryList(
  params: SimulationParams
): SurgeryCase[] {
  return generateSurgeryListTemplate(params) as SurgeryCase[];
}

import { v4 as uuidv4 } from "uuid";

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
	dequeue(): T | undefined {
		return this.items.shift()?.element;
	}
	isEmpty(): boolean {
		return this.items.length === 0;
	}
	peek(): T | undefined {
		return this.items[0]?.element;
	}
	get length(): number {
		return this.items.length;
	}
}

function normalRandom(mean: number, stdDev: number): number {
	if (stdDev <= 0) return mean;
	let u = 0,
		v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	return Math.max(0, mean + stdDev * z);
}

function weightedRandomSelection(
	distribution: Record<string, number>
): string | null {
	const totalWeight = Object.values(distribution).reduce(
		(sum, weight) => sum + weight,
		0
	);
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

// Nurse skill level definition
export interface NurseSkill {
	id: string;
	name: string;
	canHandlePhase1: boolean;
	canHandlePhase2: boolean;
	efficiencyMultiplier: number; // 1.0 is standard, higher is more efficient
}

// Nurse shift definition
export interface NurseShift {
	id: string;
	name: string;
	startMinute: number; // Minutes from day start (e.g., 480 = 8:00 AM)
	durationMinutes: number;
	nursesPerDay: number[]; // Array of nurse counts per day of week (0 = Monday, 6 = Sunday)
	skillDistribution: Record<string, number>; // Skill ID to percentage
}

export interface StaffParams {
	totalNurses: number;
	phase1NurseRatio: number;
	phase2NurseRatio: number;
	useEnhancedNurseModel: boolean;
	nurseSkills: NurseSkill[];
	nurseShifts: NurseShift[];
	overtimeMultiplier: number; // Cost multiplier for overtime
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
	surgeryScheduleType: "template" | "custom";
	customSurgeryList?: SurgeryCaseInput[];
	surgeryScheduleTemplate: {
		averageDailySurgeries: number;
		turnoverTime?: number; // Time between surgeries in minutes
		orStartTime?: number; // OR start time in minutes from midnight (default: 465 = 7:45 AM)
		orEndTime?: number; // OR end time in minutes from midnight (default: 960 = 4:00 PM)
		overrunRiskPercent?: number; // Percentage risk of surgery going over scheduled time
		durationDistribution?: {
			short: number; // Percentage of short surgeries (< 60 min)
			medium: number; // Percentage of medium surgeries (60-120 min)
			long: number; // Percentage of long surgeries (> 120 min)
		};
	};
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
	processType: "standard" | "outpatient" | "directTransfer";
	pacuPhase1DurationMean: number;
	pacuPhase1DurationStd: number;
	pacuPhase2DurationMean: number;
	pacuPhase2DurationStd: number;
	// Ward stay parameters
	wardStayDurationMean?: number;
	wardStayDurationStd?: number;
	// Cancellation risk (0-1, probability of cancellation)
	cancellationRisk?: number;
	// Time-of-day variability (0-1, how much duration varies by time of day)
	timeOfDayVariability?: number;
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
	caseType?: "elective" | "emergency";
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
	wardPlannedDuration?: number; // Planned ward stay duration
	wardActualDuration?: number; // Actual ward stay duration
	dischargeTime?: number;
	pacuPhase1BedId?: string;
	pacuPhase2BedId?: string;
	wardBedId?: string;
	assignedNurseId?: string;
	cancellationReason?:
		| "patient_no_show"
		| "resource_unavailable"
		| "medical_reason"
		| "rescheduled";
	cancellationTime?: number;
	rescheduledToId?: string; // ID of the rescheduled surgery case
	currentState?:
		| "scheduled"
		| "arrived"
		| "waiting_or"
		| "in_or"
		| "waiting_pacu1"
		| "in_pacu1"
		| "waiting_pacu2"
		| "in_pacu2"
		| "waiting_ward"
		| "in_ward"
		| "discharged"
		| "cancelled";
	wardTransferDelay?: number;
	orWaitingTime?: number;
	arrivalTime?: number; // For backwards compatibility
};

export interface SimulationEvent {
	time: number;
	type:
		| "PATIENT_ARRIVAL"
		| "OR_AVAILABLE"
		| "SURGERY_END"
		| "PACU1_END"
		| "PACU2_END"
		| "WARD_BED_AVAILABLE"
		| "DISCHARGE_CRITERIA_MET"
		| "NURSE_AVAILABLE"
		| "EMERGENCY_ARRIVAL"
		| "SIMULATION_END_CHECK"
		// New event types
		| "NURSE_SHIFT_START"
		| "NURSE_SHIFT_END"
		| "WARD_DISCHARGE"
		| "SURGERY_CANCELLATION"
		| "SURGERY_RESCHEDULE";
	patientId?: string;
	resourceId?: string;
	shiftId?: string;
	skillId?: string;
	cancellationReason?: string;
}

export interface ResourceState {
	id: string;
	isBusy: boolean;
	busyUntil: number;
	assignedPatientId?: string;
	// Cost tracking per resource
	totalBusyTime: number;
	lastBusyStartTime: number;
	// Nurse-specific properties
	skillId?: string;
	shiftId?: string;
	shiftStartTime?: number;
	shiftEndTime?: number;
	isOnShift?: boolean;
	totalOvertimeMinutes?: number;
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
	nurseOvertimeByShift: Record<string, number>; // Overtime minutes by shift ID
	nurseUtilizationBySkill: Record<string, number>; // Utilization by skill ID
	shiftCoverage: Record<string, number>; // Percentage of time shifts were fully staffed
	pacuPhase1OccupancyData: Array<{ time: number; count: number }>;
	pacuPhase2OccupancyData: Array<{ time: number; count: number }>;
	wardOccupancyData: Array<{ time: number; count: number }>;
	nurseUtilizationData: Array<{ time: number; busyCount: number }>;
	nurseShiftData: Array<{ time: number; onShift: number; working: number }>; // Track nurses on shift vs. working
	wardTransferDelayDistribution: number[];
	orWaitingTimeDistribution: number[];
	totalCost: number;
	costBreakdown: {
		orCost: number;
		pacu1Cost: number;
		pacu2Cost: number;
		nurseCost: number;
		nurseOvertimeCost: number; // Separate overtime cost
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
	peakTimes?: Array<{ time: number; occupancy: number }>;
}

// --- Default Values ---

export const defaultPatientClasses: PatientClass[] = [
	{
		id: "HERKO",
		name: "HERKO (Heräämöstä kotiin)",
		color: "#1f77b4",
		priority: 1,
		surgeryDurationMean: 60,
		surgeryDurationStd: 15,
		processType: "standard",
		pacuPhase1DurationMean: 60,
		pacuPhase1DurationStd: 15,
		pacuPhase2DurationMean: 60,
		pacuPhase2DurationStd: 15,
		wardStayDurationMean: 2880, // 2 days (in minutes)
		wardStayDurationStd: 720, // 12 hours (in minutes)
		cancellationRisk: 0.05, // 5% chance of cancellation
		timeOfDayVariability: 0.2, // 20% variation by time of day
		averagePacuTime: 120,
	},
	{
		id: "OSASTO",
		name: "OSASTO (Heräämöstä osastolle)",
		color: "#ff7f0e",
		priority: 2,
		surgeryDurationMean: 90,
		surgeryDurationStd: 20,
		processType: "standard",
		pacuPhase1DurationMean: 75,
		pacuPhase1DurationStd: 20,
		pacuPhase2DurationMean: 75,
		pacuPhase2DurationStd: 20,
		wardStayDurationMean: 4320, // 3 days (in minutes)
		wardStayDurationStd: 1440, // 1 day (in minutes)
		cancellationRisk: 0.08, // 8% chance of cancellation
		timeOfDayVariability: 0.15, // 15% variation by time of day
		averagePacuTime: 150,
	},
	{
		id: "PAIKI",
		name: "PÄIKI (Päiväkirurginen)",
		color: "#2ca02c",
		priority: 3,
		surgeryDurationMean: 120,
		surgeryDurationStd: 30,
		processType: "outpatient",
		pacuPhase1DurationMean: 45,
		pacuPhase1DurationStd: 10,
		pacuPhase2DurationMean: 90,
		pacuPhase2DurationStd: 25,
		wardStayDurationMean: 0, // Outpatient - no ward stay
		wardStayDurationStd: 0,
		cancellationRisk: 0.1, // 10% chance of cancellation
		timeOfDayVariability: 0.1, // 10% variation by time of day
		averagePacuTime: 30,
	},
	{
		id: "PKL",
		name: "PKL (Polikliininen)",
		color: "#d62728",
		priority: 4,
		surgeryDurationMean: 180,
		surgeryDurationStd: 45,
		processType: "directTransfer",
		pacuPhase1DurationMean: 0,
		pacuPhase1DurationStd: 0,
		pacuPhase2DurationMean: 0,
		pacuPhase2DurationStd: 0,
		wardStayDurationMean: 5760, // 4 days (in minutes)
		wardStayDurationStd: 1440, // 1 day (in minutes)
		cancellationRisk: 0.12, // 12% chance of cancellation
		timeOfDayVariability: 0.25, // 25% variation by time of day
		averagePacuTime: 0,
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

// Default nurse skills
export const defaultNurseSkills: NurseSkill[] = [
	{
		id: "junior",
		name: "Junior Nurse",
		canHandlePhase1: true,
		canHandlePhase2: true,
		efficiencyMultiplier: 0.8,
	},
	{
		id: "senior",
		name: "Senior Nurse",
		canHandlePhase1: true,
		canHandlePhase2: true,
		efficiencyMultiplier: 1.2,
	},
	{
		id: "specialist",
		name: "PACU Specialist",
		canHandlePhase1: true,
		canHandlePhase2: true,
		efficiencyMultiplier: 1.5,
	},
];

// Default nurse shifts
export const defaultNurseShifts: NurseShift[] = [
	{
		id: "morning",
		name: "Morning Shift",
		startMinute: 7 * 60, // 7:00 AM
		durationMinutes: 8 * 60, // 8 hours
		nursesPerDay: [6, 6, 6, 6, 6, 4, 4], // Mon-Fri: 6 nurses, Sat-Sun: 4 nurses
		skillDistribution: { junior: 0.3, senior: 0.5, specialist: 0.2 },
	},
	{
		id: "evening",
		name: "Evening Shift",
		startMinute: 15 * 60, // 3:00 PM
		durationMinutes: 8 * 60, // 8 hours
		nursesPerDay: [4, 4, 4, 4, 4, 3, 3], // Mon-Fri: 4 nurses, Sat-Sun: 3 nurses
		skillDistribution: { junior: 0.4, senior: 0.5, specialist: 0.1 },
	},
	{
		id: "night",
		name: "Night Shift",
		startMinute: 23 * 60, // 11:00 PM
		durationMinutes: 8 * 60, // 8 hours
		nursesPerDay: [2, 2, 2, 2, 2, 2, 2], // 2 nurses every day
		skillDistribution: { junior: 0.5, senior: 0.5, specialist: 0.0 },
	},
];

export const defaultSimulationParams: SimulationParams = {
	simulationDays: 5,
	numberOfORs: 3,
	patientClasses: defaultPatientClasses,
	patientClassDistribution: { HERKO: 0.25, OSASTO: 0.3, PAIKI: 0.3, PKL: 0.15 },
	surgeryScheduleType: "template",
	surgeryScheduleTemplate: {
		averageDailySurgeries: 6,
		turnoverTime: 15, // 15 minutes turnover time between surgeries
		orStartTime: 465, // 7:45 AM (465 minutes from midnight)
		orEndTime: 960, // 4:00 PM (960 minutes from midnight)
		overrunRiskPercent: 10, // 10% risk of surgery going over scheduled time
		durationDistribution: {
			short: 0.3, // 30% of surgeries are short (< 60 min)
			medium: 0.5, // 50% of surgeries are medium (60-120 min)
			long: 0.2, // 20% of surgeries are long (> 120 min)
		},
	},
	blockScheduleEnabled: false,
	pacuParams: { phase1Beds: 4, phase2Beds: 6 },
	wardParams: { totalBeds: 20 },
	staffParams: {
		totalNurses: 10,
		phase1NurseRatio: 1,
		phase2NurseRatio: 2,
		useEnhancedNurseModel: false, // Default to legacy model for backward compatibility
		nurseSkills: defaultNurseSkills,
		nurseShifts: defaultNurseShifts,
		overtimeMultiplier: 1.5, // 50% overtime premium
	},
	emergencyParams: {
		enabled: true,
		arrivalRateMeanPerDay: 1,
		patientClassDistribution: { HERKO: 0.4, OSASTO: 0.6 },
	},
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

	// Helper function to get day of week (0 = Monday, 6 = Sunday)
	const getDayOfWeek = (timeInMinutes: number): number => {
		// Assuming simulation starts on a Monday (day 0)
		const dayNumber = Math.floor(timeInMinutes / (24 * 60));
		return dayNumber % 7;
	};

	// Helper function to get time of day in minutes (0-1439)
	const getTimeOfDay = (timeInMinutes: number): number => {
		return timeInMinutes % (24 * 60);
	};

	// Helper function to apply time-of-day variability to durations
	const applyTimeOfDayVariability = (
		baseDuration: number,
		variabilityFactor: number,
		timeInMinutes: number
	): number => {
		if (variabilityFactor <= 0) return baseDuration;

		// Time of day effect: procedures take longer in the afternoon/evening
		// and shorter in the morning
		const timeOfDay = getTimeOfDay(timeInMinutes);
		const hourOfDay = Math.floor(timeOfDay / 60);

		// Define a curve where morning (7-10) is faster, midday (11-14) is baseline,
		// and afternoon/evening (15-19) is slower
		let timeMultiplier = 1.0;
		if (hourOfDay >= 7 && hourOfDay <= 10) {
			// Morning: up to 10% faster
			timeMultiplier = 1.0 - variabilityFactor * 0.5;
		} else if (hourOfDay >= 15 && hourOfDay <= 19) {
			// Afternoon/evening: up to 20% slower
			timeMultiplier = 1.0 + variabilityFactor;
		}

		return Math.max(baseDuration * timeMultiplier, baseDuration * 0.5);
	};

	// Resource Pools with cost tracking
	const createResourcePool = (
		prefix: string,
		count: number
	): Record<string, ResourceState> => {
		const pool: Record<string, ResourceState> = {};
		for (let i = 1; i <= count; i++) {
			pool[`${prefix}-${i}`] = {
				id: `${prefix}-${i}`,
				isBusy: false,
				busyUntil: 0,
				totalBusyTime: 0,
				lastBusyStartTime: 0,
			};
		}
		return pool;
	};
	const orResources = createResourcePool("OR", params.numberOfORs);
	const pacu1Beds = createResourcePool(
		"P1",
		params.pacuParams?.phase1Beds || 0
	);
	const pacu2Beds = createResourcePool(
		"P2",
		params.pacuParams?.phase2Beds || 0
	);
	const wardBeds = createResourcePool(
		"W",
		params.wardParams?.totalBeds || params.beds || 10
	);

	// Create nurse resources with enhanced model if enabled
	let nurses: Record<string, ResourceState> = {};
	if (params.staffParams?.useEnhancedNurseModel) {
		// Initialize nurses based on shifts
		let nurseCounter = 0;
		params.staffParams.nurseShifts.forEach((shift) => {
			// Calculate total nurses needed for this shift across all days
			const totalNursesForShift = shift.nursesPerDay.reduce(
				(sum, count) => sum + count,
				0
			);

			// For each nurse in this shift
			for (let i = 0; i < totalNursesForShift; i++) {
				// Determine skill for this nurse based on skill distribution
				const skillId =
					weightedRandomSelection(shift.skillDistribution) || "junior";
				const skill = params.staffParams.nurseSkills.find(
					(s) => s.id === skillId
				);

				nurseCounter++;
				const nurseId = `N-${nurseCounter}`;
				nurses[nurseId] = {
					id: nurseId,
					isBusy: false,
					busyUntil: 0,
					totalBusyTime: 0,
					lastBusyStartTime: 0,
					skillId: skillId,
					shiftId: shift.id,
					isOnShift: false,
					totalOvertimeMinutes: 0,
				};
			}
		});

		// Schedule shift start/end events for all simulation days
		for (let day = 0; day < params.simulationDays; day++) {
			const dayStart = day * 24 * 60;

			params.staffParams.nurseShifts.forEach((shift) => {
				const dayOfWeek = day % 7;
				const nursesForThisDay = shift.nursesPerDay[dayOfWeek];

				if (nursesForThisDay > 0) {
					// Find nurses assigned to this shift
					const shiftNurses = Object.values(nurses)
						.filter((n) => n.shiftId === shift.id)
						.slice(0, nursesForThisDay);

					// Schedule shift start
					const shiftStart = dayStart + shift.startMinute;
					if (shiftStart < simulationEndTime) {
						addEvent(shiftStart, "NURSE_SHIFT_START", {
							shiftId: shift.id,
							resourceId: shiftNurses.map((n) => n.id).join(","),
						});
					}

					// Schedule shift end
					const shiftEnd = shiftStart + shift.durationMinutes;
					if (shiftEnd < simulationEndTime) {
						addEvent(shiftEnd, "NURSE_SHIFT_END", {
							shiftId: shift.id,
							resourceId: shiftNurses.map((n) => n.id).join(","),
						});
					}
				}
			});
		}
	} else {
		// Use legacy nurse model
		nurses = createResourcePool(
			"N",
			params.staffParams?.totalNurses || params.nurses || 5
		);
	}

	// Waiting Queues
	const orWaitingQueue = new PriorityQueue<string>();
	const pacu1WaitingQueue = new PriorityQueue<string>();
	const pacu2WaitingQueue = new PriorityQueue<string>();
	const wardWaitingQueue = new PriorityQueue<string>();
	const nurseWaitingQueue = new PriorityQueue<{
		patientId: string;
		phase: "pacu1" | "pacu2";
	}>();

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

	const findAvailableResource = (
		pool: Record<string, ResourceState>
	): ResourceState | null => {
		for (const id in pool) {
			if (!pool[id].isBusy) return pool[id];
		}
		return null;
	};

	const addEvent = (
		time: number,
		type: SimulationEvent["type"],
		data?: Omit<SimulationEvent, "time" | "type">
	) => {
		if (time < currentTime) time = currentTime;
		if (time >= simulationEndTime && type !== "SIMULATION_END_CHECK") return;
		eventQueue.enqueue({ time, type, ...data }, time);
	};

	const getPatient = (patientId: string): SurgeryCase | null =>
		patients[patientId] || null;
	const getPatientClass = (patient: SurgeryCase): PatientClass | null =>
		params.patientClasses.find((p) => p.id === patient.classId) || null;

	// Helper to update resource busy time and cost
	const updateResourceUsage = (
		resource: ResourceState,
		isEnding: boolean,
		time: number
	) => {
		if (isEnding && resource.isBusy) {
			const duration = time - resource.lastBusyStartTime;
			if (duration > 0) {
				resource.totalBusyTime += duration;
				// Accumulate cost based on resource type
				if (resource.id.startsWith("OR"))
					totalORCost += duration * (params.costParams?.costPerORMinute || 0);
				else if (resource.id.startsWith("P1"))
					totalPACU1Cost +=
						duration * (params.costParams?.costPerPACU1BedMinute || 0);
				else if (resource.id.startsWith("P2"))
					totalPACU2Cost +=
						duration * (params.costParams?.costPerPACU2BedMinute || 0);
				else if (resource.id.startsWith("N"))
					totalNurseCost +=
						duration * (params.costParams?.costPerNurseMinute || 0);
				else if (resource.id.startsWith("W"))
					totalWardCost +=
						duration * (params.costParams?.costPerWardBedMinute || 0);
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

		const p1Busy = Object.values(pacu1Beds).filter((b) => b.isBusy).length;
		const p2Busy = Object.values(pacu2Beds).filter((b) => b.isBusy).length;
		const wardBusy = Object.values(wardBeds).filter((b) => b.isBusy).length;
		const nurseBusy = Object.values(nurses).filter((n) => n.isBusy).length;
		const waitingWardCount = wardWaitingQueue.length;

		if (occupancyData.pacu1[occupancyData.pacu1.length - 1].count !== p1Busy)
			occupancyData.pacu1.push({ time, count: p1Busy });
		if (occupancyData.pacu2[occupancyData.pacu2.length - 1].count !== p2Busy)
			occupancyData.pacu2.push({ time, count: p2Busy });
		if (occupancyData.ward[occupancyData.ward.length - 1].count !== wardBusy)
			occupancyData.ward.push({ time, count: wardBusy });
		if (
			occupancyData.nurse[occupancyData.nurse.length - 1].busyCount !==
			nurseBusy
		)
			occupancyData.nurse.push({ time, busyCount: nurseBusy });

		const totalPacuBeds =
			params.pacuParams.phase1Beds + params.pacuParams.phase2Beds;
		if (totalPacuBeds > 0) {
			totalPacuBlockedTime += (waitingWardCount / totalPacuBeds) * duration;
		}

		lastStatsUpdateTime = time;
	};

	const tryAssignNurse = (
		patientId: string,
		phase: "pacu1" | "pacu2"
	): boolean => {
		const patient = getPatient(patientId);
		if (!patient) return false;

		// Enhanced nurse model
		if (params.staffParams?.useEnhancedNurseModel) {
			// Find nurses that are on shift and have the right skills
			const availableNurses = Object.values(nurses).filter((nurse) => {
				// Must be not busy and on shift
				if (nurse.isBusy || !nurse.isOnShift) return false;

				// Check if nurse has the right skills
				const nurseSkill = params.staffParams.nurseSkills.find(
					(skill) => skill.id === nurse.skillId
				);

				if (!nurseSkill) return false;

				// Check if nurse can handle this phase
				return phase === "pacu1"
					? nurseSkill.canHandlePhase1
					: nurseSkill.canHandlePhase2;
			});

			// Sort by efficiency (most efficient first)
			availableNurses.sort((a, b) => {
				const skillA = params.staffParams.nurseSkills.find(
					(skill) => skill.id === a.skillId
				);
				const skillB = params.staffParams.nurseSkills.find(
					(skill) => skill.id === b.skillId
				);

				const effA = skillA?.efficiencyMultiplier || 1.0;
				const effB = skillB?.efficiencyMultiplier || 1.0;

				return effB - effA; // Higher efficiency first
			});

			if (availableNurses.length > 0) {
				const selectedNurse = availableNurses[0];
				updateResourceUsage(selectedNurse, false, currentTime); // Mark nurse as busy
				selectedNurse.assignedPatientId = patientId;
				patient.assignedNurseId = selectedNurse.id;

				// Get nurse skill for logging
				const nurseSkill = params.staffParams.nurseSkills.find(
					(skill) => skill.id === selectedNurse.skillId
				);

				console.log(
					`Time ${currentTime.toFixed(2)}: Nurse ${selectedNurse.id} (${
						nurseSkill?.name
					}) assigned to Patient ${patientId} for ${phase}.`
				);
				return true;
			} else {
				// Check if there are any nurses on shift but busy
				const onShiftCount = Object.values(nurses).filter(
					(n) => n.isOnShift
				).length;
				const busyCount = Object.values(nurses).filter(
					(n) => n.isOnShift && n.isBusy
				).length;

				console.log(
					`Time ${currentTime.toFixed(
						2
					)}: Patient ${patientId} waiting for Nurse for ${phase}. Queue size: ${
						nurseWaitingQueue.length + 1
					}. Nurses on shift: ${onShiftCount}, Busy: ${busyCount}`
				);
				nurseWaitingQueue.enqueue({ patientId, phase }, patient.priority);
				return false;
			}
		}
		// Legacy nurse model
		else {
			const availableNurse = findAvailableResource(nurses);
			if (availableNurse) {
				updateResourceUsage(availableNurse, false, currentTime); // Mark nurse as busy
				availableNurse.assignedPatientId = patientId;
				patient.assignedNurseId = availableNurse.id;
				console.log(
					`Time ${currentTime.toFixed(2)}: Nurse ${
						availableNurse.id
					} assigned to Patient ${patientId} for ${phase}.`
				);
				return true;
			} else {
				console.log(
					`Time ${currentTime.toFixed(
						2
					)}: Patient ${patientId} waiting for Nurse for ${phase}. Queue size: ${
						nurseWaitingQueue.length + 1
					}`
				);
				nurseWaitingQueue.enqueue({ patientId, phase }, patient.priority);
				return false;
			}
		}
	};

	const releaseNurse = (nurseId: string | undefined) => {
		if (!nurseId || !nurses[nurseId]) return;
		const nurse = nurses[nurseId];

		// Check if nurse is working overtime
		if (
			params.staffParams?.useEnhancedNurseModel &&
			nurse.isOnShift === false &&
			nurse.shiftEndTime !== undefined &&
			currentTime > nurse.shiftEndTime
		) {
			// Calculate overtime minutes
			const overtimeMinutes = currentTime - nurse.shiftEndTime;
			nurse.totalOvertimeMinutes =
				(nurse.totalOvertimeMinutes || 0) + overtimeMinutes;

			// Apply overtime cost multiplier
			const overtimeMultiplier = params.staffParams.overtimeMultiplier || 1.5;
			const overtimeCost =
				overtimeMinutes *
				(params.costParams?.costPerNurseMinute || 0) *
				(overtimeMultiplier - 1);
			totalNurseCost += overtimeCost;

			console.log(
				`Time ${currentTime.toFixed(
					2
				)}: Nurse ${nurseId} released after ${overtimeMinutes.toFixed(
					0
				)} minutes of overtime.`
			);
		} else {
			console.log(`Time ${currentTime.toFixed(2)}: Nurse ${nurseId} released.`);
		}

		updateResourceUsage(nurse, true, currentTime); // Mark nurse as free and update cost
		nurse.busyUntil = 0; // Reset busyUntil

		// Try to assign this nurse to a waiting patient if the nurse is still on shift
		if (params.staffParams?.useEnhancedNurseModel && !nurse.isOnShift) {
			// Nurse is off shift, don't assign new patients
			return;
		}

		if (!nurseWaitingQueue.isEmpty()) {
			const waitingPatientInfo = nurseWaitingQueue.dequeue();
			if (waitingPatientInfo) {
				const waitingPatient = getPatient(waitingPatientInfo.patientId);

				// Check if this nurse can handle this patient's phase
				let canHandle = true;
				if (params.staffParams?.useEnhancedNurseModel) {
					const nurseSkill = params.staffParams.nurseSkills.find(
						(skill) => skill.id === nurse.skillId
					);

					if (nurseSkill) {
						canHandle =
							waitingPatientInfo.phase === "pacu1"
								? nurseSkill.canHandlePhase1
								: nurseSkill.canHandlePhase2;
					}
				}

				if (canHandle && waitingPatient) {
					if (
						waitingPatientInfo.phase === "pacu1" &&
						waitingPatient.currentState === "waiting_pacu1"
					) {
						// Assign this nurse directly
						nurse.isBusy = true;
						nurse.lastBusyStartTime = currentTime;
						nurse.assignedPatientId = waitingPatient.id;
						waitingPatient.assignedNurseId = nurse.id;

						addEvent(currentTime, "SURGERY_END", {
							patientId: waitingPatient.id,
						});
					} else if (
						waitingPatientInfo.phase === "pacu2" &&
						waitingPatient.currentState === "waiting_pacu2"
					) {
						// Assign this nurse directly
						nurse.isBusy = true;
						nurse.lastBusyStartTime = currentTime;
						nurse.assignedPatientId = waitingPatient.id;
						waitingPatient.assignedNurseId = nurse.id;

						addEvent(currentTime, "PACU1_END", {
							patientId: waitingPatient.id,
						});
					} else {
						// Put the patient back in the queue
						nurseWaitingQueue.enqueue(
							waitingPatientInfo,
							waitingPatient.priority
						);
					}
				} else {
					// Put the patient back in the queue
					nurseWaitingQueue.enqueue(
						waitingPatientInfo,
						waitingPatient?.priority || 5
					);
				}
			}
		}
	};

	// --- Generate Initial Events ---
	let initialSurgeryList: SurgeryCaseInput[];
	if (
		params.surgeryScheduleType === "custom" &&
		params.customSurgeryList &&
		params.customSurgeryList.length > 0
	) {
		initialSurgeryList = params.customSurgeryList;
		console.log(
			"Using custom surgery list with",
			initialSurgeryList.length,
			"surgeries"
		);
	} else if (
		params.blockScheduleEnabled &&
		params.orBlocks &&
		params.orBlocks.length > 0
	) {
		initialSurgeryList = scheduleCasesInBlocks(
			params.orBlocks,
			params.patientClasses,
			params.patientClassDistribution,
			params.simulationDays
		);
		console.log(
			"Generated surgery list from blocks with",
			initialSurgeryList.length,
			"surgeries"
		);
	} else {
		initialSurgeryList = generateSurgeryListTemplate(params);
		console.log(
			"Generated template surgery list with",
			initialSurgeryList.length,
			"surgeries"
		);
	}

	// Ensure we have surgeries to simulate
	if (initialSurgeryList.length === 0) {
		console.log("No surgeries in list, generating default template");
		initialSurgeryList = generateSurgeryListTemplate({
			...params,
			surgeryScheduleTemplate: {
				averageDailySurgeries: Math.max(
					6,
					params.surgeryScheduleTemplate?.averageDailySurgeries || 6
				),
			},
		});
		console.log(
			"Generated default surgery list with",
			initialSurgeryList.length,
			"surgeries"
		);
	}

	initialSurgeryList.forEach((s) => {
		const patientClass = params.patientClasses.find(
			(pc) => pc.id === s.classId
		);
		if (!patientClass) return;
		const patientId = s.id || `S-${uuidv4()}`;
		const arrivalTime = s.actualArrivalTime ?? s.scheduledStartTime - 30;

		// Use the provided duration if available, otherwise generate one
		// This ensures that user-defined durations are respected
		const duration =
			s.duration ??
			Math.max(
				15,
				Math.round(
					normalRandom(
						patientClass.surgeryDurationMean,
						patientClass.surgeryDurationStd
					)
				)
			);

		const priority = s.priority ?? patientClass.priority;
		patients[patientId] = {
			...s,
			id: patientId,
			caseType: "elective",
			actualArrivalTime: arrivalTime,
			duration: duration, // Use the duration we determined above
			priority: priority,
			currentState: "scheduled",
			wardTransferDelay: 0,
			orWaitingTime: 0,
		};
		addEvent(arrivalTime, "PATIENT_ARRIVAL", { patientId });
	});

	if (
		params.emergencyParams?.enabled &&
		params.emergencyParams?.arrivalRateMeanPerDay &&
		params.emergencyParams?.arrivalRateMeanPerDay > 0
	) {
		const meanArrivalsPerMinute =
			params.emergencyParams.arrivalRateMeanPerDay / (24 * 60);
		const timeToFirstArrival = exponentialRandom(meanArrivalsPerMinute);
		addEvent(timeToFirstArrival, "EMERGENCY_ARRIVAL");
	}
	addEvent(simulationEndTime, "SIMULATION_END_CHECK");

	// --- Main Simulation Loop ---
	while (!eventQueue.isEmpty()) {
		const currentEvent = eventQueue.dequeue();
		if (!currentEvent) break;

		if (currentEvent.time > currentTime) {
			updateStats(currentEvent.time);
			currentTime = currentEvent.time;
		}
		if (
			currentTime >= simulationEndTime &&
			currentEvent.type !== "SIMULATION_END_CHECK"
		)
			continue;

		const patient = currentEvent.patientId
			? getPatient(currentEvent.patientId)
			: null;
		const patientClass = patient ? getPatientClass(patient) : null;

		switch (currentEvent.type) {
			case "PATIENT_ARRIVAL":
				if (!patient) break;
				patient.currentState = "arrived";
				console.log(
					`Time ${currentTime.toFixed(2)}: Patient ${patient.id} (${
						patient.caseType
					}) arrived.`
				);

				// Check for cancellation based on patient class cancellation risk
				const patientCancellationRisk = patientClass?.cancellationRisk || 0;
				if (
					patientCancellationRisk > 0 &&
					Math.random() < patientCancellationRisk
				) {
					// Determine cancellation reason
					const reasons = [
						"patient_no_show",
						"medical_reason",
						"resource_unavailable",
					];
					const randomReason =
						reasons[Math.floor(Math.random() * reasons.length)];

					// Schedule cancellation
					addEvent(currentTime, "SURGERY_CANCELLATION", {
						patientId: patient.id,
						cancellationReason: randomReason,
					});

					console.log(
						`Time ${currentTime.toFixed(2)}: Patient ${
							patient.id
						} will be cancelled (${randomReason}).`
					);
					break;
				}

				const availableOR = findAvailableResource(orResources);
				if (availableOR) {
					updateResourceUsage(availableOR, false, currentTime); // Mark OR busy
					availableOR.assignedPatientId = patient.id;
					patient.orRoom = availableOR.id;
					patient.orStartTime = currentTime;
					patient.orWaitingTime = Math.max(
						0,
						currentTime - patient.actualArrivalTime
					);
					orWaitingTimes.push(patient.orWaitingTime);
					patient.currentState = "in_or";

					// Apply time-of-day variability to surgery duration if configured
					let surgeryDuration = patient.duration;
					if (patientClass?.timeOfDayVariability) {
						surgeryDuration = applyTimeOfDayVariability(
							surgeryDuration,
							patientClass.timeOfDayVariability,
							currentTime
						);
					}

					const surgeryEndTime = currentTime + surgeryDuration;
					availableOR.busyUntil = surgeryEndTime;
					addEvent(surgeryEndTime, "SURGERY_END", {
						patientId: patient.id,
						resourceId: availableOR.id,
					});
					console.log(
						`Time ${currentTime.toFixed(2)}: Patient ${
							patient.id
						} started surgery in ${
							availableOR.id
						}. Ends at ${surgeryEndTime.toFixed(2)}.`
					);
				} else {
					patient.currentState = "waiting_or";
					orWaitingQueue.enqueue(patient.id, patient.priority);
					console.log(
						`Time ${currentTime.toFixed(2)}: Patient ${
							patient.id
						} waiting for OR. Queue size: ${orWaitingQueue.length}`
					);
				}
				break;

			case "OR_AVAILABLE":
				const orId = currentEvent.resourceId;
				if (!orId || !orResources[orId]) break;
				console.log(`Time ${currentTime.toFixed(2)}: OR ${orId} available.`);
				updateResourceUsage(orResources[orId], true, currentTime); // Mark OR free, update cost
				orResources[orId].busyUntil = 0;

				if (!orWaitingQueue.isEmpty()) {
					const nextPatientId = orWaitingQueue.dequeue();
					if (nextPatientId) {
						const nextPatient = getPatient(nextPatientId);
						if (nextPatient && nextPatient.currentState === "waiting_or") {
							updateResourceUsage(orResources[orId], false, currentTime); // Mark OR busy
							orResources[orId].assignedPatientId = nextPatient.id;
							nextPatient.orRoom = orId;
							nextPatient.orStartTime = currentTime;
							nextPatient.orWaitingTime = Math.max(
								0,
								currentTime - nextPatient.actualArrivalTime
							);
							orWaitingTimes.push(nextPatient.orWaitingTime);
							nextPatient.currentState = "in_or";

							// Apply time-of-day variability to surgery duration if configured
							const nextPatientClass = getPatientClass(nextPatient);
							let surgeryDuration = nextPatient.duration;
							if (nextPatientClass?.timeOfDayVariability) {
								surgeryDuration = applyTimeOfDayVariability(
									surgeryDuration,
									nextPatientClass.timeOfDayVariability,
									currentTime
								);
							}

							const surgeryEndTime = currentTime + surgeryDuration;
							orResources[orId].busyUntil = surgeryEndTime;
							addEvent(surgeryEndTime, "SURGERY_END", {
								patientId: nextPatient.id,
								resourceId: orId,
							});
							console.log(
								`Time ${currentTime.toFixed(2)}: Patient ${
									nextPatient.id
								} (from queue) started surgery in ${orId}. Ends at ${surgeryEndTime.toFixed(
									2
								)}.`
							);
						} else if (nextPatient) {
							console.warn(
								`Patient ${nextPatientId} from OR queue was not in waiting_or state (${nextPatient.currentState}). Re-queueing OR_AVAILABLE.`
							);
							addEvent(currentTime, "OR_AVAILABLE", { resourceId: orId });
						}
					}
				}
				break;

			case "SURGERY_END":
				if (!patient || !patientClass) break;
				const endedOrId = currentEvent.resourceId;
				console.log(
					`Time ${currentTime.toFixed(2)}: Patient ${
						patient.id
					} finished surgery in ${endedOrId || patient.orRoom}.`
				);
				patient.orEndTime = currentTime;
				// OR release is now handled by OR_AVAILABLE event triggered below
				if (endedOrId && orResources[endedOrId])
					addEvent(currentTime, "OR_AVAILABLE", { resourceId: endedOrId });
				else if (patient.orRoom && orResources[patient.orRoom])
					addEvent(currentTime, "OR_AVAILABLE", { resourceId: patient.orRoom });

				if (patientClass.processType === "directTransfer") {
					patient.currentState = "discharged";
					patient.dischargeTime = currentTime;
					completedSurgeries.push(patient);
					console.log(
						`Time ${currentTime.toFixed(2)}: Patient ${
							patient.id
						} (Direct Transfer) discharged/transferred.`
					);
				} else {
					const availableP1Bed = findAvailableResource(pacu1Beds);
					if (availableP1Bed && tryAssignNurse(patient.id, "pacu1")) {
						updateResourceUsage(availableP1Bed, false, currentTime); // Mark P1 bed busy
						availableP1Bed.assignedPatientId = patient.id;
						patient.pacuPhase1BedId = availableP1Bed.id;
						patient.pacuPhase1StartTime = currentTime;
						patient.currentState = "in_pacu1";
						const p1Duration = Math.max(
							10,
							Math.round(
								normalRandom(
									patientClass.pacuPhase1DurationMean,
									patientClass.pacuPhase1DurationStd
								)
							)
						);
						const p1EndTime = currentTime + p1Duration;
						availableP1Bed.busyUntil = p1EndTime;
						if (patient.assignedNurseId && nurses[patient.assignedNurseId])
							nurses[patient.assignedNurseId].busyUntil = p1EndTime;
						addEvent(p1EndTime, "PACU1_END", {
							patientId: patient.id,
							resourceId: availableP1Bed.id,
						});
						console.log(
							`Time ${currentTime.toFixed(2)}: Patient ${
								patient.id
							} entered PACU Phase 1 in ${
								availableP1Bed.id
							}. Ends at ${p1EndTime.toFixed(2)}.`
						);
					} else {
						patient.currentState = "waiting_pacu1";
						pacu1WaitingQueue.enqueue(patient.id, patient.priority);
						console.log(
							`Time ${currentTime.toFixed(2)}: Patient ${
								patient.id
							} waiting for PACU Phase 1 bed/nurse. BedQ: ${
								pacu1WaitingQueue.length
							}, NurseQ: ${nurseWaitingQueue.length}`
						);
					}
				}
				break;

			case "PACU1_END":
				if (!patient || !patientClass || !patient.pacuPhase1BedId) break;
				const p1BedId = currentEvent.resourceId;
				console.log(
					`Time ${currentTime.toFixed(2)}: Patient ${
						patient.id
					} finished PACU Phase 1 in ${p1BedId || patient.pacuPhase1BedId}.`
				);
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
							if (nextPatient && nextPatient.currentState === "waiting_pacu1") {
								if (tryAssignNurse(nextPatient.id, "pacu1")) {
									updateResourceUsage(pacu1Beds[p1BedId], false, currentTime); // Mark P1 bed busy
									pacu1Beds[p1BedId].assignedPatientId = nextPatient.id;
									nextPatient.pacuPhase1BedId = p1BedId;
									nextPatient.pacuPhase1StartTime = currentTime;
									nextPatient.currentState = "in_pacu1";
									const pc = getPatientClass(nextPatient);
									const p1Duration = pc
										? Math.max(
												10,
												Math.round(
													normalRandom(
														pc.pacuPhase1DurationMean,
														pc.pacuPhase1DurationStd
													)
												)
										  )
										: 60;
									const p1EndTime = currentTime + p1Duration;
									pacu1Beds[p1BedId].busyUntil = p1EndTime;
									if (
										nextPatient.assignedNurseId &&
										nurses[nextPatient.assignedNurseId]
									)
										nurses[nextPatient.assignedNurseId].busyUntil = p1EndTime;
									addEvent(p1EndTime, "PACU1_END", {
										patientId: nextPatient.id,
										resourceId: p1BedId,
									});
									console.log(
										`Time ${currentTime.toFixed(2)}: Patient ${
											nextPatient.id
										} (from queue) entered PACU Phase 1 in ${p1BedId}. Ends at ${p1EndTime.toFixed(
											2
										)}.`
									);
								} else {
									pacu1WaitingQueue.enqueue(
										nextPatient.id,
										nextPatient.priority
									);
								}
							} else if (nextPatient) {
								console.warn(
									`Patient ${nextPatientId} from PACU1 queue was not in waiting_pacu1 state (${nextPatient.currentState}).`
								);
							}
						}
					}
				}

				if (patientClass.pacuPhase2DurationMean > 0) {
					const availableP2Bed = findAvailableResource(pacu2Beds);
					if (availableP2Bed && tryAssignNurse(patient.id, "pacu2")) {
						updateResourceUsage(availableP2Bed, false, currentTime); // Mark P2 bed busy
						availableP2Bed.assignedPatientId = patient.id;
						patient.pacuPhase2BedId = availableP2Bed.id;
						patient.pacuPhase2StartTime = currentTime;
						patient.currentState = "in_pacu2";
						const p2Duration = Math.max(
							10,
							Math.round(
								normalRandom(
									patientClass.pacuPhase2DurationMean,
									patientClass.pacuPhase2DurationStd
								)
							)
						);
						const p2EndTime = currentTime + p2Duration;
						availableP2Bed.busyUntil = p2EndTime;
						if (patient.assignedNurseId && nurses[patient.assignedNurseId])
							nurses[patient.assignedNurseId].busyUntil = p2EndTime;
						addEvent(p2EndTime, "PACU2_END", {
							patientId: patient.id,
							resourceId: availableP2Bed.id,
						});
						console.log(
							`Time ${currentTime.toFixed(2)}: Patient ${
								patient.id
							} entered PACU Phase 2 in ${
								availableP2Bed.id
							}. Ends at ${p2EndTime.toFixed(2)}.`
						);
					} else {
						patient.currentState = "waiting_pacu2";
						pacu2WaitingQueue.enqueue(patient.id, patient.priority);
						console.log(
							`Time ${currentTime.toFixed(2)}: Patient ${
								patient.id
							} waiting for PACU Phase 2 bed/nurse. BedQ: ${
								pacu2WaitingQueue.length
							}, NurseQ: ${nurseWaitingQueue.length}`
						);
					}
				} else {
					addEvent(currentTime, "DISCHARGE_CRITERIA_MET", {
						patientId: patient.id,
					});
				}
				break;

			case "PACU2_END":
				if (!patient || !patientClass || !patient.pacuPhase2BedId) break;
				const p2BedId = currentEvent.resourceId;
				console.log(
					`Time ${currentTime.toFixed(2)}: Patient ${
						patient.id
					} finished PACU Phase 2 in ${p2BedId || patient.pacuPhase2BedId}.`
				);
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
							if (nextPatient && nextPatient.currentState === "waiting_pacu2") {
								if (tryAssignNurse(nextPatient.id, "pacu2")) {
									updateResourceUsage(pacu2Beds[p2BedId], false, currentTime); // Mark P2 bed busy
									pacu2Beds[p2BedId].assignedPatientId = nextPatient.id;
									nextPatient.pacuPhase2BedId = p2BedId;
									nextPatient.pacuPhase2StartTime = currentTime;
									nextPatient.currentState = "in_pacu2";
									const pc = getPatientClass(nextPatient);
									const p2Duration = pc
										? Math.max(
												10,
												Math.round(
													normalRandom(
														pc.pacuPhase2DurationMean,
														pc.pacuPhase2DurationStd
													)
												)
										  )
										: 60;
									const p2EndTime = currentTime + p2Duration;
									pacu2Beds[p2BedId].busyUntil = p2EndTime;
									if (
										nextPatient.assignedNurseId &&
										nurses[nextPatient.assignedNurseId]
									)
										nurses[nextPatient.assignedNurseId].busyUntil = p2EndTime;
									addEvent(p2EndTime, "PACU2_END", {
										patientId: nextPatient.id,
										resourceId: p2BedId,
									});
									console.log(
										`Time ${currentTime.toFixed(2)}: Patient ${
											nextPatient.id
										} (from queue) entered PACU Phase 2 in ${p2BedId}. Ends at ${p2EndTime.toFixed(
											2
										)}.`
									);
								} else {
									pacu2WaitingQueue.enqueue(
										nextPatient.id,
										nextPatient.priority
									);
								}
							} else if (nextPatient) {
								console.warn(
									`Patient ${nextPatientId} from PACU2 queue was not in waiting_pacu2 state (${nextPatient.currentState}).`
								);
							}
						}
					}
				}
				addEvent(currentTime, "DISCHARGE_CRITERIA_MET", {
					patientId: patient.id,
				});
				break;

			case "DISCHARGE_CRITERIA_MET":
				if (!patient || !patientClass) break;
				console.log(
					`Time ${currentTime.toFixed(2)}: Patient ${
						patient.id
					} met discharge criteria.`
				);
				patient.readyForWardTime = currentTime;

				if (patientClass.processType === "outpatient") {
					patient.currentState = "discharged";
					patient.dischargeTime = currentTime;
					completedSurgeries.push(patient);
					console.log(
						`Time ${currentTime.toFixed(2)}: Patient ${
							patient.id
						} (Outpatient) discharged home.`
					);
				} else {
					const availableWardBed = findAvailableResource(wardBeds);
					if (availableWardBed) {
						updateResourceUsage(availableWardBed, false, currentTime); // Mark Ward bed busy
						availableWardBed.assignedPatientId = patient.id;
						patient.wardBedId = availableWardBed.id;
						patient.wardArrivalTime = currentTime;
						patient.currentState = "in_ward";
						patient.wardTransferDelay = 0;
						wardTransferDelays.push(0);

						// Calculate realistic ward stay duration based on patient class
						let wardStayDuration = 60; // Default 1 hour

						if (
							patientClass.wardStayDurationMean &&
							patientClass.wardStayDurationStd
						) {
							wardStayDuration = Math.max(
								60, // Minimum 1 hour
								Math.round(
									normalRandom(
										patientClass.wardStayDurationMean,
										patientClass.wardStayDurationStd
									)
								)
							);

							// Apply time-of-day variability if configured
							if (patientClass.timeOfDayVariability) {
								wardStayDuration = applyTimeOfDayVariability(
									wardStayDuration,
									patientClass.timeOfDayVariability,
									currentTime
								);
							}
						}

						patient.wardPlannedDuration = wardStayDuration;

						// Schedule ward discharge
						const dischargeTime = currentTime + wardStayDuration;
						availableWardBed.busyUntil = dischargeTime;

						console.log(
							`Time ${currentTime.toFixed(2)}: Patient ${
								patient.id
							} transferred to Ward Bed ${availableWardBed.id}. Planned stay: ${
								wardStayDuration / 60
							} hours.`
						);

						// Schedule discharge event
						addEvent(dischargeTime, "WARD_DISCHARGE", {
							patientId: patient.id,
							resourceId: availableWardBed.id,
						});
					} else {
						patient.currentState = "waiting_ward";
						wardWaitingQueue.enqueue(patient.id, patient.priority);
						console.log(
							`Time ${currentTime.toFixed(2)}: Patient ${
								patient.id
							} waiting for Ward Bed. Queue size: ${
								wardWaitingQueue.length
							}. PACU BLOCKING.`
						);
					}
				}
				break;

			case "WARD_BED_AVAILABLE":
				const wardBedId = currentEvent.resourceId;
				if (!wardBedId || !wardBeds[wardBedId]) break;
				console.log(
					`Time ${currentTime.toFixed(2)}: Ward Bed ${wardBedId} available.`
				);
				updateResourceUsage(wardBeds[wardBedId], true, currentTime); // Mark Ward bed free, update cost
				wardBeds[wardBedId].busyUntil = 0;

				if (!wardWaitingQueue.isEmpty()) {
					const nextPatientId = wardWaitingQueue.dequeue();
					if (nextPatientId) {
						const nextPatient = getPatient(nextPatientId);
						if (
							nextPatient &&
							nextPatient.currentState === "waiting_ward" &&
							nextPatient.readyForWardTime !== undefined
						) {
							updateResourceUsage(wardBeds[wardBedId], false, currentTime); // Mark Ward bed busy
							wardBeds[wardBedId].assignedPatientId = nextPatient.id;
							nextPatient.wardBedId = wardBedId;
							nextPatient.wardArrivalTime = currentTime;
							nextPatient.currentState = "in_ward";
							nextPatient.wardTransferDelay =
								currentTime - nextPatient.readyForWardTime;
							wardTransferDelays.push(nextPatient.wardTransferDelay);

							// Get patient class for ward stay duration
							const nextPatientClass = getPatientClass(nextPatient);

							// Calculate realistic ward stay duration based on patient class
							let wardStayDuration = 60; // Default 1 hour

							if (
								nextPatientClass &&
								nextPatientClass.wardStayDurationMean &&
								nextPatientClass.wardStayDurationStd
							) {
								wardStayDuration = Math.max(
									60, // Minimum 1 hour
									Math.round(
										normalRandom(
											nextPatientClass.wardStayDurationMean,
											nextPatientClass.wardStayDurationStd
										)
									)
								);

								// Apply time-of-day variability if configured
								if (nextPatientClass.timeOfDayVariability) {
									wardStayDuration = applyTimeOfDayVariability(
										wardStayDuration,
										nextPatientClass.timeOfDayVariability,
										currentTime
									);
								}
							}

							nextPatient.wardPlannedDuration = wardStayDuration;

							// Schedule ward discharge
							const dischargeTime = currentTime + wardStayDuration;
							wardBeds[wardBedId].busyUntil = dischargeTime;

							console.log(
								`Time ${currentTime.toFixed(2)}: Patient ${
									nextPatient.id
								} (from queue) transferred to Ward Bed ${wardBedId}. Delay: ${nextPatient.wardTransferDelay.toFixed(
									2
								)} mins. Planned stay: ${wardStayDuration / 60} hours.`
							);

							// Schedule discharge event
							addEvent(dischargeTime, "WARD_DISCHARGE", {
								patientId: nextPatient.id,
								resourceId: wardBedId,
							});
						} else if (nextPatient) {
							console.warn(
								`Patient ${nextPatientId} from Ward queue was not in waiting_ward state (${nextPatient.currentState}). Re-queueing WARD_BED_AVAILABLE.`
							);
							addEvent(currentTime, "WARD_BED_AVAILABLE", {
								resourceId: wardBedId,
							});
						}
					}
				}
				break;

			case "EMERGENCY_ARRIVAL":
				console.log(
					`Time ${currentTime.toFixed(
						2
					)}: Processing potential emergency arrival.`
				);
				const emergencyClassId = weightedRandomSelection(
					params.emergencyParams?.patientClassDistribution ||
						params.patientClassDistribution
				);
				if (!emergencyClassId) break;
				const emergencyClass = params.patientClasses.find(
					(pc) => pc.id === emergencyClassId
				);
				if (!emergencyClass) break;
				const emergencyPatientId = `E-${++emergencyCounter}`;
				const emergencyDuration = Math.max(
					15,
					Math.round(
						normalRandom(
							emergencyClass.surgeryDurationMean,
							emergencyClass.surgeryDurationStd
						)
					)
				);
				const emergencyPriority = 0;
				patients[emergencyPatientId] = {
					id: emergencyPatientId,
					caseType: "emergency",
					classId: emergencyClassId,
					scheduledStartTime: currentTime,
					actualArrivalTime: currentTime,
					duration: emergencyDuration,
					orRoom: "",
					priority: emergencyPriority,
					currentState: "scheduled",
					wardTransferDelay: 0,
					orWaitingTime: 0,
				};
				console.log(
					`Time ${currentTime.toFixed(
						2
					)}: Generated Emergency Case ${emergencyPatientId} (Class ${emergencyClassId}).`
				);
				addEvent(currentTime, "PATIENT_ARRIVAL", {
					patientId: emergencyPatientId,
				});
				if (
					params.emergencyParams?.enabled &&
					params.emergencyParams?.arrivalRateMeanPerDay &&
					params.emergencyParams?.arrivalRateMeanPerDay > 0
				) {
					const meanArrivalsPerMinute =
						params.emergencyParams.arrivalRateMeanPerDay / (24 * 60);
					const timeToNextArrival = exponentialRandom(meanArrivalsPerMinute);
					addEvent(currentTime + timeToNextArrival, "EMERGENCY_ARRIVAL");
					console.log(
						`Time ${currentTime.toFixed(
							2
						)}: Next emergency arrival scheduled at ${(
							currentTime + timeToNextArrival
						).toFixed(2)}.`
					);
				}
				break;

			case "NURSE_SHIFT_START":
				if (!currentEvent.shiftId || !currentEvent.resourceId) break;
				console.log(
					`Time ${currentTime.toFixed(2)}: Nurse shift ${
						currentEvent.shiftId
					} starting.`
				);

				// Mark nurses as on shift
				const nurseIds = currentEvent.resourceId.split(",");
				nurseIds.forEach((nurseId) => {
					if (nurses[nurseId]) {
						const nurse = nurses[nurseId];
						nurse.isOnShift = true;
						nurse.shiftStartTime = currentTime;

						// Find shift duration
						const shift = params.staffParams?.nurseShifts.find(
							(s) => s.id === currentEvent.shiftId
						);
						if (shift) {
							nurse.shiftEndTime = currentTime + shift.durationMinutes;
						}

						console.log(
							`Time ${currentTime.toFixed(2)}: Nurse ${nurseId} started shift ${
								currentEvent.shiftId
							}.`
						);
					}
				});

				// Check if any patients are waiting for nurses
				if (!nurseWaitingQueue.isEmpty()) {
					// Try to assign nurses to waiting patients
					const waitingPatientInfo = nurseWaitingQueue.dequeue();
					if (waitingPatientInfo) {
						addEvent(
							currentTime,
							waitingPatientInfo.phase === "pacu1"
								? "SURGERY_END"
								: "PACU1_END",
							{
								patientId: waitingPatientInfo.patientId,
							}
						);
					}
				}
				break;

			case "NURSE_SHIFT_END":
				if (!currentEvent.shiftId || !currentEvent.resourceId) break;
				console.log(
					`Time ${currentTime.toFixed(2)}: Nurse shift ${
						currentEvent.shiftId
					} ending.`
				);

				// Mark nurses as off shift
				const endingNurseIds = currentEvent.resourceId.split(",");
				endingNurseIds.forEach((nurseId) => {
					if (nurses[nurseId]) {
						const nurse = nurses[nurseId];
						nurse.isOnShift = false;

						// If nurse is busy, they will continue working (overtime)
						if (nurse.isBusy) {
							console.log(
								`Time ${currentTime.toFixed(
									2
								)}: Nurse ${nurseId} shift ended but continuing to work (overtime).`
							);
						} else {
							console.log(
								`Time ${currentTime.toFixed(2)}: Nurse ${nurseId} ended shift ${
									currentEvent.shiftId
								}.`
							);
						}
					}
				});
				break;

			case "SURGERY_CANCELLATION":
				if (!patient) break;
				console.log(
					`Time ${currentTime.toFixed(2)}: Surgery for patient ${
						patient.id
					} cancelled. Reason: ${currentEvent.cancellationReason || "unknown"}.`
				);

				patient.currentState = "cancelled";
				patient.cancellationTime = currentTime;
				patient.cancellationReason = currentEvent.cancellationReason as any;
				cancelledSurgeries.push(patient);

				// Add cancellation cost
				totalCancellationCost += params.costParams?.costPerCancellation || 0;
				break;

			case "WARD_DISCHARGE":
				if (!patient || !patient.wardBedId) break;
				console.log(
					`Time ${currentTime.toFixed(2)}: Patient ${
						patient.id
					} discharged from ward bed ${patient.wardBedId}.`
				);

				patient.dischargeTime = currentTime;
				patient.currentState = "discharged";

				// Release ward bed
				if (wardBeds[patient.wardBedId]) {
					updateResourceUsage(wardBeds[patient.wardBedId], true, currentTime);
					wardBeds[patient.wardBedId].busyUntil = 0;

					// Check if any patients are waiting for ward beds
					if (!wardWaitingQueue.isEmpty()) {
						addEvent(currentTime, "WARD_BED_AVAILABLE", {
							resourceId: patient.wardBedId,
						});
					}
				}
				break;

			case "SIMULATION_END_CHECK":
				console.log(`Time ${currentTime.toFixed(2)}: Simulation end check.`);
				updateStats(currentTime);
				// Ensure any ongoing resource usage is accounted for up to simulation end time
				Object.values(orResources).forEach((r) => {
					if (r.isBusy) updateResourceUsage(r, true, currentTime);
				});
				Object.values(pacu1Beds).forEach((r) => {
					if (r.isBusy) updateResourceUsage(r, true, currentTime);
				});
				Object.values(pacu2Beds).forEach((r) => {
					if (r.isBusy) updateResourceUsage(r, true, currentTime);
				});
				Object.values(wardBeds).forEach((r) => {
					if (r.isBusy) updateResourceUsage(r, true, currentTime);
				});
				Object.values(nurses).forEach((r) => {
					if (r.isBusy) updateResourceUsage(r, true, currentTime);
				});
				break;
		}
	} // End of simulation loop

	// --- Post-Simulation Analysis ---
	console.log("Simulation loop finished. Calculating results...");
	if (lastStatsUpdateTime < simulationEndTime) updateStats(simulationEndTime);

	const calculatePercentile = (data: number[], percentile: number): number => {
		if (data.length === 0) return 0;
		data.sort((a, b) => a - b);
		const index = Math.min(
			data.length - 1,
			Math.floor(data.length * percentile)
		);
		return data[index] || 0;
	};

	const meanORWaitingTime =
		orWaitingTimes.length > 0
			? orWaitingTimes.reduce((s, t) => s + t, 0) / orWaitingTimes.length
			: 0;
	const p95ORWaitingTime = calculatePercentile(orWaitingTimes, 0.95);
	const meanWardTransferDelay =
		wardTransferDelays.length > 0
			? wardTransferDelays.reduce((s, t) => s + t, 0) /
			  wardTransferDelays.length
			: 0;
	const p95WardTransferDelay = calculatePercentile(wardTransferDelays, 0.95);
	const pacuTimes = completedSurgeries
		.map(
			(p) =>
				(p.pacuPhase2EndTime ?? p.pacuPhase1EndTime ?? 0) -
				(p.pacuPhase1StartTime ?? p.pacuPhase2StartTime ?? 0)
		)
		.filter((t) => t > 0);
	const meanPacuTime =
		pacuTimes.length > 0
			? pacuTimes.reduce((s, t) => s + t, 0) / pacuTimes.length
			: 0;
	const pacuBlockedTimeRatio =
		simulationEndTime > 0 ? totalPacuBlockedTime / simulationEndTime : 0;

	const calculateTimeSeriesStats = (
		data: Array<{ time: number; count?: number; busyCount?: number }>,
		totalResource: number,
		simTime: number
	) => {
		if (data.length <= 1 || totalResource <= 0 || simTime <= 0)
			return { mean: 0, peak: 0, totalBusyTime: 0 };
		let totalWeightedCount = 0;
		let peakCount = 0;
		for (let i = 1; i < data.length; i++) {
			const duration = data[i].time - data[i - 1].time;
			const count = data[i - 1].count ?? data[i - 1].busyCount ?? 0;
			if (duration > 0) totalWeightedCount += count * duration;
			peakCount = Math.max(peakCount, count);
		}
		const lastDuration = simTime - data[data.length - 1].time;
		const lastCount =
			data[data.length - 1].count ?? data[data.length - 1].busyCount ?? 0;
		if (lastDuration > 0) totalWeightedCount += lastCount * lastDuration;
		peakCount = Math.max(peakCount, lastCount);
		const meanCount = totalWeightedCount / simTime;
		return {
			mean: meanCount / totalResource,
			peak: peakCount / totalResource,
			totalBusyTime: totalWeightedCount,
		};
	};

	const pacu1Stats = calculateTimeSeriesStats(
		occupancyData.pacu1,
		params.pacuParams?.phase1Beds || 1,
		simulationEndTime
	);
	const pacu2Stats = calculateTimeSeriesStats(
		occupancyData.pacu2,
		params.pacuParams?.phase2Beds || 1,
		simulationEndTime
	);
	const wardStats = calculateTimeSeriesStats(
		occupancyData.ward,
		params.wardParams?.totalBeds || params.beds || 10,
		simulationEndTime
	);
	const nurseStats = calculateTimeSeriesStats(
		occupancyData.nurse,
		params.staffParams?.totalNurses || params.nurses || 5,
		simulationEndTime
	);

	// Calculate OR Utilization based on total busy time
	const orUtilization: Record<string, number> = {};
	let totalORBusyTime = 0;
	Object.values(orResources).forEach((or) => {
		orUtilization[or.id] =
			simulationEndTime > 0 ? or.totalBusyTime / simulationEndTime : 0;
		totalORBusyTime += or.totalBusyTime;
	});

	// Final cost calculation
	totalCancellationCost =
		cancelledSurgeries.length * (params.costParams?.costPerCancellation || 0);
	const totalCost =
		totalORCost +
		totalPACU1Cost +
		totalPACU2Cost +
		totalNurseCost +
		totalWardCost +
		totalCancellationCost;

	// Calculate nurse overtime and shift coverage
	let totalOvertimeMinutes = 0;
	const nurseOvertimeByShift: Record<string, number> = {};
	const nurseUtilizationBySkill: Record<string, number> = {};
	const shiftCoverage: Record<string, number> = {};

	if (params.staffParams?.useEnhancedNurseModel) {
		// Calculate overtime by shift
		Object.values(nurses).forEach((nurse) => {
			if (nurse.totalOvertimeMinutes && nurse.totalOvertimeMinutes > 0) {
				totalOvertimeMinutes += nurse.totalOvertimeMinutes;

				// Add to shift-specific overtime
				if (nurse.shiftId) {
					nurseOvertimeByShift[nurse.shiftId] =
						(nurseOvertimeByShift[nurse.shiftId] || 0) +
						nurse.totalOvertimeMinutes;
				}
			}

			// Add to skill-specific utilization
			if (nurse.skillId) {
				const busyRatio = nurse.totalBusyTime / simulationEndTime;
				nurseUtilizationBySkill[nurse.skillId] =
					((nurseUtilizationBySkill[nurse.skillId] || 0) *
						(Object.values(nurses).filter((n) => n.skillId === nurse.skillId)
							.length -
							1) +
						busyRatio) /
					Object.values(nurses).filter((n) => n.skillId === nurse.skillId)
						.length;
			}
		});

		// Calculate shift coverage
		params.staffParams.nurseShifts.forEach((shift) => {
			// For each shift, calculate what percentage of the time all required nurses were available
			let totalShiftMinutes = 0;
			let fullyCoveredMinutes = 0;

			// For each day
			for (let day = 0; day < params.simulationDays; day++) {
				const dayOfWeek = day % 7;
				const requiredNurses = shift.nursesPerDay[dayOfWeek];

				if (requiredNurses > 0) {
					const shiftDuration = shift.durationMinutes;
					totalShiftMinutes += shiftDuration;

					// Simplified calculation - assume full coverage if we have enough nurses with this shift
					const nursesWithThisShift = Object.values(nurses).filter(
						(n) => n.shiftId === shift.id
					).length;
					if (nursesWithThisShift >= requiredNurses) {
						fullyCoveredMinutes += shiftDuration;
					}
				}
			}

			shiftCoverage[shift.id] =
				totalShiftMinutes > 0 ? fullyCoveredMinutes / totalShiftMinutes : 1.0;
		});
	}

	const overtimeHours = totalOvertimeMinutes / 60;

	// Create time-of-day data for compatibility with current visualization components
	const timePoints = 24 * 4; // 15-minute intervals for a day
	const bedOccupancy: number[] = new Array(timePoints).fill(0);
	const nurseUtilization: number[] = new Array(timePoints).fill(0);
	const orUtilizationByRoom: Record<string, number[]> = {};

	// Create nurse shift data
	const nurseShiftData: Array<{
		time: number;
		onShift: number;
		working: number;
	}> = [];

	// Sample nurse shift data at regular intervals
	if (params.staffParams?.useEnhancedNurseModel) {
		for (let t = 0; t < simulationEndTime; t += 60) {
			// Sample every hour
			const onShift = Object.values(nurses).filter((n) => {
				return (
					n.shiftStartTime !== undefined &&
					n.shiftEndTime !== undefined &&
					t >= n.shiftStartTime &&
					t < n.shiftEndTime
				);
			}).length;

			const working = Object.values(nurses).filter((n) => {
				return (
					n.lastBusyStartTime <= t &&
					(n.isBusy || (n.busyUntil !== undefined && t < n.busyUntil))
				);
			}).length;

			nurseShiftData.push({ time: t, onShift, working });
		}
	}

	// Initialize OR utilization arrays for compatibility
	for (let i = 1; i <= params.numberOfORs; i++) {
		orUtilizationByRoom[`OR-${i}`] = new Array(timePoints).fill(0);
	}

	// Convert occupancy data to time-of-day data
	const truncateTimePoints = (
		data: Array<{ time: number; count: number }>,
		maxPoints: number
	): Array<{ time: number; count: number }> => {
		return data.filter((d) => d.time < 1440);
	};

	const truncatedWardData = truncateTimePoints(occupancyData.ward, timePoints);
	const truncatedNurseData = occupancyData.nurse.filter((d) => d.time < 1440);

	// Add nurse utilization data based on time blocks
	if (truncatedNurseData.length > 0) {
		let lastTimeIndex = 0;
		for (const entry of truncatedNurseData) {
			const timeIndex = Math.min(
				timePoints - 1,
				Math.floor((entry.time % 1440) / 15)
			);
			if (timeIndex >= 0) {
				// Fill in any gaps since last recorded time
				for (let i = lastTimeIndex; i <= timeIndex; i++) {
					nurseUtilization[i] =
						entry.busyCount /
						(params.staffParams?.totalNurses || params.nurses || 5);
				}
				lastTimeIndex = timeIndex + 1;
			}
		}
	}

	// Add bed occupancy data based on time blocks
	if (truncatedWardData.length > 0) {
		let lastTimeIndex = 0;
		for (const entry of truncatedWardData) {
			const timeIndex = Math.min(
				timePoints - 1,
				Math.floor((entry.time % 1440) / 15)
			);
			if (timeIndex >= 0) {
				// Fill in any gaps since last recorded time
				for (let i = lastTimeIndex; i <= timeIndex; i++) {
					bedOccupancy[i] =
						entry.count / (params.wardParams?.totalBeds || params.beds || 10);
				}
				lastTimeIndex = timeIndex + 1;
			}
		}
	}

	// Find peak times (times when bed occupancy > 80%)
	const peakTimes = bedOccupancy
		.map((occ, idx) => ({ time: idx * 15, occupancy: occ }))
		.filter((item) => item.occupancy > 0.8)
		.sort((a, b) => b.occupancy - a.occupancy)
		.slice(0, 5);

	// Calculate patient class counts
	const patientClassCounts: Record<string, number> = {};
	completedSurgeries.forEach((surgery) => {
		patientClassCounts[surgery.classId] =
			(patientClassCounts[surgery.classId] || 0) + 1;
	});

	console.log(
		`Simulation complete. Completed: ${completedSurgeries.length}, Cancelled: ${cancelledSurgeries.length}`
	);
	console.log(
		`Total Costs - OR: ${totalORCost.toFixed(2)}, P1: ${totalPACU1Cost.toFixed(
			2
		)}, P2: ${totalPACU2Cost.toFixed(2)}, Nurse: ${totalNurseCost.toFixed(
			2
		)}, Ward: ${totalWardCost.toFixed(
			2
		)}, Cancel: ${totalCancellationCost.toFixed(2)}, TOTAL: ${totalCost.toFixed(
			2
		)}`
	);

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
		// Enhanced nurse model metrics
		nurseOvertimeByShift,
		nurseUtilizationBySkill,
		shiftCoverage,
		// Occupancy data
		pacuPhase1OccupancyData: occupancyData.pacu1,
		pacuPhase2OccupancyData: occupancyData.pacu2,
		wardOccupancyData: occupancyData.ward,
		nurseUtilizationData: occupancyData.nurse,
		nurseShiftData: nurseShiftData || [],
		// Distributions
		wardTransferDelayDistribution: wardTransferDelays,
		orWaitingTimeDistribution: orWaitingTimes,
		// Cost data
		totalCost,
		costBreakdown: {
			orCost: totalORCost,
			pacu1Cost: totalPACU1Cost,
			pacu2Cost: totalPACU2Cost,
			nurseCost: totalNurseCost,
			nurseOvertimeCost:
				totalOvertimeMinutes *
				(params.costParams?.costPerNurseMinute || 0) *
				((params.staffParams?.overtimeMultiplier || 1.5) - 1),
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

export function generateSurgeryListTemplate(
	params: SimulationParams
): SurgeryCaseInput[] {
	const {
		simulationDays,
		numberOfORs,
		patientClasses,
		patientClassDistribution,
	} = params;
	const avgDaily =
		params.surgeryScheduleTemplate?.averageDailySurgeries ||
		params.averageDailySurgeries ||
		8; // Increased default from 6 to 8
	const surgeryList: SurgeryCaseInput[] = [];

	// Define turnover time between surgeries (minutes)
	const turnoverTime = params.surgeryScheduleTemplate?.turnoverTime || 15;

	// Define OR start and end times
	const orStartTime = 465; // 7:45 AM (465 minutes from midnight)
	const orEndTime = 960; // 4:00 PM (960 minutes from midnight)

	// Calculate average surgeries per OR per day
	const surgeriesPerDay = Math.max(1, Math.round(avgDaily));
	const surgeriesPerORPerDay = Math.ceil(surgeriesPerDay / numberOfORs);

	for (let day = 0; day < simulationDays; day++) {
		// For each OR, schedule surgeries throughout the day
		for (let orNum = 1; orNum <= numberOfORs; orNum++) {
			const orRoom = `OR-${orNum}`;
			let currentTime = orStartTime;

			// Schedule surgeries for this OR on this day
			for (let i = 0; i < surgeriesPerORPerDay; i++) {
				// Select patient class based on distribution
				const classId = weightedRandomSelection(patientClassDistribution);
				if (!classId) continue;
				const patientClass = patientClasses.find((pc) => pc.id === classId);
				if (!patientClass) continue;

				// Generate realistic duration based on patient class
				let duration = Math.max(
					30, // Minimum surgery duration 30 minutes
					Math.round(
						normalRandom(
							patientClass.surgeryDurationMean,
							patientClass.surgeryDurationStd
						)
					)
				);

				// Apply overrun risk if configured
				const overrunRiskPercent =
					params.surgeryScheduleTemplate.overrunRiskPercent || 0;
				if (
					overrunRiskPercent > 0 &&
					Math.random() * 100 < overrunRiskPercent
				) {
					// Surgery goes over scheduled time by 10-50%
					const overrunFactor = 1 + (0.1 + Math.random() * 0.4); // 1.1 to 1.5
					duration = Math.round(duration * overrunFactor);
					console.log(
						`Surgery overrun: ${duration} minutes (${Math.round(
							(overrunFactor - 1) * 100
						)}% over scheduled time)`
					);
				}

				// Check if there's enough time for this surgery before OR closing
				// Include turnover time in the calculation
				if (currentTime + duration + turnoverTime > orEndTime) {
					// Not enough time for another surgery + turnover
					break;
				}

				const scheduledStartTime = day * 1440 + currentTime;

				// Add surgery to list with unique ID
				surgeryList.push({
					id: `S-${day}-${orRoom}-${i}`,
					classId,
					scheduledStartTime,
					orRoom,
					duration,
					priority: patientClass.priority || 3,
				});

				// Move to next surgery time, adding surgery duration and turnover time
				currentTime += duration + turnoverTime;
			}
		}
	}
	return surgeryList;
}

export function scheduleCasesInBlocks(
	blocks: ORBlock[],
	patientClasses: PatientClass[],
	patientDistribution: Record<string, number>,
	simulationDays: number
): SurgeryCaseInput[] {
	const surgeryList: SurgeryCaseInput[] = [];

	// Define standard turnover time between surgeries (minutes)
	const standardTurnoverTime = 15;

	for (let day = 0; day < simulationDays; day++) {
		// Group blocks by OR room for this day
		const orBlocksMap: Record<string, ORBlock[]> = {};

		// Get blocks for this day
		const dayBlocks = blocks
			.filter((block) => block.day % simulationDays === day % simulationDays)
			.sort((a, b) => {
				// First sort by OR ID to group blocks by OR
				if (a.orId < b.orId) return -1;
				if (a.orId > b.orId) return 1;
				// Then sort by start time within each OR
				return a.start - b.start;
			});

		// Group blocks by OR room
		dayBlocks.forEach((block) => {
			if (!orBlocksMap[block.orId]) {
				orBlocksMap[block.orId] = [];
			}
			orBlocksMap[block.orId].push(block);
		});

		// Process each OR's blocks
		for (const orId in orBlocksMap) {
			const orBlocks = orBlocksMap[orId];
			let surgeryCount = 0;

			// Process each block in this OR
			for (const block of orBlocks) {
				const blockDurationMinutes = block.end - block.start;
				const allowedClasses = block.allowedClasses.filter((id) =>
					patientClasses.some((pc) => pc.id === id)
				);

				if (allowedClasses.length === 0) continue;

				// Normalize patient distribution for allowed classes in this block
				const totalProbability = allowedClasses.reduce(
					(sum, id) => sum + (patientDistribution[id] || 0),
					0
				);
				const normalizedDistribution: Record<string, number> = {};

				allowedClasses.forEach((id) => {
					normalizedDistribution[id] =
						totalProbability > 0
							? (patientDistribution[id] || 0) / totalProbability
							: 1 / allowedClasses.length;
				});

				// Schedule surgeries within this block
				let currentTimeInBlock = block.start;
				let remainingTime = blockDurationMinutes;

				while (remainingTime > 30) {
					// Select patient class based on normalized distribution
					const classId = weightedRandomSelection(normalizedDistribution);
					if (!classId) break;

					const patientClass = patientClasses.find((pc) => pc.id === classId);
					if (!patientClass) continue;

					// Generate realistic duration based on patient class
					let duration = Math.max(
						30, // Minimum surgery duration 30 minutes
						Math.round(
							normalRandom(
								patientClass.surgeryDurationMean,
								patientClass.surgeryDurationStd
							)
						)
					);

					// Apply overrun risk if configured (assuming same params as in generateSurgeryListTemplate)
					const overrunRiskPercent = 10; // Default to 10% if not specified
					if (
						overrunRiskPercent > 0 &&
						Math.random() * 100 < overrunRiskPercent
					) {
						// Surgery goes over scheduled time by 10-50%
						const overrunFactor = 1 + (0.1 + Math.random() * 0.4); // 1.1 to 1.5
						duration = Math.round(duration * overrunFactor);
						console.log(
							`Block surgery overrun: ${duration} minutes (${Math.round(
								(overrunFactor - 1) * 100
							)}% over scheduled time)`
						);
					}

					// Apply turnover time (except for first surgery in block)
					const turnoverTime =
						currentTimeInBlock > block.start ? standardTurnoverTime : 0;

					// Check if there's enough time for this surgery + turnover
					if (duration + turnoverTime > remainingTime) {
						// Not enough time for full surgery, check if we can fit a shorter one
						if (remainingTime - turnoverTime < 30) break; // Not enough time for even a minimum surgery

						// Adjust duration to fit remaining time
						duration = remainingTime - turnoverTime;
						if (duration < 30) break; // Ensure minimum surgery duration
					}

					// Calculate actual start time including day offset
					const scheduledStartTime =
						day * 1440 + currentTimeInBlock + turnoverTime;

					// Add surgery to list with unique ID
					surgeryList.push({
						id: `B-${day}-${block.orId}-${surgeryCount}`,
						classId,
						scheduledStartTime,
						duration,
						orRoom: block.orId,
						priority: patientClass.priority || 3,
					});

					// Update time tracking
					currentTimeInBlock += duration + turnoverTime;
					remainingTime = block.end - currentTimeInBlock;
					surgeryCount++;
				}
			}
		}
	}

	return surgeryList;
}

// --- Legacy function for backward compatibility ---

export function generateSurgeryList(params: SimulationParams): SurgeryCase[] {
	return generateSurgeryListTemplate(params) as SurgeryCase[];
}

// This function has been moved to the top of the file to avoid duplication

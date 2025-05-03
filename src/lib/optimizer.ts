
import { SimulationParams, SimulationResults, SurgeryCaseInput, runSimulation } from "./simulation";

// --- Interfaces ---

export interface OptimizationParams {
    alpha: number; // Weight for Peak Occupancy
    beta: number;  // Weight for Overtime/Nurse Utilization
    gamma: number; // Weight for Cost (e.g., OR cost, cancellation cost - requires cost model)
    // Add other optimization-specific parameters
    maxIterations?: number;
    initialTemperature?: number; // For Simulated Annealing
    coolingRate?: number;      // For Simulated Annealing
}

export interface OptimizationResult {
    bestSchedule: SurgeryCaseInput[];
    bestScore: number;
    initialScore: number;
    finalScore: number;
    iterationsRun: number;
    // Include best simulation results for context
    bestSimulationResults?: SimulationResults;
}

// --- Objective Function ---

// Calculates a score based on simulation results and weights
// Lower score is better
function calculateObjectiveScore(
    results: SimulationResults,
    weights: { alpha: number; beta: number; gamma: number }
): number {
    let score = 0;

    // 1. Peak Occupancy Component (Alpha)
    // Using peak PACU occupancy (Phase 1 + Phase 2 combined for simplicity)
    const peakP1Occupancy = results.peakPacuPhase1BedOccupancy || 0;
    const peakP2Occupancy = results.peakPacuPhase2BedOccupancy || 0;
    // Simple sum - could be weighted or use a combined peak metric
    const peakPacuOccupancy = peakP1Occupancy + peakP2Occupancy; 
    score += weights.alpha * peakPacuOccupancy; 

    // 2. Overtime/Nurse Utilization Component (Beta)
    // Using peak nurse utilization as a proxy for potential overtime
    const peakNurseUtilization = results.peakNurseUtilization || 0;
    // Could also use results.overtimeHours if calculated
    score += weights.beta * peakNurseUtilization; 

    // 3. Cost Component (Gamma)
    // Placeholder: Requires cost model integration in simulation results
    const totalCost = results.totalCost || 0; // Assuming totalCost is calculated
    // Normalize or scale cost appropriately if needed
    score += weights.gamma * totalCost; 
    
    // 4. Other potential penalties (optional)
    // - High P95 Ward Transfer Delay
    score += (results.p95WardTransferDelay || 0) * 0.1; // Example small penalty
    // - High P95 OR Waiting Time
    score += (results.p95ORWaitingTime || 0) * 0.05; // Example smaller penalty

    // Ensure score is non-negative
    return Math.max(0, score);
}

// --- Optimization Algorithm (Simulated Annealing Example) ---

// Generates a neighboring schedule by making a small change (e.g., swap two surgeries)
function generateNeighborSchedule(
    currentSchedule: SurgeryCaseInput[],
    params: SimulationParams
): SurgeryCaseInput[] {
    const newSchedule = [...currentSchedule];
    if (newSchedule.length < 2) return newSchedule; // Need at least two to swap

    // Simple swap: Pick two random surgeries and swap their times/ORs if compatible
    const index1 = Math.floor(Math.random() * newSchedule.length);
    let index2 = Math.floor(Math.random() * newSchedule.length);
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * newSchedule.length);
    }

    const surgery1 = newSchedule[index1];
    const surgery2 = newSchedule[index2];

    // Basic swap of scheduled time and OR room
    // TODO: Add validation against OR blocks if blockScheduleEnabled
    const tempTime = surgery1.scheduledStartTime;
    const tempOR = surgery1.orRoom;

    surgery1.scheduledStartTime = surgery2.scheduledStartTime;
    surgery1.orRoom = surgery2.orRoom;

    surgery2.scheduledStartTime = tempTime;
    surgery2.orRoom = tempOR;
    
    // Alternative: Slightly shift one surgery's time
    // const shiftAmount = (Math.random() - 0.5) * 60; // Shift by up to +/- 30 mins
    // const indexToShift = Math.floor(Math.random() * newSchedule.length);
    // newSchedule[indexToShift].scheduledStartTime += shiftAmount;
    // TODO: Ensure shifted time is valid (e.g., within working hours, respects blocks)

    return newSchedule;
}

// Acceptance probability function for Simulated Annealing
function acceptanceProbability(oldScore: number, newScore: number, temperature: number): number {
    if (newScore < oldScore) {
        return 1.0; // Always accept better solutions
    }
    if (temperature <= 0) {
        return 0.0; // Avoid division by zero
    }
    // Accept worse solutions with a probability decreasing with temperature
    return Math.exp((oldScore - newScore) / temperature);
}

// Main optimization function using Simulated Annealing
export function optimizeSchedule(
    initialSchedule: SurgeryCaseInput[],
    simulationParams: SimulationParams,
    optimizationParams: OptimizationParams
): OptimizationResult {
    console.log("Starting schedule optimization...");

    const maxIterations = optimizationParams.maxIterations || 1000;
    let temperature = optimizationParams.initialTemperature || 1000;
    const coolingRate = optimizationParams.coolingRate || 0.99;
    const weights = { alpha: optimizationParams.alpha, beta: optimizationParams.beta, gamma: optimizationParams.gamma };

    let currentSchedule = [...initialSchedule];
    let currentSimParams = { ...simulationParams, customSurgeryList: currentSchedule, surgeryScheduleType: 'custom' as 'custom' };
    let currentResults = runSimulation(currentSimParams);
    let currentScore = calculateObjectiveScore(currentResults, weights);

    let bestSchedule = [...currentSchedule];
    let bestScore = currentScore;
    let bestResults = currentResults;
    const initialScore = currentScore;

    console.log(`Initial Score: ${currentScore.toFixed(3)}`);

    for (let i = 0; i < maxIterations; i++) {
        const neighborSchedule = generateNeighborSchedule(currentSchedule, simulationParams);
        const neighborSimParams = { ...simulationParams, customSurgeryList: neighborSchedule, surgeryScheduleType: 'custom' as 'custom' };
        const neighborResults = runSimulation(neighborSimParams);
        const neighborScore = calculateObjectiveScore(neighborResults, weights);

        const probability = acceptanceProbability(currentScore, neighborScore, temperature);

        if (probability > Math.random()) {
            currentSchedule = neighborSchedule;
            currentScore = neighborScore;
            currentResults = neighborResults; // Store results if accepted
            // console.log(`Iteration ${i}: Accepted new schedule. Score: ${currentScore.toFixed(3)}, Temp: ${temperature.toFixed(3)}`);
        } else {
            // console.log(`Iteration ${i}: Rejected new schedule. Score: ${neighborScore.toFixed(3)} > ${currentScore.toFixed(3)}, Temp: ${temperature.toFixed(3)}`);
        }

        if (currentScore < bestScore) {
            bestSchedule = [...currentSchedule];
            bestScore = currentScore;
            bestResults = currentResults; // Store best results found so far
            console.log(`Iteration ${i}: New best score found: ${bestScore.toFixed(3)}`);
        }

        // Cool down temperature
        temperature *= coolingRate;
        
        if (temperature < 0.1) {
            console.log(`Temperature dropped below threshold at iteration ${i}. Stopping early.`);
            break; // Stop if temperature is too low
        }
        
        // Optional: Log progress periodically
        if (i % 100 === 0) {
             console.log(`Iteration ${i}: Current Score: ${currentScore.toFixed(3)}, Best Score: ${bestScore.toFixed(3)}, Temp: ${temperature.toFixed(3)}`);
        }
    }

    console.log(`Optimization finished. Best score: ${bestScore.toFixed(3)}`);

    return {
        bestSchedule,
        bestScore,
        initialScore,
        finalScore: currentScore, // Score of the last accepted schedule
        iterationsRun: maxIterations, // Or actual count if stopped early
        bestSimulationResults: bestResults, // Include the simulation results for the best schedule
    };
}

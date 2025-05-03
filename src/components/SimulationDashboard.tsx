import React, { useState, useCallback, useEffect } from "react";
import {
	defaultSimulationParams,
	runSimulation,
	SimulationResults,
	SimulationParams,
	SurgeryCase,
	ORBlock,
	PatientClass,
	scheduleCasesInBlocks,
	generateSurgeryListTemplate,
	SurgeryCaseInput,
} from "@/lib/simulation";
import {
	optimizeSchedule,
	OptimizationParams,
	OptimizationResult,
} from "@/lib/optimizer";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import SimulationParameters from "./SimulationParameters";
import ResultsCharts from "./ResultsCharts";
import ORScheduleChart from "./ORScheduleChart";
import GanttChart from "./GanttChart";
import BlockScheduler from "./BlockScheduler";
import SurgeryScheduler from "./SurgeryScheduler";
import ScenarioManager from "./ScenarioManager";
import ReportExport from "./ReportExport";
import OptimizationSettings from "./OptimizationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Block interface that extends ORBlock for UI components
interface Block extends ORBlock {
	label: string;
	allowedProcedures: string[];
}

// Convert Block to ORBlock for simulation
const convertBlockToORBlock = (block: Block): ORBlock => {
	return {
		id: block.id,
		orId: block.orId,
		start: block.start,
		end: block.end,
		allowedClasses: block.allowedProcedures,
		day: block.day,
		label: block.label,
	};
};

const defaultOptimizationParams: OptimizationParams = {
	alpha: 1.0,
	beta: 0.5,
	gamma: 0.1,
	maxIterations: 500,
	initialTemperature: 1000,
	coolingRate: 0.98,
};

const SimulationDashboard: React.FC = () => {
	// Update params to include blocks and enhanced nurse model
	const [params, setParams] = useState<SimulationParams>({
		...defaultSimulationParams,
		staffParams: {
			...defaultSimulationParams.staffParams,
			useEnhancedNurseModel: false, // Default to false for backward compatibility
		},
	});

	const [results, setResults] = useState<SimulationResults | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [isOptimizing, setIsOptimizing] = useState(false);
	const [optimizationProgress, setOptimizationProgress] = useState(0);
	const [activeTab, setActiveTab] = useState("simulator");
	const [resultTab, setResultTab] = useState("metrics");
	const [activeConfigTab, setActiveConfigTab] = useState("parameters");

	// New states for integrating BlockScheduler and SurgeryScheduler
	const [blocks, setBlocks] = useState<Block[]>([]);
	const [surgeryList, setSurgeryList] = useState<SurgeryCaseInput[]>([]);
	const [scheduleType, setScheduleType] = useState<"template" | "custom">(
		"template"
	);
	const [blockScheduleEnabled, setBlockScheduleEnabled] = useState(true);

	// State for optimization parameters
	const [optParams, setOptParams] = useState<OptimizationParams>(
		defaultOptimizationParams
	);
	const [optimizationResults, setOptimizationResults] =
		useState<OptimizationResult | null>(null);

	const handleParamChange = useCallback((key: string, value: any) => {
		setParams((prev) => {
			if (key === "averageDailySurgeries") {
				return {
					...prev,
					surgeryScheduleTemplate: {
						...prev.surgeryScheduleTemplate,
						averageDailySurgeries: value,
					},
				};
			}
			return {
				...prev,
				[key]: value,
			};
		});
	}, []);

	const handlePatientDistributionChange = useCallback(
		(classId: string, value: number) => {
			setParams((prev) => {
				// Adjust other percentages to maintain sum close to 1
				const newDistribution = { ...prev.patientClassDistribution };

				// Calculate how much we're changing this value
				const delta = value - newDistribution[classId];

				// Set the new value for this class
				newDistribution[classId] = value;

				// Distribute the delta proportionally among other classes
				const otherClassIds = Object.keys(newDistribution).filter(
					(id) => id !== classId
				);
				const totalOther = otherClassIds.reduce(
					(sum, id) => sum + newDistribution[id],
					0
				);

				if (totalOther > 0) {
					otherClassIds.forEach((id) => {
						const proportion = newDistribution[id] / totalOther;
						newDistribution[id] = Math.max(
							0,
							newDistribution[id] - delta * proportion
						);
						// Ensure no negative values
						if (newDistribution[id] < 0.01) newDistribution[id] = 0.01;
					});
				}

				// Normalize to ensure sum is 1
				const sum = Object.values(newDistribution).reduce(
					(total, val) => total + val,
					0
				);
				if (sum > 0) {
					Object.keys(newDistribution).forEach((id) => {
						newDistribution[id] = newDistribution[id] / sum;
					});
				}

				return {
					...prev,
					patientClassDistribution: newDistribution,
				};
			});
		},
		[]
	);

	// Handle optimization parameter changes
	const handleOptParamChange = useCallback(
		(key: keyof OptimizationParams, value: any) => {
			setOptParams((prev) => ({ ...prev, [key]: value }));
		},
		[]
	);

	// Handle block schedule changes
	const handleBlockScheduleChange = useCallback(
		(updatedBlocks: Block[]) => {
			console.log("Block schedule changed:", updatedBlocks);
			setBlocks(updatedBlocks);
			setBlockScheduleEnabled(true);

			// Update params with new blocks
			setParams((prev) => {
				// Convert Block[] to ORBlock[] for the simulation
				const orBlocks: ORBlock[] = updatedBlocks.map(convertBlockToORBlock);

				console.log("Updated orBlocks in params:", orBlocks);
				return {
					...prev,
					blockScheduleEnabled: true,
					orBlocks: orBlocks,
				};
			});

			// If we're using the block-based scheduling, update the surgery list based on blocks
			if (scheduleType === "template") {
				generateSurgeryListFromBlocks(updatedBlocks);
			}
		},
		[scheduleType]
	);

	// Generate surgery list from blocks
	const generateSurgeryListFromBlocks = useCallback(
		(blocksToUse: Block[]) => {
			console.log("Generating surgery list from blocks:", blocksToUse);
			const orBlocks = blocksToUse.map(convertBlockToORBlock);

			if (orBlocks.length === 0) {
				toast({
					title: "Ei blokkeja",
					description:
						"Lisää blokkeja saadaksesi automaattisen leikkauslistan.",
					variant: "destructive",
				});
				return;
			}

			// Generate cases based on blocks
			const generatedSurgeryList = scheduleCasesInBlocks(
				orBlocks,
				params.patientClasses,
				params.patientClassDistribution,
				params.simulationDays
			);

			console.log("Generated surgery list:", generatedSurgeryList);
			setSurgeryList(generatedSurgeryList);

			// Update simulation params with new surgery list
			setParams((prev) => {
				console.log("Updating params with generated surgery list");
				return {
					...prev,
					surgeryScheduleType: "custom",
					customSurgeryList: generatedSurgeryList,
				};
			});

			toast({
				title: "Leikkauslista generoitu",
				description: `${generatedSurgeryList.length} leikkausta generoitu blokkien perusteella.`,
			});
		},
		[
			params.patientClasses,
			params.patientClassDistribution,
			params.simulationDays,
		]
	);

	// Handle surgery list changes from SurgeryScheduler
	const handleSurgeryListChange = useCallback(
		(newSurgeryList: SurgeryCaseInput[], type: "template" | "custom") => {
			setSurgeryList(newSurgeryList);
			setScheduleType(type);

			setParams((prev) => ({
				...prev,
				surgeryScheduleType: type,
				customSurgeryList: type === "custom" ? newSurgeryList : undefined,
			}));

			// Validate surgeries against blocks if we have blocks
			if (blocks.length > 0 && type === "custom" && blockScheduleEnabled) {
				validateSurgeriesAgainstBlocks(newSurgeryList, blocks);
			}
		},
		[blocks, blockScheduleEnabled]
	);

	// Validate surgeries against blocks
	const validateSurgeriesAgainstBlocks = (
		surgeries: SurgeryCaseInput[],
		blocksToValidate: Block[]
	) => {
		let invalidSurgeries = 0;
		const orBlocks = blocksToValidate.map(convertBlockToORBlock);

		surgeries.forEach((surgery) => {
			// Find the class for this surgery
			const patientClass = params.patientClasses.find(
				(pc) => pc.id === surgery.classId
			);
			if (!patientClass) return;

			// Calculate surgery day and time
			const surgeryDay = Math.floor(surgery.scheduledStartTime / 1440); // 1440 minutes in a day
			const surgeryStartTime = surgery.scheduledStartTime % 1440; // Time within the day
			// Use provided duration or estimate from patient class
			const duration =
				surgery.duration ?? Math.round(patientClass.surgeryDurationMean);
			const surgeryEndTime = surgeryStartTime + duration;

			// Find matching block for this surgery
			const matchingBlock = orBlocks.find((block) => {
				return (
					block.orId === surgery.orRoom &&
					block.day === surgeryDay &&
					surgeryStartTime >= block.start &&
					surgeryEndTime <= block.end &&
					block.allowedClasses.includes(surgery.classId)
				);
			});

			if (!matchingBlock) {
				invalidSurgeries++;
			}
		});

		if (invalidSurgeries > 0) {
			toast({
				title: "Yhteensopivuusvaroitus",
				description: `${invalidSurgeries} leikkausta ei vastaa määritettyjä blokkeja.`,
				variant: "destructive",
			});
		}
	};

	// Handle schedule type change
	const handleScheduleTypeChange = useCallback(
		(type: "template" | "custom") => {
			setScheduleType(type);

			if (type === "template" && blockScheduleEnabled && blocks.length > 0) {
				// When switching to template and blocks are enabled, generate surgeries from blocks
				generateSurgeryListFromBlocks(blocks);
			}
		},
		[blockScheduleEnabled, blocks, generateSurgeryListFromBlocks]
	);

	const runSimulationHandler = useCallback(() => {
		setIsRunning(true);
		// Use setTimeout to allow UI to update before running simulation
		setTimeout(() => {
			try {
				// Ensure we're using the right parameters
				const simulationParams = {
					...params,
					blockScheduleEnabled: blockScheduleEnabled,
					orBlocks: blocks.map(convertBlockToORBlock),
					surgeryScheduleType: scheduleType,
					customSurgeryList:
						scheduleType === "custom" ? surgeryList : undefined,
				};

				console.log("Running simulation with parameters:", simulationParams);
				console.log("Block schedule enabled:", blockScheduleEnabled);
				console.log("OR Blocks:", simulationParams.orBlocks);
				console.log("Surgery list:", simulationParams.customSurgeryList);

				// Run simulation with current parameters
				const simulationResults = runSimulation(simulationParams);
				console.log("Simulation results:", simulationResults);
				setResults(simulationResults);
				toast({
					title: "Simulaatio valmis",
					description: `${params.simulationDays} päivän simulaatio suoritettu onnistuneesti.`,
				});
				setResultTab("metrics"); // Switch to metrics tab after simulation
			} catch (error) {
				console.error("Simulation error:", error);
				toast({
					title: "Virhe simulaatiossa",
					description: "Simulaation suorittamisessa tapahtui virhe.",
					variant: "destructive",
				});
			} finally {
				setIsRunning(false);
			}
		}, 100);
	}, [params, blockScheduleEnabled, blocks, scheduleType, surgeryList]);

	// Run optimization
	const runOptimizationHandler = useCallback(() => {
		setIsOptimizing(true);
		setOptimizationProgress(0);

		setTimeout(() => {
			try {
				// Generate initial schedule if needed
				let initialSchedule: SurgeryCaseInput[];

				if (scheduleType === "template" || surgeryList.length === 0) {
					if (blockScheduleEnabled && blocks.length > 0) {
						initialSchedule = scheduleCasesInBlocks(
							blocks.map(convertBlockToORBlock),
							params.patientClasses,
							params.patientClassDistribution,
							params.simulationDays
						);
					} else {
						initialSchedule = generateSurgeryListTemplate(params);
					}
				} else {
					initialSchedule = surgeryList;
				}

				// Ensure each surgery has an ID for tracking
				initialSchedule = initialSchedule.map((surgery) => ({
					...surgery,
					id: surgery.id || `S-${uuidv4().substring(0, 8)}`,
				}));

				// Setup simulation parameters for optimization
				const simulationParams = {
					...params,
					blockScheduleEnabled: blockScheduleEnabled,
					orBlocks: blocks.map(convertBlockToORBlock),
					surgeryScheduleType: "custom" as const, // Always use custom for optimization
				};

				// Run optimization
				const optResult = optimizeSchedule(
					initialSchedule,
					simulationParams,
					optParams
				);

				// Update state with results
				setOptimizationResults(optResult);
				setResults(optResult.bestSimulationResults || null);

				// Update surgery list with optimized schedule
				setSurgeryList(optResult.bestSchedule);
				setScheduleType("custom");

				// Update params to reflect the optimized schedule
				setParams((prev) => ({
					...prev,
					surgeryScheduleType: "custom",
					customSurgeryList: optResult.bestSchedule,
				}));

				toast({
					title: "Optimointi valmis",
					description: `Paras pistemäärä: ${optResult.bestScore.toFixed(
						2
					)}, alkuperäinen: ${optResult.initialScore.toFixed(2)}`,
				});

				// Switch to results view
				setResultTab("metrics");
			} catch (error) {
				console.error("Optimization error:", error);
				toast({
					title: "Virhe optimoinnissa",
					description: `Optimoinnissa tapahtui virhe: ${error}`,
					variant: "destructive",
				});
			} finally {
				setIsOptimizing(false);
				setOptimizationProgress(100);
			}
		}, 100);
	}, [
		params,
		optParams,
		blockScheduleEnabled,
		blocks,
		scheduleType,
		surgeryList,
	]);

	// Load a scenario from ScenarioManager
	const handleLoadScenario = useCallback(
		(scenario: {
			params: SimulationParams;
			results: SimulationResults | null;
			optParams?: OptimizationParams;
			blocks?: Block[];
			surgeryList?: SurgeryCaseInput[];
			scheduleType?: "template" | "custom";
		}) => {
			setParams(scenario.params);
			setResults(scenario.results);
			setActiveTab("simulator");

			// Update additional state from the scenario
			if (scenario.optParams) setOptParams(scenario.optParams);
			if (scenario.blocks) setBlocks(scenario.blocks);
			if (scenario.surgeryList) setSurgeryList(scenario.surgeryList);
			if (scenario.scheduleType) setScheduleType(scenario.scheduleType);

			setBlockScheduleEnabled(scenario.params.blockScheduleEnabled || false);

			toast({
				title: "Skenaario ladattu",
				description: "Skenaario on ladattu simulaattoriin.",
			});
		},
		[]
	);

	// Generate surgery list from blocks when block tab is selected
	useEffect(() => {
		if (
			activeConfigTab === "or-blocks" &&
			blockScheduleEnabled &&
			blocks.length > 0 &&
			scheduleType === "template"
		) {
			generateSurgeryListFromBlocks(blocks);
		}
	}, [
		activeConfigTab,
		blockScheduleEnabled,
		blocks,
		scheduleType,
		generateSurgeryListFromBlocks,
	]);

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			<Tabs
				defaultValue="simulator"
				value={activeTab}
				onValueChange={setActiveTab}
			>
				<div className="flex justify-between items-center mb-4">
					<TabsList>
						<TabsTrigger value="simulator">Simulaattori</TabsTrigger>
						<TabsTrigger value="optimizer">Optimointi</TabsTrigger>
						<TabsTrigger value="scenarios">Skenaariot</TabsTrigger>
						<TabsTrigger value="reports">Raportit</TabsTrigger>
						<TabsTrigger value="guide">Ohjeet</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="simulator" className="space-y-6">
					{/* Configuration tabs */}
					<Tabs value={activeConfigTab} onValueChange={setActiveConfigTab}>
						<TabsList>
							<TabsTrigger value="parameters">Parametrit</TabsTrigger>
							<TabsTrigger value="or-blocks">Salisuunnittelu</TabsTrigger>
							<TabsTrigger value="surgery-list">Leikkauslista</TabsTrigger>
						</TabsList>

						<TabsContent value="parameters" className="pt-4">
							<SimulationParameters
								params={params}
								onParamChange={handleParamChange}
								onPatientDistributionChange={handlePatientDistributionChange}
								onRunSimulation={runSimulationHandler}
								isRunning={isRunning}
							/>
						</TabsContent>

						<TabsContent value="or-blocks" className="pt-4">
							<BlockScheduler
								patientClasses={params.patientClasses}
								onScheduleChange={handleBlockScheduleChange}
							/>

							<div className="mt-4">
								{blocks.length > 0 && (
									<Card className="mb-4">
										<CardContent className="pt-4">
											<div className="flex justify-between items-center mb-2">
												<div className="flex items-center">
													<Badge
														variant={
															blockScheduleEnabled ? "default" : "outline"
														}
														className="mr-2"
													>
														{blockScheduleEnabled ? "Käytössä" : "Ei käytössä"}
													</Badge>
													<h3 className="text-lg font-medium">
														Leikkaussaliblokit
													</h3>
												</div>
												<div className="flex space-x-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															setBlockScheduleEnabled(!blockScheduleEnabled)
														}
													>
														{blockScheduleEnabled
															? "Poista käytöstä"
															: "Ota käyttöön"}
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															if (blocks.length > 0)
																generateSurgeryListFromBlocks(blocks);
															setActiveConfigTab("surgery-list");
														}}
													>
														Generoi leikkauslista
													</Button>
												</div>
											</div>
											<p className="text-sm text-muted-foreground">
												{blockScheduleEnabled
													? "Leikkaussaliblokit ohjaavat simulaatiota. Leikkaukset aikataulutetaan blokkien mukaisesti."
													: "Leikkaussaliblokit eivät vaikuta simulaatioon."}
											</p>
										</CardContent>
									</Card>
								)}

								<div className="flex justify-end">
									<Button
										onClick={runSimulationHandler}
										disabled={isRunning}
										className="bg-medical-blue text-white px-4 py-2 rounded hover:bg-opacity-90 disabled:opacity-50"
									>
										{isRunning ? "Simulaatio käynnissä..." : "Aja simulaatio"}
									</Button>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="surgery-list" className="pt-4">
							<SurgeryScheduler
								patientClasses={params.patientClasses}
								patientDistribution={params.patientClassDistribution}
								simulationDays={params.simulationDays}
								onScheduleGenerated={(newSurgeryList) =>
									handleSurgeryListChange(newSurgeryList, "custom")
								}
								onScheduleTypeChange={handleScheduleTypeChange}
								blocks={blocks}
								blockScheduleEnabled={blockScheduleEnabled}
							/>

							<div className="mt-4 flex justify-end">
								<Button
									onClick={runSimulationHandler}
									disabled={isRunning}
									className="bg-medical-blue text-white px-4 py-2 rounded hover:bg-opacity-90 disabled:opacity-50"
								>
									{isRunning ? "Simulaatio käynnissä..." : "Aja simulaatio"}
								</Button>
							</div>
						</TabsContent>
					</Tabs>

					{isRunning ? (
						<Card className="h-[350px] flex items-center justify-center animate-pulse-slow">
							<CardContent>
								<p className="text-center">
									Simulaatio käynnissä... Odota hetki.
								</p>
							</CardContent>
						</Card>
					) : results ? (
						<div className="space-y-4">
							<Tabs value={resultTab} onValueChange={setResultTab}>
								<TabsList>
									<TabsTrigger value="metrics">Tulokset</TabsTrigger>
									{params.surgeryScheduleType === "custom" &&
										params.customSurgeryList && (
											<TabsTrigger value="schedule">
												Leikkausaikataulu
											</TabsTrigger>
										)}
									{params.orBlocks && params.orBlocks.length > 0 && (
										<TabsTrigger value="blocks">Saliblokit</TabsTrigger>
									)}
									<TabsTrigger value="gantt">Gantt-kaavio</TabsTrigger>
								</TabsList>

								<TabsContent value="metrics" className="pt-4">
									<ResultsCharts results={results} params={params} />
								</TabsContent>

								<TabsContent value="schedule" className="pt-4">
									<ORScheduleChart
										surgeries={results.completedSurgeries}
										orCount={params.numberOfORs}
										patientClasses={params.patientClasses}
									/>
								</TabsContent>

								<TabsContent value="blocks" className="pt-4">
									<Card>
										<CardHeader>
											<CardTitle>Saliblokkien yhteenveto</CardTitle>
											<CardDescription>
												Leikkaussalien käyttö potilasluokittain
											</CardDescription>
										</CardHeader>
										<CardContent>
											{params.orBlocks && params.orBlocks.length > 0 ? (
												<div className="space-y-4">
													<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
														{params.patientClasses.map((pc) => {
															// Count blocks with this patient class
															const blockCount =
																params.orBlocks?.filter((b) => {
																	// Use both allowedClasses and allowedProcedures for compatibility
																	const allowedPatients = b.allowedClasses;
																	return allowedPatients.includes(pc.id);
																}).length || 0;

															// Calculate total hours for this class
															const totalHours =
																params.orBlocks?.reduce((sum, block) => {
																	const allowedPatients = block.allowedClasses;
																	if (allowedPatients.includes(pc.id)) {
																		return sum + (block.end - block.start) / 60;
																	}
																	return sum;
																}, 0) || 0;

															return (
																<Card key={pc.id}>
																	<CardContent className="p-4">
																		<div className="flex items-center gap-2">
																			<div
																				className="w-3 h-3 rounded-full"
																				style={{ backgroundColor: pc.color }}
																			/>
																			<span className="font-medium">
																				{pc.name}
																			</span>
																		</div>
																		<div className="mt-2 text-2xl font-bold">
																			{blockCount}{" "}
																			<span className="text-sm font-normal">
																				blokkia
																			</span>
																		</div>
																		<div className="text-sm text-muted-foreground">
																			{Math.round(totalHours * 10) / 10} tuntia
																		</div>
																	</CardContent>
																</Card>
															);
														})}
													</div>

													<div className="mt-6">
														<h3 className="text-lg font-medium mb-3">
															OR blokit potilasluokittain
														</h3>
														<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
															{params.orBlocks.map((block) => {
																const allowedPatientClasses =
																	params.patientClasses.filter((pc) =>
																		block.allowedClasses.includes(pc.id)
																	);

																return (
																	<Card key={block.id}>
																		<CardContent className="p-4">
																			<div className="flex justify-between items-center">
																				<span className="font-medium">
																					{block.label || `Block ${block.id}`}
																				</span>
																				<span className="text-sm text-muted-foreground">
																					{block.orId}
																				</span>
																			</div>
																			<div className="mt-2 flex flex-wrap gap-1">
																				{allowedPatientClasses.map((pc) => (
																					<Badge
																						key={pc.id}
																						style={{
																							backgroundColor: pc.color,
																						}}
																					>
																						{pc.name}
																					</Badge>
																				))}
																			</div>
																		</CardContent>
																	</Card>
																);
															})}
														</div>
													</div>
												</div>
											) : (
												<p className="text-center text-muted-foreground">
													Ei saliblokki tietoja saatavilla.
												</p>
											)}
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="gantt" className="pt-4">
									<GanttChart
										surgeries={results.completedSurgeries}
										patientClasses={params.patientClasses}
									/>
								</TabsContent>
							</Tabs>
						</div>
					) : (
						<Card className="h-[350px] flex items-center justify-center">
							<CardContent>
								<p className="text-center text-muted-foreground">
									Aja simulaatio nähdäksesi tulokset
								</p>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value="optimizer" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Optimointiasetukset</CardTitle>
							<CardDescription>
								Määritä parametrit leikkauslistan optimointialgoritmille
							</CardDescription>
						</CardHeader>
						<CardContent>
							<OptimizationSettings
								optParams={optParams}
								onOptParamChange={handleOptParamChange}
							/>

							<div className="mt-6 flex justify-end">
								<Button
									onClick={runOptimizationHandler}
									disabled={isOptimizing}
									className="bg-medical-blue text-white"
								>
									{isOptimizing
										? "Optimointi käynnissä..."
										: "Käynnistä optimointi"}
								</Button>
							</div>

							{isOptimizing && (
								<Progress value={optimizationProgress} className="mt-4" />
							)}
						</CardContent>
					</Card>

					{optimizationResults && (
						<Card>
							<CardHeader>
								<CardTitle>Optimoinnin tulokset</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
									<div>
										<h4 className="text-sm font-medium mb-1">
											Alkuperäinen pistemäärä
										</h4>
										<div className="text-2xl font-bold">
											{optimizationResults.initialScore.toFixed(2)}
										</div>
									</div>
									<div>
										<h4 className="text-sm font-medium mb-1">
											Paras pistemäärä
										</h4>
										<div className="text-2xl font-bold">
											{optimizationResults.bestScore.toFixed(2)}
										</div>
									</div>
									<div>
										<h4 className="text-sm font-medium mb-1">Parannus</h4>
										<div className="text-2xl font-bold">
											{(
												((optimizationResults.initialScore -
													optimizationResults.bestScore) /
													optimizationResults.initialScore) *
												100
											).toFixed(1)}
											%
										</div>
									</div>
								</div>

								<p className="text-sm text-muted-foreground mb-4">
									Optimoitu leikkauslista on nyt käytettävissä simulaattorissa.
									Voit tarkastella tuloksia simulaatio-välilehdellä ja
									leikkauslistaa leikkauslista-välilehdellä.
								</p>

								<Button
									variant="outline"
									onClick={() => {
										setActiveTab("simulator");
										setActiveConfigTab("surgery-list");
									}}
								>
									Näytä optimoitu leikkauslista
								</Button>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value="scenarios">
					<ScenarioManager
						currentParams={params}
						currentResults={results}
						currentOptParams={optParams}
						currentBlocks={blocks}
						currentSurgeryList={surgeryList}
						currentScheduleType={scheduleType}
						onLoadScenario={handleLoadScenario}
					/>
				</TabsContent>

				<TabsContent value="reports">
					<ReportExport
						results={results}
						params={params}
						patientClasses={params.patientClasses}
					/>
				</TabsContent>

				<TabsContent value="guide">
					<Card>
						<CardHeader>
							<CardTitle>Johdon työkalut PACU-simulaation hallintaan</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<h3 className="font-semibold">Simulaation tarkoitus</h3>
								<p>
									Tämän sovelluksen avulla voit mallintaa heräämön (PACU)
									toimintaa ja resurssitarpeita erilaisilla potilasmäärillä ja
									-tyypeillä. Sovellus on suunniteltu johdon tarpeisiin,
									mahdollistaen datapohjaisen päätöksenteon ja resurssien
									optimoinnin.
								</p>
							</div>

							<div className="space-y-2">
								<h3 className="font-semibold">Uudet johdon ominaisuudet</h3>
								<p>Sovellus sisältää seuraavat työkalut johdon käyttöön:</p>
								<ul className="list-disc pl-5 space-y-1">
									<li>
										Gantt-kaaviot visualisoivat leikkaussalien ja heräämön
										aikatauluja
									</li>
									<li>
										Skenaarioiden vertailu auttaa näkemään eri vaihtoehtojen
										vaikutukset
									</li>
									<li>
										Raporttien vienti mahdollistaa tulosten jakamisen
										johtoryhmien kokouksissa
									</li>
									<li>
										Interaktiiviset visualisoinnit tukevat resurssien käytön
										optimointia
									</li>
								</ul>
							</div>

							<div className="space-y-2">
								<h3 className="font-semibold">Skenaarioiden hallinta</h3>
								<p>Skenaarioiden hallintajärjestelmä mahdollistaa:</p>
								<ul className="list-disc pl-5 space-y-1">
									<li>
										Skenaarioiden tallentamisen nimen, kuvauksen ja tagien
										kanssa
									</li>
									<li>Skenaarioiden vertailun keskenään</li>
									<li>Resurssitarpeiden arvioinnin eri potilasmäärillä</li>
									<li>Pitkän aikavälin kapasiteettisuunnittelun</li>
								</ul>
							</div>

							<div className="space-y-2">
								<h3 className="font-semibold">Raportointi</h3>
								<p>Voit luoda ja viedä raportteja:</p>
								<ul className="list-disc pl-5 space-y-1">
									<li>Excel-muodossa (CSV) tarkempaa analyysia varten</li>
									<li>PDF-muodossa esittämistä varten</li>
									<li>
										Valitse, mitkä mittarit ja visualisoinnit sisällytetään
										raporttiin
									</li>
								</ul>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default SimulationDashboard;

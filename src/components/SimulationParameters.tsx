import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
	PatientClass,
	SimulationParams,
	SurgeryCase,
	NurseSkill,
	NurseShift,
	defaultNurseSkills,
	defaultNurseShifts,
} from "@/lib/simulation";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SurgeryScheduler from "./SurgeryScheduler";
import BlockScheduler from "./BlockScheduler";
import EnhancedNurseSettings from "./EnhancedNurseSettings";

interface SimulationParametersProps {
	params: SimulationParams;
	onParamChange: (key: string, value: any) => void;
	onPatientDistributionChange: (classId: string, value: number) => void;
	onRunSimulation: () => void;
	isRunning: boolean;
}

const SimulationParameters: React.FC<SimulationParametersProps> = ({
	params,
	onParamChange,
	onPatientDistributionChange,
	onRunSimulation,
	isRunning,
}) => {
	// Calculate total percentage for patient distribution
	const totalPercentage = Object.values(params.patientClassDistribution).reduce(
		(sum, val) => sum + val,
		0
	);
	const isValidDistribution = Math.abs(totalPercentage - 1.0) < 0.01; // Allow small rounding errors

	// Handle surgery list generation
	const handleSurgeryListGenerated = (surgeryList: SurgeryCase[]) => {
		onParamChange("customSurgeryList", surgeryList);
	};

	// Handle schedule type change
	const handleScheduleTypeChange = (type: "template" | "custom") => {
		onParamChange("surgeryScheduleType", type);
	};

	// Handle OR block schedule change
	const handleBlockScheduleChange = (blocks: any[]) => {
		onParamChange("orBlocks", blocks);
	};

	const [activeTab, setActiveTab] = useState("resources");

	// Handle nurse skill changes
	const handleNurseSkillChange = (index: number, key: string, value: any) => {
		const updatedSkills = [...params.staffParams.nurseSkills];
		updatedSkills[index] = { ...updatedSkills[index], [key]: value };
		onParamChange("staffParams", {
			...params.staffParams,
			nurseSkills: updatedSkills,
		});
	};

	// Handle nurse shift changes
	const handleNurseShiftChange = (index: number, key: string, value: any) => {
		const updatedShifts = [...params.staffParams.nurseShifts];
		updatedShifts[index] = { ...updatedShifts[index], [key]: value };
		onParamChange("staffParams", {
			...params.staffParams,
			nurseShifts: updatedShifts,
		});
	};

	// Handle adding a new nurse skill
	const handleAddNurseSkill = () => {
		const newSkill: NurseSkill = {
			id: `skill-${params.staffParams.nurseSkills.length + 1}`,
			name: `Taitotaso ${params.staffParams.nurseSkills.length + 1}`,
			canHandlePhase1: true,
			canHandlePhase2: true,
			efficiencyMultiplier: 1.0,
		};
		onParamChange("staffParams", {
			...params.staffParams,
			nurseSkills: [...params.staffParams.nurseSkills, newSkill],
		});
	};

	// Handle removing a nurse skill
	const handleRemoveNurseSkill = (index: number) => {
		const updatedSkills = [...params.staffParams.nurseSkills];
		updatedSkills.splice(index, 1);
		onParamChange("staffParams", {
			...params.staffParams,
			nurseSkills: updatedSkills,
		});
	};

	// Handle adding a new nurse shift
	const handleAddNurseShift = () => {
		const newShift: NurseShift = {
			id: `shift-${params.staffParams.nurseShifts.length + 1}`,
			name: `Vuoro ${params.staffParams.nurseShifts.length + 1}`,
			startMinute: 8 * 60, // 8:00 AM
			durationMinutes: 8 * 60, // 8 hours
			nursesPerDay: [5, 5, 5, 5, 5, 3, 3], // Mon-Fri: 5, Sat-Sun: 3
			skillDistribution: params.staffParams.nurseSkills.reduce(
				(dist, skill) => {
					dist[skill.id] = 1.0 / params.staffParams.nurseSkills.length;
					return dist;
				},
				{} as Record<string, number>
			),
		};
		onParamChange("staffParams", {
			...params.staffParams,
			nurseShifts: [...params.staffParams.nurseShifts, newShift],
		});
	};

	// Handle removing a nurse shift
	const handleRemoveNurseShift = (index: number) => {
		const updatedShifts = [...params.staffParams.nurseShifts];
		updatedShifts.splice(index, 1);
		onParamChange("staffParams", {
			...params.staffParams,
			nurseShifts: updatedShifts,
		});
	};

	// Handle changing nurses per day for a shift
	const handleShiftNursesPerDayChange = (
		shiftIndex: number,
		dayIndex: number,
		value: number
	) => {
		const updatedShifts = [...params.staffParams.nurseShifts];
		const updatedNursesPerDay = [...updatedShifts[shiftIndex].nursesPerDay];
		updatedNursesPerDay[dayIndex] = value;
		updatedShifts[shiftIndex] = {
			...updatedShifts[shiftIndex],
			nursesPerDay: updatedNursesPerDay,
		};
		onParamChange("staffParams", {
			...params.staffParams,
			nurseShifts: updatedShifts,
		});
	};

	// Handle changing skill distribution for a shift
	const handleSkillDistributionChange = (
		shiftIndex: number,
		skillId: string,
		value: number
	) => {
		const updatedShifts = [...params.staffParams.nurseShifts];
		const updatedDistribution = {
			...updatedShifts[shiftIndex].skillDistribution,
			[skillId]: value,
		};

		// Normalize distribution to sum to 1
		const total = Object.values(updatedDistribution).reduce(
			(sum, val) => sum + val,
			0
		);
		if (total > 0) {
			Object.keys(updatedDistribution).forEach((id) => {
				updatedDistribution[id] = updatedDistribution[id] / total;
			});
		}

		updatedShifts[shiftIndex] = {
			...updatedShifts[shiftIndex],
			skillDistribution: updatedDistribution,
		};
		onParamChange("staffParams", {
			...params.staffParams,
			nurseShifts: updatedShifts,
		});
	};

	// Handle staff params change
	const handleStaffParamsChange = (key: string, value: any) => {
		onParamChange("staffParams", { ...params.staffParams, [key]: value });
	};

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<Tabs
				defaultValue="resources"
				value={activeTab}
				onValueChange={setActiveTab}
				className="col-span-2 space-y-4"
			>
				<TabsList>
					<TabsTrigger value="resources">Resurssit</TabsTrigger>
					<TabsTrigger value="nurses">Hoitajat</TabsTrigger>
					<TabsTrigger value="patients">Potilasjakauma</TabsTrigger>
					<TabsTrigger value="schedule">Leikkauslista</TabsTrigger>
					{/* <TabsTrigger value="blocks">Salisuunnittelu</TabsTrigger> */}
				</TabsList>

				<TabsContent value="nurses">
					<EnhancedNurseSettings
						staffParams={params.staffParams}
						onStaffParamsChange={handleStaffParamsChange}
						onNurseSkillChange={handleNurseSkillChange}
						onNurseShiftChange={handleNurseShiftChange}
						onAddNurseSkill={handleAddNurseSkill}
						onRemoveNurseSkill={handleRemoveNurseSkill}
						onAddNurseShift={handleAddNurseShift}
						onRemoveNurseShift={handleRemoveNurseShift}
						onShiftNursesPerDayChange={handleShiftNursesPerDayChange}
						onSkillDistributionChange={handleSkillDistributionChange}
					/>
				</TabsContent>

				<TabsContent value="resources">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-lg">Resurssit ja asetukset</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="beds">Vuodepaikat</Label>
										<div className="flex items-center gap-2">
											<Slider
												id="beds"
												min={4}
												max={20}
												step={1}
												value={[params.beds]}
												onValueChange={(value) =>
													onParamChange("beds", value[0])
												}
												className="flex-1"
											/>
											<span className="w-8 text-center">{params.beds}</span>
										</div>
									</div>
									<div>
										<Label htmlFor="nurses">Hoitajat/vuoro</Label>
										<div className="flex items-center gap-2">
											<Slider
												id="nurses"
												min={2}
												max={15}
												step={1}
												value={[params.nurses]}
												onValueChange={(value) =>
													onParamChange("nurses", value[0])
												}
												className="flex-1"
											/>
											<span className="w-8 text-center">{params.nurses}</span>
										</div>
									</div>
								</div>

								<div>
									<Label htmlFor="nursePatientRatio">
										Hoitaja:potilas-suhde
									</Label>
									<div className="flex items-center gap-2">
										<span>1:</span>
										<Slider
											id="nursePatientRatio"
											min={1}
											max={4}
											step={0.5}
											value={[params.nursePatientRatio]}
											onValueChange={(value) =>
												onParamChange("nursePatientRatio", value[0])
											}
											className="flex-1"
										/>
										<span className="w-8 text-center">
											{params.nursePatientRatio}
										</span>
									</div>
								</div>

								<div>
									<Label htmlFor="numberOfORs">Leikkaussalien määrä</Label>
									<div className="flex items-center gap-2">
										<Slider
											id="numberOfORs"
											min={1}
											max={10}
											step={1}
											value={[params.numberOfORs]}
											onValueChange={(value) =>
												onParamChange("numberOfORs", value[0])
											}
											className="flex-1"
										/>
										<span className="w-8 text-center">
											{params.numberOfORs}
										</span>
									</div>
								</div>

								<div>
									<Label htmlFor="emergencyRate">
										Päivystysten määrä päivässä
									</Label>
									<div className="flex items-center gap-2">
										<Slider
											id="emergencyRate"
											min={0}
											max={5}
											step={0.5}
											value={[params.emergencyParams.arrivalRateMeanPerDay]}
											onValueChange={(value) =>
												onParamChange("emergencyParams", {
													...params.emergencyParams,
													arrivalRateMeanPerDay: value[0],
												})
											}
											className="flex-1"
										/>
										<span className="w-10 text-center">
											{params.emergencyParams.arrivalRateMeanPerDay}
										</span>
									</div>
								</div>

								<div>
									<Label htmlFor="surgeryOverrunRisk">
										Leikkausten yliajalle menemisen riski (%)
									</Label>
									<div className="flex items-center gap-2">
										<Slider
											id="surgeryOverrunRisk"
											min={0}
											max={50}
											step={1}
											value={[
												params.surgeryScheduleTemplate.overrunRiskPercent || 10,
											]}
											onValueChange={(value) =>
												onParamChange("surgeryScheduleTemplate", {
													...params.surgeryScheduleTemplate,
													overrunRiskPercent: value[0],
												})
											}
											className="flex-1"
										/>
										<span className="w-10 text-center">
											{params.surgeryScheduleTemplate.overrunRiskPercent || 10}%
										</span>
									</div>
								</div>

								<div>
									<Label htmlFor="cancellationRisk">
										Peruutusten todennäköisyys (%)
									</Label>
									<div className="flex items-center gap-2">
										<Slider
											id="cancellationRisk"
											min={0}
											max={30}
											step={1}
											value={[
												Math.round(
													(params.patientClasses.reduce(
														(sum, pc) => sum + (pc.cancellationRisk || 0),
														0
													) /
														params.patientClasses.length) *
														100
												),
											]}
											onValueChange={(value) => {
												// Update cancellation risk for all patient classes
												const riskFactor = value[0] / 100;
												const updatedClasses = params.patientClasses.map(
													(pc) => ({
														...pc,
														cancellationRisk: riskFactor,
													})
												);
												onParamChange("patientClasses", updatedClasses);
											}}
											className="flex-1"
										/>
										<span className="w-10 text-center">
											{Math.round(
												(params.patientClasses.reduce(
													(sum, pc) => sum + (pc.cancellationRisk || 0),
													0
												) /
													params.patientClasses.length) *
													100
											)}
											%
										</span>
									</div>
								</div>

								{params.surgeryScheduleType === "template" && (
									<div>
										<Label htmlFor="surgeries">Leikkauksia/päivä</Label>
										<div className="flex items-center gap-2">
											<Slider
												id="surgeries"
												min={5}
												max={50}
												step={1}
												value={[
													params.surgeryScheduleTemplate.averageDailySurgeries,
												]}
												onValueChange={(value) =>
													onParamChange("averageDailySurgeries", value[0])
												}
												className="flex-1"
											/>
											<span className="w-8 text-center">
												{params.surgeryScheduleTemplate.averageDailySurgeries}
											</span>
										</div>
									</div>
								)}

								<div>
									<Label htmlFor="days">Simuloitavat päivät</Label>
									<div className="flex items-center gap-2">
										<Slider
											id="days"
											min={7}
											max={90}
											step={1}
											value={[params.simulationDays]}
											onValueChange={(value) =>
												onParamChange("simulationDays", value[0])
											}
											className="flex-1"
										/>
										<span className="w-10 text-center">
											{params.simulationDays}
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="patients">
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-lg">Potilasluokkajakauma</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{params.patientClasses.map((patientClass: PatientClass) => (
										<div key={patientClass.id}>
											<div className="flex items-center justify-between mb-1">
												<Label
													htmlFor={`class-${patientClass.id}`}
													className="flex items-center gap-2"
												>
													<span
														className="block w-3 h-3 rounded-full"
														style={{ backgroundColor: patientClass.color }}
													/>
													{patientClass.name}
												</Label>
												<span className="text-sm">
													{Math.round(
														params.patientClassDistribution[patientClass.id] *
															100
													)}
													%
												</span>
											</div>
											<Slider
												id={`class-${patientClass.id}`}
												min={0}
												max={1}
												step={0.01}
												value={[
													params.patientClassDistribution[patientClass.id],
												]}
												onValueChange={(value) =>
													onPatientDistributionChange(patientClass.id, value[0])
												}
												className="flex-1"
											/>
										</div>
									))}

									<div className="pt-2">
										<div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden flex">
											{params.patientClasses.map(
												(patientClass: PatientClass) => (
													<div
														key={patientClass.id}
														style={{
															backgroundColor: patientClass.color,
															width: `${
																params.patientClassDistribution[
																	patientClass.id
																] * 100
															}%`,
														}}
														className="h-full"
													/>
												)
											)}
										</div>
										{!isValidDistribution && (
											<p className="text-red-500 text-sm mt-2">
												Yhteensä: {Math.round(totalPercentage * 100)}%. Summan
												pitäisi olla 100%.
											</p>
										)}
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-lg">
									Leikkausten pituusjakauma
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{params.patientClasses.map((patientClass: PatientClass) => (
										<div key={patientClass.id}>
											<div className="flex items-center justify-between mb-1">
												<Label
													htmlFor={`duration-${patientClass.id}`}
													className="flex items-center gap-2"
												>
													<span
														className="block w-3 h-3 rounded-full"
														style={{ backgroundColor: patientClass.color }}
													/>
													{patientClass.name}
												</Label>
												<span className="text-sm">
													{patientClass.surgeryDurationMean} min ±{" "}
													{patientClass.surgeryDurationStd} min
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Slider
													id={`duration-${patientClass.id}`}
													min={30}
													max={360}
													step={15}
													value={[patientClass.surgeryDurationMean]}
													onValueChange={(value) => {
														const updatedClasses = [...params.patientClasses];
														const index = updatedClasses.findIndex(
															(pc) => pc.id === patientClass.id
														);
														if (index >= 0) {
															updatedClasses[index] = {
																...updatedClasses[index],
																surgeryDurationMean: value[0],
															};
															onParamChange("patientClasses", updatedClasses);
														}
													}}
													className="flex-1"
												/>
											</div>
											<div className="flex items-center gap-2 mt-1">
												<Label
													htmlFor={`std-${patientClass.id}`}
													className="text-xs w-20"
												>
													Hajonta:
												</Label>
												<Slider
													id={`std-${patientClass.id}`}
													min={5}
													max={120}
													step={5}
													value={[patientClass.surgeryDurationStd]}
													onValueChange={(value) => {
														const updatedClasses = [...params.patientClasses];
														const index = updatedClasses.findIndex(
															(pc) => pc.id === patientClass.id
														);
														if (index >= 0) {
															updatedClasses[index] = {
																...updatedClasses[index],
																surgeryDurationStd: value[0],
															};
															onParamChange("patientClasses", updatedClasses);
														}
													}}
													className="flex-1"
												/>
												<span className="text-xs w-10 text-right">
													±{patientClass.surgeryDurationStd}
												</span>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="schedule">
					<SurgeryScheduler
						patientClasses={params.patientClasses}
						patientDistribution={params.patientClassDistribution}
						simulationDays={params.simulationDays}
						onScheduleGenerated={handleSurgeryListGenerated}
						onScheduleTypeChange={handleScheduleTypeChange}
						blocks={[]} // Pass empty blocks for now
						blockScheduleEnabled={false} // Disable block scheduling by default
					/>
				</TabsContent>

				<TabsContent value="blocks">
					<BlockScheduler
						patientClasses={params.patientClasses}
						onScheduleChange={handleBlockScheduleChange}
					/>
				</TabsContent>

				<div className="pt-4">
					<Button
						onClick={onRunSimulation}
						disabled={isRunning || !isValidDistribution}
						className="w-full"
					>
						<PlayCircle className="mr-2 h-4 w-4" />
						{isRunning ? "Simulaatio käynnissä..." : "Aloita simulaatio"}
					</Button>
				</div>
			</Tabs>
		</div>
	);
};

export default SimulationParameters;

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import {
	Plus,
	Trash,
	RotateCw,
	Clock,
	Move,
	Edit,
	Save,
	X,
} from "lucide-react";
import { PatientClass, ORBlock } from "@/lib/simulation";

// ORRoom Type
interface ORRoom {
	id: string;
	name: string;
	equipment: string[];
	openTime: number; // minutes from day start
	closeTime: number; // minutes from day start
}

// Block type that extends ORBlock with UI-specific fields
interface Block extends ORBlock {
	label: string;
	allowedProcedures: string[]; // patient class IDs
	color?: string;
}

interface BlockSchedulerProps {
	patientClasses: PatientClass[];
	onScheduleChange: (blocks: Block[]) => void;
	defaultORRooms?: ORRoom[];
}

const defaultORs: ORRoom[] = [
	{
		id: "OR-1",
		name: "Sali 1",
		equipment: ["standard"],
		openTime: 7 * 60,
		closeTime: 15 * 60,
	},
	{
		id: "OR-2",
		name: "Sali 2",
		equipment: ["standard", "robotic"],
		openTime: 7 * 60,
		closeTime: 15 * 60,
	},
	{
		id: "OR-3",
		name: "Sali 3",
		equipment: ["standard"],
		openTime: 7 * 60,
		closeTime: 15 * 60,
	},
];

// Template blocks per OR
const createTemplateBlocks = (
	orId: string,
	patientClasses: PatientClass[]
): Block[] => {
	// Get patient class IDs
	const classIds = patientClasses.map((pc) => pc.id);

	// Create default blocks with actual patient class IDs
	return [
		{
			id: `${orId}-1`,
			orId: orId,
			start: 7 * 60,
			end: 10 * 60,
			label: "Aamu",
			allowedProcedures: classIds.length > 0 ? [classIds[0]] : [],
			allowedClasses: classIds.length > 0 ? [classIds[0]] : [],
			day: 0,
		},
		{
			id: `${orId}-2`,
			orId: orId,
			start: 10 * 60,
			end: 13 * 60,
			label: "Keskipäivä",
			allowedProcedures:
				classIds.length > 1 ? [classIds[0], classIds[1]] : classIds,
			allowedClasses:
				classIds.length > 1 ? [classIds[0], classIds[1]] : classIds,
			day: 0,
		},
		{
			id: `${orId}-3`,
			orId: orId,
			start: 13 * 60,
			end: 15 * 60,
			label: "Iltapäivä",
			allowedProcedures:
				classIds.length > 2
					? [classIds[2]]
					: classIds.length > 0
					? [classIds[0]]
					: [],
			allowedClasses:
				classIds.length > 2
					? [classIds[2]]
					: classIds.length > 0
					? [classIds[0]]
					: [],
			day: 0,
		},
	];
};

const BlockScheduler: React.FC<BlockSchedulerProps> = ({
	patientClasses,
	onScheduleChange,
	defaultORRooms = defaultORs,
}) => {
	const [orRooms, setORRooms] = useState<ORRoom[]>(defaultORRooms);
	const [blocks, setBlocks] = useState<Block[]>([]);
	const [draggingBlock, setDraggingBlock] = useState<Block | null>(null);
	const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
	const [editingBlock, setEditingBlock] = useState<{
		label: string;
		start: number;
		end: number;
	} | null>(null);

	// Initialize blocks
	useEffect(() => {
		let initialBlocks: Block[] = [];
		orRooms.forEach((or) => {
			initialBlocks = [
				...initialBlocks,
				...createTemplateBlocks(or.id, patientClasses),
			];
		});
		console.log("Initializing blocks:", initialBlocks);
		setBlocks(initialBlocks);

		// Notify parent component about initial blocks
		onScheduleChange(initialBlocks);
	}, [patientClasses]);

	// Update parent component when blocks change
	useEffect(() => {
		onScheduleChange(blocks);
	}, [blocks, onScheduleChange]);

	// Add a new OR room
	const handleAddOR = () => {
		const nextId = `OR-${orRooms.length + 1}`;
		const newOR = {
			id: nextId,
			name: `Sali ${orRooms.length + 1}`,
			equipment: ["standard"],
			openTime: 7 * 60,
			closeTime: 15 * 60,
		};

		setORRooms([...orRooms, newOR]);

		// Add template blocks for the new OR
		const newBlocks = createTemplateBlocks(nextId, patientClasses);
		setBlocks([...blocks, ...newBlocks]);

		toast({
			title: "Leikkaussali lisätty",
			description: `${newOR.name} lisätty aikatauluun.`,
		});
	};

	// Remove an OR room
	const handleRemoveOR = (orId: string) => {
		if (orRooms.length <= 1) {
			toast({
				title: "Ei voida poistaa",
				description: "Ainakin yksi leikkaussali on oltava käytössä.",
				variant: "destructive",
			});
			return;
		}

		setORRooms(orRooms.filter((or) => or.id !== orId));
		setBlocks(blocks.filter((block) => block.orId !== orId));

		toast({
			title: "Leikkaussali poistettu",
			description: `${orId} on poistettu aikataulusta.`,
		});
	};

	// Add a new block to an OR
	const handleAddBlock = (orId: string) => {
		const orBlocks = blocks
			.filter((b) => b.orId === orId)
			.sort((a, b) => a.end - b.end);
		const lastBlock =
			orBlocks.length > 0 ? orBlocks[orBlocks.length - 1] : null;

		const startTime = lastBlock
			? lastBlock.end
			: orRooms.find((or) => or.id === orId)!.openTime;
		const endTime = Math.min(
			startTime + 180,
			orRooms.find((or) => or.id === orId)!.closeTime
		); // 3-hour block or until closing

		if (startTime >= endTime) {
			toast({
				title: "Ei voida lisätä",
				description: "Leikkaussalin aikataulu on jo täynnä.",
				variant: "destructive",
			});
			return;
		}

		// Get all patient class IDs
		const classIds = patientClasses.map((pc) => pc.id);

		const newBlock: Block = {
			id: `${orId}-${blocks.filter((b) => b.orId === orId).length + 1}`,
			orId: orId,
			start: startTime,
			end: endTime,
			label: "Uusi blokki",
			allowedProcedures: classIds, // Allow all patient classes by default
			allowedClasses: classIds, // Keep both fields in sync
			day: 0,
		};

		setBlocks([...blocks, newBlock]);
	};

	// Remove a block
	const handleRemoveBlock = (blockId: string) => {
		setBlocks(blocks.filter((block) => block.id !== blockId));
	};

	// Update block allowed procedures
	const handleUpdateBlockProcedures = (
		blockId: string,
		procedureIds: string[]
	) => {
		setBlocks(
			blocks.map((block) =>
				block.id === blockId
					? {
							...block,
							allowedProcedures: procedureIds,
							allowedClasses: procedureIds, // Keep both fields in sync
					  }
					: block
			)
		);
	};

	// Start editing block
	const handleStartEditBlock = (block: Block) => {
		setEditingBlockId(block.id);
		setEditingBlock({
			label: block.label,
			start: block.start,
			end: block.end,
		});
	};

	// Save block edits
	const handleSaveBlockEdits = () => {
		if (!editingBlockId || !editingBlock) return;

		// Validate time values
		if (editingBlock.start >= editingBlock.end) {
			toast({
				title: "Virheelliset ajat",
				description: "Alkuajan täytyy olla ennen loppuaikaa.",
				variant: "destructive",
			});
			return;
		}

		const orId = blocks.find((b) => b.id === editingBlockId)?.orId;
		if (!orId) return;

		const orRoom = orRooms.find((or) => or.id === orId);
		if (!orRoom) return;

		// Validate against OR opening hours
		if (
			editingBlock.start < orRoom.openTime ||
			editingBlock.end > orRoom.closeTime
		) {
			toast({
				title: "Aika salin aukioloajan ulkopuolella",
				description: "Blokin ajat ylittävät leikkaussalin aukioloajan.",
				variant: "destructive",
			});
			return;
		}

		// Check for overlapping blocks in the same OR
		const otherBlocks = blocks.filter(
			(b) => b.orId === orId && b.id !== editingBlockId
		);
		const isOverlapping = otherBlocks.some((b) => {
			return editingBlock.start < b.end && editingBlock.end > b.start;
		});

		if (isOverlapping) {
			toast({
				title: "Päällekkäiset blokit",
				description: "Blokki menee päällekkäin toisen blokin kanssa.",
				variant: "destructive",
			});
			return;
		}

		// Update block
		setBlocks(
			blocks.map((block) =>
				block.id === editingBlockId
					? {
							...block,
							label: editingBlock.label,
							start: editingBlock.start,
							end: editingBlock.end,
					  }
					: block
			)
		);

		// Reset editing state
		setEditingBlockId(null);
		setEditingBlock(null);

		toast({
			title: "Blokki päivitetty",
			description: "Blokin tiedot päivitetty onnistuneesti.",
		});
	};

	// Cancel block editing
	const handleCancelBlockEdit = () => {
		setEditingBlockId(null);
		setEditingBlock(null);
	};

	// Optimize schedule (placeholder for now)
	const handleOptimizeSchedule = () => {
		toast({
			title: "Optimointi käynnistetty",
			description: "Aikataulun optimointi on käynnissä...",
		});

		// Here we would call the optimization algorithm
		// For now, we just update the UI after a short delay
		setTimeout(() => {
			toast({
				title: "Optimointi valmis",
				description: "Aikataulu on optimoitu onnistuneesti.",
			});
		}, 1500);
	};

	// Format minutes to HH:MM display
	const formatTime = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours.toString().padStart(2, "0")}:${mins
			.toString()
			.padStart(2, "0")}`;
	};

	// Convert HH:MM string to minutes
	const parseTimeToMinutes = (timeString: string): number => {
		const [hours, minutes] = timeString.split(":").map(Number);
		return hours * 60 + minutes;
	};

	// Format minutes for input field (HH:MM)
	const formatTimeForInput = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours.toString().padStart(2, "0")}:${mins
			.toString()
			.padStart(2, "0")}`;
	};

	// Handle time input change
	const handleTimeInputChange = (type: "start" | "end", value: string) => {
		if (!editingBlock) return;

		try {
			const minutes = parseTimeToMinutes(value);
			setEditingBlock({
				...editingBlock,
				[type]: minutes,
			});
		} catch (e) {
			// Invalid time format, ignore
		}
	};

	// Render the block with patient class colors
	const renderBlock = (block: Block) => {
		// Find matching patient class for color
		const blockColor =
			block.allowedProcedures.length === 1 &&
			patientClasses.find((pc) => pc.id === block.allowedProcedures[0])?.color;

		const isEditing = editingBlockId === block.id;

		return (
			<div
				key={block.id}
				className="mb-2 p-2 rounded border relative"
				style={{
					backgroundColor: blockColor ? `${blockColor}20` : undefined,
					borderColor: blockColor,
				}}
			>
				{isEditing ? (
					<div className="space-y-2">
						<div className="flex items-center space-x-2">
							<Input
								value={editingBlock?.label || ""}
								onChange={(e) =>
									setEditingBlock({ ...editingBlock!, label: e.target.value })
								}
								className="flex-grow"
								placeholder="Blokin nimi"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div>
								<Label className="text-xs">Alkuaika</Label>
								<div className="flex items-center space-x-2">
									<Input
										type="time"
										value={formatTimeForInput(editingBlock?.start || 0)}
										onChange={(e) =>
											handleTimeInputChange("start", e.target.value)
										}
									/>
								</div>
							</div>
							<div>
								<Label className="text-xs">Loppuaika</Label>
								<div className="flex items-center space-x-2">
									<Input
										type="time"
										value={formatTimeForInput(editingBlock?.end || 0)}
										onChange={(e) =>
											handleTimeInputChange("end", e.target.value)
										}
									/>
								</div>
							</div>
						</div>

						<div className="flex justify-end space-x-2 mt-2">
							<Button size="sm" variant="ghost" onClick={handleCancelBlockEdit}>
								<X className="h-4 w-4 mr-1" /> Peruuta
							</Button>
							<Button size="sm" onClick={handleSaveBlockEdits}>
								<Save className="h-4 w-4 mr-1" /> Tallenna
							</Button>
						</div>
					</div>
				) : (
					<>
						<div className="flex justify-between items-center">
							<div>
								<div className="font-medium">{block.label}</div>
								<div className="text-sm text-gray-600">
									{formatTime(block.start)} - {formatTime(block.end)} (
									{Math.round(((block.end - block.start) / 60) * 10) / 10}h)
								</div>
							</div>
							<div className="flex space-x-1">
								<Button
									size="sm"
									variant="ghost"
									onClick={() => handleStartEditBlock(block)}
								>
									<Edit className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => handleRemoveBlock(block.id)}
								>
									<Trash className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<div className="mt-2">
							<Label className="text-xs mb-1 block">
								Sallitut potilasluokat
							</Label>
							<div className="flex flex-wrap gap-1">
								{patientClasses.map((pc) => (
									<div
										key={pc.id}
										className={`px-2 py-1 text-xs rounded cursor-pointer ${
											block.allowedProcedures.includes(pc.id)
												? "text-white"
												: "text-gray-600 bg-gray-100"
										}`}
										style={{
											backgroundColor: block.allowedProcedures.includes(pc.id)
												? pc.color
												: undefined,
										}}
										onClick={() => {
											const updatedProcedures =
												block.allowedProcedures.includes(pc.id)
													? block.allowedProcedures.filter((id) => id !== pc.id)
													: [...block.allowedProcedures, pc.id];

											// Ensure at least one procedure type is selected
											if (updatedProcedures.length > 0) {
												handleUpdateBlockProcedures(
													block.id,
													updatedProcedures
												);
											}
										}}
									>
										{pc.name}
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</div>
		);
	};

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center justify-between">
					<span>Leikkaussali blokit</span>
					<Button size="sm" variant="outline" onClick={handleOptimizeSchedule}>
						<RotateCw className="h-4 w-4 mr-2" />
						Optimoi aikataulu
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="mb-4 flex justify-end">
					<Button onClick={handleAddOR}>
						<Plus className="h-4 w-4 mr-2" />
						Lisää leikkaussali
					</Button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{orRooms.map((or) => (
						<Card key={or.id} className="shadow-sm">
							<CardHeader className="py-3">
								<CardTitle className="text-base flex items-center justify-between">
									<span>{or.name}</span>
									{orRooms.length > 1 && (
										<Button
											size="sm"
											variant="ghost"
											onClick={() => handleRemoveOR(or.id)}
										>
											<Trash className="h-4 w-4" />
										</Button>
									)}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-xs text-gray-500 flex justify-between mb-2">
									<span>
										<Clock className="h-3 w-3 inline mr-1" />
										{formatTime(or.openTime)} - {formatTime(or.closeTime)}
									</span>
									<Button
										size="sm"
										variant="ghost"
										className="h-6 py-0 px-1"
										onClick={() => handleAddBlock(or.id)}
									>
										<Plus className="h-3 w-3 mr-1" /> Blokki
									</Button>
								</div>

								{blocks
									.filter((block) => block.orId === or.id)
									.sort((a, b) => a.start - b.start)
									.map(renderBlock)}
							</CardContent>
						</Card>
					))}
				</div>
			</CardContent>
		</Card>
	);
};

export default BlockScheduler;

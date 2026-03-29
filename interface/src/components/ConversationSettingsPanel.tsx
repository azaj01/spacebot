import { useState } from "react";
import { Button } from "@/ui/Button";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	SelectGroup,
	SelectLabel,
} from "@/ui/Select";
import type { ConversationSettings, ConversationDefaultsResponse } from "@/api/types";

interface ConversationSettingsPanelProps {
	defaults: ConversationDefaultsResponse;
	currentSettings: ConversationSettings;
	onChange: (settings: ConversationSettings) => void;
	onSave: () => void;
	onCancel?: () => void;
	saving?: boolean;
}

const PRESETS: Array<{ id: string; name: string; description: string; settings: ConversationSettings }> = [
	{ id: "chat", name: "Chat", description: "Full memory, delegates work", settings: { memory: "full", delegation: "standard", worker_context: { history: "none", memory: "none" } } },
	{ id: "focus", name: "Focus", description: "Read-only memory, no persistence", settings: { memory: "ambient", delegation: "standard", worker_context: { history: "none", memory: "none" } } },
	{ id: "hands-on", name: "Hands-on", description: "Direct tools, workers get context", settings: { memory: "off", delegation: "direct", worker_context: { history: "recent", memory: "tools" } } },
	{ id: "quick", name: "Quick", description: "Stateless, lightweight", settings: { memory: "off", delegation: "standard", worker_context: { history: "none", memory: "none" } } },
];

const MEMORY_OPTIONS = [
	{ value: "full", label: "On", description: "Reads and writes memories" },
	{ value: "ambient", label: "Context Only", description: "Reads but won't write" },
	{ value: "off", label: "Off", description: "No memory context" },
] as const;

const DELEGATION_OPTIONS = [
	{ value: "standard", label: "Standard", description: "Delegates via workers" },
	{ value: "direct", label: "Direct", description: "Has all tools directly" },
] as const;

const WORKER_HISTORY_OPTIONS = [
	{ value: "none", label: "None" },
	{ value: "summary", label: "Summary" },
	{ value: "recent", label: "Recent (20)" },
	{ value: "full", label: "Full" },
] as const;

const WORKER_MEMORY_OPTIONS = [
	{ value: "none", label: "None" },
	{ value: "ambient", label: "Read-only" },
	{ value: "tools", label: "Can search" },
	{ value: "full", label: "Full access" },
] as const;

/** Group models by provider for the select dropdown. */
function groupModelsByProvider(models: ConversationDefaultsResponse["available_models"]) {
	const groups: Record<string, typeof models> = {};
	for (const model of models) {
		const key = model.provider;
		if (!groups[key]) groups[key] = [];
		groups[key].push(model);
	}
	return groups;
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<label className="shrink-0 text-xs text-ink-dull">{label}</label>
			<div className="w-40">{children}</div>
		</div>
	);
}

export function ConversationSettingsPanel({
	defaults,
	currentSettings,
	onChange,
	onSave,
	onCancel,
	saving,
}: ConversationSettingsPanelProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const modelGroups = groupModelsByProvider(defaults.available_models);

	return (
		<div className="flex flex-col gap-3">
			{/* Presets */}
			<div className="flex gap-1.5">
				{PRESETS.map((preset) => (
					<button
						key={preset.id}
						onClick={() => onChange({ ...currentSettings, ...preset.settings })}
						title={preset.description}
						className="rounded-md border border-app-line bg-app-darkBox px-2.5 py-1 text-xs text-ink-dull transition-colors hover:border-accent/40 hover:text-ink"
					>
						{preset.name}
					</button>
				))}
			</div>

			{/* Core settings */}
			<div className="flex flex-col gap-2.5">
				<SettingRow label="Model">
					<Select
						value={currentSettings.model || defaults.model}
						onValueChange={(value) => onChange({ ...currentSettings, model: value })}
					>
						<SelectTrigger className="h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(modelGroups).map(([provider, models]) => (
								<SelectGroup key={provider}>
									<SelectLabel>{provider}</SelectLabel>
									{models.map((m) => (
										<SelectItem key={m.id} value={m.id} className="text-xs">
											{m.name}
										</SelectItem>
									))}
								</SelectGroup>
							))}
						</SelectContent>
					</Select>
				</SettingRow>

				<SettingRow label="Memory">
					<Select
						value={currentSettings.memory || defaults.memory}
						onValueChange={(value) => onChange({ ...currentSettings, memory: value as ConversationSettings["memory"] })}
					>
						<SelectTrigger className="h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MEMORY_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value} className="text-xs">
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>

				<SettingRow label="Mode">
					<Select
						value={currentSettings.delegation || defaults.delegation}
						onValueChange={(value) => onChange({ ...currentSettings, delegation: value as ConversationSettings["delegation"] })}
					>
						<SelectTrigger className="h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DELEGATION_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value} className="text-xs">
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>
			</div>

			{/* Advanced toggle */}
			<button
				onClick={() => setShowAdvanced(!showAdvanced)}
				className="self-start text-[11px] text-ink-faint transition-colors hover:text-ink-dull"
			>
				{showAdvanced ? "Hide" : "Show"} advanced
			</button>

			{showAdvanced && (
				<div className="flex flex-col gap-2.5 border-t border-app-line pt-2.5">
					{/* Per-process model overrides */}
					<p className="text-[11px] font-medium text-ink-faint">Model overrides</p>
					{(["channel", "branch", "worker"] as const).map((process) => (
						<SettingRow key={process} label={process.charAt(0).toUpperCase() + process.slice(1)}>
							<Select
								value={currentSettings.model_overrides?.[process] || "__inherit__"}
								onValueChange={(value) => {
									const overrides = { ...currentSettings.model_overrides };
									if (value === "__inherit__") {
										delete overrides[process];
									} else {
										overrides[process] = value;
									}
									onChange({ ...currentSettings, model_overrides: overrides });
								}}
							>
								<SelectTrigger className="h-7 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__inherit__" className="text-xs italic">
										Inherit
									</SelectItem>
									{Object.entries(modelGroups).map(([provider, models]) => (
										<SelectGroup key={provider}>
											<SelectLabel>{provider}</SelectLabel>
											{models.map((m) => (
												<SelectItem key={m.id} value={m.id} className="text-xs">
													{m.name}
												</SelectItem>
											))}
										</SelectGroup>
									))}
								</SelectContent>
							</Select>
						</SettingRow>
					))}

					<p className="mt-1 text-[11px] font-medium text-ink-faint">Worker context</p>
					<SettingRow label="History">
						<Select
							value={currentSettings.worker_context?.history || defaults.worker_context.history}
							onValueChange={(value) => onChange({
								...currentSettings,
								worker_context: { ...currentSettings.worker_context, history: value as any },
							})}
						>
							<SelectTrigger className="h-7 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{WORKER_HISTORY_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value} className="text-xs">
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SettingRow>

					<SettingRow label="Memory">
						<Select
							value={currentSettings.worker_context?.memory || defaults.worker_context.memory}
							onValueChange={(value) => onChange({
								...currentSettings,
								worker_context: { ...currentSettings.worker_context, memory: value as any },
							})}
						>
							<SelectTrigger className="h-7 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{WORKER_MEMORY_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value} className="text-xs">
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SettingRow>
				</div>
			)}

			{/* Actions */}
			<div className="flex items-center justify-end gap-2 pt-1">
				{onCancel && (
					<Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
						Cancel
					</Button>
				)}
				<Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs">
					{saving ? "Saving..." : "Apply"}
				</Button>
			</div>
		</div>
	);
}

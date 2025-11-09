import { useCallback, useEffect, useMemo, useState } from 'react';
import 'katex/dist/katex.min.css';

import { MeasurementHistory } from './components/MeasurementHistory';
import { MeasurementPanel } from './components/Measurements/MeasurementPanel.tsx';
import { MathChannelWizardDialog } from './components/MathChannelWizard/MathChannelWizardDialog.tsx';
import { MeasurementWizard } from './components/MeasurementWizard/MeasurementWizard.tsx';
import { ModalBackdrop, ModalCard } from './components/common/ModalPrimitives.ts';
import { ChannelWizard } from './components/ChannelWizard/ChannelWizard.tsx';
import { ChannelStrip } from './components/ChannelStrip/ChannelStrip.tsx';
import { SettingsPanel } from './components/SidePanels/SettingsPanel.tsx';
import { AboutPanel } from './components/SidePanels/AboutPanel.tsx';
import { HelpPanel } from './components/SidePanels/HelpPanel.tsx';

import { useDevices } from './hooks/useDevice.ts';
import type { MeasurementSample } from './types/deviceData.ts';
import { useChannelManager } from './hooks/useChannelManager.ts';
import { useMathChannelHistory } from './hooks/useMathChannelHistory.ts';
import { useDeveloperMode } from './hooks/useDeveloperMode.ts';
import { useDeviceChannelWizard } from './hooks/useDeviceChannelWizard.ts';
import { useChannelSettingsManager } from './hooks/useChannelSettingsManager.ts';
import { useMeasurementSummaries } from './hooks/useMeasurementSummaries.ts';

import type {
	ChannelConfig,
	MathChannelConfig,
	MathChannelSubmission,
} from './types/channel.ts';
import { isDeviceChannel, isMathChannel } from './types/channel.ts';
import { DEVICE_TYPE_OPTIONS, type DeviceTypeOption } from './types/devices.ts';

import { buildDefaultMathAlias } from './utils/mathChannelDefaults.ts';
import { pickChannelColor } from './utils/channelColors.ts';
import { createId } from './utils/createId.ts';

import {
	AppShell,
	EdgeTabRail,
	EdgeTabButton,
	CentralStage,
	ScopeCanvas,
	ScopeContent,
	ScopeHistoryContainer,
} from './components/AppLayout/styled.ts';

const DEVELOPER_MODE_STORAGE_KEY = 'tsmultimeter:developer-mode';

function App() {
	const {
		devices,
		connectDevice,
		disconnectDevice,
		isLoading,
		availablePorts,
		refreshPorts,
		measurementHistory,
		clearMeasurementHistory,
	} = useDevices();

	const { enabled: developerModeEnabled, toggle: toggleDeveloperMode } = useDeveloperMode(DEVELOPER_MODE_STORAGE_KEY);

	const deviceTypeOptions = useMemo<readonly DeviceTypeOption[]>(() => (
		developerModeEnabled
			? DEVICE_TYPE_OPTIONS
			: DEVICE_TYPE_OPTIONS.filter((option) => option.value !== 'Mock')
	), [developerModeEnabled]);

	const {
		channelConfigs,
		setChannelConfigs,
		deviceChannels,
		mathChannels,
		channelStyles,
		deviceChannelById,
	} = useChannelManager(devices);

	const [mathHistory, setMathHistory] = useMathChannelHistory(deviceChannels, mathChannels, measurementHistory);

	const combinedMeasurementHistory = useMemo(() => {
		if (Object.keys(mathHistory).length === 0) {
			return measurementHistory;
		}
		return {
			...measurementHistory,
			...mathHistory,
		};
	}, [measurementHistory, mathHistory]);

	const {
		measurementSummaries,
		measurementForm,
		updateMeasurementForm,
		prepareMeasurementForm,
		resetMeasurementForm,
		submitMeasurement,
		removeMeasurement,
	} = useMeasurementSummaries({
		measurementHistory: combinedMeasurementHistory,
		channelStyles,
		devices,
	});

	const {
		isOpen: channelWizardOpen,
		form: channelWizardForm,
		isLinking: isLinkingChannel,
		error: channelWizardError,
		open: openChannelWizardInternal,
		close: closeChannelWizard,
		changeDeviceType,
		changePort,
		changeAlias,
		submit: submitChannelWizard,
	} = useDeviceChannelWizard({
		deviceTypeOptions,
		developerModeEnabled,
		availablePorts,
		refreshPorts,
		connectDevice,
		setChannelConfigs,
	});

	const {
		draft: channelSettingsDraft,
		error: channelSettingsError,
		mathHelpChannelId,
		openSettings: openChannelSettings,
		toggleMathHelp: toggleMathSettingsHelp,
		updateField: handleChannelSettingsFieldChange,
		cancel: cancelChannelSettings,
		submit: handleChannelSettingsSubmit,
	} = useChannelSettingsManager({
		channelConfigs,
		setChannelConfigs,
		deviceChannelById,
	});

	const [activeLeftPanel, setActiveLeftPanel] = useState<'settings' | 'about' | 'help' | null>(null);
	const [measurementsOpen, setMeasurementsOpen] = useState(false);
	const [mathChannelWizardOpen, setMathChannelWizardOpen] = useState(false);
	const [measurementWizardOpen, setMeasurementWizardOpen] = useState(false);

	const latestSampleByChannel = useMemo(() => {
		const entries: Record<string, MeasurementSample | undefined> = {};
		Object.entries(combinedMeasurementHistory).forEach(([channelId, samples]) => {
			if (samples.length > 0) {
				entries[channelId] = samples[samples.length - 1];
			}
		});
		return entries;
	}, [combinedMeasurementHistory]);

	const channelReadings = useMemo(
		() => channelConfigs.map((channel) => {
			const sampleKey = isDeviceChannel(channel) ? channel.deviceId : channel.id;
			const sample = latestSampleByChannel[sampleKey];
			return { channel, sample };
		}),
		[channelConfigs, latestSampleByChannel],
	);

	const measurementChannelOptions = useMemo(
		() => {
			const deviceOptions = deviceChannels.map((channel) => {
				const style = channelStyles[channel.deviceId];
				const label = style?.alias ?? channel.alias;
				return {
					id: channel.id,
					label,
					group: 'device' as const,
				};
			});
			const mathOptions = mathChannels.map((channel) => {
				const style = channelStyles[channel.id];
				const label = style?.alias ?? channel.alias;
				return {
					id: channel.id,
					label,
					group: 'math' as const,
				};
			});
			return [...deviceOptions, ...mathOptions];
		},
		[deviceChannels, mathChannels, channelStyles],
	);

	useEffect(() => {
		if (!mathChannelWizardOpen) {
			return;
		}
		if (deviceChannels.length === 0) {
			setMathChannelWizardOpen(false);
		}
	}, [deviceChannels.length, mathChannelWizardOpen]);

	const openChannelWizard = useCallback(() => {
		openChannelWizardInternal(channelConfigs.length);
	}, [channelConfigs.length, openChannelWizardInternal]);

	const openMeasurementWizard = useCallback(() => {
		const defaultChannelId = measurementChannelOptions[0]?.id;
		prepareMeasurementForm(defaultChannelId);
		setMeasurementWizardOpen(true);
	}, [measurementChannelOptions, prepareMeasurementForm]);

	const closeMeasurementWizard = useCallback(() => {
		setMeasurementWizardOpen(false);
		resetMeasurementForm();
	}, [resetMeasurementForm]);

	const handleMeasurementSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
		const created = submitMeasurement(event);
		if (created) {
			setMeasurementWizardOpen(false);
		}
	}, [submitMeasurement]);

	const openMathChannelWizard = () => {
		setMathChannelWizardOpen(true);
	};

	const handleCreateMathChannel = useCallback((submission: MathChannelSubmission) => {
		const trimmedAlias = submission.alias.trim();
		const id = createId();

		setChannelConfigs((prev) => {
			const mathCount = prev.filter(isMathChannel).length;
			const alias = trimmedAlias.length > 0 ? trimmedAlias : buildDefaultMathAlias(mathCount);
			const usedColors = new Set(prev.map((entry) => entry.color));
			const color = pickChannelColor(usedColors);

			const nextConfig: MathChannelConfig = {
				id,
				type: 'math',
				alias,
				color,
				enabled: true,
				expression: submission.expression,
				inputs: submission.inputs,
				unit: submission.unit,
			};

			return [...prev, nextConfig];
		});

		setMathHistory((prev) => ({
			...prev,
			[id]: prev[id] ?? [],
		}));

		setMathChannelWizardOpen(false);
	}, [setChannelConfigs, setMathHistory]);

	const handleClearHistory = useCallback((targetId?: string) => {
		if (!targetId) {
			setMathHistory({});
			clearMeasurementHistory();
			return;
		}

		setMathHistory((prev) => {
			if (!(targetId in prev)) {
				return prev;
			}
			const { [targetId]: _removed, ...rest } = prev;
			return rest;
		});
		clearMeasurementHistory(targetId);
	}, [clearMeasurementHistory, setMathHistory]);

	const handleDisconnectChannel = useCallback(async (channel: ChannelConfig) => {
		try {
			if (isDeviceChannel(channel)) {
				await disconnectDevice(channel.deviceId);
			}
		} catch (error) {
			if (isDeviceChannel(channel)) {
				console.error(`Failed to disconnect ${channel.deviceId}`, error);
			} else {
				console.error(`Failed to remove math channel ${channel.id}`, error);
			}
		} finally {
			setChannelConfigs((prev) => prev.filter((entry) => entry.id !== channel.id));
			if (channelSettingsDraft?.id === channel.id) {
				cancelChannelSettings();
			}
			if (isMathChannel(channel)) {
				setMathHistory((prev) => {
					if (!(channel.id in prev)) {
						return prev;
					}
					const { [channel.id]: _removed, ...rest } = prev;
					return rest;
				});
			}
		}
	}, [cancelChannelSettings, channelSettingsDraft, disconnectDevice, setChannelConfigs, setMathHistory]);

	const handleToggleChannel = useCallback((id: string) => {
		setChannelConfigs((prev) => prev.map((entry) => (
			entry.id === id
				? { ...entry, enabled: !entry.enabled }
				: entry
		)));
	}, [setChannelConfigs]);

	const handleRemoveMeasurement = useCallback((id: string) => {
		removeMeasurement(id);
	}, [removeMeasurement]);

	const leftPanelOpen = activeLeftPanel !== null;

	const handleDeveloperModeToggle = useCallback(() => {
		toggleDeveloperMode();
	}, [toggleDeveloperMode]);

	return (
		<AppShell>
			<EdgeTabRail $position="left">
				<EdgeTabButton
					type="button"
					onClick={() => setActiveLeftPanel((panel) => (panel === 'settings' ? null : 'settings'))}
					$active={activeLeftPanel === 'settings'}
					aria-pressed={activeLeftPanel === 'settings'}
				>
					Settings
				</EdgeTabButton>
				<EdgeTabButton
					type="button"
					onClick={() => setActiveLeftPanel((panel) => (panel === 'about' ? null : 'about'))}
					$active={activeLeftPanel === 'about'}
					aria-pressed={activeLeftPanel === 'about'}
				>
					About
				</EdgeTabButton>
				<EdgeTabButton
					type="button"
					onClick={() => setActiveLeftPanel((panel) => (panel === 'help' ? null : 'help'))}
					$active={activeLeftPanel === 'help'}
					aria-pressed={activeLeftPanel === 'help'}
				>
					Help
				</EdgeTabButton>
			</EdgeTabRail>

			<CentralStage $leftPanelOpen={leftPanelOpen} $rightPanelOpen={measurementsOpen}>
				

				<ScopeCanvas>
					<ScopeContent>
						<ScopeHistoryContainer>
							<MeasurementHistory
								history={combinedMeasurementHistory}
								channelStyles={channelStyles}
								onClearHistory={handleClearHistory}
							/>
						</ScopeHistoryContainer>
					</ScopeContent>

					<ChannelStrip
						channelReadings={channelReadings}
						channelSettingsDraft={channelSettingsDraft}
						channelSettingsError={channelSettingsError}
						deviceChannelById={deviceChannelById}
						mathSettingsHelpChannelId={mathHelpChannelId}
						isAddDeviceDisabled={isLoading}
						canAddMathChannel={deviceChannels.length > 0}
						onAddDevice={openChannelWizard}
						onAddMath={openMathChannelWizard}
						onOpenChannelSettings={openChannelSettings}
						onDisconnectChannel={(channel: ChannelConfig) => { void handleDisconnectChannel(channel); }}
						onToggleChannel={handleToggleChannel}
						onToggleMathHelp={toggleMathSettingsHelp}
						onSettingsFieldChange={handleChannelSettingsFieldChange}
						onSettingsCancel={cancelChannelSettings}
						onSettingsSubmit={handleChannelSettingsSubmit}
					/>
				</ScopeCanvas>
			</CentralStage>

			<EdgeTabRail $position="right">
				<EdgeTabButton
					type="button"
					onClick={() => setMeasurementsOpen((open) => !open)}
					$active={measurementsOpen}
					aria-pressed={measurementsOpen}
				>
					Measurements
				</EdgeTabButton>
			</EdgeTabRail>

			<SettingsPanel
				open={activeLeftPanel === 'settings'}
				developerModeEnabled={developerModeEnabled}
				onToggleDeveloperMode={handleDeveloperModeToggle}
			/>

			<AboutPanel open={activeLeftPanel === 'about'} />

			<HelpPanel open={activeLeftPanel === 'help'} />

			<MeasurementPanel
				open={measurementsOpen}
				summaries={measurementSummaries}
				canAddMeasurement={measurementChannelOptions.length > 0}
				onAddMeasurement={openMeasurementWizard}
				onRemoveMeasurement={handleRemoveMeasurement}
			/>

			{channelWizardOpen && (
				<ModalBackdrop>
					<ModalCard>
						<ChannelWizard
							form={channelWizardForm}
							availablePorts={availablePorts}
							isLinking={isLinkingChannel}
							isBusy={isLoading}
							errorMessage={channelWizardError}
							onSubmit={submitChannelWizard}
							onClose={closeChannelWizard}
							onRefreshPorts={() => {
								void refreshPorts();
							}}
							onChangeDeviceType={changeDeviceType}
							onChangePort={changePort}
							onChangeAlias={changeAlias}
							deviceTypeOptions={deviceTypeOptions}
						/>
					</ModalCard>
				</ModalBackdrop>
			)}

			{mathChannelWizardOpen && (
				<ModalBackdrop>
					<ModalCard>
						<MathChannelWizardDialog
							deviceChannels={deviceChannels}
							latestSampleByChannel={latestSampleByChannel}
							mathChannelCount={mathChannels.length}
							onSubmit={handleCreateMathChannel}
							onClose={() => setMathChannelWizardOpen(false)}
						/>
					</ModalCard>
				</ModalBackdrop>
			)}

			{measurementWizardOpen && (
				<ModalBackdrop>
					<ModalCard>
						<MeasurementWizard
							channelOptions={measurementChannelOptions}
							form={measurementForm}
							onSubmit={handleMeasurementSubmit}
							onClose={closeMeasurementWizard}
							onChangeChannel={(channelId) => updateMeasurementForm('channelId', channelId)}
							onChangeKind={(kind) => updateMeasurementForm('kind', kind)}
						/>
					</ModalCard>
				</ModalBackdrop>
			)}
		</AppShell>
	);
}

export default App;

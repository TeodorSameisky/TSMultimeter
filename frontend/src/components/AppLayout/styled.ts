import styled, { css } from 'styled-components';

export const AppShell = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  height: 100vh;
  background: #0c121a;
  color: #e5edf8;
  font-family: 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden;
`;

export const EdgeTabRail = styled.div<{ $position: 'left' | 'right' }>`
  width: 56px;
  background: #0a0f17;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 1.5rem 0;
  gap: 1rem;
  z-index: 4;

  ${({ $position }) => ($position === 'left'
    ? css`
        border-right: 1px solid rgba(255, 255, 255, 0.06);
      `
    : css`
        border-left: 1px solid rgba(255, 255, 255, 0.06);
      `)}
`;

export const EdgeTabButton = styled.button<{ $active: boolean }>`
  width: 40px;
  height: 160px;
  border-radius: 20px;
  border: 1px solid transparent;
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, rgba(55, 134, 255, 0.9), rgba(105, 168, 255, 0.95))'
    : 'rgba(255, 255, 255, 0.04)')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#7d8aa1')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  padding: 0.75rem 0.35rem;
  transition: all 0.25s ease;

  &:hover {
    color: #ffffff;
    background: ${({ $active }) => ($active
      ? 'linear-gradient(135deg, rgba(55, 134, 255, 1), rgba(105, 168, 255, 1))'
      : 'rgba(55, 134, 255, 0.2)')};
  }

  &:active {
    transform: translateY(1px);
  }
`;

export const CentralStage = styled.div<{ $leftPanelOpen: boolean; $rightPanelOpen: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.75rem 3rem;
  background: radial-gradient(circle at 25% -10%, rgba(41, 66, 112, 0.5), transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(36, 78, 184, 0.35), rgba(12, 18, 26, 0.9) 65%),
    linear-gradient(180deg, rgba(9, 14, 22, 0.92) 0%, rgba(9, 14, 22, 0.98) 100%);
  position: relative;
  overflow: hidden;
  margin-left: ${({ $leftPanelOpen }) => ($leftPanelOpen ? '360px' : '0')};
  margin-right: ${({ $rightPanelOpen }) => ($rightPanelOpen ? '360px' : '0')};
  transition: margin 0.32s ease;
`;

export const StageHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

export const StageTitle = styled.h1`
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: #f5f8ff;
`;

export const StageSubtitle = styled.p`
  margin: 0;
  color: #8b96aa;
  font-size: 0.95rem;
`;

export const ScopeCanvas = styled.section`
  flex: 1;
  min-height: 0;
  background: rgba(13, 20, 30, 0.6);
  border-radius: 18px;
  padding: 1.2rem 1.5rem 1.5rem;
  box-shadow: 0 28px 60px rgba(3, 10, 24, 0.55);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
`;

export const ScopeContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const ScopeHistoryContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const SidePanel = styled.aside<{ $position: 'left' | 'right'; $open: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 360px;
  background: rgba(11, 18, 28, 0.98);
  backdrop-filter: blur(18px);
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  z-index: 12;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  transition: transform 0.32s ease;

  ${({ $position, $open }) => ($position === 'left'
    ? css`
        left: 0;
        border-right: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 18px 0 45px rgba(0, 0, 0, 0.45);
        transform: translateX(${ $open ? '56px' : '-100%' });
      `
    : css`
        right: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: -18px 0 45px rgba(0, 0, 0, 0.45);
        transform: translateX(${ $open ? '-56px' : '100%' });
      `)}
`;

export const PanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const PanelHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #f2f7ff;
`;

export const ToolbarButton = styled.button`
  border: none;
  border-radius: 999px;
  background: rgba(55, 134, 255, 0.85);
  color: #fff;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(55, 134, 255, 1);
  }
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const PanelSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const PanelSectionTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #8ea0bd;
`;

export const PanelText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #9fb4d7;
`;

export const PanelList = styled.ul`
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #9fb4d7;
`;

export const PanelListItem = styled.li`
  line-height: 1.5;
`;

export const EmptyNote = styled.div`
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(14, 22, 34, 0.7);
  color: #8fa0be;
  padding: 1rem;
  font-size: 0.85rem;
  text-align: center;
`;

export const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.9rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
`;

export const SettingInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const SettingLabel = styled.span`
  font-weight: 600;
  color: #f4f8ff;
`;

export const SettingDescription = styled.span`
  font-size: 0.8rem;
  line-height: 1.4;
  color: #8faad0;
`;

export const SettingToggle = styled.button<{ $active: boolean }>`
  position: relative;
  width: 54px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(86, 156, 255, 0.85)' : 'rgba(255, 255, 255, 0.2)')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, rgba(70, 145, 255, 0.95), rgba(112, 184, 255, 0.95))'
    : 'rgba(10, 16, 24, 0.85)')};
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;

  &:focus-visible {
    outline: 2px solid rgba(120, 182, 255, 0.95);
    outline-offset: 3px;
  }
`;

export const ToggleThumb = styled.span<{ $active: boolean }>`
  position: absolute;
  top: 4px;
  left: ${({ $active }) => ($active ? 'calc(100% - 22px)' : '4px')};
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  transition: left 0.2s ease;
`;

export const MeasurementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

export const MeasurementItem = styled.div<{ $accent: string }>`
  border-radius: 12px;
  border: 1px solid ${({ $accent }) => `${$accent}3f`};
  background: ${({ $accent }) => `linear-gradient(145deg, rgba(12, 18, 30, 0.82), rgba(12, 18, 30, 0.92)), linear-gradient(145deg, ${$accent}1f, rgba(255, 255, 255, 0.03))`};
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  box-shadow: 0 16px 32px rgba(5, 10, 18, 0.35);
`;

export const MeasurementHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const MeasurementName = styled.span`
  font-weight: 600;
  font-size: 0.95rem;
  color: #f1f6ff;
`;

export const MeasurementBadge = styled.span<{ $accent: string }>`
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 600;
  background: ${({ $accent }) => `${$accent}33`};
  color: ${({ $accent }) => `${$accent}dd`};
  letter-spacing: 0.05em;
`;

export const MeasurementValue = styled.div<{ $accent: string }>`
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  font-family: 'Roboto Mono', 'SFMono-Regular', monospace;

  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${({ $accent }) => $accent};
    text-shadow: ${({ $accent }) => `0 0 22px ${$accent}55`};
  }

  .unit {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(223, 233, 255, 0.8);
    letter-spacing: 0.05em;
    text-transform: none;
  }
`;

export const MeasurementActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export const RemoveMeasurementButton = styled.button<{ $accent: string }>`
  border: none;
  border-radius: 999px;
  background: ${({ $accent }) => `${$accent}22`};
  color: ${({ $accent }) => `${$accent}dd`};
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: ${({ $accent }) => `${$accent}33`};
    color: ${({ $accent }) => `${$accent}ff`};
  }
`;

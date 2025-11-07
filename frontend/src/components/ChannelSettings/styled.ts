import styled from 'styled-components';

export const ChannelSettingsPanel = styled.form`
  margin-top: 0.7rem;
  padding: 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(118, 156, 238, 0.28);
  background: rgba(9, 14, 22, 0.96);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  backdrop-filter: blur(6px);
  width: 100%;
`;

export const ChannelSettingsField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #9fb4d7;
`;

export const ChannelTextInput = styled.input`
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(12, 18, 26, 0.85);
  color: #f0f6ff;
  padding: 0.4rem 0.65rem;
  font-size: 0.85rem;
  outline: none;

  &:focus {
    border-color: rgba(88, 143, 255, 0.85);
    box-shadow: 0 0 0 2px rgba(88, 143, 255, 0.25);
  }
`;

export const ChannelColorInput = styled.input`
  appearance: none;
  width: 100%;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  padding: 0;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border-radius: 6px;
    border: none;
  }
`;

export const ChannelSettingsActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

export const ChannelSettingsActionButton = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: inherit;
  font-weight: 600;
  padding: 0.4rem 1.1rem;
  cursor: pointer;
  font-size: 0.82rem;
  transition: background 0.2s ease, color 0.2s ease;

  ${({ $variant }) => ($variant === 'primary'
    ? `
      background: linear-gradient(135deg, rgba(54, 121, 255, 0.9), rgba(86, 143, 255, 0.9));
      color: #fff;
      border: none;
    `
    : '')}

  &:hover {
    background: ${({ $variant }) => ($variant === 'primary'
      ? 'linear-gradient(135deg, rgba(54, 121, 255, 1), rgba(86, 143, 255, 1))'
      : 'rgba(255, 255, 255, 0.12)')};
  }
`;

export const ChannelSettingsError = styled.div`
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 129, 0.4);
  background: rgba(255, 107, 129, 0.12);
  color: #ffb7c3;
  padding: 0.5rem 0.7rem;
  font-size: 0.8rem;
`;

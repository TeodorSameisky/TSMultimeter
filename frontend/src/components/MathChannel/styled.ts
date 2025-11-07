import styled from 'styled-components';

export const MathInputList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

export const MathInputRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.3rem 0.45rem;
  border-radius: 10px;
  background: rgba(18, 27, 46, 0.72);
  border: 1px solid rgba(108, 142, 203, 0.22);
`;

export const VariableBadge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: ${({ $color }) => ($color ? 'rgba(255, 255, 255, 0.06)' : 'rgba(88, 143, 255, 0.16)')};
  border: 2px solid ${({ $color }) => $color ?? 'rgba(88, 143, 255, 0.45)'};
  color: ${({ $color }) => $color ?? '#eef4ff'};
  font-weight: 600;
  font-size: 0.85rem;
`;

export const MathPreviewSurface = styled.div`
  margin-top: 0.35rem;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 16, 24, 0.75);
  min-height: 42px;
  display: flex;
  align-items: center;
`;

export const MathPreviewError = styled.div`
  margin-top: 0.3rem;
  color: #ff8787;
  font-size: 0.75rem;
  font-weight: 600;
`;

export const VariableAliasHint = styled.span`
  font-size: 0.75rem;
  color: rgba(197, 214, 241, 0.78);
`;

export const FieldLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

export const HelpToggleButton = styled.button<{ $active?: boolean }>`
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? 'rgba(62, 157, 255, 0.32)' : 'rgba(255, 255, 255, 0.08)')};
  color: #dbe7ff;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(62, 157, 255, 0.45)' : 'rgba(255, 255, 255, 0.14)')};
  }
`;

export const SyntaxHelpCard = styled.div`
  margin-top: 0.4rem;
  border-radius: 10px;
  border: 1px solid rgba(120, 159, 221, 0.24);
  background: rgba(20, 30, 48, 0.75);
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: #c8d9f7;
  font-size: 0.78rem;
  line-height: 1.4;
`;

export const SyntaxHelpTitle = styled.span`
  font-weight: 600;
  color: #e0e9ff;
  font-size: 0.82rem;
`;

export const SyntaxHelpList = styled.ul`
  margin: 0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

export const SyntaxHelpItem = styled.li`
  list-style: disc;
`;

export const SyntaxHelpCode = styled.code`
  font-family: 'Roboto Mono', 'SFMono-Regular', monospace;
  font-size: 0.75rem;
  color: #9fc4ff;
  white-space: normal;
  word-break: break-word;
`;

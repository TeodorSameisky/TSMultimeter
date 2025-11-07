import styled from 'styled-components';

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 15, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
  padding: 2rem;
`;

export const ModalCard = styled.div`
  width: min(420px, 100%);
  background: rgba(12, 19, 30, 0.96);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  color: #eef4ff;
  box-shadow: 0 28px 64px rgba(0, 0, 0, 0.45);
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

export const FormGroup = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #9fb2d0;
`;

export const Select = styled.select`
  background: rgba(10, 16, 24, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  color: inherit;
  font-size: 0.95rem;
  outline: none;

  &:focus {
    border-color: rgba(88, 143, 255, 0.85);
    box-shadow: 0 0 0 2px rgba(88, 143, 255, 0.25);
  }
`;

export const Input = styled.input`
  background: rgba(10, 16, 24, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  color: inherit;
  font-size: 0.95rem;
  outline: none;

  &:focus {
    border-color: rgba(88, 143, 255, 0.85);
    box-shadow: 0 0 0 2px rgba(88, 143, 255, 0.25);
  }
`;

export const TextArea = styled.textarea`
  background: rgba(10, 16, 24, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  color: inherit;
  font-size: 0.95rem;
  outline: none;
  min-height: 96px;
  resize: vertical;

  &:focus {
    border-color: rgba(88, 143, 255, 0.85);
    box-shadow: 0 0 0 2px rgba(88, 143, 255, 0.25);
  }
`;

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(54, 121, 255, 0.95), rgba(86, 143, 255, 0.95));
  color: #fff;
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: linear-gradient(135deg, rgba(54, 121, 255, 1), rgba(86, 143, 255, 1));
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const GhostButton = styled.button`
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: inherit;
  font-weight: 600;
  padding: 0.55rem 1rem;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

export const InlineGhostButton = styled(GhostButton)`
  padding: 0.35rem 0.6rem;
  font-size: 0.82rem;
`;

export const ErrorNote = styled.div`
  border-radius: 10px;
  border: 1px solid rgba(255, 107, 129, 0.4);
  background: rgba(255, 107, 129, 0.12);
  color: #ffb7c3;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
`;

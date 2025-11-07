import { memo } from 'react';
import { SyntaxHelpCard, SyntaxHelpList, SyntaxHelpItem, SyntaxHelpTitle, SyntaxHelpCode } from './styled';
import { MATH_CONSTANT_LABEL, MATH_FUNCTION_LABEL } from '../../utils/mathExpressions.ts';

type MathSyntaxHelpProps = {
  id?: string;
};

const MathSyntaxHelpComponent: React.FC<MathSyntaxHelpProps> = ({ id }) => (
  <SyntaxHelpCard id={id}>
    <SyntaxHelpTitle>Math syntax</SyntaxHelpTitle>
    <SyntaxHelpList>
      <SyntaxHelpItem>
        Variables <SyntaxHelpCode>a</SyntaxHelpCode> to <SyntaxHelpCode>h</SyntaxHelpCode> map to the selected device channels.
      </SyntaxHelpItem>
      <SyntaxHelpItem>
        Operators: <SyntaxHelpCode>+</SyntaxHelpCode>, <SyntaxHelpCode>-</SyntaxHelpCode>, <SyntaxHelpCode>*</SyntaxHelpCode>,
        {' '}<SyntaxHelpCode>/</SyntaxHelpCode>, parentheses, and <SyntaxHelpCode>**</SyntaxHelpCode> for powers. The preview renders
        {' '}<SyntaxHelpCode>*</SyntaxHelpCode> as <SyntaxHelpCode>\cdot</SyntaxHelpCode>.
      </SyntaxHelpItem>
      <SyntaxHelpItem>
        Functions: call <SyntaxHelpCode>Math.&lt;fn&gt;</SyntaxHelpCode>, for example <SyntaxHelpCode>Math.sin(a)</SyntaxHelpCode>.
        Available functions: <SyntaxHelpCode>{MATH_FUNCTION_LABEL}</SyntaxHelpCode>.
      </SyntaxHelpItem>
      <SyntaxHelpItem>
        Constants: access via <SyntaxHelpCode>Math.&lt;const&gt;</SyntaxHelpCode>, for example <SyntaxHelpCode>Math.PI</SyntaxHelpCode>.
        Available constants: <SyntaxHelpCode>{MATH_CONSTANT_LABEL}</SyntaxHelpCode>.
      </SyntaxHelpItem>
    </SyntaxHelpList>
  </SyntaxHelpCard>
);

export const MathSyntaxHelp = memo(MathSyntaxHelpComponent);

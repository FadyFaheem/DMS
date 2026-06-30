import type { ReactNode } from 'react';
import { Container } from '@react-three/uikit';
import { Card } from '@react-three/uikit-default';

// A centered modal over a dimmed backdrop. Click outside to close.
export default function Modal({
  children,
  width = 380,
  onClose,
}: {
  children: ReactNode;
  width?: number;
  onClose: () => void;
}) {
  return (
    <Container
      positionType="absolute"
      positionTop={0}
      positionLeft={0}
      positionRight={0}
      positionBottom={0}
      alignItems="center"
      justifyContent="center"
      pointerEvents="auto"
      onClick={onClose}
    >
      <Container
        positionType="absolute"
        positionTop={0}
        positionLeft={0}
        positionRight={0}
        positionBottom={0}
        backgroundColor="#000000"
        opacity={0.45}
      />
      <Card
        flexDirection="column"
        gap={10}
        padding={20}
        width={width}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </Card>
    </Container>
  );
}

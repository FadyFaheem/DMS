import type { ReactNode } from 'react';
import { Container, Text } from '@react-three/uikit';

// Standard scrollable layout for a full management screen: a title and a column
// of content. Used by every non-park screen.
export default function ScreenScaffold({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Container flexGrow={1} flexDirection="column" padding={16} gap={12} overflow="scroll">
      <Text fontSize={24} fontWeight="bold">
        {title}
      </Text>
      {children}
    </Container>
  );
}

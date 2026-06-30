import { Text } from '@react-three/uikit';
import { Card } from '@react-three/uikit-default';
import { BRAND_COLORS } from '../../theme/theme';

// Simple centered message card used for loading, errors, and not-yet-migrated
// screens.
export default function InfoPanel({ title, message }: { title: string; message?: string }) {
  return (
    <Card flexDirection="column" gap={8} padding={28} width={380}>
      <Text fontSize={20} fontWeight="bold">
        {title}
      </Text>
      {message != null && (
        <Text fontSize={14} color={BRAND_COLORS.mediumGray}>
          {message}
        </Text>
      )}
    </Card>
  );
}

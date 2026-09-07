import { StyleSheet, View, type ViewProps } from 'react-native';

import { cardShadow, colors, radii } from '../theme';

interface CardProps extends ViewProps {
  /** Removes the drop shadow for cards on a white background. */
  flat?: boolean;
  padded?: boolean;
}

export function Card({ flat, padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, padded && styles.padded, !flat && cardShadow, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
  },
  padded: { padding: 16 },
});

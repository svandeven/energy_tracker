import { Text as RNText, type TextProps, StyleSheet } from 'react-native';

import { colors, type } from '../theme';

type Variant = keyof typeof type;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** Text with the app's font stack applied — use this instead of RN's Text. */
export function Text({ variant = 'body', color, center, style, ...rest }: AppTextProps) {
  return (
    <RNText
      style={[
        type[variant],
        { color: color ?? colors.ink },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});

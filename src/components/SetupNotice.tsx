import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii } from '../theme';
import { Text } from './Text';

/** Shown when EXPO_PUBLIC_SUPABASE_* are missing, so the failure is self-explaining. */
export function SetupNotice() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Text variant="display">⚡</Text>
        </View>
        <Text variant="title" center>
          One setup step left
        </Text>
        <Text variant="body" color={colors.inkMuted} center style={styles.lead}>
          Energy Score needs your Supabase project before it can sign anyone in.
        </Text>

        <Step n={1} text="Create a free project at supabase.com." />
        <Step n={2} text="Open SQL Editor and run the contents of supabase/schema.sql." />
        <Step
          n={3}
          text="Copy .env.example to .env and paste in your Project URL and anon key (Project Settings → API)."
        />
        <Step n={4} text="Restart the dev server with `npx expo start --clear`." />

        <Text variant="caption" color={colors.inkFaint} center style={styles.footnote}>
          Full instructions, including Google and Apple sign-in, are in README.md.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text variant="label" color={colors.onMint}>
          {n}
        </Text>
      </View>
      <Text variant="small" style={styles.stepText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, paddingTop: 40, gap: 4 },
  badge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lead: { marginTop: 8, marginBottom: 24 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1 },
  footnote: { marginTop: 28 },
});

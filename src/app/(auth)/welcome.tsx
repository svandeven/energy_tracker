import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wordmark}>
        <Text variant="caption" style={styles.leaf}>
          🌿
        </Text>
        <Text variant="bodyStrong">Energy Score</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.ring} />
        <View style={styles.disc}>
          <Image
            source={require('../../../assets/images/welcome-illustration.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.copy}>
        <Text variant="title" center>
          Welcome to Energy Score
        </Text>
        <Text variant="body" color={colors.ink} center style={styles.lead}>
          Track daily energy in 5 quick check-ins.
        </Text>
        <Text variant="small" color={colors.inkMuted} center>
          Small moments, big clarity — feel your day flow.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Get started" onPress={() => router.push('/sign-in?mode=signup')} />
        <Button
          label="I already have an account"
          variant="secondary"
          onPress={() => router.push('/sign-in?mode=login')}
        />
        <View style={styles.privacy}>
          <Ionicons name="lock-closed" size={12} color={colors.teal} />
          <Text variant="caption" color={colors.inkMuted}>
            Your data stays private.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const DISC = 220;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 24 },
  wordmark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  leaf: { fontSize: 14, marginRight: 5 },
  hero: { alignItems: 'center', justifyContent: 'center', marginTop: 24, height: DISC + 40 },
  ring: {
    position: 'absolute',
    width: DISC + 40,
    height: DISC + 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.tealChip,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: 999,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // The asset is the mockup's mint disc cropped to its own bounds, so it fills
  // the container and the circular clip trims the leftover corner triangles.
  illustration: { width: '100%', height: '100%' },
  copy: { marginTop: 28 },
  lead: { marginTop: 12 },
  actions: { marginTop: 'auto', paddingBottom: 12, gap: 12 },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
});

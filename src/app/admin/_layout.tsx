import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, usePathname, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, radii } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';

/**
 * Web-only content admin for content editors and super admins. The admin
 * screens are an internal tool, so they stay in English and aren't themselves
 * translatable. Row-level security is what actually protects the data; this
 * gate only keeps people out of screens they couldn't use.
 */
export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const role = profile?.role;
  const allowed = role === 'content_editor' || role === 'super_admin';

  // Lift the phone-width frame that scripts/postexport-web.mjs puts on #root.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.classList.add('fettle-admin');
    return () => document.body.classList.remove('fettle-admin');
  }, []);

  const leave = () => router.replace('/settings');

  if (Platform.OS !== 'web') {
    return (
      <Notice
        title="Open this on the web"
        body="Content admin is available in a browser at fettle-life.com/admin."
        onBack={leave}
      />
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <Notice
        title="No access"
        body="Content admin is for content editors and super admins. Ask a super admin if you need access."
        onBack={leave}
      />
    );
  }

  const tabs = [
    { href: '/admin' as const, label: 'Text & translations' },
    ...(role === 'super_admin' ? [{ href: '/admin/users' as const, label: 'Users & roles' }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Text variant="heading">Sun Steps admin</Text>
          <View style={styles.tabs}>
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Pressable
                  key={tab.href}
                  onPress={() => router.replace(tab.href)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text variant="smallStrong" color={active ? colors.ink : colors.inkMuted}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={leave} accessibilityRole="link">
            <Text variant="smallStrong" color={colors.accent}>
              Back to app
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.body}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

function Notice({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <SafeAreaView style={[styles.safe, styles.centered]}>
      <View style={styles.notice}>
        <Text variant="heading" center>
          {title}
        </Text>
        <Text variant="small" color={colors.inkMuted} center>
          {body}
        </Text>
        <Button label="Back to settings" variant="secondary" onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}

const ADMIN_MAX_WIDTH = 1100;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { maxWidth: 420, padding: 24, gap: 14 },
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerInner: {
    width: '100%',
    maxWidth: ADMIN_MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  tabs: { flexDirection: 'row', gap: 6, flex: 1 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill },
  tabActive: { backgroundColor: colors.tint },
  body: { flex: 1 },
});

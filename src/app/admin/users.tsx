import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { AdminUserRow, UserRole } from '../../lib/database.types';
import { useAuth } from '../../providers/AuthProvider';

const DANGER = '#C4342B';
const MAX_WIDTH = 1100;

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: 'user', label: 'User', hint: 'Uses the app' },
  { value: 'content_editor', label: 'Content editor', hint: 'Edits text and translations' },
  { value: 'super_admin', label: 'Super admin', hint: 'Editor, plus manages roles' },
];

/**
 * Super admins hand out roles here. The database enforces the same rules
 * (super admins only, never your own role), so this screen can't be used to
 * get around them.
 */
export default function UsersScreen() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: loadError } = await supabase.rpc('admin_list_users');
    if (loadError) {
      setError(loadError.message);
      setUsers([]);
      return;
    }
    setUsers(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setRole = async (user: AdminUserRow, role: UserRole) => {
    if (role === user.role) return;
    setSavingId(user.id);
    setError(null);
    const { error: saveError } = await supabase.rpc('admin_set_role', {
      target: user.id,
      new_role: role,
    });
    setSavingId(null);
    if (saveError) {
      setError(`${user.email ?? 'User'}: ${saveError.message}`);
      return;
    }
    setUsers((prev) => prev?.map((u) => (u.id === user.id ? { ...u, role } : u)) ?? prev);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!users) return [];
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email ?? '').toLowerCase().includes(q) || (u.display_name ?? '').toLowerCase().includes(q),
    );
  }, [users, query]);

  if (profile?.role !== 'super_admin') {
    return (
      <View style={styles.centered}>
        <Text variant="body" color={colors.inkMuted}>
          Only super admins can manage roles.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <Text variant="title">Users & roles</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.lead}>
          Content editors can change the app’s text and translations. Super admins can do that and
          give other people roles. You can’t change your own role, so there is always a super admin
          left.
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by email or name…"
          placeholderTextColor={colors.inkFaint}
          style={styles.search}
        />

        {error && (
          <Text variant="small" color={DANGER} style={styles.error}>
            {error}
          </Text>
        )}

        {users == null ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <>
            <Text variant="caption" color={colors.inkMuted} style={styles.count}>
              {visible.length} of {users.length} accounts
            </Text>
            {visible.map((user) => {
              const isSelf = user.id === profile.id;
              return (
                <Card key={user.id} style={styles.row}>
                  <View style={styles.who}>
                    <Text variant="bodyStrong">{user.email ?? '(no email)'}</Text>
                    <Text variant="caption" color={colors.inkMuted}>
                      {user.display_name ?? '—'}
                      {isSelf ? ' · you' : ''}
                    </Text>
                  </View>
                  <View style={styles.roles}>
                    {ROLES.map((r) => {
                      const active = user.role === r.value;
                      return (
                        <Pressable
                          key={r.value}
                          onPress={() => void setRole(user, r.value)}
                          disabled={isSelf || savingId != null}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active, disabled: isSelf }}
                          accessibilityHint={r.hint}
                          style={[
                            styles.role,
                            active && styles.roleActive,
                            (isSelf || savingId === user.id) && styles.disabled,
                          ]}
                        >
                          <Text variant="caption" color={active ? colors.onTint : colors.inkMuted}>
                            {r.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 24, paddingHorizontal: 24 },
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  lead: { marginTop: 6, marginBottom: 18, maxWidth: 720 },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    maxWidth: 420,
  },
  error: { marginTop: 12 },
  loading: { marginTop: 32 },
  count: { marginTop: 14, marginBottom: 8 },
  row: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  who: { flex: 1, minWidth: 220 },
  roles: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.pill, padding: 3 },
  role: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  roleActive: { backgroundColor: colors.tint },
  disabled: { opacity: 0.5 },
});

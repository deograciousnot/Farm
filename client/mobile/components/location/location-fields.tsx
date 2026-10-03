import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { KENYA_COUNTIES } from '@/constants/counties';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LocationFieldsProps = {
  county: string;
  town: string;
  onChangeCounty: (county: string) => void;
  onChangeTown: (town: string) => void;
  countyLabel?: string;
  hint?: string;
  error?: string;
};

/** County picker plus an optional town. Counties make regional prices and advice possible. */
export function LocationFields({
  county,
  town,
  onChangeCounty,
  onChangeTown,
  countyLabel = 'County',
  hint,
  error,
}: LocationFieldsProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? KENYA_COUNTIES.filter((name) => name.toLowerCase().includes(search)) : KENYA_COUNTIES;
  }, [query]);

  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <AppText variant="label">{countyLabel}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={county ? `${countyLabel}: ${county}. Change` : `Choose ${countyLabel.toLowerCase()}`}
          onPress={() => setIsOpen(true)}
          style={[styles.select, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border }]}>
          <Feather name="map-pin" size={17} color={colors.textSubtle} />
          <AppText variant="body" color={county ? 'text' : 'textSubtle'} style={styles.selectText}>
            {county || 'Choose a county'}
          </AppText>
          <Feather name="chevron-down" size={18} color={colors.textSubtle} />
        </Pressable>
        {error ? (
          <AppText variant="caption" color="danger">
            {error}
          </AppText>
        ) : hint ? (
          <AppText variant="caption" color="textMuted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <TextField label="Town or village (optional)" value={town} onChangeText={onChangeTown} placeholder="e.g. Njoro" />

      <Sheet
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
          setQuery('');
        }}
        title="Choose a county"
        tall>
        <TextField value={query} onChangeText={setQuery} placeholder="Search counties" icon="search" autoFocus />
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item === county;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChangeCounty(item);
                  setIsOpen(false);
                  setQuery('');
                }}
                style={({ pressed }) => [styles.option, (pressed || isSelected) && { backgroundColor: colors.surfaceMuted }]}>
                <AppText variant="body" style={styles.selectText}>
                  {item}
                </AppText>
                {isSelected ? <Feather name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <AppText variant="callout" color="textMuted" style={styles.empty}>
              No county matches “{query}”.
            </AppText>
          }
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  field: { gap: 6 },
  select: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectText: { flex: 1 },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  empty: { padding: Spacing.md },
});

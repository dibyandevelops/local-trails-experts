import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type NavigationControlsProps = {
  followingUser: boolean;
  navigating: boolean;
  onFocusLocation: () => void;
  onShowEntireRoute: () => void;
};

export function NavigationControls({
  followingUser,
  navigating,
  onFocusLocation,
  onShowEntireRoute,
}: NavigationControlsProps) {
  return (
    <View style={styles.mapControls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={navigating ? 'Recenter and follow my location' : 'Jump to my location'}
        style={[styles.mapControl, followingUser && styles.mapControlActive]}
        onPress={onFocusLocation}
      >
        <Text style={[styles.mapControlIcon, followingUser && styles.mapControlIconActive]}>
          {followingUser ? '⌖' : '◎'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show the entire route"
        style={styles.mapControl}
        onPress={onShowEntireRoute}
      >
        <Text style={styles.mapControlIcon}>⌗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mapControls: { alignSelf: 'flex-end', gap: 9 },
  mapControl: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.15)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  mapControlActive: { borderColor: '#047857', backgroundColor: '#047857' },
  mapControlIcon: { color: '#16372a', fontSize: 27, fontWeight: '900', lineHeight: 30 },
  mapControlIconActive: { color: '#ffffff' },
});

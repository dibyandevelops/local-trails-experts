import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type NavigationControlsProps = {
  followingUser: boolean;
  navigating: boolean;
  showElevation?: boolean;
  onFocusLocation: () => void;
  onShowEntireRoute: () => void;
  onResetNorth?: () => void;
  onCycleMapStyle?: () => void;
  onToggleElevation?: () => void;
};

export function NavigationControls({
  followingUser,
  navigating,
  showElevation,
  onFocusLocation,
  onShowEntireRoute,
  onResetNorth,
  onCycleMapStyle,
  onToggleElevation,
}: NavigationControlsProps) {
  return (
    <View style={styles.mapControls}>
      {onCycleMapStyle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch map style"
          style={styles.mapControl}
          onPress={onCycleMapStyle}
        >
          <Text style={styles.mapControlSmallIcon}>☵</Text>
        </Pressable>
      ) : null}

      {onToggleElevation ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle elevation profile"
          style={[styles.mapControl, showElevation && styles.mapControlActive]}
          onPress={onToggleElevation}
        >
          <Text style={[styles.mapControlSmallIcon, showElevation && styles.mapControlIconActive]}>
            ▲
          </Text>
        </Pressable>
      ) : null}

      {onResetNorth ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset compass to North"
          style={styles.mapControl}
          onPress={onResetNorth}
        >
          <Text style={styles.mapControlCompass}>N</Text>
        </Pressable>
      ) : null}

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
    width: 46,
    height: 46,
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
  mapControlIcon: { color: '#16372a', fontSize: 26, fontWeight: '900', lineHeight: 28 },
  mapControlSmallIcon: { color: '#16372a', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  mapControlCompass: { color: '#047857', fontSize: 16, fontWeight: '900' },
  mapControlIconActive: { color: '#ffffff' },
});

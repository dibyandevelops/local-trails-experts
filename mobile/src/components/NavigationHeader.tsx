import React from 'react';
import {
  Pressable,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NavigationTrail } from '../types';

type NavigationHeaderProps = {
  trail: NavigationTrail;
  mapError?: string;
  onReturnToMenu?: () => void;
  onShareTrail?: () => void;
};

export function NavigationHeader({
  trail,
  mapError,
  onReturnToMenu,
  onShareTrail,
}: NavigationHeaderProps) {
  return (
    <View style={styles.topPanel}>
      <View style={styles.headerRow}>
        {onReturnToMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to main menu"
            style={styles.backButton}
            onPress={onReturnToMenu}
          >
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
        ) : null}

        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.trailName}>
            {trail.name}
          </Text>
          <Text numberOfLines={1} style={styles.locationText}>
            {trail.location}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {onShareTrail ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share trail"
              style={styles.headerActionButton}
              onPress={onShareTrail}
            >
              <Text style={styles.headerActionIcon}>⇪</Text>
            </Pressable>
          ) : null}

          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>
              {trail.source === 'gpx' ? 'GPX' : trail.difficulty}
            </Text>
          </View>
        </View>
      </View>
      {mapError ? <Text style={styles.mapError}>{mapError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    marginTop: (NativeStatusBar.currentHeight || 0) + 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    backgroundColor: 'rgba(7, 23, 17, 0.92)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#102c21',
  },
  backButtonText: { color: '#a7f3d0', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  headerText: { flex: 1, gap: 2 },
  trailName: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  locationText: { color: '#a8bdb2', fontSize: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActionButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#102c21',
  },
  headerActionIcon: { color: '#a7f3d0', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  difficultyBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#174d39',
  },
  difficultyText: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  mapError: { marginTop: 8, color: '#fecaca', fontSize: 12 },
});

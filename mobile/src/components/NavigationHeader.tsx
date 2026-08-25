import React from 'react';
import { StatusBar as NativeStatusBar, StyleSheet, Text, View } from 'react-native';
import type { NavigationTrail } from '../types';

type NavigationHeaderProps = {
  trail: NavigationTrail;
  mapError?: string;
};

export function NavigationHeader({ trail, mapError }: NavigationHeaderProps) {
  return (
    <View style={styles.topPanel}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.trailName}>
            {trail.name}
          </Text>
          <Text numberOfLines={1} style={styles.locationText}>
            {trail.location}
          </Text>
        </View>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>
            {trail.source === 'gpx' ? 'GPX' : trail.difficulty}
          </Text>
        </View>
      </View>
      {mapError ? <Text style={styles.mapError}>{mapError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    marginTop: (NativeStatusBar.currentHeight || 0) + 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    backgroundColor: 'rgba(7, 23, 17, 0.9)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 3 },
  trailName: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  locationText: { color: '#a8bdb2', fontSize: 12 },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#174d39',
  },
  difficultyText: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  mapError: { marginTop: 9, color: '#fecaca', fontSize: 12 },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ElevationMetrics } from '../types';

type ElevationProfilePanelProps = {
  metrics: ElevationMetrics;
  onClose?: () => void;
};

export function ElevationProfilePanel({ metrics }: ElevationProfilePanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ELEVATION & CLIMB PROFILE</Text>
      </View>
      <View style={styles.grid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>GAIN</Text>
          <Text style={styles.metricValue}>+{metrics.gainM} m</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>DESCENT</Text>
          <Text style={styles.metricValue}>-{metrics.lossM} m</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PEAK</Text>
          <Text style={styles.metricValue}>{metrics.maxAltitudeM} m</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>BASE</Text>
          <Text style={styles.metricValue}>{metrics.minAltitudeM} m</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(7, 23, 17, 0.94)',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    color: '#81988c',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
});

import React from 'react';
import { Linking as NativeLinking, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance } from '../hooks/useTrailNavigation';
import type { NavigationTrail } from '../types';

type NavigationHudProps = {
  trail: NavigationTrail;
  navigating: boolean;
  remainingM: number;
  offRouteM: number;
  distanceM: number;
  speedMps: number | null;
  accuracyM: number | null;
  progressPercent: number;
  navigationMessage: string;
  offlineStatus: string;
  offRouteThresholdM: number;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onGuideBackToRoute: () => void;
  onDownloadOfflineMap: () => void;
};

export function NavigationHud({
  trail,
  navigating,
  remainingM,
  offRouteM,
  distanceM,
  speedMps,
  accuracyM,
  progressPercent,
  navigationMessage,
  offlineStatus,
  offRouteThresholdM,
  onStartNavigation,
  onStopNavigation,
  onGuideBackToRoute,
  onDownloadOfflineMap,
}: NavigationHudProps) {
  return (
    <View style={styles.navPanel}>
      {navigating ? (
        <>
          <View style={[styles.guidanceCard, offRouteM > offRouteThresholdM && styles.guidanceWarning]}>
            <Text style={styles.guidanceEyebrow}>
              {remainingM <= 40 ? 'ARRIVING' : offRouteM > offRouteThresholdM ? 'OFF ROUTE' : 'NAVIGATING'}
            </Text>
            <Text style={styles.guidanceText}>{navigationMessage}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.metrics}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>REMAINING</Text>
              <Text style={styles.metricValue}>{formatDistance(remainingM)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>SPEED</Text>
              <Text style={styles.metricValue}>
                {speedMps == null ? '—' : `${(speedMps * 3.6).toFixed(1)}`}
                {speedMps == null ? '' : <Text style={styles.metricUnit}> km/h</Text>}
              </Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>GPS</Text>
              <Text style={[styles.metricValue, accuracyM != null && accuracyM > 30 && styles.warning]}>
                {accuracyM == null ? '—' : `±${Math.round(accuracyM)} m`}
              </Text>
            </View>
          </View>
          <View style={styles.navigationFooter}>
            <Text style={styles.travelledText}>{formatDistance(distanceM)} travelled</Text>
            <View style={styles.navigationActions}>
              {offRouteM > offRouteThresholdM ? (
                <Pressable style={styles.guideButton} onPress={onGuideBackToRoute}>
                  <Text style={styles.guideButtonText}>Guide back</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.stopButton} onPress={onStopNavigation}>
                <Text style={styles.stopButtonText}>End</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.metrics}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricValue}>{trail.distance_km || '—'} km</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>CLIMB</Text>
              <Text style={styles.metricValue}>{trail.elevation_gain_m || '—'} m</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>OFFLINE</Text>
              <Text style={styles.metricSmall}>{offlineStatus}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save map offline"
              style={styles.iconButton}
              onPress={onDownloadOfflineMap}
            >
              <Text style={styles.iconButtonText}>⇣</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onStartNavigation}>
              <Text style={styles.buttonText}>Start navigation</Text>
            </Pressable>
          </View>
          {trail.komoot_url ? (
            <Pressable onPress={() => NativeLinking.openURL(trail.komoot_url!)}>
              <Text style={styles.komootLink}>Open in Komoot</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navPanel: {
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(7, 23, 17, 0.94)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  guidanceCard: { gap: 3, padding: 12, borderRadius: 12, backgroundColor: '#123b2d' },
  guidanceWarning: { backgroundColor: '#713f12' },
  guidanceEyebrow: { color: '#6ee7b7', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  guidanceText: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  progressTrack: { height: 5, overflow: 'hidden', borderRadius: 999, backgroundColor: '#29463a' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#2dd4bf' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metricBlock: { flex: 1, gap: 2 },
  metricLabel: { color: '#81988c', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  metricValue: { color: '#f8fafc', fontSize: 19, fontWeight: '900' },
  metricUnit: { color: '#9fb0a7', fontSize: 10, fontWeight: '700' },
  metricSmall: { color: '#d8e5de', fontSize: 11, fontWeight: '700' },
  warning: { color: '#fbbf24' },
  actions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 52,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2c6851',
    borderRadius: 14,
    backgroundColor: '#102c21',
  },
  iconButtonText: { color: '#a7f3d0', fontSize: 25, fontWeight: '900', lineHeight: 28 },
  button: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#047857',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  navigationFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  navigationActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  travelledText: { color: '#a8bdb2', fontSize: 12, fontWeight: '700' },
  guideButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#f59e0b',
  },
  guideButtonText: { color: '#111827', fontSize: 13, fontWeight: '900' },
  stopButton: {
    minWidth: 76,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#991b1b',
  },
  stopButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  komootLink: { color: '#9fb0a7', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

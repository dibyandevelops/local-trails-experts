import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  UserLocation,
} from '@maplibre/maplibre-react-native';

const MAP_IMAGES = {
  'route-arrow': require('../../assets/route-arrow.png'),
  'user-pointer': require('../../assets/user-pointer.png'),
};

type TrailMapProps = {
  trailId: string;
  mapStyleUrl: string;
  cameraRef: React.RefObject<CameraRef | null>;
  bounds: [number, number, number, number];
  routePadding: { top: number; right: number; bottom: number; left: number };
  followingUser: boolean;
  navigating: boolean;
  mapLoaded: boolean;
  routeShape: any;
  routeDirectionArrowsShape?: any;
  userLocationShape?: any;
  completedRouteShape: any;
  shouldShowRerouteGuide: boolean;
  rerouteGuideShape: any;
  rerouteTargetShape?: any;
  routeEndpointsShape: any;
  onMapLoaded: () => void;
  onMapError: (error: string) => void;
  onRegionWillChange: (event: any) => void;
};

export function TrailMap({
  trailId,
  mapStyleUrl,
  cameraRef,
  bounds,
  routePadding,
  followingUser,
  navigating,
  mapLoaded,
  routeShape,
  routeDirectionArrowsShape,
  userLocationShape,
  completedRouteShape,
  shouldShowRerouteGuide,
  rerouteGuideShape,
  rerouteTargetShape,
  routeEndpointsShape,
  onMapLoaded,
  onMapError,
  onRegionWillChange,
}: TrailMapProps) {
  const [west, south, east, north] = bounds;

  return (
    <View style={styles.container}>
      <Map
        key={trailId}
        style={styles.map}
        mapStyle={mapStyleUrl}
        androidView="texture"
        compass
        scaleBar
        attribution
        logo={false}
        preferredFramesPerSecond={navigating ? 60 : 30}
        compassPosition={{ top: 100, right: 16 }}
        attributionPosition={{ bottom: 8, left: 8 }}
        scaleBarPosition={{ top: 96, left: 16 }}
        onRegionWillChange={onRegionWillChange}
        onDidFailLoadingMap={() =>
          onMapError('Map tiles could not be loaded. Your route is still available.')
        }
        onDidFinishLoadingMap={onMapLoaded}
      >
        <Images images={MAP_IMAGES} />

        <Camera
          ref={cameraRef}
          initialViewState={{
            bounds: [west, south, east, north],
            padding: routePadding,
          }}
        />

        <GeoJSONSource id="trail-route" data={routeShape}>
          <Layer
            id="trail-route-casing"
            type="line"
            paint={{ 'line-color': '#052e24', 'line-width': 9, 'line-opacity': 0.9 }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          <Layer
            id="trail-route-line"
            type="line"
            paint={{ 'line-color': '#2dd4bf', 'line-width': 5.5 }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>

        {routeDirectionArrowsShape ? (
          <GeoJSONSource id="route-direction-arrows" data={routeDirectionArrowsShape}>
            <Layer
              id="route-direction-symbols"
              type="symbol"
              layout={{
                'icon-image': 'route-arrow',
                'icon-size': 0.35,
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {navigating ? (
          <GeoJSONSource id="completed-route" data={completedRouteShape}>
            <Layer
              id="completed-route-line"
              type="line"
              paint={{ 'line-color': '#f8fafc', 'line-width': 3, 'line-opacity': 0.9 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        ) : null}

        {shouldShowRerouteGuide ? (
          <>
            <GeoJSONSource id="reroute-guide" data={rerouteGuideShape}>
              <Layer
                id="reroute-guide-casing"
                type="line"
                paint={{
                  'line-color': '#111827',
                  'line-width': 7,
                  'line-opacity': 0.75,
                  'line-dasharray': [0.8, 0.7],
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
              <Layer
                id="reroute-guide-line"
                type="line"
                paint={{
                  'line-color': '#fbbf24',
                  'line-width': 4.5,
                  'line-dasharray': [0.8, 0.7],
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </GeoJSONSource>

            {rerouteTargetShape ? (
              <GeoJSONSource id="reroute-target" data={rerouteTargetShape}>
                <Layer
                  id="reroute-target-pulse"
                  type="circle"
                  paint={{
                    'circle-radius': 13,
                    'circle-color': '#fbbf24',
                    'circle-opacity': 0.35,
                  }}
                />
                <Layer
                  id="reroute-target-center"
                  type="circle"
                  paint={{
                    'circle-radius': 6.5,
                    'circle-color': '#f59e0b',
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 2.5,
                  }}
                />
              </GeoJSONSource>
            ) : null}
          </>
        ) : null}

        <GeoJSONSource id="route-endpoints" data={routeEndpointsShape}>
          <Layer
            id="route-start"
            type="circle"
            filter={['==', ['get', 'kind'], 'start']}
            paint={{
              'circle-radius': 7,
              'circle-color': '#ffffff',
              'circle-stroke-color': '#059669',
              'circle-stroke-width': 4,
            }}
          />
          <Layer
            id="route-finish"
            type="circle"
            filter={['==', ['get', 'kind'], 'finish']}
            paint={{
              'circle-radius': 7,
              'circle-color': '#0f172a',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 4,
            }}
          />
        </GeoJSONSource>

        {userLocationShape ? (
          <GeoJSONSource id="custom-user-location" data={userLocationShape}>
            <Layer
              id="user-location-accuracy-ring"
              type="circle"
              paint={{
                'circle-radius': ['max', 15, ['get', 'accuracyRadius']],
                'circle-color': '#34d399',
                'circle-opacity': 0.18,
                'circle-stroke-color': '#059669',
                'circle-stroke-width': 1,
                'circle-stroke-opacity': 0.4,
              }}
            />
            <Layer
              id="user-location-puck-body"
              type="circle"
              paint={{
                'circle-radius': 11,
                'circle-color': '#047857',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 3,
              }}
            />
            <Layer
              id="user-location-direction-chevron"
              type="symbol"
              layout={{
                'icon-image': 'user-pointer',
                'icon-size': 0.55,
                'icon-rotate': ['get', 'heading'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-offset': [0, -12],
              }}
            />
          </GeoJSONSource>
        ) : (
          <UserLocation animated accuracy heading minDisplacement={1} />
        )}
      </Map>

      {!mapLoaded ? (
        <View pointerEvents="none" style={styles.mapLoading}>
          <ActivityIndicator color="#047857" />
          <Text style={styles.mapLoadingText}>Loading map</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  mapLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#e7efe8',
  },
  mapLoadingText: { color: '#16372a', fontSize: 13, fontWeight: '800' },
});

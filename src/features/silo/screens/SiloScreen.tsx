import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  useWindowDimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Polygon,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { SiloSvg } from '../components/SiloSvg';
import { SiloScreenProps } from '../types';

export function SiloScreen({ onBack }: SiloScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Responsive container sizing: Fits full silo (356 x 810) inside any screen viewport
  const headerHeight = 52;
  const metricsHeight = 62;
  const footerHeight = 44;
  const verticalPadding = insets.top + insets.bottom + 20;

  const maxCanvasHeight = height - headerHeight - metricsHeight - footerHeight - verticalPadding;
  const maxCanvasWidth = width - 32;

  // Preserve 356:810 aspect ratio matching solo.svg
  let imgHeight = maxCanvasHeight;
  let imgWidth = (imgHeight * 356) / 810;

  if (imgWidth > maxCanvasWidth) {
    imgWidth = maxCanvasWidth;
    imgHeight = (imgWidth * 810) / 356;
  }

  // Exact scale factor mapping solo.svg (356 x 810) to rendered screen pixels
  const scale = imgWidth / 356;

  // Exact Silo Geometric Reference Points
  const cx = 178 * scale;
  const siloRoofTopY = 12.4 * scale; // Top cap of roof
  const siloRoofBaseY = 152.2 * scale; // Cylinder shoulder
  const topCapHalfW = (72.2 * scale) / 2;
  const shoulderHalfW = (348.6 * scale) / 2;
  const chuteHalfW = (76.5 * scale) / 2;
  const siloLeftX = 2.84 * scale;
  const siloRightX = 351.5 * scale;
  const siloCylinderBottomY = 417 * scale; // Cylinder bottom / hopper joint
  const siloHopperBottomY = 682 * scale; // Bottom hopper discharge chute
  const chuteLeftX = 139.28 * scale;
  const chuteRightX = 215.75 * scale;

  // Total container capacity in Liters
  const MAX_CAPACITY_LITERS = 25000;

  // Helper to get container boundary at any height Y
  const getContainerBoundAtY = (y: number) => {
    let halfW = shoulderHalfW;
    if (y < siloRoofBaseY) {
      const t = (y - siloRoofTopY) / Math.max(1, siloRoofBaseY - siloRoofTopY);
      halfW = topCapHalfW + t * (shoulderHalfW - topCapHalfW);
    } else if (y > siloCylinderBottomY) {
      const t = (y - siloCylinderBottomY) / Math.max(1, siloHopperBottomY - siloCylinderBottomY);
      halfW = shoulderHalfW - t * (shoulderHalfW - chuteHalfW);
    }
    return { left: cx - halfW, right: cx + halfW };
  };

  // 1. P3 (Center Point): Can move ANYWHERE inside the entire container (never outside)
  const clampCenterDot = (rawX: number, rawY: number) => {
    const y = Math.max(siloRoofTopY, Math.min(siloHopperBottomY, rawY));
    const bound = getContainerBoundAtY(y);
    const x = Math.max(bound.left, Math.min(bound.right, rawX));
    return { x, y };
  };

  // 2. P1 (Right Point): LOCKED TO THE RIGHT BORDER LINE (moves only along the right contour wall)
  const clampP1OnRightBorder = (rawY: number) => {
    const y = Math.max(siloRoofTopY, Math.min(siloHopperBottomY, rawY));
    const bound = getContainerBoundAtY(y);
    return { x: bound.right, y };
  };

  // 3. P2 (Left Point): LOCKED TO THE LEFT BORDER LINE (moves only along the left contour wall)
  const clampP2OnLeftBorder = (rawY: number) => {
    const y = Math.max(siloRoofTopY, Math.min(siloHopperBottomY, rawY));
    const bound = getContainerBoundAtY(y);
    return { x: bound.left, y };
  };

  // Initial 3 Points
  const [p1, setP1] = useState(clampP1OnRightBorder(siloRoofBaseY + 50 * scale));
  const [p2, setP2] = useState(clampP2OnLeftBorder(siloRoofBaseY + 50 * scale));
  const [p3, setP3] = useState(clampCenterDot(cx, siloRoofBaseY - 20 * scale));

  const [activePoint, setActivePoint] = useState<number | null>(null);

  // Drag start anchors
  const startP1Y = useRef(p1.y);
  const startP2Y = useRef(p2.y);
  const startP3 = useRef(p3);

  // Spring scale animations for active handles
  const scaleP1 = useRef(new Animated.Value(1)).current;
  const scaleP2 = useRef(new Animated.Value(1)).current;
  const scaleP3 = useRef(new Animated.Value(1)).current;

  // Pulse animation for idle handles
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const animateScale = (anim: Animated.Value, toValue: number) => {
    Animated.spring(anim, {
      toValue,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  // Dot 1 (P1 - Right Border Handle): Glides strictly along the right container border line
  const panP1 = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActivePoint(1);
        startP1Y.current = p1.y;
        animateScale(scaleP1, 1.35);
      },
      onPanResponderMove: (_, gs) => {
        const rawY = startP1Y.current + gs.dy;
        setP1(clampP1OnRightBorder(rawY));
      },
      onPanResponderRelease: () => {
        setActivePoint(null);
        animateScale(scaleP1, 1);
      },
      onPanResponderTerminate: () => {
        setActivePoint(null);
        animateScale(scaleP1, 1);
      },
    })
  ).current;

  // Dot 2 (P2 - Left Border Handle): Glides strictly along the left container border line
  const panP2 = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActivePoint(2);
        startP2Y.current = p2.y;
        animateScale(scaleP2, 1.35);
      },
      onPanResponderMove: (_, gs) => {
        const rawY = startP2Y.current + gs.dy;
        setP2(clampP2OnLeftBorder(rawY));
      },
      onPanResponderRelease: () => {
        setActivePoint(null);
        animateScale(scaleP2, 1);
      },
      onPanResponderTerminate: () => {
        setActivePoint(null);
        animateScale(scaleP2, 1);
      },
    })
  ).current;

  // Dot 3 (P3 - Center / Apex Red Dot): Moves ANYWHERE in 2D space inside the container
  const panP3 = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActivePoint(3);
        startP3.current = { ...p3 };
        animateScale(scaleP3, 1.35);
      },
      onPanResponderMove: (_, gs) => {
        const rawX = startP3.current.x + gs.dx;
        const rawY = startP3.current.y + gs.dy;
        setP3(clampCenterDot(rawX, rawY));
      },
      onPanResponderRelease: () => {
        setActivePoint(null);
        animateScale(scaleP3, 1);
      },
      onPanResponderTerminate: () => {
        setActivePoint(null);
        animateScale(scaleP3, 1);
      },
    })
  ).current;

  // Calculate Live Telemetry
  const avgSurfaceY = (p1.y + p2.y + p3.y) / 3;
  const totalContainerHeight = siloHopperBottomY - siloRoofTopY;
  const waterHeight = Math.max(0, siloHopperBottomY - avgSurfaceY);

  const fillPercentage = Math.min(100, Math.max(0, (waterHeight / totalContainerHeight) * 100));
  const currentVolumeLiters = Math.round((fillPercentage / 100) * MAX_CAPACITY_LITERS);
  const currentTons = (currentVolumeLiters / 1000).toFixed(2);
  const widthPx = Math.round(Math.abs(p1.x - p2.x));
  const heightPx = Math.round(Math.abs(p3.y - (p1.y + p2.y) / 2));

  // Determine whether P3 is forming an upper peak or a lower funnel
  const isP3Peak = p3.y <= Math.max(p1.y, p2.y);

  // Dynamic Wall-to-Wall Liquid Polygon that ALWAYS covers up to P3
  const buildWaterPolygon = () => {
    const pts: string[] = [];

    // 1. Water / Material surface: P2 (left border) -> P3 (apex) -> P1 (right border)
    pts.push(`${p2.x},${p2.y}`);
    pts.push(`${p3.x},${p3.y}`);
    pts.push(`${p1.x},${p1.y}`);

    // 2. Right boundary of container below p1.y
    if (p1.y < siloRoofBaseY) {
      pts.push(`${siloRightX},${siloRoofBaseY}`);
    }
    if (p1.y < siloCylinderBottomY) {
      pts.push(`${siloRightX},${siloCylinderBottomY}`);
    }
    pts.push(`${chuteRightX},${siloHopperBottomY}`);

    // 3. Bottom chute
    pts.push(`${chuteLeftX},${siloHopperBottomY}`);

    // 4. Left boundary of container below p2.y
    if (p2.y < siloCylinderBottomY) {
      pts.push(`${siloLeftX},${siloCylinderBottomY}`);
    }
    if (p2.y < siloRoofBaseY) {
      pts.push(`${siloLeftX},${siloRoofBaseY}`);
    }

    return pts.join(' ');
  };

  const liquidPolygonPoints = buildWaterPolygon();

  // Inverted Sensor Radar Cone (when P3 is at bottom funnel)
  const sensorConePoints = isP3Peak
    ? `${p2.x},${p2.y} ${p3.x},${p3.y} ${p1.x},${p1.y}`
    : `${p2.x},${p2.y} ${p1.x},${p1.y} ${p3.x},${p3.y}`;

  // Complete Container Perimeter Outline
  const fullContainerOutlinePoints = [
    `${cx - topCapHalfW},${siloRoofTopY}`,
    `${cx + topCapHalfW},${siloRoofTopY}`,
    `${siloRightX},${siloRoofBaseY}`,
    `${siloRightX},${siloCylinderBottomY}`,
    `${chuteRightX},${siloHopperBottomY}`,
    `${chuteLeftX},${siloHopperBottomY}`,
    `${siloLeftX},${siloCylinderBottomY}`,
    `${siloLeftX},${siloRoofBaseY}`,
  ].join(' ');

  const handleReset = () => {
    setP1(clampP1OnRightBorder(siloRoofBaseY + 50 * scale));
    setP2(clampP2OnLeftBorder(siloRoofBaseY + 50 * scale));
    setP3(clampCenterDot(cx, siloRoofBaseY - 20 * scale));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Container Water Sensor</Text>
          <Text style={styles.headerSub}>P1 • P2 Border • P3 2D Sensor</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Live Volume Telemetry HUD */}
      <View style={styles.metricsCard}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>WATER VOLUME</Text>
          <Text style={styles.metricValue}>
            {currentVolumeLiters.toLocaleString()} <Text style={styles.metricUnit}>L</Text>
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>FILL CAPACITY</Text>
          <Text style={[styles.metricValue, styles.metricValueYellow]}>
            {fillPercentage.toFixed(1)} <Text style={styles.metricUnit}>%</Text>
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>MASS WEIGHT</Text>
          <Text style={styles.metricValue}>
            {currentTons} <Text style={styles.metricUnit}>T</Text>
          </Text>
        </View>
      </View>

      {/* Main Silo Canvas Area */}
      <View style={styles.canvasArea}>
        <View style={[styles.siloContainer, { width: imgWidth, height: imgHeight }]}>
          {/* Pure Vector Silo Graphic */}
          <SiloSvg width={imgWidth} height={imgHeight} />

          {/* SVG Overlay */}
          <Svg style={StyleSheet.absoluteFill} width={imgWidth} height={imgHeight}>
            <Defs>
              <LinearGradient id="waterYellow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FEF9C3" stopOpacity="0.82" />
                <Stop offset="50%" stopColor="#FEF08A" stopOpacity="0.75" />
                <Stop offset="100%" stopColor="#FACC15" stopOpacity="0.78" />
              </LinearGradient>
              <LinearGradient id="sensorConeGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.65" />
                <Stop offset="100%" stopColor="#64748B" stopOpacity="0.70" />
              </LinearGradient>
            </Defs>

            {/* Red Perimeter Silhouette Outline */}
            <Polygon
              points={fullContainerOutlinePoints}
              fill="none"
              stroke="#EF4444"
              strokeWidth={2.5 * Math.max(0.8, scale)}
              strokeLinejoin="round"
            />

            {/* Dynamic Wall-to-Wall Liquid Yellow Fill */}
            <Polygon
              points={liquidPolygonPoints}
              fill="url(#waterYellow)"
              stroke="#CA8A04"
              strokeWidth={1.5 * Math.max(0.8, scale)}
              strokeLinejoin="round"
            />

            {/* Inverted Funnel Radar Cone (when P3 is lower than surface) */}
            {!isP3Peak && (
              <Polygon
                points={sensorConePoints}
                fill="url(#sensorConeGrad)"
                stroke="#334155"
                strokeWidth={1.5}
              />
            )}

            {/* Connecting Surface Triangle Line */}
            <Polygon
              points={`${p2.x},${p2.y} ${p3.x},${p3.y} ${p1.x},${p1.y}`}
              fill="none"
              stroke="#334155"
              strokeWidth={1.5}
            />

            {/* Horizontal Reference Bar */}
            <Rect
              x={siloLeftX}
              y={siloRoofBaseY + 6 * scale}
              width={siloRightX - siloLeftX}
              height={4 * scale}
              fill="rgba(226, 232, 240, 0.9)"
            />

            {/* Right Vertical Reference Bar */}
            <Line
              x1={siloRightX + 10 * scale}
              y1={siloRoofBaseY}
              x2={siloRightX + 10 * scale}
              y2={siloRoofBaseY + 160 * scale}
              stroke="#CBD5E1"
              strokeWidth={3.5 * scale}
              strokeLinecap="round"
            />

            {/* Width Dimension Indicator Line */}
            <Line
              x1={p2.x}
              y1={Math.min(p1.y, p2.y, p3.y) - 10 * scale}
              x2={p1.x}
              y2={Math.min(p1.y, p2.y, p3.y) - 10 * scale}
              stroke="#0F172A"
              strokeWidth={1.2}
            />

            {/* Height Dimension Indicator Bar */}
            <Line
              x1={siloRightX + 6 * scale}
              y1={Math.min(p1.y, p2.y, p3.y)}
              x2={siloRightX + 6 * scale}
              y2={Math.max(p1.y, p2.y, p3.y)}
              stroke="#0F172A"
              strokeWidth={2.5}
            />
          </Svg>

          {/* Dimension Text Labels */}
          <View
            style={[
              styles.dimensionLabelBox,
              {
                left: cx - 40,
                top: Math.min(p1.y, p2.y, p3.y) - 24 * scale,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.dimensionText}>{widthPx} px</Text>
          </View>

          <View
            style={[
              styles.heightLabelBox,
              {
                left: siloRightX + 10 * scale,
                top: (Math.min(p1.y, p2.y, p3.y) + Math.max(p1.y, p2.y, p3.y)) / 2 - 12,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.heightText}>{heightPx} px</Text>
          </View>

          {/* Red Dot 1 (P1: Moves ONLY along the Right Border Line) */}
          <View
            style={[
              styles.handleTouchTarget,
              {
                left: p1.x - 24,
                top: p1.y - 24,
              },
            ]}
            {...panP1.panHandlers}
          >
            <Animated.View
              style={[
                styles.handleDot,
                activePoint === 1 && styles.handleDotActive,
                { transform: [{ scale: activePoint === 1 ? scaleP1 : pulseAnim }] },
              ]}
            >
              <Text style={styles.dotLabelText}>P1</Text>
            </Animated.View>
          </View>

          {/* Red Dot 2 (P2: Moves ONLY along the Left Border Line) */}
          <View
            style={[
              styles.handleTouchTarget,
              {
                left: p2.x - 24,
                top: p2.y - 24,
              },
            ]}
            {...panP2.panHandlers}
          >
            <Animated.View
              style={[
                styles.handleDot,
                activePoint === 2 && styles.handleDotActive,
                { transform: [{ scale: activePoint === 2 ? scaleP2 : pulseAnim }] },
              ]}
            >
              <Text style={styles.dotLabelText}>P2</Text>
            </Animated.View>
          </View>

          {/* Red Dot 3 (P3: Moves ANYWHERE in 2D space inside the container) */}
          <View
            style={[
              styles.handleTouchTarget,
              {
                left: p3.x - 24,
                top: p3.y - 24,
              },
            ]}
            {...panP3.panHandlers}
          >
            <Animated.View
              style={[
                styles.handleDot,
                activePoint === 3 && styles.handleDotActive,
                { transform: [{ scale: activePoint === 3 ? scaleP3 : pulseAnim }] },
              ]}
            >
              <Text style={styles.dotLabelText}>P3</Text>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Bottom Hint */}
      <View style={styles.footerBar}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>
          P1 locked to right border • P2 locked to left border • P3 moves anywhere inside.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  backArrow: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    marginRight: 4,
  },
  backText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  resetText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricColumn: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricValueYellow: {
    color: '#EAB308',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  canvasArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  siloContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimensionLabelBox: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
    zIndex: 10,
  },
  dimensionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  heightLabelBox: {
    position: 'absolute',
    transform: [{ rotate: '90deg' }],
    zIndex: 10,
  },
  heightText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  handleTouchTarget: {
    position: 'absolute',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  handleDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 6,
  },
  handleDotActive: {
    backgroundColor: '#DC2626',
    borderColor: '#FEF08A',
    borderWidth: 2.5,
  },
  dotLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EAB308',
    marginRight: 8,
  },
  footerText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

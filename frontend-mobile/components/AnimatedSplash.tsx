import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: Props) {
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(20)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Icon bounces in
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),

      // 2. App name slides up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // 3. Loading dots appear
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),

      // 4. Hold for a moment
      Animated.delay(800),

      // 5. Fade out whole screen
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Icon */}
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App name */}
      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textY }],
        }}
      >
        <Text style={styles.appName}>Rentivo</Text>
        <Text style={styles.tagline}>Find · Rent · Live</Text>
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={[styles.dots, { opacity: dotsOpacity }]}>
        <PulsingDot delay={0} />
        <PulsingDot delay={200} />
        <PulsingDot delay={400} />
      </Animated.View>
    </Animated.View>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, {
          toValue: 1.4,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(600 - delay),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ scale }] }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 999,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: 'hidden',
  },
  icon: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0d5fa3',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 12,
    color: '#4a8db8',
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a8fe3',
    opacity: 0.7,
  },
});
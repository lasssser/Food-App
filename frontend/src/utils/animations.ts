import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

// Fade in animation hook
export function useFadeIn(delay: number = 0, duration: number = 400) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return anim;
}

// Slide up + fade in
export function useSlideUp(delay: number = 0, distance: number = 30, duration: number = 500) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// Scale bounce in
export function useScaleIn(delay: number = 0, duration: number = 400) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.6,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return { opacity, transform: [{ scale }] };
}

// Stagger children animation helper
export function useStaggeredList(count: number, baseDelay: number = 80) {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  useEffect(() => {
    const animations = anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, {
          toValue: 1,
          duration: 350,
          delay: i * baseDelay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(a.translateY, {
          toValue: 0,
          duration: 350,
          delay: i * baseDelay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(0, animations).start();
  }, []);

  return anims.map(a => ({
    opacity: a.opacity,
    transform: [{ translateY: a.translateY }],
  }));
}

// Pulse animation (continuous)
export function usePulse(minScale: number = 0.97, maxScale: number = 1.03) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  return { transform: [{ scale }] };
}

// Press scale animation for buttons
export function createPressAnimation() {
  const scale = new Animated.Value(1);
  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };
  return { scale, onPressIn, onPressOut };
}

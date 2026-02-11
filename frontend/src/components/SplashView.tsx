import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FOOD_ICONS = [
  { name: 'pizza-outline', x: 0.12, y: 0.15, size: 28, delay: 200 },
  { name: 'fast-food-outline', x: 0.82, y: 0.12, size: 26, delay: 400 },
  { name: 'cafe-outline', x: 0.08, y: 0.75, size: 24, delay: 600 },
  { name: 'ice-cream-outline', x: 0.85, y: 0.78, size: 26, delay: 300 },
  { name: 'restaurant-outline', x: 0.18, y: 0.42, size: 22, delay: 500 },
  { name: 'flame-outline', x: 0.78, y: 0.45, size: 24, delay: 100 },
  { name: 'beer-outline', x: 0.5, y: 0.1, size: 20, delay: 700 },
  { name: 'fish-outline', x: 0.5, y: 0.85, size: 22, delay: 350 },
  { name: 'nutrition-outline', x: 0.25, y: 0.88, size: 20, delay: 550 },
  { name: 'leaf-outline', x: 0.72, y: 0.9, size: 18, delay: 450 },
];

export default function SplashView() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const iconAnims = useRef(FOOD_ICONS.map(() => ({
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0.3),
    rotate: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Shimmer
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Food icons staggered entrance + float
    iconAnims.forEach((anim, i) => {
      const delay = FOOD_ICONS[i].delay;
      Animated.parallel([
        Animated.timing(anim.opacity, { toValue: 0.35, duration: 800, delay, useNativeDriver: true }),
        Animated.spring(anim.scale, { toValue: 1, friction: 5, tension: 40, delay, useNativeDriver: true }),
      ]).start(() => {
        // Floating animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim.rotate, { toValue: 1, duration: 2500 + i * 200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(anim.rotate, { toValue: 0, duration: 2500 + i * 200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ).start();
      });
    });
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <LinearGradient colors={['#E53935', '#C62828', '#B71C1C']} style={st.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {/* Food icons scattered around */}
      {FOOD_ICONS.map((icon, i) => {
        const floatY = iconAnims[i].rotate.interpolate({
          inputRange: [0, 1],
          outputRange: [0, i % 2 === 0 ? -8 : 8],
        });
        return (
          <Animated.View
            key={i}
            style={[
              st.foodIcon,
              {
                left: icon.x * width - icon.size / 2,
                top: icon.y * height - icon.size / 2,
                opacity: iconAnims[i].opacity,
                transform: [
                  { scale: iconAnims[i].scale },
                  { translateY: floatY },
                ],
              },
            ]}
          >
            <Ionicons name={icon.name as any} size={icon.size} color="rgba(255,255,255,0.6)" />
          </Animated.View>
        );
      })}

      {/* Glow behind logo */}
      <Animated.View style={[st.glow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />

      {/* Logo */}
      <Animated.View style={[st.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <Image source={require('../../assets/images/splash-screen.png')} style={st.logoImg} resizeMode="contain" />

        {/* Shimmer overlay */}
        <Animated.View style={[st.shimmer, { transform: [{ translateX: shimmerTranslate }, { rotate: '25deg' }] }]} />
      </Animated.View>

      {/* Bottom text */}
      <Animated.View style={[st.bottomText, { opacity: logoOpacity }]}>
        <View style={st.dots}>
          <View style={[st.dot, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />
          <View style={[st.dot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
          <View style={[st.dot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodIcon: {
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,200,100,0.15)',
  },
  logoWrap: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 30,
  },
  logoImg: {
    width: 280,
    height: 280,
  },
  shimmer: {
    position: 'absolute',
    width: 60,
    height: 300,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -50,
  },
  bottomText: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

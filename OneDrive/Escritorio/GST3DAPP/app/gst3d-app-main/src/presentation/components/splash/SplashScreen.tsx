import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  Animated, 
  Dimensions,
  Text,
  ActivityIndicator
} from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
  showProgress?: boolean;
}

const { width, height } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  duration = 3000,
  showProgress = true
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de progreso (solo si showProgress es true)
    if (showProgress) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration - 500,
        useNativeDriver: false,
      }).start();
    }

    // Finalizar splash screen
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, progressAnim, duration, onFinish]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.6],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* Logo principal */}
        <Animated.View 
          style={[
            styles.logoContainer,
            { 
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          <Image
            source={require('../../../images/1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Texto de carga eliminado */}

        {/* Indicador de progreso */}
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: progressWidth }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Spinner de carga */}
        <ActivityIndicator 
          size="small" 
          color="#007AFF" 
          style={styles.spinner}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>GST3D App</Text>
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '60%',
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  spinner: {
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 12,
    color: '#999999',
  },
});

export default SplashScreen;

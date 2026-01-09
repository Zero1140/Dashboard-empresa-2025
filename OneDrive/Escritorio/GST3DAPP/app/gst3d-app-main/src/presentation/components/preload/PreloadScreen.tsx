import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const PreloadScreen = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../images/3.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});

export default PreloadScreen;










import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          Go to Home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F7F8FA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2563EB',
  },
});

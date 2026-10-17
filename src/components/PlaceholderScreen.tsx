import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7F8FA',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});

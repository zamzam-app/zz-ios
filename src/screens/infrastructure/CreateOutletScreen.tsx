import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { colors } from '../../theme/theme';

import { OutletFormContent } from './components/OutletForm';

type Props = NativeStackScreenProps<InfrastructureStackParamList, 'CreateOutlet'>;

export default function CreateOutletScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <OutletFormContent onSuccess={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

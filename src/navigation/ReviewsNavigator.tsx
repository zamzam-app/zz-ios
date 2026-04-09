import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReviewsScreen from '../screens/reviews/ReviewsScreen';
import ReviewDetailScreen from '../screens/reviews/ReviewDetailScreen';
import { colors, typography } from '../theme/theme';

export type ReviewsStackParamList = {
  ReviewsList: undefined;
  ReviewDetail: { reviewId: string };
};

const Stack = createNativeStackNavigator<ReviewsStackParamList>();

export default function ReviewsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: typography.semibold, color: colors.text },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="ReviewsList" component={ReviewsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: 'Review Detail' }} />
    </Stack.Navigator>
  );
}

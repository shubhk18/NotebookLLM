import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import ChatScreen from './screens/ChatScreen';
import ModelSelectScreen from './screens/ModelSelectScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="ModelSelect">
          <Stack.Screen 
            name="ModelSelect" 
            component={ModelSelectScreen}
            options={{ title: 'Select Model' }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{ title: 'NotebookLLM Chat' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
} 
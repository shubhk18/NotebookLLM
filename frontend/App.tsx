import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import NotebookScreen from './screens/NotebookScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00a82d',
    accent: '#1a73e8',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#333333',
    placeholder: '#737373',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Notebook" 
            component={NotebookScreen}
            options={{
              title: 'NotebookLLM',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 1,
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
              },
              headerTintColor: '#333333',
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
              headerShadowVisible: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
} 
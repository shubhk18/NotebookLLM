import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import axios from 'axios';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

interface ModelCardProps {
  modelId: string;
  onSelect: (model: string) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ modelId, onSelect }) => {
  const theme = useTheme();
  const modelName = modelId.split('/').pop() || modelId;
  
  const getModelDescription = (name: string) => {
    if (name.includes('bloomz')) {
      return 'A multilingual language model trained on a diverse dataset.';
    } else if (name.includes('chatglm')) {
      return 'An efficient bilingual conversational language model.';
    }
    return 'A powerful language model for natural conversations.';
  };

  return (
    <TouchableOpacity onPress={() => onSelect(modelId)}>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.modelName}>{modelName}</Text>
        <Text style={styles.modelDescription}>
          {getModelDescription(modelId)}
        </Text>
        <View style={styles.modelStats}>
          <Text style={styles.statsText}>
            {modelName.includes('3b') ? '3B params' : 
             modelName.includes('1b') ? '1.7B params' :
             modelName.includes('6b') ? '6B params' : 
             '560M params'}
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const ModelSelectScreen = ({ navigation }: any) => {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/models`);
      setModels(response.data.models);
      setError(null);
    } catch (error) {
      setError('Failed to load models. Please try again.');
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading available models...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchModels} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.header}>Choose your AI Assistant</Text>
      <Text style={styles.subheader}>
        Select a model to start your conversation
      </Text>
      {models.map((model) => (
        <ModelCard
          key={model}
          modelId={model}
          onSelect={(selectedModel) => navigation.navigate('Chat', { model: selectedModel })}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  modelName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  modelStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModelSelectScreen; 
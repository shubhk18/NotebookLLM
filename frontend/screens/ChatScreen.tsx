import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { TextInput, IconButton, Text, useTheme, Card, Menu } from 'react-native-paper';
import axios from 'axios';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

interface Cell {
  id: string;
  type: 'code' | 'text' | 'output';
  content: string;
  isExecuting?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  cells?: Cell[];
}

interface ChatScreenProps {
  route: {
    params: {
      model: string;
    };
  };
}

interface CodeCellProps {
  content: string;
  onExecute: () => void;
  isExecuting: boolean;
}

interface TextCellProps {
  content: string;
}

interface OutputCellProps {
  content: string;
}

const CodeCell: React.FC<CodeCellProps> = ({ content, onExecute, isExecuting }) => {
  const theme = useTheme();
  
  return (
    <Card style={styles.codeCell}>
      <Card.Content>
        <View style={styles.codeCellHeader}>
          <Text style={styles.cellLabel}>Code</Text>
          <IconButton
            icon={isExecuting ? 'loading' : 'play'}
            size={20}
            onPress={onExecute}
            disabled={isExecuting}
          />
        </View>
        <TextInput
          mode="outlined"
          multiline
          value={content}
          style={[styles.codeInput, { backgroundColor: theme.colors.background }]}
          theme={{ colors: { primary: theme.colors.primary } }}
        />
      </Card.Content>
    </Card>
  );
};

const TextCell: React.FC<TextCellProps> = ({ content }) => {
  return (
    <Card style={styles.textCell}>
      <Card.Content>
        <Text style={styles.textContent}>{content}</Text>
      </Card.Content>
    </Card>
  );
};

const OutputCell: React.FC<OutputCellProps> = ({ content }) => {
  const theme = useTheme();
  
  return (
    <Card style={[styles.outputCell, { backgroundColor: theme.colors.background }]}>
      <Card.Content>
        <View style={styles.outputCellHeader}>
          <Text style={styles.cellLabel}>Output</Text>
        </View>
        <Text style={styles.outputContent}>{content}</Text>
      </Card.Content>
    </Card>
  );
};

const ChatScreen: React.FC<ChatScreenProps> = ({ route }) => {
  const [notebook, setNotebook] = useState<Cell[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const theme = useTheme();

  // Initial greeting
  useEffect(() => {
    const initialCell: Cell = {
      id: Date.now().toString(),
      type: 'text',
      content: `Welcome to the Notebook LLM! I'm running on ${route.params.model}. You can:
- Write code in code cells
- Add text explanations
- Execute code and see outputs
- Ask questions about your code`
    };
    setNotebook([initialCell]);
  }, [route.params.model]);

  // Auto scroll to bottom when new cells are added
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [notebook]);

  const addCell = (type: 'code' | 'text') => {
    const newCell: Cell = {
      id: Date.now().toString(),
      type,
      content: '',
    };
    setNotebook((prev: Cell[]) => [...prev, newCell]);
  };

  const executeCode = async (cellId: string) => {
    const cellIndex = notebook.findIndex((cell: Cell) => cell.id === cellId);
    if (cellIndex === -1) return;

    const cell = notebook[cellIndex];
    if (cell.type !== 'code') return;

    // Update cell status
    setNotebook((prev: Cell[]) => prev.map((c: Cell) => 
      c.id === cellId ? { ...c, isExecuting: true } : c
    ));

    try {
      const response = await axios.post(`${API_URL}/execute`, {
        code: cell.content,
        model: route.params.model,
      });

      // Add output cell
      const outputCell: Cell = {
        id: Date.now().toString(),
        type: 'output',
        content: response.data.output,
      };

      setNotebook((prev: Cell[]) => [
        ...prev.slice(0, cellIndex + 1),
        outputCell,
        ...prev.slice(cellIndex + 1)
      ]);
    } catch (error) {
      const errorCell: Cell = {
        id: Date.now().toString(),
        type: 'output',
        content: 'Error executing code. Please try again.',
      };
      setNotebook((prev: Cell[]) => [
        ...prev.slice(0, cellIndex + 1),
        errorCell,
        ...prev.slice(cellIndex + 1)
      ]);
    } finally {
      setNotebook((prev: Cell[]) => prev.map((c: Cell) => 
        c.id === cellId ? { ...c, isExecuting: false } : c
      ));
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.notebookContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {notebook.map((cell: Cell) => {
          switch (cell.type) {
            case 'code':
              return (
                <CodeCell
                  key={cell.id}
                  content={cell.content}
                  onExecute={() => executeCode(cell.id)}
                  isExecuting={cell.isExecuting || false}
                />
              );
            case 'text':
              return <TextCell key={cell.id} content={cell.content} />;
            case 'output':
              return <OutputCell key={cell.id} content={cell.content} />;
            default:
              return null;
          }
        })}
      </ScrollView>

      <View style={styles.actionBar}>
        <IconButton
          icon="plus"
          size={24}
          onPress={() => addCell('text')}
          style={styles.actionButton}
        />
        <IconButton
          icon="code-tags"
          size={24}
          onPress={() => addCell('code')}
          style={styles.actionButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  notebookContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  codeCell: {
    marginVertical: 8,
    elevation: 2,
  },
  textCell: {
    marginVertical: 8,
    elevation: 2,
  },
  outputCell: {
    marginVertical: 8,
    marginLeft: 16,
    elevation: 1,
  },
  codeCellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  outputCellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cellLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  outputContent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    margin: 4,
  },
});

export default ChatScreen; 
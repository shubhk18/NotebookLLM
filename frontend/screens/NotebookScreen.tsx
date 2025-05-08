import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  IconButton,
  useTheme,
  Menu,
  Divider,
  Surface,
  Portal,
  Modal,
  ActivityIndicator,
} from 'react-native-paper';
import axios from 'axios';
import { API_URL } from '../config';

interface Cell {
  id: string;
  type: 'code' | 'text' | 'markdown' | 'output' | 'chat' | 'assistant';
  content: string;
  isExecuting?: boolean;
  language?: string;
  timestamp?: Date;
}

const CodeEditor: React.FC<{
  content: string;
  onChangeText: (text: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
}> = ({ content, onChangeText, onExecute, isExecuting }) => {
  const theme = useTheme();

  return (
    <Surface style={styles.codeEditorContainer}>
      <View style={styles.codeHeader}>
        <View style={styles.languageIndicator}>
          <Text style={styles.languageText}>Python</Text>
        </View>
        <IconButton
          icon={isExecuting ? 'loading' : 'play'}
          mode="contained"
          onPress={onExecute}
          disabled={isExecuting}
          style={styles.executeButton}
          size={20}
        />
      </View>
      <TextInput
        mode="flat"
        multiline
        value={content}
        onChangeText={onChangeText}
        style={[
          styles.codeInput,
          { backgroundColor: theme.colors.background, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={theme.colors.primary}
      />
    </Surface>
  );
};

const OutputDisplay: React.FC<{
  content: string;
}> = ({ content }) => {
  const theme = useTheme();

  return (
    <Surface style={styles.outputContainer}>
      <View style={styles.outputHeader}>
        <Text style={styles.outputTitle}>Output</Text>
      </View>
      <View style={styles.outputContent}>
        <Text style={[
          styles.outputText,
          { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }
        ]}>
          {content}
        </Text>
      </View>
    </Surface>
  );
};

const ChatInput: React.FC<{
  onSend: (message: string) => void;
  isLoading: boolean;
}> = ({ onSend, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <Surface style={styles.chatInputContainer}>
      <TextInput
        mode="outlined"
        value={message}
        onChangeText={setMessage}
        placeholder="Ask me anything..."
        style={styles.chatInput}
        right={
          <TextInput.Icon
            icon={isLoading ? 'loading' : 'send'}
            onPress={handleSend}
            disabled={isLoading || !message.trim()}
          />
        }
        onSubmitEditing={handleSend}
      />
    </Surface>
  );
};

const ChatMessage: React.FC<{
  content: string;
  type: 'chat' | 'assistant';
}> = ({ content, type }) => {
  const theme = useTheme();
  
  return (
    <Surface style={[
      styles.messageContainer,
      type === 'chat' ? styles.userMessage : styles.assistantMessage
    ]}>
      <Paragraph style={styles.messageText}>{content}</Paragraph>
    </Surface>
  );
};

const NotebookScreen: React.FC = () => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    // Initialize with a welcome message
    if (cells.length === 0) {
      setCells([
        {
          id: Date.now().toString(),
          type: 'assistant',
          content: '👋 Hi! I\'m your AI assistant. I can help you with:\n\n• Writing and executing code\n• Explaining concepts\n• Answering questions\n\nWhat would you like to do?',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const addCell = (type: Cell['type']) => {
    const newCell: Cell = {
      id: Date.now().toString(),
      type,
      content: '',
      language: type === 'code' ? 'python' : undefined,
      timestamp: new Date(),
    };
    setCells(prev => [...prev, newCell]);
    setMenuVisible(false);
  };

  const updateCellContent = (id: string, content: string) => {
    setCells(prev =>
      prev.map(cell => (cell.id === id ? { ...cell, content } : cell))
    );
  };

  const executeCode = async (id: string) => {
    const cellIndex = cells.findIndex(cell => cell.id === id);
    if (cellIndex === -1) return;

    const cell = cells[cellIndex];
    if (cell.type !== 'code') return;

    setCells(prev =>
      prev.map(c => (c.id === id ? { ...c, isExecuting: true } : c))
    );

    try {
      const response = await axios.post(`${API_URL}/execute`, {
        code: cell.content,
      });

      const outputCell: Cell = {
        id: Date.now().toString(),
        type: 'output',
        content: response.data.output,
        timestamp: new Date(),
      };

      setCells(prev => [
        ...prev.slice(0, cellIndex + 1),
        outputCell,
        ...prev.slice(cellIndex + 1),
      ]);
    } catch (error) {
      const errorCell: Cell = {
        id: Date.now().toString(),
        type: 'output',
        content: 'Error executing code. Please try again.',
        timestamp: new Date(),
      };
      setCells(prev => [
        ...prev.slice(0, cellIndex + 1),
        errorCell,
        ...prev.slice(cellIndex + 1),
      ]);
    } finally {
      setCells(prev =>
        prev.map(c => (c.id === id ? { ...c, isExecuting: false } : c))
      );
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userCell: Cell = {
      id: Date.now().toString(),
      type: 'chat',
      content: message,
      timestamp: new Date(),
    };
    setCells(prev => [...prev, userCell]);

    setIsLoading(true);
    try {
      console.log('Sending message:', message); // Debug log
      const response = await axios.post(`${API_URL}/chat`, {
        message: message.trim(),
        model: "llama3.2"
      });
      console.log('Received response:', response.data); // Debug log

      // Add assistant response
      const assistantCell: Cell = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };
      setCells(prev => [...prev, assistantCell]);
    } catch (error: any) {
      console.error('Chat error:', error.response?.data || error); // Enhanced error logging
      // Add error message
      const errorCell: Cell = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${error.response?.data?.detail || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setCells(prev => [...prev, errorCell]);
    } finally {
      setIsLoading(false);
      // Scroll to bottom
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {cells.map((cell, index) => (
          <View key={cell.id} style={styles.cellContainer}>
            {cell.type === 'code' ? (
              <CodeEditor
                content={cell.content}
                onChangeText={(text) => updateCellContent(cell.id, text)}
                onExecute={() => executeCode(cell.id)}
                isExecuting={cell.isExecuting || false}
              />
            ) : cell.type === 'output' ? (
              <OutputDisplay content={cell.content} />
            ) : cell.type === 'chat' || cell.type === 'assistant' ? (
              <ChatMessage content={cell.content} type={cell.type} />
            ) : (
              <TextInput
                mode="outlined"
                multiline
                value={cell.content}
                onChangeText={(text) => updateCellContent(cell.id, text)}
                style={styles.textInput}
              />
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        <View style={styles.toolbar}>
          <Button
            mode="contained"
            onPress={() => setMenuVisible(true)}
            icon="plus"
          >
            Add Cell
          </Button>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<View />}
          >
            <Menu.Item
              onPress={() => addCell('code')}
              title="Code Cell"
              leadingIcon="code-tags"
            />
            <Menu.Item
              onPress={() => addCell('text')}
              title="Text Cell"
              leadingIcon="text"
            />
            <Menu.Item
              onPress={() => addCell('markdown')}
              title="Markdown Cell"
              leadingIcon="markdown"
            />
          </Menu>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  cellContainer: {
    marginBottom: 24,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  chatInputContainer: {
    marginBottom: 8,
    elevation: 0,
  },
  chatInput: {
    backgroundColor: '#ffffff',
  },
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '85%',
    elevation: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e3f2fd',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  codeEditorContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#ffffff',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  languageIndicator: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  languageText: {
    color: '#1a73e8',
    fontSize: 12,
    fontWeight: '600',
  },
  executeButton: {
    backgroundColor: '#1a73e8',
    margin: 0,
  },
  codeInput: {
    fontSize: 14,
    padding: 16,
    lineHeight: 20,
    minHeight: 100,
    backgroundColor: '#fafafa',
  },
  outputContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  outputHeader: {
    padding: 12,
    backgroundColor: '#f5f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  outputTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outputContent: {
    padding: 16,
  },
  outputText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default NotebookScreen; 
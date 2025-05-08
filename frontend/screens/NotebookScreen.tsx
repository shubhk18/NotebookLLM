import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableOpacity,
  Keyboard,
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
  FAB,
  Text,
  Tooltip,
} from 'react-native-paper';
import axios from 'axios';
import { API_URL } from '../config';
import Markdown from 'react-native-markdown-display';

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
  onDelete: () => void;
  isExecuting: boolean;
}> = ({ content, onChangeText, onExecute, onDelete, isExecuting }) => {
  const theme = useTheme();

  return (
    <Surface style={styles.codeEditorContainer}>
      <View style={styles.codeHeader}>
        <View style={styles.codeHeaderLeft}>
          <View style={styles.languageIndicator}>
            <Text style={styles.languageText}>Python</Text>
          </View>
        </View>
        <View style={styles.codeHeaderRight}>
          <IconButton
            icon={isExecuting ? 'loading' : 'play'}
            mode="contained"
            onPress={onExecute}
            disabled={isExecuting}
            style={styles.executeButton}
            size={20}
          />
          <IconButton
            icon="delete"
            mode="contained"
            onPress={onDelete}
            style={styles.deleteButton}
            size={20}
          />
        </View>
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
  onCreateCell?: (type: 'code' | 'text') => void;
}> = ({ content, type, onCreateCell }) => {
  const theme = useTheme();
  const [showActions, setShowActions] = useState(false);
  
  // Check if the message contains code blocks
  const hasCodeBlock = content.includes('```');
  
  return (
    <Surface style={[
      styles.messageContainer,
      type === 'chat' ? styles.userMessage : styles.assistantMessage
    ]}>
      <Markdown style={styles.markdownStyles}>
        {content}
      </Markdown>
      {type === 'assistant' && hasCodeBlock && (
        <View style={styles.messageActions}>
          <Button
            mode="contained-tonal"
            onPress={() => onCreateCell?.('code')}
            icon="plus-box"
            style={styles.actionButton}
          >
            Add as Code Cell
          </Button>
        </View>
      )}
    </Surface>
  );
};

const NotebookScreen: React.FC = () => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Initialize with a welcome message
    if (cells.length === 0) {
      setCells([
        {
          id: Date.now().toString(),
          type: 'assistant',
          content: '👋 Hi! I\'m your AI coding assistant. I can help you with:\n\n• Writing and executing Python code\n• Explaining concepts\n• Debugging issues\n• Answering questions\n\nTry asking me something or use the + button to add a code cell!',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Add keyboard shortcuts
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyPress = (event: KeyboardEvent) => {
        // Check if Ctrl/Cmd key is pressed
        const isCtrlCmd = event.metaKey || event.ctrlKey;
        
        if (isCtrlCmd) {
          switch (event.key) {
            case 'Enter': // Ctrl/Cmd + Enter to execute current cell
              // Find the last code cell and execute it
              const lastCodeCell = [...cells].reverse().find(cell => cell.type === 'code');
              if (lastCodeCell) {
                executeCode(lastCodeCell.id);
              }
              event.preventDefault();
              break;
            
            case 'b': // Ctrl/Cmd + B to add code cell
              addCell('code');
              event.preventDefault();
              break;
            
            case 't': // Ctrl/Cmd + T to add text cell
              addCell('text');
              event.preventDefault();
              break;
            
            case 's': // Ctrl/Cmd + S to save (placeholder)
              event.preventDefault();
              // TODO: Implement save functionality
              break;
          }
        }
      };

      // Add event listener
      window.addEventListener('keydown', handleKeyPress);

      // Cleanup
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [cells]); // Add cells as dependency to access latest state

  // Add keyboard shortcuts help modal
  const [showShortcuts, setShowShortcuts] = useState(false);

  const ShortcutsModal = () => (
    <Portal>
      <Modal
        visible={showShortcuts}
        onDismiss={() => setShowShortcuts(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Title>Keyboard Shortcuts</Title>
        <Divider style={styles.divider} />
        <View style={styles.shortcutRow}>
          <Text>Ctrl/Cmd + Enter</Text>
          <Text>Execute current cell</Text>
        </View>
        <View style={styles.shortcutRow}>
          <Text>Ctrl/Cmd + B</Text>
          <Text>Add code cell</Text>
        </View>
        <View style={styles.shortcutRow}>
          <Text>Ctrl/Cmd + T</Text>
          <Text>Add text cell</Text>
        </View>
        <View style={styles.shortcutRow}>
          <Text>Ctrl/Cmd + S</Text>
          <Text>Save notebook</Text>
        </View>
        <Button mode="contained" onPress={() => setShowShortcuts(false)} style={styles.closeButton}>
          Close
        </Button>
      </Modal>
    </Portal>
  );

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
    
    // Scroll to the new cell
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const deleteCell = (id: string) => {
    setCells(prev => prev.filter(cell => cell.id !== id));
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
    } catch (error: any) {
      const errorCell: Cell = {
        id: Date.now().toString(),
        type: 'output',
        content: `Error: ${error.response?.data?.detail || 'Something went wrong. Please try again.'}`,
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
      // Scroll to show the output
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
      const response = await axios.post(`${API_URL}/chat`, {
        message: message.trim(),
        model: "codellama:7b-instruct"
      });

      // Add assistant response
      const assistantCell: Cell = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };
      setCells(prev => [...prev, assistantCell]);
    } catch (error: any) {
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

  const handleCreateCellFromMessage = (type: 'code' | 'text') => {
    addCell(type);
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
                onDelete={() => deleteCell(cell.id)}
                isExecuting={cell.isExecuting || false}
              />
            ) : cell.type === 'output' ? (
              <OutputDisplay content={cell.content} />
            ) : cell.type === 'chat' || cell.type === 'assistant' ? (
              <ChatMessage 
                content={cell.content} 
                type={cell.type}
                onCreateCell={handleCreateCellFromMessage}
              />
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
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => addCell('code')}
          onLongPress={() => setMenuVisible(true)}
          label="Add Code Cell"
        />
        <FAB
          icon="keyboard"
          style={[styles.fab, styles.helpFab]}
          onPress={() => setShowShortcuts(true)}
          small
        />
        <Portal>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<View style={{ position: 'absolute', right: 16, bottom: 80 }} />}
          >
            <Menu.Item
              onPress={() => {
                addCell('code');
                setMenuVisible(false);
              }}
              title="Python Code Cell"
              leadingIcon="language-python"
            />
            <Menu.Item
              onPress={() => {
                addCell('text');
                setMenuVisible(false);
              }}
              title="Text Note"
              leadingIcon="text"
            />
            <Menu.Item
              onPress={() => {
                addCell('markdown');
                setMenuVisible(false);
              }}
              title="Markdown Note"
              leadingIcon="markdown"
            />
          </Menu>
        </Portal>
      </View>
      <ShortcutsModal />
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
    padding: 16,
    paddingBottom: 100,
  },
  cellContainer: {
    marginBottom: 16,
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
  messageActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginLeft: 8,
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
  codeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    backgroundColor: '#1a73e8',
  },
  helpFab: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    backgroundColor: '#666',
  },
  markdownStyles: {
    body: {
      color: '#333333',
      fontSize: 16,
    },
    code_block: {
      backgroundColor: '#f5f5f5',
      padding: 8,
      borderRadius: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    fence: {
      backgroundColor: '#f5f5f5',
      padding: 8,
      borderRadius: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  divider: {
    marginVertical: 10,
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  closeButton: {
    marginTop: 20,
  },
});

export default NotebookScreen; 
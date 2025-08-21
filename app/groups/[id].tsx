import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GROUPS } from '../../constants/group';

type Message = {
  id: string;
  user: string;
  content: string;
  timestamp: string;
};

const PRIMARY = "#3D8DFF";
const VERY_LIGHT = "#FAFBFD";
const USER_BG = "#dbeafe";
const OTHER_BG = "#F2F6FF";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const group = GROUPS.find(g => g.id === id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([
      ...messages,
      {
        id: `${Date.now()}`,
        user: 'You',
        content: input,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setInput('');
  };

  if (!group) return <Text style={styles.notFound}>Group not found.</Text>;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{group.title}</Text>
        <Text style={styles.headerDesc}>{group.description}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        style={styles.chatList}
        renderItem={({ item }) => {
          const isYou = item.user === 'You';
          return (
            <View
              style={[
                styles.message,
                isYou ? styles.messageYou : styles.messageOther,
              ]}
            >
              <Text style={[styles.user, isYou && { color: PRIMARY }]}>
                {item.user}:
              </Text>
              <Text style={styles.content}>{item.content}</Text>
              <Text style={styles.time}>{item.timestamp}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No messages yet. Start the conversation!
          </Text>
        }
        contentContainerStyle={{ flexGrow: 1, justifyContent: messages.length === 0 ? 'center' : 'flex-start' }}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={styles.input}
          placeholder="Write a message..."
          placeholderTextColor="#BCC6D6"
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: input.trim() ? 1 : 0.7 }]}
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0, backgroundColor: VERY_LIGHT },
  notFound: { padding: 50, textAlign: "center", fontSize: 18, color: "#9a9b9e" },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#EFF0F2", backgroundColor: "#fff" },
  headerTitle: { fontWeight: 'bold', fontSize: 22, color: "#2d2d2d" },
  headerDesc: { color: '#666', marginTop: 3, fontSize: 15 },
  chatList: { flex: 1, padding: 16 },
  message: {
    maxWidth: "75%",
    marginVertical: 4,
    padding: 12,
    borderRadius: 14,
    shadowColor: "#7b8",
    shadowOpacity: 0.05,
    shadowOffset: { width: 1, height: 2 },
    shadowRadius: 6,
  },
  messageYou: {
    backgroundColor: USER_BG,
    alignSelf: "flex-end",
    borderTopRightRadius: 5,
  },
  messageOther: {
    backgroundColor: OTHER_BG,
    alignSelf: "flex-start",
    borderTopLeftRadius: 5,
  },
  user: { fontWeight: '600', fontSize: 14, marginBottom: 2 },
  content: { fontSize: 15, color: "#222", marginBottom: 2 },
  time: { fontSize: 11, marginTop: 1, color: "#A7B0C7", textAlign: "right" },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EFF0F2"
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e7ed",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: "#f9fafd",
    marginRight: 8,
    fontSize: 16,
    color: "#23272F"
  },
  sendButton: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5
  },
  empty: {
    color: "#b4bac7",
    fontSize: 16,
    textAlign: "center",
    marginTop: 60
  }
});
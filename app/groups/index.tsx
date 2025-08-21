import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import GroupCard from '../../components/ui/GroupCard';
import { GROUPS } from '../../constants/group';

const GroupsListScreen = () => {
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);

  const handleJoinLeave = (groupId: string) => {
    setJoinedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Focus Groups</Text>
      <FlatList
        data={GROUPS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            joined={joinedGroups.includes(item.id)}
            onJoinLeave={() => handleJoinLeave(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No groups found. Create the first group!</Text>
        }
        contentContainerStyle={GROUPS.length === 0 ? { flex: 1, justifyContent: 'center' } : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FAFBFD" },
  header: {
    fontSize: 28, fontWeight: "700", marginBottom: 12, color: "#2d2d2d",
    letterSpacing: 0.5
  },
  empty: { color: "#b0b5bb", textAlign: "center", marginTop: 60, fontSize: 18 }
});

export default GroupsListScreen;
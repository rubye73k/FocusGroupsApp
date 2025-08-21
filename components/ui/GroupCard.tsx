import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Group } from '../../constants/group';

type Props = {
  group: Group;
  joined: boolean;
  onJoinLeave: () => void;
};

const GroupCard = ({ group, joined, onJoinLeave }: Props) => {
  const router = useRouter();

  return (
    <Pressable
      style={[
        styles.card,
        joined && styles.cardJoined,
      ]}
      onPress={() => router.push({
        pathname: '/groups/[id]',
        params: { id: group.id },
      })}
    >
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{group.title}</Text>
          <Text style={styles.desc}>{group.description}</Text>
          <Text style={styles.members}>{group.memberCount} members</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            joined ? styles.buttonLeave : styles.buttonJoin
          ]}
          onPress={(e) => {
            e.stopPropagation && e.stopPropagation();
            onJoinLeave();
          }}
        >
          <Text style={joined ? styles.buttonLeaveText : styles.buttonJoinText}>
            {joined ? "Leave" : "Join"}
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

const PRIMARY = "#3D8DFF";
const SUBTLE = "#F2F6FF";
const JOINED = "#D0EAFF";
const BORDER = "#B4D2FF";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#ECECEC",    // (for web, not native—ok to omit)
  },
  cardJoined: {
    backgroundColor: JOINED,
    borderColor: BORDER,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: { fontWeight: "bold", fontSize: 18, color: "#262626" },
  desc: { color: "#636e72", marginVertical: 2, fontSize: 14 },
  members: { color: "#8795a1", fontSize: 13, marginTop: 4 },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 75,
  },
  buttonJoin: {
    backgroundColor: PRIMARY,
  },
  buttonJoinText: {
    color: "#fff",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  buttonLeave: {
    backgroundColor: "#fff",
    borderColor: PRIMARY,
    borderWidth: 1,
  },
  buttonLeaveText: {
    color: PRIMARY,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default GroupCard;
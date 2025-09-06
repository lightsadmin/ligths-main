import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  TextInput,
  Alert,
  Modal,
  PanResponder,
  SafeAreaView,
} from "react-native";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import voiceRecordingAnimation from "./animations/Voice UI.json";
import notebookAnimation from "./animations/Notebook.json";

const { width } = Dimensions.get("window");

// --- Main App Component ---
export default function NoteAIScreen() {
  const [recording, setRecording] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [today, setToday] = useState(new Date().toISOString().split("T")[0]);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [sound, setSound] = useState();
  const [showIntroGuide, setShowIntroGuide] = useState(false);
  const [showManualNoteModal, setShowManualNoteModal] = useState(false);
  const [manualNoteText, setManualNoteText] = useState("");
  const noteFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadNotes();
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const hasSeenNotesIntro = await AsyncStorage.getItem("hasSeenNotesIntro");
      if (!hasSeenNotesIntro) {
        setShowIntroGuide(true);
      }
    } catch (error) {
      console.error("Error checking first time user:", error);
    }
  };

  const dismissIntroGuide = async () => {
    try {
      await AsyncStorage.setItem("hasSeenNotesIntro", "true");
      setShowIntroGuide(false);
    } catch (error) {
      console.error("Error saving intro guide state:", error);
      setShowIntroGuide(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadNotes();
    }, [])
  );

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const loadNotes = async () => {
    try {
      const allNotes = [];
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const stored = await AsyncStorage.getItem(`notes_${dateStr}`);
        if (stored) {
          const dayNotes = JSON.parse(stored);
          allNotes.push(...dayNotes);
        }
      }

      allNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotes(allNotes);
    } catch (err) {
      console.error("Error loading notes", err);
    }
  };

  const saveNotes = async (newNotes) => {
    try {
      const notesByDate = {};

      newNotes.forEach((note) => {
        const noteDate = note.timestamp
          ? new Date(note.timestamp).toISOString().split("T")[0]
          : today;

        if (!notesByDate[noteDate]) {
          notesByDate[noteDate] = [];
        }
        notesByDate[noteDate].push(note);
      });

      for (const [date, dayNotes] of Object.entries(notesByDate)) {
        await AsyncStorage.setItem(`notes_${date}`, JSON.stringify(dayNotes));
      }
    } catch (err) {
      console.error("Error saving notes", err);
    }
  };

  const deleteNote = async (index) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const updatedNotes = notes.filter((_, i) => i !== index);
          setNotes(updatedNotes);
          saveNotes(updatedNotes);
        },
      },
    ]);
  };

  const editNote = (index) => {
    setEditingNote(index);
    setEditText(notes[index].text);
    setShowEditModal(true);
  };

  const saveEditedNote = async () => {
    if (editingNote !== null) {
      const updatedNotes = [...notes];
      updatedNotes[editingNote] = {
        ...updatedNotes[editingNote],
        text: editText,
      };
      setNotes(updatedNotes);
      await saveNotes(updatedNotes);
      setShowEditModal(false);
      setEditingNote(null);
      setEditText("");
      noteFadeAnim.setValue(0);
      Animated.timing(noteFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      setIsRecording(false);
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    console.log("Stopping recording..");
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    console.log("Recording stopped and stored at", uri);

    const locationString = await fetchLocation();

    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString();
      const newNote = {
        id: Date.now().toString(),
        time: timestamp,
        timestamp: now.toISOString(),
        audioUri: uri,
        text: "Voice Note (Tap to play)",
        location: locationString,
        isAudio: true,
      };
      setNotes((prevNotes) => {
        const updatedNotes = [...prevNotes, newNote];
        saveNotes(updatedNotes);
        return updatedNotes;
      });
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  const saveManualNote = async () => {
    if (!manualNoteText.trim()) {
      Alert.alert("Note is empty", "Please enter some text for your note.");
      return;
    }

    const locationString = await fetchLocation();

    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString();
      const newNote = {
        id: Date.now().toString(),
        time: timestamp,
        timestamp: now.toISOString(),
        text: manualNoteText,
        location: locationString,
        isAudio: false,
      };

      setNotes((prevNotes) => {
        const updatedNotes = [...prevNotes, newNote];
        saveNotes(updatedNotes);
        return updatedNotes;
      });

      setManualNoteText("");
      setShowManualNoteModal(false);
    } catch (err) {
      console.error("Error saving manual note:", err);
    }
  };

  const fetchLocation = async () => {
    let locationString = "Location not available";
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is needed to stamp your notes."
        );
      } else {
        const position = await Location.getCurrentPositionAsync({});
        const placemarks = await Location.reverseGeocodeAsync(position.coords);
        if (placemarks && placemarks[0]) {
          const place = placemarks[0];
          const addressParts = [
            place.street,
            place.subregion,
            place.district,
            place.city,
          ];
          const uniqueParts = [...new Set(addressParts.filter((part) => part))];
          if (uniqueParts.length > 0) {
            locationString = uniqueParts.join(", ");
          } else {
            locationString = "Precise location unavailable";
          }
        }
      }
    } catch (err) {
      console.error("Error fetching location", err);
    }
    return locationString;
  };

  const playAudio = async (audioUri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: audioUri,
      });
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert("Error", "Could not play audio recording");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Ligths Notes</Text>
              <Text style={styles.subtitle}>{formatDate(today)}</Text>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  {notes.length} notes this week
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.notesContainer}>
          {notes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>📝</Text>
              </View>
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the record or manual note button to add your first note
              </Text>
            </View>
          ) : (
            <FlatList
              data={[...notes].reverse()}
              keyExtractor={(item, index) => item.id || index.toString()}
              ListHeaderComponent={
                <View style={styles.swipeHint}>
                  <Text style={styles.swipeHintText}>
                    💡 Swipe left to delete, right to edit
                  </Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <SwipeableNoteItem
                  item={item}
                  noteCount={notes.length}
                  indexInReversedList={index}
                  onEdit={() => editNote(notes.length - 1 - index)}
                  onDelete={() => deleteNote(notes.length - 1 - index)}
                  onPlayAudio={playAudio}
                  fadeAnim={noteFadeAnim}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.notesList}
            />
          )}
        </View>

        {/* Floating Action Buttons */}
        <View style={styles.floatingButtonsContainer}>
          {!isRecording && (
            <TouchableOpacity
              style={styles.floatingManualNoteButton}
              onPress={() => setShowManualNoteModal(true)}
            >
              <LottieView
                source={notebookAnimation}
                style={styles.manualNoteLottie}
                autoPlay={true}
                loop={false}
                speed={0.8}
              />
            </TouchableOpacity>
          )}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.floatingMicButton,
                isRecording ? styles.micButtonActive : styles.micButtonInactive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <LottieView
                source={voiceRecordingAnimation}
                autoPlay={isRecording}
                loop={isRecording}
                style={styles.micLottie}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <EditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          editText={editText}
          onEditTextChange={setEditText}
          onSave={saveEditedNote}
        />

        <ManualNoteModal
          visible={showManualNoteModal}
          onClose={() => setShowManualNoteModal(false)}
          noteText={manualNoteText}
          onNoteTextChange={setManualNoteText}
          onSave={saveManualNote}
        />

        <IntroGuideModal visible={showIntroGuide} onClose={dismissIntroGuide} />
      </View>
    </SafeAreaView>
  );
}

// ====================================================================
//  ✅ COMPONENTS MOVED OUTSIDE THE 'App' COMPONENT
// ====================================================================

const SwipeableNoteItem = ({
  item,
  noteCount,
  indexInReversedList,
  onEdit,
  onDelete,
  onPlayAudio,
  fadeAnim,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const actionOpacity = useRef(new Animated.Value(0)).current;
  const currentDirection = useRef(null);
  const SWIPE_THRESHOLD = 80;
  const ACTION_WIDTH = 80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
        Math.abs(gestureState.dx) > 15,
      onPanResponderGrant: (evt, gestureState) => {
        translateX.setOffset(translateX._value);
        translateX.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx } = gestureState;
        let translationValue = dx;
        const maxSwipe = ACTION_WIDTH + 40;
        if (Math.abs(dx) > maxSwipe) {
          const resistance = 0.3;
          const excess = Math.abs(dx) - maxSwipe;
          translationValue =
            dx > 0
              ? maxSwipe + excess * resistance
              : -(maxSwipe + excess * resistance);
        }
        translateX.setValue(translationValue);
        const progress = Math.min(
          Math.abs(translationValue) / SWIPE_THRESHOLD,
          1
        );
        actionOpacity.setValue(progress);
        if (Math.abs(dx) > 20) {
          const newDirection = dx > 0 ? "right" : "left";
          if (currentDirection.current !== newDirection) {
            currentDirection.current = newDirection;
            setTimeout(() => {
              setSwipeDirection(newDirection);
            }, 0);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset();
        const { dx, vx } = gestureState;
        const shouldActivateAction =
          Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5;
        if (shouldActivateAction) {
          if (dx > 0) {
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: ACTION_WIDTH,
                tension: 100,
                friction: 8,
                useNativeDriver: false,
              }),
              Animated.timing(actionOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start();
            setTimeout(() => {
              setIsSwipeActive(true);
              setSwipeDirection("right");
              currentDirection.current = "right";
            }, 0);
          } else {
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: -ACTION_WIDTH,
                tension: 100,
                friction: 8,
                useNativeDriver: false,
              }),
              Animated.timing(actionOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start();
            setTimeout(() => {
              setIsSwipeActive(true);
              setSwipeDirection("left");
              currentDirection.current = "left";
            }, 0);
          }
        } else {
          resetSwipe();
        }
      },
      onPanResponderTerminate: () => resetSwipe(),
    })
  ).current;

  const resetSwipe = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(actionOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsSwipeActive(false);
      setSwipeDirection(null);
      currentDirection.current = null;
    });
  };

  const handleEdit = () => {
    onEdit();
    resetSwipe();
  };
  const handleDelete = () => {
    onDelete();
    resetSwipe();
  };

  return (
    <Animated.View
      style={[
        styles.swipeContainer,
        {
          opacity: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        },
      ]}
    >
      <Animated.View
        style={[
          styles.actionContainer,
          styles.editAction,
          {
            opacity: swipeDirection === "right" ? actionOpacity : 0,
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-ACTION_WIDTH, 0, ACTION_WIDTH],
                  outputRange: [-ACTION_WIDTH, -ACTION_WIDTH, 0],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEdit}
          activeOpacity={0.8}
        >
          <Image
            source={require("./assets/feedback_768932.png")}
            style={styles.actionIconImage}
          />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[
          styles.actionContainer,
          styles.deleteAction,
          {
            opacity: swipeDirection === "left" ? actionOpacity : 0,
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-ACTION_WIDTH, 0, ACTION_WIDTH],
                  outputRange: [0, ACTION_WIDTH, ACTION_WIDTH],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Image
            source={require("./assets/delete_3221897.png")}
            style={styles.actionIconImage}
          />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[
          styles.noteCard,
          {
            opacity: 1 - indexInReversedList * 0.02,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={
            isSwipeActive
              ? resetSwipe
              : item.isAudio
              ? () => onPlayAudio(item.audioUri)
              : undefined
          }
          disabled={!isSwipeActive && !item.isAudio}
        >
          <View style={styles.noteHeader}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <View style={styles.noteNumber}>
              <Text style={styles.noteNumberText}>
                {noteCount - indexInReversedList}
              </Text>
            </View>
          </View>

          {item.location && (
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}

          <View style={styles.noteContent}>
            {item.isAudio ? (
              <View style={styles.audioNoteContainer}>
                <Text style={styles.audioIcon}>🎵</Text>
                <Text style={styles.noteText}>{item.text}</Text>
              </View>
            ) : (
              <Text style={styles.noteText}>{item.text}</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const EditModal = ({
  visible,
  onClose,
  editText,
  onEditTextChange,
  onSave,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Note</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.editTextInput}
          value={editText}
          onChangeText={onEditTextChange}
          multiline={true}
          placeholder="Edit your note..."
          autoFocus={true}
        />
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={onSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const ManualNoteModal = ({
  visible,
  onClose,
  noteText,
  onNoteTextChange,
  onSave,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create New Note</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.editTextInput}
          value={noteText}
          onChangeText={onNoteTextChange}
          multiline={true}
          placeholder="Type your note here..."
          autoFocus={true}
        />
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={onSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const IntroGuideModal = ({ visible, onClose }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.introModalOverlay}>
      <View style={styles.introModalContent}>
        <View style={styles.introHeader}>
          <Text style={styles.introTitle}>Welcome to Lights Notes! 🎤</Text>
        </View>

        <View style={styles.introBody}>
          <View style={styles.introFeature}>
            <Text style={styles.introFeatureIcon}>🎙️</Text>
            <View style={styles.introFeatureText}>
              <Text style={styles.introFeatureTitle}>Voice Recording</Text>
              <Text style={styles.introFeatureDesc}>
                Tap the microphone to record voice notes instantly
              </Text>
            </View>
          </View>

          <View style={styles.introFeature}>
            <Text style={styles.introFeatureIcon}>📍</Text>
            <View style={styles.introFeatureText}>
              <Text style={styles.introFeatureTitle}>Location Tagging</Text>
              <Text style={styles.introFeatureDesc}>
                Each note is automatically tagged with your current location
              </Text>
            </View>
          </View>

          <View style={styles.introFeature}>
            <Text style={styles.introFeatureIcon}>✏️</Text>
            <View style={styles.introFeatureText}>
              <Text style={styles.introFeatureTitle}>Easy Editing</Text>
              <Text style={styles.introFeatureDesc}>
                Swipe right to edit notes, swipe left to delete
              </Text>
            </View>
          </View>

          <View style={styles.introFeature}>
            <Text style={styles.introFeatureIcon}>🎵</Text>
            <View style={styles.introFeatureText}>
              <Text style={styles.introFeatureTitle}>Playback</Text>
              <Text style={styles.introFeatureDesc}>
                Tap on voice notes to play them back anytime
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.introButton} onPress={onClose}>
          <Text style={styles.introButtonText}>Got it! Let's start</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// --- Enhanced Stylesheet ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: 32, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#64748b", marginBottom: 12 },
  statsContainer: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statsText: { fontSize: 14, color: "#475569", fontWeight: "600" },
  notesContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  swipeHint: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b3e5fc",
  },
  swipeHintText: { fontSize: 12, color: "#0277bd", fontWeight: "600" },
  notesList: { paddingBottom: 110 },
  swipeContainer: {
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
  },
  actionContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    zIndex: 1,
  },
  editAction: { left: 0, backgroundColor: "#10b981" },
  deleteAction: { right: 0, backgroundColor: "#ef4444" },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    minHeight: 60,
    width: 60,
  },
  actionIconImage: {
    width: 30,
    height: 30,
    tintColor: "#fff",
    resizeMode: "contain",
  },
  noteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeContainer: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  noteNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  noteNumberText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: -2,
  },
  locationIcon: { fontSize: 11, marginRight: 4 },
  locationText: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  noteContent: { marginTop: 2 },
  audioNoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  audioIcon: { fontSize: 14, marginRight: 6 },
  noteText: { fontSize: 15, lineHeight: 22, color: "#334155" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyIconText: { fontSize: 32 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { fontSize: 16, color: "#64748b", fontWeight: "600" },
  editTextInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#f8fafc",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: { backgroundColor: "#f1f5f9" },
  cancelButtonText: { color: "#64748b", fontSize: 16, fontWeight: "600" },
  saveButton: { backgroundColor: "#3b82f6" },
  saveButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },

  introModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  introModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  introHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },
  introBody: {
    marginBottom: 32,
  },
  introFeature: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  introFeatureIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  introFeatureText: {
    flex: 1,
  },
  introFeatureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  introFeatureDesc: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  introButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  introButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  floatingButtonsContainer: {
    position: "absolute",
    bottom: 90,
    right: 24,
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    zIndex: 1000,
  },
  floatingManualNoteButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingMicButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonInactive: { backgroundColor: "#3b82f6" },
  micButtonActive: { backgroundColor: "transparent" },
  micLottie: { width: 90, height: 90 },
  manualNoteLottie: { width: 70, height: 70 },
});
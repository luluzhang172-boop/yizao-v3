import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Analytics } from "./src/screens/Analytics";
import { Home } from "./src/screens/Home";
import { LevelMapScreen } from "./src/screens/LevelMapScreen";
import { QuestionBankDiagnosticsScreen } from "./src/screens/QuestionBankDiagnosticsScreen";
import { Quiz } from "./src/screens/Quiz";
import { Review } from "./src/screens/Review";
import { SubjectSelectScreen } from "./src/screens/SubjectSelectScreen";
import { useLearningStore } from "./src/store/learningStore";
import { theme } from "./src/theme/theme";

export type ScreenName =
  | "home"
  | "levels"
  | "subjects"
  | "quiz"
  | "review"
  | "analytics"
  | "diagnostics";

const tabs: Array<{ key: ScreenName; label: string }> = [
  { key: "home", label: "首页" },
  { key: "levels", label: "闯关" },
  { key: "review", label: "复习" },
  { key: "analytics", label: "分析" }
];

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("home");
  const hydrate = useLearningStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.outer}>
          <View style={styles.shell}>
            <View style={styles.content}>
              {screen === "home" && <Home navigate={setScreen} />}
              {screen === "levels" && <LevelMapScreen navigate={setScreen} />}
              {screen === "subjects" && <SubjectSelectScreen navigate={setScreen} />}
              {screen === "quiz" && <Quiz navigate={setScreen} />}
              {screen === "review" && <Review navigate={setScreen} />}
              {screen === "analytics" && <Analytics />}
              {screen === "diagnostics" && (
                <QuestionBankDiagnosticsScreen navigate={setScreen} />
              )}
            </View>

            <View style={styles.tabs}>
              {tabs.map((tab) => {
                const active = screen === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setScreen(tab.key)}
                    style={[styles.tab, active && styles.activeTab]}
                  >
                    <Text style={[styles.tabText, active && styles.activeTabText]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  outer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.background
  },
  shell: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    backgroundColor: theme.colors.background
  },
  content: {
    flex: 1,
    paddingTop: theme.spacing.md
  },
  tabs: {
    flexDirection: "row",
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1
  },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1EADF"
  },
  activeTab: {
    backgroundColor: theme.colors.primary
  },
  tabText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "900"
  },
  activeTabText: {
    color: "#ffffff"
  }
});

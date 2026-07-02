import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Analytics } from "./src/screens/Analytics";
import { Home } from "./src/screens/Home";
import { QuestionBankDiagnosticsScreen } from "./src/screens/QuestionBankDiagnosticsScreen";
import { Quiz } from "./src/screens/Quiz";
import { Review } from "./src/screens/Review";
import { SubjectSelectScreen } from "./src/screens/SubjectSelectScreen";
import { useLearningStore } from "./src/store/learningStore";

export type ScreenName =
  | "home"
  | "subjects"
  | "quiz"
  | "review"
  | "analytics"
  | "diagnostics";

const tabs: Array<{ key: ScreenName; label: string }> = [
  { key: "home", label: "首页" },
  { key: "subjects", label: "科目" },
  { key: "quiz", label: "刷题" },
  { key: "analytics", label: "分析" },
  { key: "diagnostics", label: "诊断" }
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
        <View style={styles.shell}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Exam Performance Engine</Text>
              <Text style={styles.title}>一造通关指南 V3</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>四个月通关提分系统</Text>
            </View>
          </View>

          <View style={styles.content}>
            {screen === "home" && <Home navigate={setScreen} />}
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fb"
  },
  shell: {
    flex: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  kicker: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900"
  },
  badge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8
  },
  badgeText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "800"
  },
  content: {
    flex: 1
  },
  tabs: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
    backgroundColor: "#ffffff",
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9"
  },
  activeTab: {
    backgroundColor: "#111827"
  },
  tabText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800"
  },
  activeTabText: {
    color: "#ffffff"
  }
});

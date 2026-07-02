import { isToday } from "date-fns";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { useLearningStore } from "../store/learningStore";
import { subjectLabels, subjects } from "../types/question";
import { Metric, Page, Panel, SectionTitle } from "./shared";

export function Home({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const questions = useLearningStore((state) => state.questions);
  const stats = useLearningStore((state) => state.questionStats);
  const progress = useLearningStore((state) => state.progress);
  const errorRecords = useLearningStore((state) => state.errorRecords);
  const startSession = useLearningStore((state) => state.startSession);
  const dueSRSIds = useLearningStore((state) => state.getDueSRSQuestionIds());

  const todayAnswered = progress.answerLogs.filter((log) =>
    isToday(log.timestamp)
  ).length;
  const accuracy = progress.answerLogs.length
    ? Math.round(
        (progress.answerLogs.filter((log) => log.correct).length /
          progress.answerLogs.length) *
          100
      )
    : 0;
  const wrongCount = progress.wrongQuestionIds.length;

  const begin = (mode: "daily" | "frequency" | "wrong") => {
    startSession({ mode, limit: 30 });
    navigate(mode === "wrong" ? "review" : "quiz");
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <Text style={styles.kicker}>一造通关指南 V3</Text>
          <SectionTitle>四个月通关提分系统</SectionTitle>
          <View style={styles.metrics}>
            <Metric label="题库总数" value={stats.total} tone="dark" />
            <Metric label="已完成" value={progress.answeredQuestionIds.length} tone="green" />
            <Metric label="今日已做" value={todayAnswered} tone="blue" />
          </View>
          <View style={styles.metrics}>
            <Metric label="正确率" value={`${accuracy}%`} tone="green" />
            <Metric label="错题数" value={wrongCount} tone="red" />
            <Metric label="SRS到期" value={dueSRSIds.length} tone="blue" />
          </View>
        </Panel>

        <Panel>
          <SectionTitle>各科题量</SectionTitle>
          <View style={styles.subjectGrid}>
            {subjects.map((subject) => (
              <View key={subject} style={styles.subjectCard}>
                <Text style={styles.subjectName}>{subjectLabels[subject]}</Text>
                <Text style={styles.subjectCount}>{stats.bySubject[subject] ?? 0}题</Text>
              </View>
            ))}
          </View>
        </Panel>

        <Panel>
          <SectionTitle>学习模式</SectionTitle>
          <Pressable style={styles.primary} onPress={() => begin("daily")}>
            <Text style={styles.primaryText}>开始今日任务</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => navigate("subjects")}>
            <Text style={styles.secondaryText}>按科目刷题</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => begin("frequency")}>
            <Text style={styles.secondaryText}>高频题训练</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              if (wrongCount > 0 || dueSRSIds.length > 0) begin("wrong");
              else navigate("review");
            }}
          >
            <Text style={styles.secondaryText}>错题复习</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => navigate("diagnostics")}>
            <Text style={styles.secondaryText}>题库诊断</Text>
          </Pressable>
        </Panel>

        <Panel>
          <SectionTitle>题库健康</SectionTitle>
          <Text style={styles.line}>有效选择题：{stats.validChoice}</Text>
          <Text style={styles.line}>无选项题：{stats.noOptions}</Text>
          <Text style={styles.line}>重复 ID 修复：{stats.duplicateCount}</Text>
          <Text style={styles.line}>平均 confidence：{stats.avgConfidence}</Text>
          <Text style={styles.line}>当前错题记录：{Object.keys(errorRecords).length}</Text>
        </Panel>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: "#0369a1",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6
  },
  metrics: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  subjectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  subjectCard: {
    width: "31%",
    minWidth: 96,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 12
  },
  subjectName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900"
  },
  subjectCount: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  primary: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  secondary: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  secondaryText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "900"
  },
  line: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 24
  }
});

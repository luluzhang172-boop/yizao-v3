import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLearningStore } from "../store/learningStore";
import { subjectLabels, subjects } from "../types/question";
import { Metric, Page, Panel, SectionTitle } from "./shared";

export function Analytics() {
  const progress = useLearningStore((state) => state.progress);
  const questions = useLearningStore((state) => state.questions);
  const totalLogs = progress.answerLogs.length;
  const correctLogs = progress.answerLogs.filter((log) => log.correct).length;
  const accuracy = totalLogs ? Math.round((correctLogs / totalLogs) * 100) : 0;

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.metrics}>
          <Metric label="已做题" value={progress.answeredQuestionIds.length} tone="dark" />
          <Metric label="正确率" value={`${accuracy}%`} tone="green" />
          <Metric label="错题数" value={progress.wrongQuestionIds.length} tone="red" />
        </View>

        <Panel>
          <SectionTitle>各科正确率</SectionTitle>
          {subjects.map((subject) => {
            const subjectTotal = questions.filter((q) => q.subject === subject).length;
            const logs = progress.answerLogs.filter((log) => log.subject === subject);
            const subjectAccuracy = logs.length
              ? Math.round((logs.filter((log) => log.correct).length / logs.length) * 100)
              : 0;
            return (
              <View key={subject} style={styles.row}>
                <Text style={styles.label}>{subjectLabels[subject]}（{subjectTotal}题）</Text>
                <Text style={styles.value}>{logs.length}次 / {subjectAccuracy}%</Text>
              </View>
            );
          })}
        </Panel>

        <Panel>
          <SectionTitle>最近答题</SectionTitle>
          {progress.answerLogs.slice(-10).reverse().map((log) => (
            <View key={`${log.questionId}-${log.timestamp}`} style={styles.row}>
              <Text numberOfLines={1} style={styles.label}>
                {subjectLabels[log.subject]} · {log.mode}
              </Text>
              <Text style={[styles.value, log.correct ? styles.ok : styles.bad]}>
                {log.correct ? "正确" : "错误"}
              </Text>
            </View>
          ))}
          {progress.answerLogs.length === 0 && (
            <Text style={styles.empty}>暂无答题记录。</Text>
          )}
        </Panel>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  row: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    gap: 12
  },
  label: {
    flex: 1,
    color: "#334155",
    fontSize: 14,
    fontWeight: "800"
  },
  value: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900"
  },
  ok: {
    color: "#166534"
  },
  bad: {
    color: "#991b1b"
  },
  empty: {
    color: "#64748b",
    fontWeight: "700",
    lineHeight: 22
  }
});

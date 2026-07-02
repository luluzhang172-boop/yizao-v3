import { ScrollView, StyleSheet, Text, View } from "react-native";
import { buildLevelNodes } from "../core/levelEngine";
import { getLevelFromXp, useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { subjectLabels, subjects } from "../types/question";
import { Metric, Page, Panel, SectionTitle } from "./shared";

export function Analytics() {
  const progress = useLearningStore((state) => state.progress);
  const questions = useLearningStore((state) => state.questions);
  const logs = progress.answerLogs;
  const accuracy = logs.length
    ? Math.round((logs.filter((log) => log.correct).length / logs.length) * 100)
    : 0;
  const nodes = buildLevelNodes(questions, progress);
  const completedLevels = nodes.filter((node) => node.completed).length;
  const singleLogs = logs.filter((log) => log.questionType === "single_choice");
  const multiLogs = logs.filter((log) => log.questionType === "multiple_choice");
  const singleAccuracy = singleLogs.length
    ? Math.round((singleLogs.filter((log) => log.correct).length / singleLogs.length) * 100)
    : 0;
  const multiAccuracy = multiLogs.length
    ? Math.round((multiLogs.filter((log) => log.correct).length / multiLogs.length) * 100)
    : 0;
  const worstSubject = subjects
    .map((subject) => {
      const subjectLogs = logs.filter((log) => log.subject === subject);
      const wrong = subjectLogs.filter((log) => !log.correct).length;
      return { subject, wrong };
    })
    .sort((a, b) => b.wrong - a.wrong)[0];

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.metrics}>
          <Metric label="总题数" value={questions.length} tone="primary" />
          <Metric label="已做" value={progress.answeredQuestionIds.length} tone="success" />
          <Metric label="正确率" value={`${accuracy}%`} tone="accent" />
        </View>
        <View style={styles.metrics}>
          <Metric label="XP" value={progress.xp} tone="primary" />
          <Metric label="Level" value={getLevelFromXp(progress.xp)} tone="secondary" />
          <Metric label="Streak" value={`${progress.streak}天`} tone="success" />
        </View>

        <Panel>
          <SectionTitle>题型表现</SectionTitle>
          <Text style={styles.line}>单选题正确率：{singleAccuracy}%</Text>
          <Text style={styles.line}>多选题正确率：{multiAccuracy}%</Text>
          <Text style={styles.line}>已完成关卡：{completedLevels}</Text>
          <Text style={styles.line}>
            错题最多科目：{worstSubject ? subjectLabels[worstSubject.subject] : "暂无"}
          </Text>
        </Panel>

        <Panel>
          <SectionTitle>各科正确率</SectionTitle>
          {subjects.map((subject) => {
            const subjectLogs = logs.filter((log) => log.subject === subject);
            const subjectAccuracy = subjectLogs.length
              ? Math.round((subjectLogs.filter((log) => log.correct).length / subjectLogs.length) * 100)
              : 0;
            return (
              <View key={subject} style={styles.row}>
                <Text style={styles.label}>{subjectLabels[subject]}</Text>
                <Text style={styles.value}>{subjectLogs.length}次 / {subjectAccuracy}%</Text>
              </View>
            );
          })}
        </Panel>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  line: {
    color: theme.colors.muted,
    fontWeight: "800",
    lineHeight: 24
  },
  row: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1
  },
  label: {
    color: theme.colors.text,
    fontWeight: "900"
  },
  value: {
    color: theme.colors.primary,
    fontWeight: "900"
  }
});

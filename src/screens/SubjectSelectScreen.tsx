import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { canUseInLevel } from "../core/questionBank";
import { useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { Subject, subjectLabels, subjects } from "../types/question";
import { Page, Panel, SectionTitle } from "./shared";

export function SubjectSelectScreen({
  navigate
}: {
  navigate: (screen: ScreenName) => void;
}) {
  const questions = useLearningStore((state) => state.questions);
  const progress = useLearningStore((state) => state.progress);
  const startSession = useLearningStore((state) => state.startSession);

  const getSubjectStats = (subject: Subject) => {
    const subjectQuestions = questions.filter(
      (question) => question.subject === subject && canUseInLevel(question)
    );
    const subjectIds = new Set(subjectQuestions.map((question) => question.id));
    const logs = progress.answerLogs.filter((log) => log.subject === subject);
    const answered = progress.answeredQuestionIds.filter((id) => subjectIds.has(id)).length;
    const accuracy = logs.length
      ? Math.round((logs.filter((log) => log.correct).length / logs.length) * 100)
      : 0;
    return { total: subjectQuestions.length, answered, accuracy };
  };

  const begin = (subject: Subject) => {
    startSession({ mode: "subject", subject, limit: 30 });
    navigate("quiz");
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <SectionTitle>按科目刷题</SectionTitle>
          <Text style={styles.note}>选择一个科目，系统会固定生成 30 题 session，连续做题不重复。</Text>
        </Panel>
        {subjects
          .filter((subject) => subject !== "unknown" && subject !== "case")
          .map((subject) => {
            const item = getSubjectStats(subject);
            return (
              <Pressable key={subject} style={styles.card} onPress={() => begin(subject)}>
                <View>
                  <Text style={styles.name}>{subjectLabels[subject]}</Text>
                  <Text style={styles.meta}>总题数：{item.total}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.meta}>已做 {item.answered}</Text>
                  <Text style={styles.accuracy}>正确率 {item.accuracy}%</Text>
                </View>
              </Pressable>
            );
          })}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  note: {
    color: theme.colors.muted,
    lineHeight: 22,
    fontWeight: "700"
  },
  card: {
    minHeight: 92,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  name: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  right: {
    alignItems: "flex-end"
  },
  accuracy: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4
  }
});

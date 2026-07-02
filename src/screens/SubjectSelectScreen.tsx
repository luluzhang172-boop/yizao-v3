import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { useLearningStore } from "../store/learningStore";
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
    const subjectQuestions = questions.filter((question) => question.subject === subject);
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
          <Text style={styles.note}>选择一个科目后，系统会生成固定 30 题 session，不会重复回到第一题。</Text>
        </Panel>
        {subjects
          .filter((subject) => subject !== "unknown")
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
    color: "#64748b",
    lineHeight: 21,
    fontWeight: "700"
  },
  card: {
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  name: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900"
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  right: {
    alignItems: "flex-end"
  },
  accuracy: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4
  }
});

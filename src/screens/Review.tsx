import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { canUseInLevel } from "../core/questionBank";
import { useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { Metric, Page, Panel, SectionTitle } from "./shared";

export function Review({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const questions = useLearningStore((state) => state.questions);
  const progress = useLearningStore((state) => state.progress);
  const errorRecords = useLearningStore((state) => state.errorRecords);
  const dueSRSIds = useLearningStore((state) => state.getDueSRSQuestionIds());
  const startSession = useLearningStore((state) => state.startSession);

  const highFrequencyWrong = progress.wrongQuestionIds.filter((id) => {
    const question = questions.find((item) => item.id === id);
    return Boolean(question && canUseInLevel(question) && question.frequencyScore >= 70);
  }).length;
  const available = progress.wrongQuestionIds.length + dueSRSIds.length;

  const startReview = () => {
    const due = new Set(dueSRSIds);
    const wrong = new Set(progress.wrongQuestionIds);
    const ids = questions
      .filter((question) => canUseInLevel(question) && (due.has(question.id) || wrong.has(question.id)))
      .sort((a, b) => {
        const dueA = due.has(a.id) ? 1 : 0;
        const dueB = due.has(b.id) ? 1 : 0;
        if (dueA !== dueB) return dueB - dueA;
        const weight =
          (errorRecords[b.id]?.errorWeight ?? b.errorWeight) -
          (errorRecords[a.id]?.errorWeight ?? a.errorWeight);
        if (weight !== 0) return weight;
        return b.frequencyScore - a.frequencyScore;
      })
      .map((question) => question.id);
    startSession({ mode: "wrong", questionIds: ids, limit: 30 });
    navigate("quiz");
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.metrics}>
          <Metric label="到期复习" value={dueSRSIds.length} tone="primary" />
          <Metric label="错题数" value={progress.wrongQuestionIds.length} tone="danger" />
          <Metric label="高频错题" value={highFrequencyWrong} tone="accent" />
        </View>

        {available === 0 ? (
          <Panel>
            <SectionTitle>今天没有到期复习，去闯一关吧。</SectionTitle>
            <Text style={styles.body}>完成关卡可以获得 XP，并推进你的连续学习记录。</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigate("levels")}>
              <Text style={styles.primaryText}>去闯关</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                startSession({ mode: "frequency", limit: 30 });
                navigate("quiz");
              }}
            >
              <Text style={styles.secondaryText}>高频训练</Text>
            </Pressable>
          </Panel>
        ) : (
          <Panel>
            <SectionTitle>复习队列已准备好</SectionTitle>
            <Text style={styles.body}>优先级：SRS 到期 → errorWeight 高 → frequencyScore 高。</Text>
            <Pressable style={styles.primaryButton} onPress={startReview}>
              <Text style={styles.primaryText}>开始复习</Text>
            </Pressable>
          </Panel>
        )}
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
  body: {
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 23
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm
  },
  secondaryText: {
    color: theme.colors.primary,
    fontWeight: "900"
  }
});

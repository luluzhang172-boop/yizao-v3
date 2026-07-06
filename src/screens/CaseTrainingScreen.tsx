import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getCaseQuestions, getCaseStats, getNextCaseQuestion } from "../core/caseEngine";
import { useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { Page, Panel, ProgressBar, SectionTitle } from "./shared";

export function CaseTrainingScreen() {
  const questions = useLearningStore((state) => state.questions);
  const progress = useLearningStore((state) => state.progress);
  const markCaseMastered = useLearningStore((state) => state.markCaseMastered);
  const markCaseWeak = useLearningStore((state) => state.markCaseWeak);
  const cases = useMemo(() => getCaseQuestions(questions), [questions]);
  const [currentId, setCurrentId] = useState(
    () => getNextCaseQuestion(questions, progress)?.id
  );
  const [showExplanation, setShowExplanation] = useState(false);
  const stats = getCaseStats(questions, progress);
  const current = cases.find((question) => question.id === currentId) ?? cases[0];
  const progressValue = stats.total
    ? Math.round((stats.mastered / stats.total) * 100)
    : 0;

  const moveNext = () => {
    const next = cases.find(
      (question) =>
        question.id !== current?.id &&
        !progress.caseProgress.masteredCaseIds.includes(question.id)
    );
    setShowExplanation(false);
    setCurrentId(next?.id ?? current?.id);
  };

  if (!current) {
    return (
      <Page>
        <Panel>
          <SectionTitle>暂无案例题</SectionTitle>
          <Text style={styles.body}>当前题库没有识别到案例训练题。</Text>
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <SectionTitle>案例专项训练</SectionTitle>
          <Text style={styles.body}>
            已掌握 {stats.mastered} / {stats.total} · 需要复习 {stats.weak}
          </Text>
          <View style={styles.progressBlock}>
            <ProgressBar value={progressValue} />
          </View>
        </Panel>

        <Panel>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>案例</Text>
            <Text style={styles.tag}>{current.year ?? "未知年份"}</Text>
            <Text style={styles.tag}>confidence {current.confidence}</Text>
          </View>
          <SectionTitle>{current.stem}</SectionTitle>

          {current.subQuestions?.length ? (
            <View style={styles.steps}>
              {current.subQuestions.map((item, index) => (
                <Text key={`${current.id}-${index}`} style={styles.step}>
                  {index + 1}. {item}
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.steps}>
              <Text style={styles.step}>1. 先拆背景、主体、时间、费用口径。</Text>
              <Text style={styles.step}>2. 再定位考点，列公式或判断依据。</Text>
              <Text style={styles.step}>3. 最后对照解析补齐失分点。</Text>
            </View>
          )}

          <Pressable
            style={styles.secondaryButton}
            onPress={() => setShowExplanation((value) => !value)}
          >
            <Text style={styles.secondaryText}>
              {showExplanation ? "收起解析" : "查看解析"}
            </Text>
          </Pressable>
        </Panel>

        {showExplanation && (
          <Panel>
            <SectionTitle>解析</SectionTitle>
            <Text style={styles.body}>{current.explanation || "暂无解析"}</Text>
          </Panel>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              markCaseMastered(current.id);
              moveNext();
            }}
          >
            <Text style={styles.primaryText}>我已掌握</Text>
          </Pressable>
          <Pressable
            style={styles.weakButton}
            onPress={() => {
              markCaseWeak(current.id);
              moveNext();
            }}
          >
            <Text style={styles.primaryText}>需要复习</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  body: {
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 23
  },
  progressBlock: {
    marginTop: theme.spacing.md
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm
  },
  tag: {
    color: theme.colors.text,
    backgroundColor: "#F1EADF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  steps: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm
  },
  step: {
    color: theme.colors.text,
    fontWeight: "800",
    lineHeight: 23
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center"
  },
  weakButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center"
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
    marginTop: theme.spacing.md
  },
  secondaryText: {
    color: theme.colors.primary,
    fontWeight: "900"
  }
});

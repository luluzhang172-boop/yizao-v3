import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { LearningMode } from "../types/progress";
import { QuestionType, subjectLabels } from "../types/question";
import { Page, Panel, ProgressBar, SectionTitle } from "./shared";

const modeLabels: Record<LearningMode, string> = {
  daily: "今日任务",
  subject: "按科目",
  frequency: "高频训练",
  wrong: "错题复习",
  level: "闯关"
};

const typeLabels: Record<QuestionType, string> = {
  single_choice: "单选",
  multiple_choice: "多选",
  judgement: "判断",
  case: "案例",
  unknown: "未知"
};

export function Quiz({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const questions = useLearningStore((state) => state.questions);
  const progress = useLearningStore((state) => state.progress);
  const activeSession = useLearningStore((state) => state.activeSession);
  const startSession = useLearningStore((state) => state.startSession);
  const answerCurrentQuestion = useLearningStore((state) => state.answerCurrentQuestion);
  const skipCurrentQuestion = useLearningStore((state) => state.skipCurrentQuestion);
  const nextQuestion = useLearningStore((state) => state.nextQuestion);
  const finishSession = useLearningStore((state) => state.finishSession);

  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [viewingExplanation, setViewingExplanation] = useState(false);

  const question = useMemo(() => {
    if (!activeSession) return undefined;
    const questionId = activeSession.questionIds[activeSession.currentIndex];
    return questions.find((item) => item.id === questionId);
  }, [activeSession, questions]);

  if (!activeSession) {
    return (
      <Page>
        <Panel>
          <SectionTitle>暂无学习 Session</SectionTitle>
          <Text style={styles.body}>请选择今日任务、闯关或科目训练开始。</Text>
        </Panel>
        <Pressable
          style={styles.primaryButton}
          onPress={() => startSession({ mode: "daily", limit: 30 })}
        >
          <Text style={styles.primaryText}>开始今日任务</Text>
        </Pressable>
      </Page>
    );
  }

  const total = activeSession.questionIds.length;
  const currentNumber = Math.min(activeSession.currentIndex + 1, total);
  const progressValue = total ? Math.round((currentNumber / total) * 100) : 0;
  const sessionLogs = progress.answerLogs.filter(
    (log) =>
      activeSession.questionIds.includes(log.questionId) &&
      log.timestamp >= activeSession.startedAt
  );
  const sessionCorrect = sessionLogs.filter((log) => log.correct).length;
  const sessionAccuracy = sessionLogs.length
    ? Math.round((sessionCorrect / sessionLogs.length) * 100)
    : 0;
  const levelResult = activeSession.levelId
    ? progress.levelResults[activeSession.levelId]
    : undefined;

  if (activeSession.completedAt || !question) {
    return (
      <Page>
        <Panel>
          <SectionTitle>本轮完成</SectionTitle>
          <Text style={styles.summaryTitle}>{modeLabels[activeSession.mode]}</Text>
          <Text style={styles.body}>完成题数：{total}</Text>
          <Text style={styles.body}>本轮正确率：{sessionAccuracy}%</Text>
          {activeSession.mode === "level" && (
            <Text style={styles.stars}>
              星级：{levelResult ? "★".repeat(levelResult.stars) + "☆".repeat(3 - levelResult.stars) : "未通关"}
            </Text>
          )}
          <Text style={styles.body}>当前 XP：{progress.xp}</Text>
          <Text style={styles.body}>下一关已按星级自动解锁。</Text>
        </Panel>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            finishSession();
            navigate(activeSession.mode === "level" ? "levels" : "home");
          }}
        >
          <Text style={styles.primaryText}>继续学习</Text>
        </Pressable>
      </Page>
    );
  }

  const optionEntries = question.options ? Object.entries(question.options) : [];
  const isMultiple = question.type === "multiple_choice";
  const canSubmit = selected.length > 0 || !question.options;

  const toggleOption = (key: string) => {
    if (submitted) return;
    if (isMultiple) {
      setSelected((current) =>
        current.includes(key)
          ? current.filter((item) => item !== key)
          : [...current, key].sort()
      );
      return;
    }
    setSelected([key]);
  };

  const submit = () => {
    if (!canSubmit || submitted) return;
    const result = answerCurrentQuestion({ selectedAnswer: selected });
    setCorrect(result);
    setSubmitted(true);
  };

  const showExplanation = () => {
    setViewingExplanation(true);
    setSubmitted(true);
  };

  const next = () => {
    setSelected([]);
    setSubmitted(false);
    setCorrect(false);
    setViewingExplanation(false);
    nextQuestion();
  };

  const skip = () => {
    setSelected([]);
    setSubmitted(false);
    setCorrect(false);
    setViewingExplanation(false);
    skipCurrentQuestion();
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <View style={styles.topRow}>
            <Text style={styles.mode}>{modeLabels[activeSession.mode]}</Text>
            <Text style={styles.count}>第 {currentNumber} / {total} 题</Text>
          </View>
          <ProgressBar value={progressValue} />
          <Text style={styles.body}>
            {subjectLabels[question.subject]} · 总题库进度 {progress.answeredQuestionIds.length} / {questions.length}
          </Text>
        </Panel>

        <Panel>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>{subjectLabels[question.subject]}</Text>
            <Text style={styles.tag}>{question.year ?? "未知年份"}</Text>
            <Text style={styles.tag}>{typeLabels[question.type]}</Text>
            <Text style={styles.tag}>频率 {question.frequencyScore}</Text>
          </View>
          <SectionTitle>{question.stem}</SectionTitle>

          {question.options ? (
            optionEntries.map(([key, value]) => {
              const picked = selected.includes(key);
              const isRight = submitted && question.normalizedAnswer.includes(key);
              const isWrongPick = submitted && picked && !question.normalizedAnswer.includes(key);
              return (
                <Pressable
                  key={key}
                  disabled={submitted}
                  onPress={() => toggleOption(key)}
                  style={[
                    styles.option,
                    picked && styles.picked,
                    isRight && styles.rightOption,
                    isWrongPick && styles.wrongOption
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      (picked || isRight || isWrongPick) && styles.lightText
                    ]}
                  >
                    {key}. {value}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.body}>本题暂无选择项，可能是案例题或解析题。</Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.miniButton} onPress={showExplanation}>
                  <Text style={styles.miniText}>查看解析</Text>
                </Pressable>
                <Pressable style={styles.lightButton} onPress={skip}>
                  <Text style={styles.lightTextButton}>跳过本题</Text>
                </Pressable>
              </View>
            </View>
          )}

          {question.options && !submitted && (
            <Pressable
              disabled={!canSubmit}
              style={[styles.primaryButton, !canSubmit && styles.disabled]}
              onPress={submit}
            >
              <Text style={styles.primaryText}>提交答案</Text>
            </Pressable>
          )}
        </Panel>

        {submitted && (
          <Panel>
            <SectionTitle>
              {viewingExplanation ? "解析" : correct ? "回答正确 +10 XP" : "回答错误，已加入错题"}
            </SectionTitle>
            <Text style={styles.answerLine}>
              正确答案：{question.normalizedAnswer.join(", ") || question.answer}
            </Text>
            <Text style={styles.answerLine}>
              我的答案：{selected.length ? selected.join(", ") : "未作答"}
            </Text>
            <Text style={styles.body}>{question.explanation || "暂无解析"}</Text>
            <Pressable style={styles.primaryButton} onPress={next}>
              <Text style={styles.primaryText}>下一题</Text>
            </Pressable>
          </Panel>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm
  },
  mode: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  count: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900"
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
  option: {
    minHeight: 54,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.card
  },
  picked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  rightOption: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success
  },
  wrongOption: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 23
  },
  lightText: {
    color: "#ffffff"
  },
  emptyBox: {
    backgroundColor: "#FFF8E8",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
  },
  miniButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  miniText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  lightButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: "#F1EADF",
    alignItems: "center",
    justifyContent: "center"
  },
  lightTextButton: {
    color: theme.colors.muted,
    fontWeight: "900"
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md
  },
  disabled: {
    opacity: 0.5
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  answerLine: {
    color: theme.colors.text,
    fontWeight: "900",
    lineHeight: 23,
    marginBottom: 4
  },
  summaryTitle: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: theme.spacing.sm
  },
  stars: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: "900",
    marginVertical: theme.spacing.sm
  },
  body: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: theme.spacing.sm
  }
});

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { useLearningStore } from "../store/learningStore";
import { LearningMode } from "../types/progress";
import { subjectLabels } from "../types/question";
import { Metric, Page, Panel, SectionTitle } from "./shared";

const modeLabels: Record<LearningMode, string> = {
  daily: "今日任务",
  subject: "按科目刷题",
  frequency: "高频题训练",
  wrong: "错题复习"
};

export function Quiz({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const questions = useLearningStore((state) => state.questions);
  const progress = useLearningStore((state) => state.progress);
  const activeSession = useLearningStore((state) => state.activeSession);
  const startSession = useLearningStore((state) => state.startSession);
  const answerCurrentQuestion = useLearningStore(
    (state) => state.answerCurrentQuestion
  );
  const skipCurrentQuestion = useLearningStore((state) => state.skipCurrentQuestion);
  const nextQuestion = useLearningStore((state) => state.nextQuestion);
  const finishSession = useLearningStore((state) => state.finishSession);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | "view" | null>(null);

  if (!activeSession) {
    return (
      <Page>
        <Panel>
          <SectionTitle>暂无学习 Session</SectionTitle>
          <Text style={styles.body}>请选择一个学习模式开始刷题。</Text>
        </Panel>
        <Pressable
          style={styles.primary}
          onPress={() => {
            startSession({ mode: "daily", limit: 30 });
            setSelected("");
            setResult(null);
          }}
        >
          <Text style={styles.primaryText}>开始今日任务</Text>
        </Pressable>
      </Page>
    );
  }

  const currentQuestionId = activeSession.questionIds[activeSession.currentIndex];
  const question = questions.find((item) => item.id === currentQuestionId);
  const total = activeSession.questionIds.length;
  const currentNumber = Math.min(activeSession.currentIndex + 1, total);
  const sessionLogs = progress.answerLogs.filter(
    (log) =>
      activeSession.questionIds.includes(log.questionId) &&
      log.timestamp >= activeSession.startedAt
  );
  const sessionCorrect = sessionLogs.filter((log) => log.correct).length;

  if (activeSession.completedAt || !question || currentNumber > total) {
    return (
      <Page>
        <Panel>
          <SectionTitle>本轮训练完成</SectionTitle>
          <View style={styles.metrics}>
            <Metric label="本轮题数" value={total} tone="dark" />
            <Metric label="答对" value={sessionCorrect} tone="green" />
            <Metric
              label="正确率"
              value={sessionLogs.length ? `${Math.round((sessionCorrect / sessionLogs.length) * 100)}%` : "0%"}
              tone="blue"
            />
          </View>
        </Panel>
        <Pressable
          style={styles.primary}
          onPress={() => {
            finishSession();
            navigate("home");
          }}
        >
          <Text style={styles.primaryText}>返回首页</Text>
        </Pressable>
      </Page>
    );
  }

  console.log("currentQuestion", question);

  const submit = (answer: string) => {
    if (result) return;
    setSelected(answer);
    const correct = answerCurrentQuestion({ selectedAnswer: answer });
    setResult(correct ? "correct" : "wrong");
  };

  const goNext = () => {
    setSelected("");
    setResult(null);
    nextQuestion();
  };

  const skip = () => {
    setSelected("");
    setResult(null);
    skipCurrentQuestion();
  };

  const optionEntries = question.options
    ? (Object.entries(question.options) as Array<["A" | "B" | "C" | "D", string]>)
    : [];

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <View style={styles.topRow}>
            <Text style={styles.mode}>{modeLabels[activeSession.mode]}</Text>
            <Text style={styles.progress}>第 {currentNumber} / {total} 题</Text>
          </View>
          <Text style={styles.body}>
            总题库进度：{progress.answeredQuestionIds.length} / {questions.length}
          </Text>
          <Text style={styles.body}>
            当前科目：{subjectLabels[question.subject]}
          </Text>
        </Panel>

        <Panel>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>{subjectLabels[question.subject]}</Text>
            <Text style={styles.tag}>{question.year ?? "未知年份"}</Text>
            <Text style={styles.tag}>频率 {question.frequencyScore}</Text>
            <Text style={styles.tag}>置信 {question.confidence}</Text>
          </View>
          <SectionTitle>{question.stem}</SectionTitle>

          {question.options ? (
            optionEntries.map(([key, value]) => {
              const picked = selected === key;
              const isAnswer = result && key === question.answer;
              const isWrongPick = result === "wrong" && picked;
              return (
                <Pressable
                  key={key}
                  disabled={!!result}
                  onPress={() => submit(key)}
                  style={[
                    styles.option,
                    picked && styles.picked,
                    isAnswer && styles.answer,
                    isWrongPick && styles.wrong
                  ]}
                >
                  <Text style={[styles.optionText, (picked || isAnswer) && styles.lightText]}>
                    {key}. {value}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyOption}>
              <Text style={styles.emptyOptionText}>本题暂无选择项，可能是案例题或解析题</Text>
              <View style={styles.emptyActions}>
                <Pressable style={styles.smallButton} onPress={() => setResult("view")}>
                  <Text style={styles.smallButtonText}>查看解析</Text>
                </Pressable>
                <Pressable style={styles.smallButtonLight} onPress={skip}>
                  <Text style={styles.smallButtonLightText}>跳过本题</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Panel>

        {result && (
          <Panel>
            <SectionTitle>
              {result === "view" ? "解析" : result === "correct" ? "正确" : "错误"}
            </SectionTitle>
            {result !== "view" && (
              <Text style={styles.answerLine}>正确答案：{question.answer}</Text>
            )}
            <Text style={styles.body}>{question.explanation || "暂无解析"}</Text>
            <Pressable style={styles.primary} onPress={goNext}>
              <Text style={styles.primaryText}>下一题</Text>
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
    gap: 8,
    marginTop: 8
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8
  },
  mode: {
    color: "#0369a1",
    fontSize: 16,
    fontWeight: "900"
  },
  progress: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10
  },
  tag: {
    color: "#334155",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "800"
  },
  option: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    marginTop: 8,
    backgroundColor: "#ffffff"
  },
  picked: {
    backgroundColor: "#334155",
    borderColor: "#334155"
  },
  answer: {
    backgroundColor: "#166534",
    borderColor: "#166534"
  },
  wrong: {
    backgroundColor: "#991b1b",
    borderColor: "#991b1b"
  },
  optionText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22
  },
  lightText: {
    color: "#ffffff"
  },
  emptyOption: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 14,
    marginTop: 8,
    backgroundColor: "#f8fafc"
  },
  emptyOptionText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22
  },
  emptyActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  smallButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center"
  },
  smallButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  smallButtonLight: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center"
  },
  smallButtonLightText: {
    color: "#334155",
    fontWeight: "900"
  },
  answerLine: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8
  },
  body: {
    color: "#475569",
    lineHeight: 22,
    fontWeight: "700"
  },
  primary: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  }
});

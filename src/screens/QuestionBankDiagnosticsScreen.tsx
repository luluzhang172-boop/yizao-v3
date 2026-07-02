import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { useLearningStore } from "../store/learningStore";
import { subjectLabels } from "../types/question";
import { Metric, Page, Panel, SectionTitle } from "./shared";

type FilterMode = "sample" | "noOptions" | "lowConfidence";

export function QuestionBankDiagnosticsScreen({
  navigate
}: {
  navigate: (screen: ScreenName) => void;
}) {
  const questions = useLearningStore((state) => state.questions);
  const stats = useLearningStore((state) => state.questionStats);
  const [filter, setFilter] = useState<FilterMode>("sample");

  const sample = useMemo(() => {
    const source =
      filter === "noOptions"
        ? questions.filter((question) => !question.options)
        : filter === "lowConfidence"
          ? questions.filter((question) => question.confidence < 0.7)
          : questions;
    return source.slice(0, 10);
  }, [filter, questions]);

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.metrics}>
          <Metric label="总题数" value={stats.total} tone="dark" />
          <Metric label="选择题" value={stats.validChoice} tone="green" />
          <Metric label="无选项" value={stats.noOptions} tone="red" />
        </View>

        <Panel>
          <SectionTitle>题库质量诊断</SectionTitle>
          <Text style={styles.line}>重复题数量：{stats.duplicateCount}</Text>
          <Text style={styles.line}>平均 confidence：{stats.avgConfidence}</Text>
          <Text style={styles.line}>各科题量：{JSON.stringify(stats.bySubject)}</Text>
          <Text style={styles.line}>各年份题量：{JSON.stringify(stats.byYear)}</Text>
        </Panel>

        <Panel>
          <SectionTitle>检查样本</SectionTitle>
          <View style={styles.actions}>
            <Pressable style={styles.smallButton} onPress={() => setFilter("noOptions")}>
              <Text style={styles.smallButtonText}>只看无选项题</Text>
            </Pressable>
            <Pressable
              style={styles.smallButton}
              onPress={() => setFilter("lowConfidence")}
            >
              <Text style={styles.smallButtonText}>只看低 confidence 题</Text>
            </Pressable>
          </View>
          <Pressable style={styles.secondary} onPress={() => navigate("home")}>
            <Text style={styles.secondaryText}>返回首页</Text>
          </Pressable>
        </Panel>

        {sample.map((question) => (
          <Panel key={question.id}>
            <Text style={styles.id}>{question.id}</Text>
            <Text style={styles.line}>subject：{subjectLabels[question.subject]}</Text>
            <Text style={styles.line}>stem：{question.stem.slice(0, 120)}</Text>
            <Text style={styles.line}>
              options：{question.options ? JSON.stringify(question.options) : "null"}
            </Text>
            <Text style={styles.line}>answer：{question.answer}</Text>
            <Text style={styles.line}>confidence：{question.confidence}</Text>
          </Panel>
        ))}
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
  line: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 22
  },
  id: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6
  },
  actions: {
    flexDirection: "row",
    gap: 8
  },
  smallButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  smallButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center"
  },
  secondary: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  secondaryText: {
    color: "#334155",
    fontWeight: "900"
  }
});

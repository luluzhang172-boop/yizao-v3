import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { subjectLabels } from "../types/question";
import { Metric, Page, Panel, SectionTitle } from "./shared";

type FilterMode = "sample" | "multiple" | "noOptions" | "hasE" | "lowConfidence";

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
      filter === "multiple"
        ? questions.filter((question) => question.type === "multiple_choice")
        : filter === "noOptions"
          ? questions.filter((question) => !question.options)
          : filter === "hasE"
            ? questions.filter((question) => Boolean(question.options?.E))
            : filter === "lowConfidence"
              ? questions.filter((question) => question.confidence < 0.7)
              : questions;
    return source.slice(0, 10);
  }, [filter, questions]);

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.metrics}>
          <Metric label="总题数" value={stats.total} tone="primary" />
          <Metric label="单选" value={stats.singleChoice} tone="success" />
          <Metric label="多选" value={stats.multipleChoice} tone="accent" />
        </View>
        <View style={styles.metrics}>
          <Metric label="案例" value={stats.case} tone="secondary" />
          <Metric label="无选项" value={stats.noOptions} tone="danger" />
          <Metric label="含E" value={stats.hasEOption} tone="primary" />
        </View>

        <Panel>
          <SectionTitle>题库质量诊断</SectionTitle>
          <Text style={styles.line}>判断题数量：{stats.judgement}</Text>
          <Text style={styles.line}>D/E 粘连修复数量：{stats.deMergedFixCount}</Text>
          <Text style={styles.line}>低 confidence 数量：{stats.lowConfidence}</Text>
          <Text style={styles.line}>重复 ID 修复：{stats.duplicateCount}</Text>
          <Text style={styles.line}>平均 confidence：{stats.avgConfidence}</Text>
          <Text style={styles.line}>各科题量：{JSON.stringify(stats.bySubject)}</Text>
          <Text style={styles.line}>各年份题量：{JSON.stringify(stats.byYear)}</Text>
        </Panel>

        <Panel>
          <SectionTitle>过滤检查</SectionTitle>
          <View style={styles.actions}>
            <Pressable style={styles.filterButton} onPress={() => setFilter("multiple")}>
              <Text style={styles.filterText}>看多选题</Text>
            </Pressable>
            <Pressable style={styles.filterButton} onPress={() => setFilter("noOptions")}>
              <Text style={styles.filterText}>看无选项题</Text>
            </Pressable>
            <Pressable style={styles.filterButton} onPress={() => setFilter("hasE")}>
              <Text style={styles.filterText}>看有 E 选项题</Text>
            </Pressable>
            <Pressable style={styles.filterButton} onPress={() => setFilter("lowConfidence")}>
              <Text style={styles.filterText}>看低 confidence</Text>
            </Pressable>
          </View>
          <Pressable style={styles.backButton} onPress={() => navigate("home")}>
            <Text style={styles.backText}>返回首页</Text>
          </Pressable>
        </Panel>

        {sample.map((question) => (
          <Panel key={question.id}>
            <Text style={styles.id}>{question.id}</Text>
            <Text style={styles.line}>subject：{subjectLabels[question.subject]}</Text>
            <Text style={styles.line}>type：{question.type}</Text>
            <Text style={styles.line}>stem：{question.stem.slice(0, 120)}</Text>
            <Text style={styles.line}>
              options：{question.options ? JSON.stringify(question.options) : "null"}
            </Text>
            <Text style={styles.line}>answer：{question.answer}</Text>
            <Text style={styles.line}>normalizedAnswer：{question.normalizedAnswer.join(",")}</Text>
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
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  line: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 22
  },
  id: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  filterButton: {
    minHeight: 42,
    borderRadius: theme.radius.lg,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  filterText: {
    color: theme.colors.primary,
    fontWeight: "900"
  },
  backButton: {
    minHeight: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md
  },
  backText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});

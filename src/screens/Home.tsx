import { format, isToday } from "date-fns";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { getCaseStats } from "../core/caseEngine";
import { canUseInLevel } from "../core/questionBank";
import { getLevelFromXp, useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { subjectLabels, subjects } from "../types/question";
import { Metric, Page, Panel, ProgressBar, SectionTitle } from "./shared";

export function Home({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const questions = useLearningStore((state) => state.questions);
  const stats = useLearningStore((state) => state.questionStats);
  const progress = useLearningStore((state) => state.progress);
  const ensureDailyPlan = useLearningStore((state) => state.ensureDailyPlan);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const plan = progress.dailyPlans[todayKey];
  const caseStats = getCaseStats(questions, progress);

  useEffect(() => {
    ensureDailyPlan();
  }, [ensureDailyPlan]);

  const todayLogs = progress.answerLogs.filter((log) => isToday(log.timestamp));
  const allAccuracy = progress.answerLogs.length
    ? Math.round(
        (progress.answerLogs.filter((log) => log.correct).length /
          progress.answerLogs.length) *
          100
      )
    : 0;
  const progressValue = plan?.totalQuestions
    ? Math.round((plan.completedQuestions / plan.totalQuestions) * 100)
    : 0;
  const reviewCount =
    plan?.steps.find((step) => step.type === "review")?.questionIds.length ?? 0;
  const newCount =
    plan?.steps.find((step) => step.type === "new_level")?.questionIds.length ?? 0;
  const weakCount =
    plan?.steps.find((step) => step.type === "weak_drill")?.questionIds.length ?? 0;

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>一造通关指南 V3.2</Text>
          <Text style={styles.heroSub}>每日学习路径系统</Text>
          <Text style={styles.heroHint}>今天只需要完成这 3 步：复习、新关卡、薄弱强化。</Text>
          <Pressable style={styles.primaryButton} onPress={() => navigate("daily")}>
            <Text style={styles.primaryText}>开始今日学习</Text>
          </Pressable>
        </View>

        <Panel>
          <SectionTitle>今日目标</SectionTitle>
          <View style={styles.planRow}>
            <Text style={styles.planItem}>复习 {reviewCount} 题</Text>
            <Text style={styles.planItem}>新关卡 {newCount ? "1 个" : "0 个"}</Text>
            <Text style={styles.planItem}>强化 {weakCount} 题</Text>
          </View>
          <View style={styles.progressBlock}>
            <Text style={styles.body}>
              今日进度：{plan?.completedQuestions ?? 0} / {plan?.totalQuestions ?? 0}
            </Text>
            <ProgressBar value={progressValue} />
          </View>
        </Panel>

        <View style={styles.metrics}>
          <Metric label="连续学习" value={`${progress.streak}天`} tone="success" />
          <Metric label="Level" value={getLevelFromXp(progress.xp)} tone="primary" />
          <Metric label="XP" value={progress.xp} tone="accent" />
        </View>

        <Panel>
          <SectionTitle>学习状态</SectionTitle>
          <Text style={styles.body}>题库总数：{stats.total}</Text>
          <Text style={styles.body}>已完成题数：{progress.answeredQuestionIds.length}</Text>
          <Text style={styles.body}>今日已做：{todayLogs.length}</Text>
          <Text style={styles.body}>正确率：{allAccuracy}%</Text>
          <Text style={styles.body}>错题数：{progress.wrongQuestionIds.length}</Text>
        </Panel>

        <Panel>
          <SectionTitle>四科进度</SectionTitle>
          <View style={styles.subjectGrid}>
            {subjects
              .filter((subject) => subject !== "unknown")
              .map((subject) => {
                if (subject === "case") {
                  return (
                    <View key={subject} style={styles.subjectCard}>
                      <Text style={styles.subjectName}>{subjectLabels[subject]}</Text>
                      <Text style={styles.subjectMeta}>
                        已训练 {caseStats.mastered} / {caseStats.total}
                      </Text>
                    </View>
                  );
                }
                const subjectQuestions = questions.filter(
                  (question) => question.subject === subject && canUseInLevel(question)
                );
                const subjectIds = new Set(subjectQuestions.map((question) => question.id));
                const completed = progress.answeredQuestionIds.filter((id) =>
                  subjectIds.has(id)
                ).length;
                return (
                  <View key={subject} style={styles.subjectCard}>
                    <Text style={styles.subjectName}>{subjectLabels[subject]}</Text>
                    <Text style={styles.subjectMeta}>
                      已完成 {completed} / {subjectQuestions.length}
                    </Text>
                  </View>
                );
              })}
          </View>
        </Panel>

        <Panel>
          <SectionTitle>次级入口</SectionTitle>
          <View style={styles.linkGrid}>
            <Pressable style={styles.linkButton} onPress={() => navigate("levels")}>
              <Text style={styles.linkText}>查看关卡地图</Text>
            </Pressable>
            <Pressable style={styles.linkButton} onPress={() => navigate("case")}>
              <Text style={styles.linkText}>案例专项训练</Text>
            </Pressable>
            <Pressable style={styles.linkButton} onPress={() => navigate("analytics")}>
              <Text style={styles.linkText}>学习分析</Text>
            </Pressable>
            <Pressable style={styles.linkButton} onPress={() => navigate("diagnostics")}>
              <Text style={styles.linkText}>题库诊断</Text>
            </Pressable>
          </View>
        </Panel>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#FFF8E8",
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  heroSub: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 6
  },
  heroHint: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 10
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.lg
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  planRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  planItem: {
    flex: 1,
    color: theme.colors.text,
    backgroundColor: "#F8FBF7",
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    textAlign: "center",
    fontWeight: "900"
  },
  progressBlock: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs
  },
  body: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 23
  },
  metrics: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  subjectGrid: {
    gap: theme.spacing.sm
  },
  subjectCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: "#F8FBF7",
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: theme.spacing.md
  },
  subjectName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  subjectMeta: {
    color: theme.colors.muted,
    fontWeight: "800",
    marginTop: 4
  },
  linkGrid: {
    gap: theme.spacing.sm
  },
  linkButton: {
    minHeight: 46,
    borderRadius: theme.radius.lg,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center"
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: "900"
  }
});

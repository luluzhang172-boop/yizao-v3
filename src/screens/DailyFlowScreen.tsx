import { format, isToday } from "date-fns";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { getNextDailyStep } from "../core/dailyPlanEngine";
import { getLevelFromXp, useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { DailyPlanStep } from "../types/progress";
import { Page, Panel, ProgressBar, SectionTitle } from "./shared";

const modeForStep = (step: DailyPlanStep) => {
  if (step.type === "review") return "wrong";
  if (step.type === "weak_drill") return "weak_drill";
  return "daily";
};

export function DailyFlowScreen({
  navigate
}: {
  navigate: (screen: ScreenName) => void;
}) {
  const progress = useLearningStore((state) => state.progress);
  const ensureDailyPlan = useLearningStore((state) => state.ensureDailyPlan);
  const markDailyPlanStepCompleted = useLearningStore(
    (state) => state.markDailyPlanStepCompleted
  );
  const startSession = useLearningStore((state) => state.startSession);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const plan = progress.dailyPlans[todayKey];
  const nextStep = getNextDailyStep(plan);
  const completedSteps = plan.steps.filter((step) => step.completed).length;
  const todayLogs = progress.answerLogs.filter((log) => isToday(log.timestamp));
  const todayAccuracy = todayLogs.length
    ? Math.round((todayLogs.filter((log) => log.correct).length / todayLogs.length) * 100)
    : 0;
  const percent = plan.totalQuestions
    ? Math.round((plan.completedQuestions / plan.totalQuestions) * 100)
    : completedSteps === plan.steps.length
      ? 100
      : 0;

  useEffect(() => {
    ensureDailyPlan();
  }, [ensureDailyPlan]);

  if (!plan) {
    return (
      <Page>
        <Panel>
          <SectionTitle>正在生成今日学习路径</SectionTitle>
          <Text style={styles.body}>系统会固定今天的复习、新关卡和薄弱强化队列。</Text>
        </Panel>
      </Page>
    );
  }

  const runStep = (step: DailyPlanStep) => {
    if (step.type === "summary") {
      markDailyPlanStepCompleted(step.id);
      return;
    }
    if (step.questionIds.length === 0) {
      markDailyPlanStepCompleted(step.id);
      return;
    }
    startSession({
      mode: modeForStep(step),
      questionIds: step.questionIds,
      dailyStepId: step.id,
      limit: step.questionIds.length
    });
    navigate("quiz");
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <Text style={styles.kicker}>今天只需要完成这 3 步</Text>
          <SectionTitle>今日学习路径</SectionTitle>
          <Text style={styles.body}>
            已完成 {plan.completedQuestions} / {plan.totalQuestions} 题 · 第 {completedSteps + 1} / {plan.steps.length} 步
          </Text>
          <View style={styles.progressBlock}>
            <ProgressBar value={percent} />
          </View>
        </Panel>

        {plan.steps.map((step, index) => (
          <Panel key={step.id}>
            <View style={styles.stepTop}>
              <View style={[styles.badge, step.completed && styles.doneBadge]}>
                <Text style={styles.badgeText}>{step.completed ? "完成" : index + 1}</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.body}>{step.description}</Text>
                <Text style={styles.meta}>
                  {step.questionIds.length ? `${step.questionIds.length} 题` : "无需做题"}
                  {step.required ? " · 必做" : " · 可跳过"}
                </Text>
              </View>
            </View>
            {!step.completed && nextStep?.id === step.id && (
              <Pressable style={styles.primaryButton} onPress={() => runStep(step)}>
                <Text style={styles.primaryText}>
                  {step.type === "summary" ? "查看今日总结" : "开始这一步"}
                </Text>
              </Pressable>
            )}
          </Panel>
        ))}

        {plan.isCompleted && (
          <Panel>
            <SectionTitle>今日完成</SectionTitle>
            <Text style={styles.body}>今日完成：{todayLogs.length} 题</Text>
            <Text style={styles.body}>今日正确率：{todayAccuracy}%</Text>
            <Text style={styles.body}>XP：{progress.xp} · Level {getLevelFromXp(progress.xp)}</Text>
            <Text style={styles.body}>Streak：{progress.streak} 天</Text>
            <Text style={styles.nextHint}>明天会继续解锁下一批未做过的新题。</Text>
            <Pressable style={styles.secondaryButton} onPress={() => navigate("home")}>
              <Text style={styles.secondaryText}>返回首页</Text>
            </Pressable>
          </Panel>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: theme.colors.success,
    fontWeight: "900",
    marginBottom: theme.spacing.xs
  },
  body: {
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 23
  },
  meta: {
    color: theme.colors.primary,
    fontWeight: "900",
    marginTop: 6
  },
  progressBlock: {
    marginTop: theme.spacing.md
  },
  stepTop: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  doneBadge: {
    backgroundColor: theme.colors.success
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  stepCopy: {
    flex: 1
  },
  stepTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4
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
    fontSize: 16,
    fontWeight: "900"
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
  },
  nextHint: {
    color: theme.colors.text,
    fontWeight: "900",
    marginTop: theme.spacing.sm
  }
});

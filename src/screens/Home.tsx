import { isToday } from "date-fns";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { buildLevelNodes, getNextLevel } from "../core/levelEngine";
import { getLevelFromXp, useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { subjectLabels, subjects } from "../types/question";
import { Metric, Page, Panel, ProgressBar, SectionTitle } from "./shared";

export function Home({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const questions = useLearningStore((state) => state.questions);
  const stats = useLearningStore((state) => state.questionStats);
  const progress = useLearningStore((state) => state.progress);
  const startSession = useLearningStore((state) => state.startSession);
  const dueSRSIds = useLearningStore((state) => state.getDueSRSQuestionIds());
  const nodes = buildLevelNodes(questions, progress);
  const nextLevel = getNextLevel(nodes);

  const todayLogs = progress.answerLogs.filter((log) => isToday(log.timestamp));
  const accuracy = progress.answerLogs.length
    ? Math.round(
        (progress.answerLogs.filter((log) => log.correct).length /
          progress.answerLogs.length) *
          100
      )
    : 0;
  const todayProgress = Math.min(100, Math.round((todayLogs.length / 20) * 100));

  const startDaily = () => {
    startSession({ mode: "daily", limit: 30 });
    navigate("quiz");
  };

  const startNextLevel = () => {
    if (!nextLevel) return;
    startSession({
      mode: "level",
      subject: nextLevel.subject,
      levelId: nextLevel.id,
      questionIds: nextLevel.questionIds,
      limit: 10
    });
    navigate("quiz");
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>一造通关指南 V3.1</Text>
          <Text style={styles.heroSub}>4个月通关计划 · 今日学习建议</Text>
          <Text style={styles.heroHint}>
            先完成 20 道新题、10 道复习，再推进 1 个闯关节点。
          </Text>
        </View>

        <Panel>
          <View style={styles.rowBetween}>
            <View>
              <SectionTitle>今日任务</SectionTitle>
              <Text style={styles.body}>今日新题：20 · 今日复习：10 · 今日闯关：1关</Text>
              <Text style={styles.body}>
                推荐关卡：{nextLevel ? nextLevel.title : "已全部完成"}
              </Text>
            </View>
          </View>
          <View style={styles.progressBlock}>
            <Text style={styles.progressText}>今日完成率 {todayProgress}%</Text>
            <ProgressBar value={todayProgress} />
          </View>
          <Pressable style={styles.primaryButton} onPress={startDaily}>
            <Text style={styles.primaryText}>开始今日学习</Text>
          </Pressable>
        </Panel>

        <View style={styles.metrics}>
          <Metric label="连续学习" value={`${progress.streak}天`} tone="success" />
          <Metric label="Level" value={getLevelFromXp(progress.xp)} tone="primary" />
          <Metric label="XP" value={progress.xp} tone="accent" />
        </View>

        <Panel>
          <SectionTitle>四科进度</SectionTitle>
          <View style={styles.subjectGrid}>
            {subjects
              .filter((subject) => subject !== "unknown")
              .map((subject) => {
                const subjectQuestions = questions.filter((q) => q.subject === subject);
                const subjectIds = new Set(subjectQuestions.map((q) => q.id));
                const completed = progress.answeredQuestionIds.filter((id) =>
                  subjectIds.has(id)
                ).length;
                const logs = progress.answerLogs.filter((log) => log.subject === subject);
                const subjectAccuracy = logs.length
                  ? Math.round((logs.filter((log) => log.correct).length / logs.length) * 100)
                  : 0;
                const currentLevel =
                  nodes.find((node) => node.subject === subject && node.unlocked && !node.completed)
                    ?.order ?? 1;
                return (
                  <View key={subject} style={styles.subjectCard}>
                    <Text style={styles.subjectName}>{subjectLabels[subject]}</Text>
                    <Text style={styles.subjectMeta}>{subjectQuestions.length}题 · 已做 {completed}</Text>
                    <Text style={styles.subjectMeta}>正确率 {subjectAccuracy}% · 第 {currentLevel} 关</Text>
                  </View>
                );
              })}
          </View>
        </Panel>

        <Panel>
          <SectionTitle>快捷入口</SectionTitle>
          <Pressable style={styles.secondaryButton} onPress={startNextLevel}>
            <Text style={styles.secondaryText}>进入闯关地图</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigate("subjects")}>
            <Text style={styles.secondaryText}>按科目刷题</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              startSession({ mode: "frequency", limit: 30 });
              navigate("quiz");
            }}
          >
            <Text style={styles.secondaryText}>高频题训练</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigate("diagnostics")}>
            <Text style={styles.secondaryText}>题库诊断</Text>
          </Pressable>
        </Panel>

        <Panel>
          <SectionTitle>学习状态</SectionTitle>
          <Text style={styles.body}>题库总数：{stats.total}</Text>
          <Text style={styles.body}>已完成题数：{progress.answeredQuestionIds.length}</Text>
          <Text style={styles.body}>正确率：{accuracy}%</Text>
          <Text style={styles.body}>错题数：{progress.wrongQuestionIds.length}</Text>
          <Text style={styles.body}>SRS 到期：{dueSRSIds.length}</Text>
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
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  body: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22
  },
  progressBlock: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs
  },
  progressText: {
    color: theme.colors.text,
    fontWeight: "900"
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
  primaryButton: {
    minHeight: 54,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900"
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm
  },
  secondaryText: {
    color: theme.colors.primary,
    fontWeight: "900"
  }
});

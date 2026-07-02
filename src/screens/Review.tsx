import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { ScreenName } from "../../App";
import { useLearningStore } from "../store/learningStore";
import { Page, Panel, SectionTitle } from "./shared";

export function Review({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const progress = useLearningStore((state) => state.progress);
  const dueSRSIds = useLearningStore((state) => state.getDueSRSQuestionIds());
  const startSession = useLearningStore((state) => state.startSession);

  const available = progress.wrongQuestionIds.length + dueSRSIds.length;

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <SectionTitle>错题复习</SectionTitle>
          <Text style={styles.body}>当前错题：{progress.wrongQuestionIds.length}</Text>
          <Text style={styles.body}>今日到期 SRS：{dueSRSIds.length}</Text>
        </Panel>

        {available === 0 ? (
          <Panel>
            <SectionTitle>暂无错题</SectionTitle>
            <Text style={styles.body}>继续完成今日任务或高频题训练，答错的题会自动进入这里。</Text>
            <Pressable style={styles.secondary} onPress={() => navigate("home")}>
              <Text style={styles.secondaryText}>返回首页</Text>
            </Pressable>
          </Panel>
        ) : (
          <Pressable
            style={styles.primary}
            onPress={() => {
              startSession({ mode: "wrong", limit: 30 });
              navigate("quiz");
            }}
          >
            <Text style={styles.primaryText}>开始错题复习</Text>
          </Pressable>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: "center"
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  secondary: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12
  },
  secondaryText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "900"
  }
});

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenName } from "../../App";
import { buildLevelNodes } from "../core/levelEngine";
import { useLearningStore } from "../store/learningStore";
import { theme } from "../theme/theme";
import { subjectLabels } from "../types/question";
import { Page, Panel, SectionTitle } from "./shared";

export function LevelMapScreen({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const questions = useLearningStore((state) => state.questions);
  const progress = useLearningStore((state) => state.progress);
  const startSession = useLearningStore((state) => state.startSession);
  const nodes = buildLevelNodes(questions, progress).slice(0, 48);

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Panel>
          <SectionTitle>闯关地图</SectionTitle>
          <Text style={styles.body}>每关 10 题，通关后解锁下一关。90% 三星，75% 二星，60% 一星。</Text>
        </Panel>

        <View style={styles.map}>
          {nodes.map((node, index) => {
            const alignRight = index % 2 === 1;
            const active = node.unlocked && !node.completed;
            return (
              <View
                key={node.id}
                style={[styles.nodeRow, alignRight && styles.nodeRowRight]}
              >
                <Pressable
                  disabled={!node.unlocked}
                  onPress={() => {
                    startSession({
                      mode: "level",
                      subject: node.subject,
                      levelId: node.id,
                      questionIds: node.questionIds,
                      limit: 10
                    });
                    navigate("quiz");
                  }}
                  style={[
                    styles.node,
                    node.completed && styles.completedNode,
                    active && styles.activeNode,
                    !node.unlocked && styles.lockedNode
                  ]}
                >
                  <Text style={styles.nodeTitle}>{node.unlocked ? node.title : "锁定关卡"}</Text>
                  <Text style={styles.nodeMeta}>{subjectLabels[node.subject]} · {node.questionIds.length}题</Text>
                  <Text style={styles.stars}>
                    {node.completed ? "★".repeat(node.stars) + "☆".repeat(3 - node.stars) : node.unlocked ? "当前挑战" : "锁定"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  body: {
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 22
  },
  map: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md
  },
  nodeRow: {
    width: "100%",
    alignItems: "flex-start"
  },
  nodeRowRight: {
    alignItems: "flex-end"
  },
  node: {
    width: "78%",
    minHeight: 108,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1
  },
  activeNode: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: "#EEF4FF"
  },
  completedNode: {
    backgroundColor: "#F0FFE8",
    borderColor: theme.colors.success
  },
  lockedNode: {
    backgroundColor: "#ECE8E1",
    opacity: 0.7
  },
  nodeTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  nodeMeta: {
    color: theme.colors.muted,
    marginTop: 6,
    fontWeight: "800"
  },
  stars: {
    color: theme.colors.accent,
    marginTop: 10,
    fontWeight: "900",
    fontSize: 18
  }
});

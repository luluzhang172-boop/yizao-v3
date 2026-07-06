import { LearningProgress } from "../types/progress";
import { Question, Subject, subjectLabels, subjects } from "../types/question";
import { canUseInLevel } from "./questionBank";

export type LevelNode = {
  id: string;
  subject: Subject;
  title: string;
  description: string;
  questionIds: string[];
  unlocked: boolean;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  order: number;
};

const questionsPerLevel = 10;

export function starsFromAccuracy(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.75) return 2;
  if (accuracy >= 0.6) return 1;
  return 0;
}

export function buildLevelNodes(
  questions: Question[],
  progress: LearningProgress
): LevelNode[] {
  const nodes: LevelNode[] = [];

  subjects
    .filter((subject) => subject !== "unknown")
    .forEach((subject) => {
      const subjectQuestions = questions.filter(
        (question) => question.subject === subject && canUseInLevel(question)
      );
      for (let index = 0; index < subjectQuestions.length; index += questionsPerLevel) {
        const chunk = subjectQuestions.slice(index, index + questionsPerLevel);
        const levelNumber = Math.floor(index / questionsPerLevel) + 1;
        if (chunk.length === 0) continue;

        const id = `${subject}-level-${levelNumber}`;
        const previousId = `${subject}-level-${levelNumber - 1}`;
        const result = progress.levelResults[id];
        const previousDone = levelNumber === 1 || Boolean(progress.levelResults[previousId]);

        nodes.push({
          id,
          subject,
          title: `${subjectLabels[subject]} Level ${levelNumber}`,
          description: `完成 ${chunk.length} 道题，解锁下一关`,
          questionIds: chunk.map((question) => question.id),
          unlocked: previousDone,
          completed: Boolean(result),
          stars: result?.stars ?? 0,
          order: levelNumber
        });
      }
    });

  return nodes;
}

export function getNextLevel(nodes: LevelNode[]) {
  return nodes.find((node) => node.unlocked && !node.completed) ?? nodes[0];
}

export function getLevelForQuestionIds(nodes: LevelNode[], ids: string[]) {
  const key = ids.join("|");
  return nodes.find((node) => node.questionIds.join("|") === key);
}

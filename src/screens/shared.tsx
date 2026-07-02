import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme/theme";

export function Page({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.max(0, Math.min(100, value))}%` as `${number}%` }
        ]}
      />
    </View>
  );
}

export function Metric({
  label,
  value,
  tone = "primary"
}: {
  label: string;
  value: string | number;
  tone?: "primary" | "secondary" | "success" | "danger" | "accent";
}) {
  return (
    <View style={[styles.metric, styles[tone]]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm
  },
  panel: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: theme.spacing.sm,
    lineHeight: 24
  },
  metric: {
    flex: 1,
    minHeight: 78,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    justifyContent: "center"
  },
  primary: {
    backgroundColor: theme.colors.primary
  },
  secondary: {
    backgroundColor: theme.colors.secondary
  },
  success: {
    backgroundColor: theme.colors.success
  },
  danger: {
    backgroundColor: theme.colors.danger
  },
  accent: {
    backgroundColor: theme.colors.accent
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#EFE8DC",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.success
  }
});

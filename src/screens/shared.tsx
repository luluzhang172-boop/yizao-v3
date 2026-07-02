import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export function Page({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Metric({
  label,
  value,
  tone = "dark"
}: {
  label: string;
  value: string | number;
  tone?: "dark" | "blue" | "green" | "red";
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
    paddingHorizontal: 18,
    paddingBottom: 12
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    marginBottom: 12
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10
  },
  metric: {
    flex: 1,
    minHeight: 82,
    borderRadius: 8,
    padding: 12,
    justifyContent: "center"
  },
  dark: {
    backgroundColor: "#111827"
  },
  blue: {
    backgroundColor: "#075985"
  },
  green: {
    backgroundColor: "#166534"
  },
  red: {
    backgroundColor: "#991b1b"
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4
  }
});

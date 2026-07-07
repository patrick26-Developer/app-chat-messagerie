import type { ReactNode } from "react";
import { SafeAreaView, type Edges } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

type ScreenContainerProps = {
  children: ReactNode;
  className?: string;
  edges?: Edges;
};

export function ScreenContainer({ children, className, edges }: ScreenContainerProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      className={["flex-1", className].filter(Boolean).join(" ")}
      style={{ backgroundColor: colors.background }}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

import { useEffect, type ReactNode } from "react";
import { AccessibilityInfo, Modal, Pressable } from "react-native";
import { MotiView } from "moti";
import { useTheme } from "@/lib/theme";

export type ModalOverlayPlacement = "bottom" | "center";

type ModalOverlayProps = {
  visible: boolean;
  onRequestClose: () => void;
  placement: ModalOverlayPlacement;
  // Chaîne unique (titre+contexte déjà concaténés par l'appelant) annoncée à
  // l'ouverture : contrairement à Alert.alert, un Modal custom ne fait rien
  // lire automatiquement au lecteur d'écran à son apparition.
  announceOnOpen?: string;
  children: ReactNode;
};

export function ModalOverlay({ visible, onRequestClose, placement, announceOnOpen, children }: ModalOverlayProps) {
  const { colors } = useTheme();
  const isBottom = placement === "bottom";

  useEffect(() => {
    if (visible && announceOnOpen) {
      AccessibilityInfo.announceForAccessibility(announceOnOpen);
    }
  }, [visible, announceOnOpen]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <Pressable
        style={
          isBottom
            ? { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }
            : { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.overlay }
        }
        onPress={onRequestClose}
      >
        <MotiView
          from={isBottom ? { opacity: 0, translateY: 24 } : { opacity: 0, scale: 0.95 }}
          animate={isBottom ? { opacity: 1, translateY: 0 } : { opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: isBottom ? 200 : 150 }}
          accessibilityViewIsModal
        >
          {children}
        </MotiView>
      </Pressable>
    </Modal>
  );
}

import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { Avatar, Button, Input, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { avatarPathForUser } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { Profile } from "../../instant.schema";

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { profile, isLoading } = useOwnProfile();

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("editProfile.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {isLoading || !profile ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <EditProfileForm profile={profile} />
      )}
    </ScreenContainer>
  );
}

function EditProfileForm({ profile }: { profile: Profile }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const auth = db.useAuth();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handleChangePhoto() {
    if (!auth.user) return;
    setPhotoError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(t("editProfile.permissionDenied"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    setIsUploadingPhoto(true);
    try {
      const file = new File(result.assets[0].uri);
      const path = avatarPathForUser(auth.user.id);
      await db.storage.uploadFile(path, file, { contentType: "image/jpeg" });
      await db.transact(db.tx.profiles[profile.id].update({ avatarUrl: path }));
    } catch (err) {
      setPhotoError(t("editProfile.uploadError"));
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await db.transact(
        db.tx.profiles[profile.id].update({
          displayName: displayName.trim(),
          phone: phone.trim() || null,
          bio: bio.trim() || null,
        }),
      );
      router.back();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <Pressable onPress={handleChangePhoto} className="items-center" disabled={isUploadingPhoto}>
        <Avatar uri={profile.avatarUrl} name={profile.displayName} size={88} />
        <Text className="mt-2 text-sm" style={{ color: colors.accent }}>
          {isUploadingPhoto ? t("editProfile.uploading") : t("editProfile.changePhoto")}
        </Text>
        {photoError ? (
          <Text className="mt-1 text-xs" style={{ color: colors.danger }}>
            {photoError}
          </Text>
        ) : null}
      </Pressable>

      <Input value={displayName} onChangeText={setDisplayName} placeholder={t("editProfile.displayNamePlaceholder")} />
      <Input value={phone} onChangeText={setPhone} placeholder={t("editProfile.phonePlaceholder")} keyboardType="phone-pad" />
      <Input value={bio} onChangeText={setBio} placeholder={t("editProfile.bioPlaceholder")} multiline />

      <Button
        label={t("editProfile.save")}
        onPress={handleSave}
        loading={isSaving}
        disabled={displayName.trim().length === 0}
      />
    </View>
  );
}

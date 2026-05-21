import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ApiLoggerHeaderProps {
  title: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

export const ApiLoggerHeader: React.FC<ApiLoggerHeaderProps> = ({
  title,
  onBack,
  rightContent,
}) => {
  return (
    <View style={styles.container}>
      {onBack != null ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.backBtnPlaceholder} />
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightContent != null ? (
        <View style={styles.right}>{rightContent}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: {
    width: 12,
  },
  backChevron: {
    fontSize: 28,
    color: '#1f2937',
    lineHeight: 30,
    marginTop: -4,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

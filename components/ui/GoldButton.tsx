import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

interface GoldButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GoldButton({
  onPress,
  children,
  variant = 'solid',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: GoldButtonProps) {
  const isSolid = variant === 'solid';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: isSolid ? COLORS.gold : 'transparent',
          borderWidth: isSolid ? 0 : 1.5,
          borderColor: COLORS.gold,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSolid ? COLORS.dark : COLORS.gold} size="small" />
      ) : (
        <Text
          style={[
            {
              fontFamily: FONTS.bodyBold,
              fontSize: 13,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: isSolid ? COLORS.dark : COLORS.gold,
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

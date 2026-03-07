import { View, Text } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

type BadgeVariant = 'gold' | 'green' | 'blue' | 'red' | 'gray' | 'yellow';

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  gold:   { bg: `${COLORS.gold}1A`,           color: COLORS.gold },
  green:  { bg: 'rgba(34,197,94,0.1)',         color: COLORS.green },
  blue:   { bg: 'rgba(59,130,246,0.1)',        color: COLORS.blue },
  red:    { bg: 'rgba(239,68,68,0.1)',         color: COLORS.red },
  gray:   { bg: 'rgba(255,255,255,0.05)',      color: COLORS.gray400 },
  yellow: { bg: 'rgba(234,179,8,0.1)',         color: COLORS.yellow },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  const { bg, color } = variantStyles[variant];
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 9, color, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        {label}
      </Text>
    </View>
  );
}

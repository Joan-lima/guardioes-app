import { View, ViewProps } from 'react-native';
import { COLORS } from '../../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  gold?: boolean;
}

export function Card({ children, style, gold = false, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.darkCard,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: gold ? `${COLORS.gold}4D` : COLORS.darkBorder,
          overflow: 'hidden',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

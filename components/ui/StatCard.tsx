import { View, Text } from 'react-native';
import { Card } from './Card';
import { COLORS, FONTS } from '../../constants/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  trend?: string;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, sub, trend, icon }: StatCardProps) {
  const trendPositive = trend?.startsWith('+');

  return (
    <Card style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        {icon && (
          <View style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
            {icon}
          </View>
        )}
        {trend && (
          <View style={{
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
            backgroundColor: trendPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          }}>
            <Text style={{
              fontSize: 10, fontFamily: FONTS.bodyBold,
              color: trendPositive ? COLORS.green : COLORS.red,
            }}>
              {trend}
            </Text>
          </View>
        )}
      </View>
      <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ fontFamily: FONTS.title, fontSize: 28, color: COLORS.white, marginBottom: 4 }}>
        {value}
      </Text>
      {sub && (
        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500 }}>
          {sub}
        </Text>
      )}
    </Card>
  );
}

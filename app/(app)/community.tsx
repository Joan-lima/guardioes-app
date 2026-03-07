import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { COLORS, FONTS } from '../../constants/theme';

interface Channel { id: string; name: string; type: string; city_id: string | null; is_readonly_for_members: boolean; }
interface Message { id: string; channel_id: string; sender_id: string; content: string | null; type: string; created_at: string; sender?: { name: string }; }

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [channels, setChannels]       = useState<Channel[]>([]);
  const [active, setActive]           = useState<Channel | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [text, setText]               = useState('');
  const [sending, setSending]         = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    async function loadChannels() {
      const { data } = await supabase.from('channels').select('*').order('type');
      setChannels(data ?? []);
      if (data && data.length > 0) setActive(data[0]);
    }
    loadChannels();
  }, []);

  useEffect(() => {
    if (!active) return;
    // Initial load
    loadMessages();
    // Real-time subscription
    const sub = supabase
      .channel(`messages:${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${active.id}` },
        async (payload) => {
          const msg = payload.new as Message;
          const { data: sender } = await supabase.from('profiles').select('name').eq('id', msg.sender_id).single();
          setMessages(prev => [...prev, { ...msg, sender: sender ?? undefined }]);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [active]);

  async function loadMessages() {
    if (!active) return;
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(name)')
      .eq('channel_id', active.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data ?? []);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function sendMessage() {
    if (!text.trim() || !active || !profile) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      channel_id: active.id,
      sender_id:  profile.id,
      content:    text.trim(),
      type:       'text',
    });
    setSending(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setText('');
  }

  const isReadOnly = active?.is_readonly_for_members && profile?.role === 'MEMBRO';
  const canSendInChannel = !isReadOnly && (() => {
    if (!active || !profile) return false;
    if (profile.role === 'ADM') return true;
    if (profile.role === 'LIDER') return ['city_notices', 'city_general', 'leaders_general', 'leaders_notices'].includes(active.type);
    return active.type === 'city_general';
  })();

  const channelIcon: Record<string, string> = {
    official_global:  '📢', leaders_notices: '⚡', leaders_general: '🌟',
    city_notices:     '📣', city_general:    '💬',
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Channels sidebar */}
        <View style={{ width: 72, backgroundColor: '#111318', borderRightWidth: 1, borderRightColor: COLORS.darkBorder }}>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            {channels.map(ch => (
              <TouchableOpacity
                key={ch.id}
                onPress={() => setActive(ch)}
                style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: active?.id === ch.id ? 3 : 0, borderRightColor: COLORS.gold }}
              >
                <Text style={{ fontSize: 22 }}>{channelIcon[ch.type] ?? '💬'}</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 8, color: active?.id === ch.id ? COLORS.gold : COLORS.gray600, textAlign: 'center', marginTop: 2 }} numberOfLines={2}>
                  {ch.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat area */}
        <View style={{ flex: 1 }}>
          {/* Channel header */}
          <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder, backgroundColor: '#171824' }}>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>
              {channelIcon[active?.type ?? ''] ?? '💬'} {active?.name ?? 'Selecione um canal'}
            </Text>
            {isReadOnly && (
              <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.red, marginTop: 2 }}>
                🔒 Somente leitura
              </Text>
            )}
          </View>

          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={m => m.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item: msg }) => {
              const isMe = msg.sender_id === profile?.id;
              return (
                <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && (
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: COLORS.gold, marginBottom: 2, marginLeft: 4 }}>
                      {(msg.sender as any)?.name ?? 'Guardião'}
                    </Text>
                  )}
                  <View style={{
                    maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
                    borderBottomRightRadius: isMe ? 4 : 16,
                    borderBottomLeftRadius: isMe ? 16 : 4,
                    backgroundColor: isMe ? COLORS.gold : '#1E202E',
                  }}>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: isMe ? COLORS.dark : COLORS.white }}>
                      {msg.content}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 9, color: COLORS.gray600, marginTop: 2, marginHorizontal: 4 }}>
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />

          {/* Input */}
          {canSendInChannel && (
            <View style={{
              flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12,
              borderTopWidth: 1, borderTopColor: COLORS.darkBorder,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Mensagem..."
                placeholderTextColor={COLORS.gray600}
                multiline
                maxLength={500}
                style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
                  paddingHorizontal: 16, paddingVertical: 10,
                  color: COLORS.white, fontFamily: FONTS.body, fontSize: 14, maxHeight: 100,
                }}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!text.trim() || sending}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: text.trim() ? COLORS.gold : 'rgba(255,255,255,0.1)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>➤</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

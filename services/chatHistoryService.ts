import { supabase } from './supabaseClient';
import { ChatMessage } from '../types';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  tool_calls?: any;
  created_at: string;
}

// Helper to try reading user ID from local storage directly (Optimistic Check)
const getUserFromLocalStorage = () => {
    try {
        if (typeof window === 'undefined') return null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
                const sessionStr = localStorage.getItem(key);
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    if (session?.user?.id) {
                        return session.user.id;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error parsing local storage session:', e);
    }
    return null;
};

// Helper to get or create a user ID (prioritizes Auth user, fallbacks to local anonymous)
export const getUserId = async () => {
  console.log('[chatHistory] getUserId called');

  // 1. Optimistic Check: Try local storage FIRST (Instant return)
  // This solves the slow load time issue by returning immediately if we know the user.
  const optimisticUserId = getUserFromLocalStorage();
  if (optimisticUserId) {
      console.log('[chatHistory] Optimistic: Found User ID in local storage, returning immediately:', optimisticUserId);
      return optimisticUserId;
  }

  try {
    // 2. Check if Supabase Auth user exists with a timeout
    console.log('[chatHistory] Local storage empty, fetching session from Supabase...');
    // Create a promise that rejects after 5 seconds
    const timeoutPromise = new Promise<{ data: { session: null } }>((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
    );

    // Race the session fetch against the timeout
    const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
    ]) as { data: { session: any } };

    console.log('[chatHistory] Session retrieved:', session ? 'Found' : 'Null');
    if (session?.user) {
      console.log('[chatHistory] Using Auth User ID');
      return session.user.id;
    }
  } catch (err: any) {
    // If we're here, it means we don't have a local ID AND the network failed/timed out.
    // This is a genuine error case where we might fall back to anonymous.
    console.warn('[chatHistory] Session fetch failed/timed out and no local ID found:', err.message || err);
  }

  // 3. Fallback to anonymous local ID
  console.log('[chatHistory] Using Anonymous ID');
  let userId = localStorage.getItem('sahabat_quran_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('sahabat_quran_user_id', userId);
  }
  return userId;
};

// Get the anonymous ID specifically (for merging)
export const getAnonymousId = () => {
    return localStorage.getItem('sahabat_quran_user_id');
};

export const chatHistoryService = {
  async getConversations(searchQuery?: string): Promise<Conversation[]> {
    console.log('[chatHistory] getConversations start', searchQuery ? `with query: ${searchQuery}` : '');
    const userId = await getUserId();
    console.log('[chatHistory] User ID:', userId);

    // Start building the query
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Apply search filter if query exists
    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    // console.log('[chatHistory] Executing query for user:', userId);

    const dbPromise = query;

    // Safety timeout: If DB doesn't respond in 15s, return empty to stop spinner
    const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('DB fetch timeout')), 15000)
    );

    try {
        const { data, error } = await Promise.race([
            dbPromise,
            timeoutPromise
        ]) as any;

        // console.log('[chatHistory] Fetch result:', { dataLength: data?.length, error });

        if (error) {
          console.error('Error fetching conversations:', error);
          return [];
        }
        return data || [];
    } catch (err) {
        console.error('[chatHistory] DB query timed out:', err);
        return [];
    }
  },

  async createConversation(firstMessage: string): Promise<Conversation | null> {
    const userId = await getUserId();
    const title = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title,
        last_message_preview: title,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
    return data;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Convert DB messages to ChatMessage type
    return (data || []).map((msg: DBMessage) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      content: msg.content,
      toolResults: msg.tool_calls ? msg.tool_calls : undefined
    }));
  },

  async saveMessage(conversationId: string, message: ChatMessage) {
    // 1. Insert message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        tool_calls: message.toolResults
      });

    if (msgError) {
      console.error('Error saving message:', msgError);
    }

    // 2. Update conversation last_message_preview and updated_at
    const preview = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
    await supabase
      .from('conversations')
      .update({
        last_message_preview: preview,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  },

  async deleteConversation(conversationId: string) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
    }
  },

  // Merge anonymous history to authenticated user
  async mergeAnonymousHistory(authUserId: string) {
    const anonymousId = getAnonymousId();
    if (!anonymousId) return;

    // Update all conversations belonging to anonymousId to now belong to authUserId
    const { error } = await supabase
        .from('conversations')
        .update({ user_id: authUserId })
        .eq('user_id', anonymousId);

    if (error) {
        console.error('Error merging history:', error);
    } else {
        console.log('Successfully merged history from', anonymousId, 'to', authUserId);
        // Optionally clear anonymous ID to prevent future confusion,
        // OR keep it? Better keep it or just not rely on it if logged in.
        // localStorage.removeItem('sahabat_quran_user_id');
    }
  }
};

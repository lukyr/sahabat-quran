
export interface Surah {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: number[];
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  text_indopak?: string;
  translations?: Array<{
    id: number;
    resource_id: number;
    text: string;
  }>;
}

export interface SearchResult {
  verse_key: string;
  verse_id: number;
  text: string;
  translations: Array<{
    name: string;
    text: string;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system' | 'function';
  content: string;
  toolResults?: any[];
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
}

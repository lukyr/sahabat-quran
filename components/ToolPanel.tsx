
import React from 'react';

const tools = [
  {
    name: 'search_verse',
    description: 'Finds verses by keyword or topic.',
    icon: '🔍',
    schema: { query: 'string', language: 'id | en' }
  },
  {
    name: 'get_ayah_details',
    description: 'Retrieves Uthmani script and translations.',
    icon: '📖',
    schema: { surah: 'number', ayah: 'number' }
  },
  {
    name: 'get_surah_info',
    description: 'Full chapter metadata and history.',
    icon: '📜',
    schema: { surah: 'number' }
  }
];

export const ToolPanel: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Available MCP Tools</h3>
        <div className="space-y-4">
          {tools.map((tool) => (
            <div key={tool.name} className="group p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100/50">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{tool.icon}</span>
                <span className="font-bold text-emerald-900 text-sm">{tool.name}</span>
              </div>
              <p className="text-xs text-emerald-700 mb-3 leading-relaxed">{tool.description}</p>
              <div className="bg-emerald-200/30 rounded-lg p-2 font-mono text-[10px] text-emerald-800">
                {JSON.stringify(tool.schema, null, 2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="font-bold mb-2">SRE Status</h4>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-green-400"></div>
            <span className="text-xs font-medium text-emerald-200">System Healthy</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="opacity-70">Latency</span>
              <span className="font-mono">42ms</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="opacity-70">Uptime</span>
              <span className="font-mono">99.99%</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="opacity-70">API Version</span>
              <span className="font-mono">v4.1</span>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 opacity-10 transform rotate-12">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

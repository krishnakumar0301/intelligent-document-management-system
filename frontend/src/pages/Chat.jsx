import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, Bot, User, Sparkles } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { sendChat, getChatHistory, clearChatHistory } from '../api/client';
import { formatBytes } from '../utils/format';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    getChatHistory().then((res) => setMessages(Array.isArray(res.data) ? res.data : []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg, id: Date.now() }]);
    setLoading(true);
    try {
      const res = await sendChat(userMsg);
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply, id: Date.now() + 1, files: res.data.related_files }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, something went wrong.', id: Date.now() + 1 }]);
    } finally { setLoading(false); }
  };

  const handleClear = async () => {
    await clearChatHistory();
    setMessages([]);
  };

  return (
    <Layout title="AI Chat">
      <div className="glass-card-strong flex flex-col h-[calc(100vh-12rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-2 pb-3 border-b border-surface-400/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-oracle-500/20 to-cyan-600/10 border border-oracle-500/10">
              <Bot className="w-4 h-4 text-oracle-400" />
            </div>
            <span className="text-sm font-medium text-surface-100">FileOracle Assistant</span>
            <span className="status-dot-active" />
          </div>
          <button className="btn-icon" onClick={handleClear} title="Clear history"><Trash2 className="w-4 h-4" /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-custom py-4 px-2 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-2xl bg-surface-800/60 border border-surface-400/10 mb-4">
                <Sparkles className="w-8 h-8 text-oracle-400" />
              </div>
              <p className="text-sm text-surface-400 mb-1">Ask me anything about your files</p>
              <p className="text-xs text-surface-500 max-w-xs">Try: "Where are my PDFs?" · "Show largest files" · "Find duplicates"</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-oracle-500 to-cyan-600 shadow-[0_4px_12px_-4px_rgba(6,182,212,0.3)]'
                    : 'bg-surface-800/60 border border-surface-400/10'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-oracle-400" />}
                </div>
                <div>
                  <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-oracle-500 to-cyan-600 text-white shadow-[0_4px_16px_-4px_rgba(6,182,212,0.2)]'
                      : 'glass border border-surface-400/10 text-surface-200'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.files?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.files.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-xs bg-surface-800/40 border border-surface-400/5 rounded-lg px-3 py-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-oracle-400" />
                          <span className="text-surface-300">{f.name}</span>
                          <span className="text-surface-500 ml-auto">{formatBytes(f.size_bytes)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-800/60 border border-surface-400/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-oracle-400" />
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-oracle-400/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-oracle-400/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-oracle-400/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-3 pt-3 border-t border-surface-400/10">
          <input
            className="input-field flex-1"
            placeholder="Ask about your files..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button className="btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}

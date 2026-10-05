import React, { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { queryDrillingAssistant } from '../../services/aiApi';
import { useWellContext } from '../../context/WellContext';

const WELCOME = {
  role: 'assistant',
  text:
    "I'm the eRTMAC drilling advisory assistant. Ask me about formation risks, historical events, or mitigation for offset wells and I'll ground the answer in real drilling records and cite my sources -- I can also help with general questions beyond this project's data.",
  sources: [],
};

// Shown as tappable chips only before the first real question is asked -- each one is a query
// confirmed to match real records in this dataset, so a first-time user (or a judge during a demo)
// gets a working example instead of guessing at phrasing the corpus happens to contain.
const SUGGESTED_PROMPTS = [
  'What caused past kicks near this well?',
  'What mud loss events have occurred nearby?',
  'What mitigation was used for stuck pipe?',
  'What cementing issues have been recorded?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white/[0.06] text-zinc-200 border border-white/[0.08] rounded-bl-sm'
        }`}
      >
        <div className="whitespace-pre-wrap">{msg.text}</div>
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/[0.08] space-y-0.5">
            <div className="text-[9.5px] uppercase tracking-wide text-zinc-500 font-semibold">Sources</div>
            {msg.sources.map((s, i) => (
              <div key={i} className="text-[10.5px] text-zinc-400 font-mono truncate">{s}</div>
            ))}
          </div>
        )}
        {!isUser && msg.isFallback && (
          <div className="mt-1.5 text-[10px] text-amber-400/80">Offline demo response -- backend unreachable.</div>
        )}
        {!isUser && !msg.isFallback && msg.grounded === false && (
          <div className="mt-1.5 text-[10px] text-blue-300/70">General knowledge -- not from eRTMAC drilling records.</div>
        )}
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const { selectedWellId } = useWellContext();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const submit = async (promptText) => {
    const prompt = promptText.trim();
    if (!prompt || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);

    setSending(true);
    try {
      const res = await queryDrillingAssistant(prompt, selectedWellId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer || "I couldn't find anything in the dataset matching that question, and couldn't reach the AI service to answer it generally either. Try again in a moment.",
          sources: res.sources || [],
          isFallback: !!res.isFallback,
          grounded: res.grounded,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "I couldn't reach the drilling advisory service just now. Please try again in a moment.", sources: [] },
      ]);
    } finally {
      setSending(false);
    }
  };

  const send = () => submit(input);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[360px] max-w-[calc(100vw-2.5rem)] h-[480px] max-h-[calc(100vh-8rem)] bg-[#0c0c0d] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-white leading-tight">Drilling Assistant</div>
                <div className="text-[10px] text-zinc-500 leading-tight">
                  {selectedWellId ? `Context: ${selectedWellId}` : 'No well selected'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close chat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.map((m, i) => (
              <Message key={i} msg={m} />
            ))}
            {messages.length === 1 && !sending && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => submit(p)}
                    className="text-[11px] leading-snug text-left text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
                  <span className="text-[11px] text-zinc-500">Searching drilling records...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.08] p-2.5 flex items-end gap-2 bg-white/[0.02]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about risks, formations, events, or anything else..."
              rows={1}
              className="flex-1 resize-none bg-white/[0.05] border border-white/[0.1] rounded-lg px-2.5 py-2 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 max-h-20"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || sending}
              className="w-9 h-9 shrink-0 rounded-lg border border-white/[0.16] bg-blue-600 hover:bg-blue-500 disabled:bg-white/[0.1] disabled:border-white/[0.14] disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Send"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle bubble */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[60] w-13 h-13 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40 flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: 52, height: 52 }}
        aria-label={open ? 'Close drilling assistant' : 'Open drilling assistant'}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <Bot className="w-5.5 h-5.5 text-white" style={{ width: 22, height: 22 }} />}
      </button>
    </>
  );
}

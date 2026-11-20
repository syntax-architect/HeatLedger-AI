import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  X,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Bot,
  User,
  RotateCcw,
  Cpu
} from 'lucide-react';
import { api, AssistantChatResponse, AssistantUsageInfo } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citedRecords?: Array<{
    type: string;
    id?: string;
    link?: string;
    [key: string]: any;
  }>;
  refusal?: boolean;
}

const DEFAULT_PROMPT_CHIPS = [
  'Which heats lack Country of Melt and Pour?',
  'Show shipments blocked by the Clause 6 release gate.',
  'Compare our top steel suppliers by compliance and emissions intensity.',
  'How much does our primary data save vs EU CBAM default markups?',
];

interface AssistantBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssistantBottomSheet: React.FC<AssistantBottomSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste. I am your plant data assistant. I answer questions strictly from your factory’s uploaded mill certificates, heat traceability ledger, and CBAM calculations. I never hallucinate or provide generic legal advice.',
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usageInfo, setUsageInfo] = useState<AssistantUsageInfo | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.getAssistantUsage()
        .then((u) => setUsageInfo(u))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.sender, content: m.text }));

      const res: AssistantChatResponse = await api.askAssistant(query, history);

      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citedRecords: res.cited_records,
        refusal: res.refusal,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      // Refresh token budget
      api.getAssistantUsage().then((u) => setUsageInfo(u)).catch(() => {});
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: err.message || 'Unable to query plant records. Please verify connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSendMessage(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleNavigateToRecord = (link?: string) => {
    if (link) {
      onClose();
      navigate(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg h-[85vh] sm:h-[650px] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Ask Your Data Assistant
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-semibold">
                  Zero Hallucination
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Grounded strictly in your plant's verified database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Token Budget Gauge Bar */}
        {usageInfo && (
          <div className="px-5 py-2 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-orange-500" />
              <span>
                Monthly Budget: <strong>{usageInfo.tokens_used.toLocaleString()}</strong> /{' '}
                {usageInfo.monthly_token_cap.toLocaleString()} tokens
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              {Math.round((usageInfo.tokens_used / usageInfo.monthly_token_cap) * 100)}% cap
            </span>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-orange-600/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-2.5 ${
                  m.sender === 'user'
                    ? 'bg-orange-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Refusal / Statutory Disclaimer Warning */}
                {m.refusal && (
                  <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Statutory Compliance Guard: HeatLedger answers exclusively from plant records and does not provide legal advice.
                    </span>
                  </div>
                )}

                {/* Grounded Citation Links */}
                {m.citedRecords && m.citedRecords.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> Grounded Source Records
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.citedRecords.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleNavigateToRecord(r.link)}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{r.heat_number || r.id || r.type || 'Record'}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[9px] ${
                    m.sender === 'user' ? 'text-orange-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <div className="w-6 h-6 rounded-lg bg-orange-600/10 text-orange-600 flex items-center justify-center animate-spin">
                <RotateCcw className="w-3 h-3" />
              </div>
              <span>Searching verified plant records...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {DEFAULT_PROMPT_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(chip)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors shadow-xs shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleToggleVoice}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              className={`p-2.5 rounded-xl border transition-colors ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about heats, shipments, suppliers or CBAM..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-medium transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1.5">
            <span>Powered by your records only</span>
            <span>Refuses generic legal advice</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
      <div className="bg-[#FCFBF8] w-full sm:max-w-lg h-[85vh] sm:h-[650px] rounded-t-xl sm:rounded-xl border border-[#18181A]/15 flex flex-col overflow-hidden text-[#18181A]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#18181A]/10 flex items-center justify-between bg-[#F7F5F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#059669]/10 text-[#059669] border border-[#059669]/20 flex items-center justify-center">
              <Bot className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-[#18181A]">
                  Ask Your Data Assistant
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20 text-[11px] font-mono font-medium">
                  Zero Hallucination
                </span>
              </div>
              <p className="text-[11px] text-[#55544E]">
                Grounded strictly in your plant's verified database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="h-8 w-8 rounded-lg hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Token Budget Gauge Bar */}
        {usageInfo && (
          <div className="px-5 py-2 bg-[#EFECE5] border-b border-[#18181A]/10 flex items-center justify-between text-[11px] text-[#55544E]">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
              <span>
                Monthly Budget: <span className="font-mono font-medium text-[#18181A]">{usageInfo.tokens_used.toLocaleString()}</span> /{' '}
                {usageInfo.monthly_token_cap.toLocaleString()} tokens
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#55544E]">
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
                <div className="w-7 h-7 rounded-lg bg-[#059669]/10 text-[#059669] border border-[#059669]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed space-y-2.5 ${
                  m.sender === 'user'
                    ? 'bg-[#18181A] text-[#FCFBF8] rounded-br-none'
                    : 'bg-[#F7F5F0] text-[#18181A] rounded-bl-none border border-[#18181A]/10'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Refusal / Statutory Disclaimer Warning */}
                {m.refusal && (
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" strokeWidth={1.5} />
                    <span>
                      Statutory Compliance Guard: HeatLedger answers exclusively from plant records and does not provide legal advice.
                    </span>
                  </div>
                )}

                {/* Grounded Citation Links */}
                {m.citedRecords && m.citedRecords.length > 0 && (
                  <div className="pt-2 border-t border-[#18181A]/10 space-y-1">
                    <p className="text-[11px] font-medium text-[#55544E] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#059669]" strokeWidth={1.5} /> Grounded Source Records
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.citedRecords.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleNavigateToRecord(r.link)}
                          className="h-7 px-2 rounded-md bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] hover:border-[#059669] hover:text-[#047857] text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{r.heat_number || r.id || r.type || 'Record'}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] font-mono ${
                    m.sender === 'user' ? 'text-[#9FA3AD] text-right' : 'text-[#78766E]'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[#EFECE5] text-[#55544E] border border-[#18181A]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-[#55544E] text-xs py-2">
              <div className="w-6 h-6 rounded-md bg-[#059669]/10 text-[#059669] flex items-center justify-center animate-spin">
                <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
              </div>
              <span>Searching verified plant records...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-4 py-2 border-t border-[#18181A]/10 bg-[#F7F5F0] overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {DEFAULT_PROMPT_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(chip)}
                disabled={isLoading}
                className="whitespace-nowrap h-7 px-3 rounded-md bg-[#FCFBF8] border border-[#18181A]/15 text-[11px] text-[#55544E] hover:border-[#059669] hover:text-[#047857] transition-colors shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#18181A]/10 bg-[#FCFBF8]">
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
              className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                isListening
                  ? 'bg-rose-700 text-[#FCFBF8] border-rose-700'
                  : 'bg-[#F7F5F0] text-[#55544E] border-[#18181A]/15 hover:bg-[#EFECE5]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" strokeWidth={1.5} /> : <Mic className="w-4 h-4" strokeWidth={1.5} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about heats, shipments, suppliers or CBAM..."
              disabled={isLoading}
              className="flex-1 h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-xs text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="h-9 w-9 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-[#FCFBF8] flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-[#78766E] px-1 pt-1.5">
            <span>Powered by your records only</span>
            <span>Refuses generic legal advice</span>
          </div>
        </div>
      </div>
    </div>
  );
};

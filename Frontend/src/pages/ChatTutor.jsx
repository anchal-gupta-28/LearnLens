import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Send, Bot, User, BrainCircuit, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatTutor = () => {
  const { API_URL } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/chat/history`);
        setMessages(res.data || []);
      } catch (err) {
        console.error('Chat history load failed:', err);
        setError('Unable to load previous chat history.');
      }
    };
    fetchHistory();
  }, [API_URL]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const res = await axios.post(`${API_URL}/chat`, { message: userMessage });
      const payload = res.data;
      const responseText = typeof payload === 'string'
        ? payload
        : payload?.response ?? payload?.message ?? payload?.text ?? 'The tutor did not return a usable answer.';

      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (err) {
      console.error('Chat send failed:', err);
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
      const clientMessage = backendMessage || err.message || 'Connection error. Please try again.';
      setError(clientMessage);
      setMessages(prev => [...prev, { role: 'model', content: clientMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="pt-24 h-screen flex flex-col px-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600 p-3 rounded-2xl shadow-lg shadow-primary-600/20">
            <BrainCircuit className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">LearnLens AI Tutor</h1>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online & Ready
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setError('');
          }}
          className="glass px-4 py-2 rounded-xl text-sm border-white/10 hover:bg-white/5 flex items-center gap-2"
        >
          <Sparkles className="text-amber-400" size={16} /> Clear Session
        </button>
      </div>

      <div className="flex-1 glass-card overflow-hidden flex flex-col mb-8 relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Bot size={64} className="mb-4 text-primary-400" />
              <h2 className="text-2xl font-bold italic">Hello! I am your AI Tutor.</h2>
              <p className="max-w-xs mt-2">Ask me anything about your current topics or request a summary of your weak concepts.</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200 text-sm">
              {error}
            </div>
          )}
          
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary-600' : 'bg-dark-800 border border-dark-700'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-primary-400" />}
                </div>
                <div className={`max-w-[75%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-dark-900 border border-dark-800 text-slate-200 rounded-tl-none shadow-lg'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
                <Bot size={20} className="text-primary-400" />
              </div>
              <div className="bg-dark-900 border border-dark-800 p-4 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-white/5">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or explain a concept..."
              className="w-full bg-dark-950 border border-dark-700 rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:border-primary-500 transition-all text-slate-200"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary-600 p-3 rounded-xl hover:bg-primary-500 transition-all text-white disabled:opacity-50" disabled={isTyping || !input.trim()}>
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatTutor;

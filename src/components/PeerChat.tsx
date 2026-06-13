import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, ShieldAlert, Image as ImageIcon, Contact, FileText, CheckCheck, Loader2 } from 'lucide-react';
import { DbService, uploadFileToBucket } from '../lib/db';
import { User } from '../types';

interface PeerChatProps {
  user: User;
  partnerPhone: string;
  partnerName: string;
  onClose: () => void;
}

export default function PeerChat({ user, partnerPhone, partnerName, onClose }: PeerChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState('');
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load static history of messaging & poll for live entries
  useEffect(() => {
    async function loadThread() {
      try {
        setLoading(true);
        const thread = await DbService.queryMessages(user.phone, partnerPhone);
        setMessages(thread);
      } catch (err) {
        console.warn('Network issue fetching thread history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadThread();

    // Subscribe to real-time additions via Supabase channels
    const unsubscribe = DbService.subscribeToNewMessages(user.phone, (incoming) => {
      // Ensure message belongs to current partner thread
      if (incoming.sender === partnerPhone) {
        setMessages(prev => [...prev, incoming]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user.phone, partnerPhone]);

  // Scroll to bottom helper
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File attachment is too large (maximum limit 10MB)');
        return;
      }
      setFileBlob(file);
      setFileName(file.name);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !fileBlob) return;
    setSending(true);

    try {
      let attachmentUrl = null;

      // Upload file to Supabase chat-files storage bucket
      if (fileBlob) {
        const fileExt = fileName.split('.').pop() || 'png';
        const cleanPhone = user.phone.replace(/\s+/g, '');
        const targetPath = `chat_${cleanPhone}_${Date.now()}.${fileExt}`;
        attachmentUrl = await uploadFileToBucket('chat-files', targetPath, fileBlob);
      }

      const originalText = inputText;

      // Save message
      const savedMsg = await DbService.sendMessage(user.phone, partnerPhone, originalText, attachmentUrl || undefined);
      
      // Update local state thread instantly
      setMessages(prev => [...prev, savedMsg]);
      
      // Clear forms
      setInputText('');
      setFileBlob(null);
      setFileName('');

    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l border-[#E5E7EB] shadow-2xl z-[100] flex flex-col justify-between"
    >
      {/* Drawer Head */}
      <div className="p-4 bg-gradient-to-r from-[#0F6E56] to-[#0b5441] text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold font-mono tracking-tight text-white border border-white/20 capitalize">
            {partnerName.slice(0, 2)}
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black tracking-tight leading-none uppercase">{partnerName}</h4>
            <p className="text-[9px] text-[#A7F3D0] mt-1 font-semibold">Live Escrow Partner</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-full text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Safety Policy Alert banner */}
      <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 text-[10px] leading-relaxed flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
        <span>To prevent fraud, sharing phone numbers or social links is blocked. Keep payments within the escrow wallet.</span>
      </div>

      {/* Message Thread container */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-[#F7F8FA]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0F6E56]" />
            <p className="text-[10px] text-[#6B7280]">Decrypting student communication nodes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-24 text-[#6B7280] space-y-2">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-[11px] font-medium max-w-[200px] mx-auto leading-relaxed">
              No chat logs found. Send a message to coordinate location, billing cycles, or delivery instructions!
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.sender === user.phone;
            return (
              <div 
                key={m.id || idx} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl p-3.5 space-y-1 text-xs shadow-sm leading-relaxed ${
                    isMe 
                      ? 'bg-[#0F6E56] text-white rounded-br-none' 
                      : 'bg-white border text-[#0D0D0D] rounded-bl-none'
                  }`}
                >
                  <p className="break-words select-text font-medium">{m.text}</p>
                  
                  {m.file_url && (
                    <div className="mt-2 bg-black/5 rounded-xl p-2 flex items-center gap-2 border border-black/10">
                      <FileText className="w-4 h-4 flex-shrink-0 text-[#EF9F27]" />
                      <a 
                        href={m.file_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] hover:underline font-semibold break-all text-[#EF9F27]"
                      >
                        Attachment Link
                      </a>
                    </div>
                  )}
                  
                  <span className={`block text-[8px] text-right mt-1 font-mono tracking-tight uppercase leading-none opacity-70`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message input drawer */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#E5E7EB] flex flex-col gap-2">
        {fileName && (
          <div className="bg-slate-50 border px-2.5 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span className="truncate max-w-[200px]">📎 {fileName}</span>
            <button 
              type="button" 
              onClick={() => { setFileBlob(null); setFileName(''); }}
              className="text-red-500 font-bold"
            >
              remove
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* File input clip */}
          <button 
            type="button"
            onClick={() => document.getElementById('chat-attachment-file')?.click()}
            className="p-2 border border-[#E5E7EB] rounded-xl text-gray-400 hover:text-[#0F6E56]"
          >
            <ImageIcon className="w-4 h-4" />
            <input 
              type="file" 
              id="chat-attachment-file" 
              className="hidden" 
              onChange={handleAttachFile}
            />
          </button>

          <input 
            type="text" 
            placeholder="Type your instruction or coordinate..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-grow bg-[#F7F8FA] border border-[#E5E7EB] rounded-2xl px-4 py-2 text-xs focus:outline-none focus:border-[#0F6E56] text-[#0D0D0D]"
          />

          <button 
            type="submit"
            disabled={sending}
            className="bg-[#0F6E56] text-white p-2.5 rounded-xl hover:bg-[#0b5441] disabled:opacity-50 cursor-pointer"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

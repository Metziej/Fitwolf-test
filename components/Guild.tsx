
import React, { useState, useRef, useEffect } from 'react';
import { t } from '../translations.ts';
import { UserProfile, GlobalSystemData, RaidOrder, GuildComment } from '../types.ts';
import { db } from '../firebase.ts';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Message {
  id: string;
  user: string;
  rank: string;
  text: string;
  timestamp: string;
  media?: string;
  mediaType?: 'image' | 'video';
  supports: number;
  reactions: Record<string, number>;
  userReaction?: string;
  comms: number;
  damageDealt?: number;
  userPic?: string;
  aspectRatio?: '9:16' | '16:9';
  comments?: GuildComment[];
}

interface GuildProps {
  language?: string;
  profile?: UserProfile;
  globalData?: GlobalSystemData;
  messages: Message[];
  isAdmin?: boolean;
  allUsers?: UserProfile[];
  onDeleteMessage?: (id: string) => void;
  onUpdateBossHp?: (hp: number) => void;
  onSendMessage?: (text: string, media?: string) => void;
  onAddAlly?: (code: string) => void;
}

const TacticalMedia = ({ src, type, aspectRatio = '16:9', className = "" }: { src: string, type?: 'image' | 'video', aspectRatio?: '9:16' | '16:9', className?: string }) => {
  const isVertical = aspectRatio === '9:16';
  return (
    <div className={`overflow-hidden relative bg-[#111] ${className} ${isVertical ? 'aspect-[9/16]' : 'aspect-video'}`}>
      <div className="w-full h-full flex items-center justify-center">
        {type === 'video' ? <video src={src} className="w-full h-full object-cover" autoPlay loop muted playsInline /> : <img src={src} className="w-full h-full object-cover" alt="Tactical" />}
      </div>
    </div>
  );
};

const RaidOrderCard: React.FC<{ order: RaidOrder, onExecute: () => void }> = ({ order, onExecute }) => {
    return (
        <div
            className="relative border border-[#333] overflow-hidden group min-h-[160px] flex flex-col justify-end p-6 cursor-pointer hover:border-[#00FF88] transition-all"
            onClick={onExecute}
        >
            {order.backgroundImage && (
                <>
                    <img src={order.backgroundImage} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity filter grayscale group-hover:grayscale-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </>
            )}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className="bg-[#00FF88] text-black text-[9px] font-black uppercase px-2 py-0.5 tracking-widest">{order.frequency}</span>
                    <span className="text-[#00FF88] text-[10px] font-black data-font border border-[#00FF88] px-2 py-0.5 bg-black/50">+{order.xpReward} XP</span>
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1 leading-none shadow-black drop-shadow-lg">{order.title}</h3>
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wide leading-tight">{order.description}</p>
            </div>
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-ping"></div>
            </div>
        </div>
    );
};

const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

export default function Guild({ language = 'en', profile, globalData, messages: initialMessages, isAdmin, allUsers = [], onDeleteMessage, onUpdateBossHp, onSendMessage, onAddAlly }: GuildProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeTab, setActiveTab] = useState<'orders' | 'pack' | 'allies'>('pack');
  const [bossHp, setBossHp] = useState(globalData?.guildBoss.currentHp || 842500);
  const [damageFeedback, setDamageFeedback] = useState<string | null>(null);

  // General chat state
  const [composerText, setComposerText] = useState('');
  const composerFileRef = useRef<HTMLInputElement>(null);

  // Comments state
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Raid state
  const [selectedOrder, setSelectedOrder] = useState<RaidOrder | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofMedia, setProofMedia] = useState<string | null>(null);
  const raidFileRef = useRef<HTMLInputElement>(null);

  // Cropping state (9:16)
  const [isCropping, setIsCropping] = useState(false);
  const [tempCropImg, setTempCropImg] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Allies state
  const [allyInput, setAllyInput] = useState('');
  const [activeAllyChat, setActiveAllyChat] = useState<UserProfile | null>(null);
  const [privateMsgs, setPrivateMsgs] = useState<Message[]>([]);
  const [privateText, setPrivateText] = useState('');
  const privateChatFileRef = useRef<HTMLInputElement>(null);
  const privateChatUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Cleanup private chat listener on unmount
  useEffect(() => {
    return () => { privateChatUnsubRef.current?.(); };
  }, []);

  const allyProfiles = (profile?.allies || [])
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean) as UserProfile[];

  const openPrivateChat = (ally: UserProfile) => {
    if (!profile?.id || !ally.id) return;
    privateChatUnsubRef.current?.();
    setActiveAllyChat(ally);

    const chatId = getChatId(profile.id, ally.id);
    const q = query(collection(db, 'privateChats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    privateChatUnsubRef.current = onSnapshot(q, snap => {
      setPrivateMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Message[]);
    }, err => console.error('[FitWolf] Private chat listener error:', err));
  };

  const closePrivateChat = () => {
    privateChatUnsubRef.current?.();
    privateChatUnsubRef.current = null;
    setActiveAllyChat(null);
    setPrivateMsgs([]);
  };

  const sendPrivateMessage = () => {
    if (!privateText.trim() || !activeAllyChat || !profile?.id) return;
    const chatId = getChatId(profile.id, activeAllyChat.id);
    addDoc(collection(db, 'privateChats', chatId, 'messages'), {
      user: profile.username,
      rank: profile.tierId || 'free',
      text: privateText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      media: null,
      supports: 0, reactions: {}, comms: 0,
    }).catch(err => console.error('[FitWolf] Private message failed:', err));
    setPrivateText('');
  };

  const handlePrivateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAllyChat || !profile?.id) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const chatId = getChatId(profile.id!, activeAllyChat.id);
      addDoc(collection(db, 'privateChats', chatId, 'messages'), {
        user: profile.username,
        rank: profile.tierId || 'free',
        text: privateText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        media: ev.target?.result as string,
        mediaType: file.type.startsWith('video') ? 'video' : 'image',
        supports: 0, reactions: {}, comms: 0,
      }).catch(err => console.error('[FitWolf] Private media failed:', err));
      setPrivateText('');
    };
    reader.readAsDataURL(file);
  };

  const toggleLike = (msgId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        const isLiked = msg.userReaction === 'like';
        return { ...msg, supports: isLiked ? msg.supports - 1 : msg.supports + 1, userReaction: isLiked ? undefined : 'like' };
      }
      return msg;
    }));
  };

  const addComment = (msgId: string) => {
    if (!commentText.trim()) return;
    const newComment: GuildComment = {
      id: Date.now().toString(),
      user: profile?.username || "Unknown",
      text: commentText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => prev.map(msg => msg.id === msgId ? { ...msg, comments: [...(msg.comments || []), newComment], comms: msg.comms + 1 } : msg));
    setCommentText('');
  };

  const handleChatUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (onSendMessage) onSendMessage(composerText, ev.target?.result as string); setComposerText(''); };
      reader.readAsDataURL(file);
    }
  };

  const handleRaidUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { setTempCropImg(ev.target?.result as string); setIsCropping(true); setCropScale(1); setCropPos({ x: 0, y: 0 }); };
      reader.readAsDataURL(file);
    }
  };

  const finalizeCrop = () => {
    if (tempCropImg && canvasRef.current && viewportRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        const width = 720; const height = 1280;
        canvas.width = width; canvas.height = height;
        ctx.fillStyle = "black"; ctx.fillRect(0, 0, width, height);
        const viewportW = viewportRef.current!.clientWidth;
        const scaleFactor = width / viewportW;
        ctx.save();
        ctx.translate(width / 2 + (cropPos.x * scaleFactor), height / 2 + (cropPos.y * scaleFactor));
        ctx.scale(cropScale, cropScale);
        const imgAspect = img.width / img.height;
        let drawW, drawH;
        if (imgAspect > (9/16)) { drawH = height; drawW = height * imgAspect; } else { drawW = width; drawH = width / imgAspect; }
        ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
        ctx.restore();
        setProofMedia(canvas.toDataURL('image/jpeg', 0.9));
        setIsCropping(false); setTempCropImg(null);
      };
      img.src = tempCropImg;
    }
  };

  const onPanStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - cropPos.x, y: clientY - cropPos.y });
  };
  const onPanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCropPos({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const submitRaid = () => {
    const DAMAGE = 5000;
    const newHp = Math.max(0, bossHp - DAMAGE);
    setBossHp(newHp);
    if (onUpdateBossHp) onUpdateBossHp(newHp);
    setDamageFeedback(`-${DAMAGE} HP`);
    setTimeout(() => setDamageFeedback(null), 3000);
    if (onSendMessage && selectedOrder) onSendMessage(`[RAID EXECUTED: ${selectedOrder.title}]\n${proofText}`, proofMedia || undefined);
    setSelectedOrder(null); setProofMedia(null); setProofText('');
  };

  const handleDeploy = () => {
    if (!composerText.trim()) return;
    if (onSendMessage) { onSendMessage(composerText); setComposerText(''); }
  };

  const hasPrivateChat = activeTab === 'allies' && !!activeAllyChat;

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-screen bg-black" onMouseUp={() => setIsDragging(false)} onTouchEnd={() => setIsDragging(false)}>
      <style>{`
        .toxic-text { color: #00FF88; }
        .toxic-bg { background: #00FF88; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .active-tab { background: #00FF8810; border-bottom: 2px solid #00FF88; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s forwards; }
        .damage-float { animation: floatUp 2s forwards; }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-50px); } }
      `}</style>

      {/* HEADER */}
      <section className="p-4 border-b border-[#00FF88]/20 bg-black sticky top-0 z-50 relative">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Raid Operations</h2>
            <h1 className="text-2xl font-black uppercase italic text-white tracking-tighter leading-none mb-1">{globalData?.guildBoss.name || 'VOID TITAN'}</h1>
          </div>
          <span className="text-[10px] data-font text-white font-bold">{bossHp.toLocaleString()} HP</span>
        </div>
        <div className="h-1.5 bg-[#111] mb-4">
          <div className="h-full toxic-bg shadow-[0_0_10px_#00FF88]" style={{ width: `${(bossHp / (globalData?.guildBoss.maxHp || 1000000)) * 100}%` }}></div>
        </div>
        {damageFeedback && (
          <div className="absolute bottom-[-20px] right-4 text-[#00FF88] font-black text-xl damage-float z-50">{damageFeedback}</div>
        )}
      </section>

      {/* TABS */}
      <nav className="flex border-b border-[#111] h-16 bg-black/95">
        <button onClick={() => setActiveTab('orders')} className={`flex-1 flex flex-col items-center justify-center ${activeTab === 'orders' ? 'active-tab toxic-text' : 'text-gray-500'}`}>
          <span className="text-lg">💀</span><span className="text-[8px] uppercase font-black tracking-widest mt-1">Raid Orders</span>
        </button>
        <button onClick={() => setActiveTab('pack')} className={`flex-1 flex flex-col items-center justify-center ${activeTab === 'pack' ? 'active-tab toxic-text' : 'text-gray-500'}`}>
          <span className="text-lg">🐺</span><span className="text-[8px] uppercase font-black tracking-widest mt-1">The Pack</span>
        </button>
        <button onClick={() => { setActiveTab('allies'); closePrivateChat(); }} className={`flex-1 flex flex-col items-center justify-center ${activeTab === 'allies' ? 'active-tab toxic-text' : 'text-gray-500'}`}>
          <span className="text-lg">👊</span>
          <span className="text-[8px] uppercase font-black tracking-widest mt-1">
            Bondgenoten{allyProfiles.length > 0 ? ` (${allyProfiles.length})` : ''}
          </span>
        </button>
      </nav>

      <main className={`flex-grow p-4 overflow-y-auto no-scrollbar ${(activeTab === 'pack' || hasPrivateChat) ? 'pb-56' : 'pb-24'}`}>

        {/* RAID ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            {globalData?.raidOrders && globalData.raidOrders.length > 0 ? globalData.raidOrders.map(order => (
              <RaidOrderCard key={order.id} order={order} onExecute={() => setSelectedOrder(order)} />
            )) : (
              <div className="text-center py-10 text-gray-600 text-[10px] uppercase font-bold tracking-widest">No Active Orders</div>
            )}
          </div>
        )}

        {/* THE PACK — algemene chat */}
        {activeTab === 'pack' && (
          <div className="space-y-6 animate-fade-in">
            {messages.length === 0 && <div className="text-center py-10 text-gray-600 text-[10px] uppercase font-bold tracking-widest">No Transmissions</div>}
            {messages.map(msg => (
              <div key={msg.id} className="bg-[#0a0a0a] border border-[#111] p-5 relative group">
                {isAdmin && onDeleteMessage && (
                  <button onClick={() => onDeleteMessage(msg.id)} className="absolute top-2 right-2 bg-red-900/20 text-red-500 border border-red-900/50 text-[8px] font-black uppercase px-2 py-1 hover:bg-red-600 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    Delete
                  </button>
                )}
                <div className="flex gap-4 mb-4">
                  <div className="w-10 h-10 border border-[#00FF88]/30 overflow-hidden bg-black flex items-center justify-center">
                    {msg.userPic ? <img src={msg.userPic} className="w-full h-full object-cover" /> : <span className="text-[10px] toxic-text font-black">{msg.rank}</span>}
                  </div>
                  <div><h4 className="text-xs font-black text-white uppercase">{msg.user}</h4><span className="text-[9px] data-font text-gray-600">{msg.timestamp}</span></div>
                </div>
                {msg.media && <TacticalMedia src={msg.media} type={msg.mediaType} aspectRatio={msg.aspectRatio} className="w-full mb-4" />}
                <p className="text-[13px] text-gray-300 mb-6 font-medium whitespace-pre-wrap">{msg.text}</p>
                <div className="flex gap-6 pt-4 border-t border-[#111] items-center">
                  <button onClick={() => toggleLike(msg.id)} className={`text-[10px] font-black uppercase tracking-widest hover:text-[#00FF88] transition-colors ${msg.userReaction ? 'text-[#00FF88]' : 'text-gray-600'}`}>
                    👊 {msg.supports}
                  </button>
                  <button onClick={() => setActiveCommentId(activeCommentId === msg.id ? null : msg.id)} className="text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-[#00FF88]">
                    💬 {msg.comments?.length || 0} Comms
                  </button>
                </div>
                {activeCommentId === msg.id && (
                  <div className="mt-4 bg-[#050505] p-3 border-t border-[#111]">
                    <div className="space-y-3 mb-4 max-h-40 overflow-y-auto no-scrollbar">
                      {msg.comments?.map(comment => (
                        <div key={comment.id} className="text-[10px]">
                          <span className="text-[#00FF88] font-black uppercase mr-2">{comment.user}:</span>
                          <span className="text-gray-300">{comment.text}</span>
                        </div>
                      ))}
                      {(!msg.comments || msg.comments.length === 0) && <p className="text-[9px] text-gray-600 italic">No comms yet.</p>}
                    </div>
                    <div className="flex gap-2">
                      <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add intel..." className="flex-grow bg-black border border-[#222] p-2 text-[10px] text-white outline-none focus:border-[#00FF88]" onKeyDown={e => e.key === 'Enter' && addComment(msg.id)} />
                      <button onClick={() => addComment(msg.id)} className="text-[9px] bg-[#00FF88] text-black px-3 font-black uppercase">Send</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* BONDGENOTEN */}
        {activeTab === 'allies' && (
          activeAllyChat ? (
            // Privéchat view
            <div className="flex flex-col animate-fade-in">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#111]">
                <button translate="no" onClick={closePrivateChat} className="text-gray-500 hover:text-[#00FF88] text-[10px] font-black uppercase tracking-widest">← Terug</button>
                <div className="flex items-center gap-2">
                  {activeAllyChat.profilePic
                    ? <img src={activeAllyChat.profilePic} className="w-7 h-7 object-cover border border-[#00FF88]/40" />
                    : <div className="w-7 h-7 border border-[#00FF88]/40 flex items-center justify-center bg-black"><span className="text-[9px] toxic-text font-black">{activeAllyChat.tierId?.slice(0,2).toUpperCase()}</span></div>
                  }
                  <span className="text-sm font-black text-white uppercase">{activeAllyChat.username}</span>
                </div>
              </div>

              <div className="space-y-3">
                {privateMsgs.length === 0 && (
                  <p className="text-center text-gray-600 text-[10px] uppercase font-bold pt-10 tracking-widest">Nog geen berichten</p>
                )}
                {privateMsgs.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.user === profile?.username ? 'items-end' : 'items-start'}`}>
                    {msg.media && (
                      msg.mediaType === 'video'
                        ? <video src={msg.media} className="max-w-[70%] mb-1" controls />
                        : <img src={msg.media} className="max-w-[70%] mb-1 border border-[#222]" alt="media" />
                    )}
                    {msg.text && (
                      <div className={`max-w-[75%] px-4 py-3 text-[12px] font-medium ${msg.user === profile?.username ? 'bg-[#00FF88] text-black' : 'bg-[#111] text-white border border-[#222]'}`}>
                        {msg.text}
                      </div>
                    )}
                    <span className="text-[8px] text-gray-600 mt-1">{msg.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Bondgenoten overzicht
            <div className="space-y-4 animate-fade-in">
              {/* Bondgenoot toevoegen */}
              <div className="border border-[#00FF88]/20 bg-[#00FF88]/5 p-4">
                <h3 className="text-[9px] uppercase font-black text-[#00FF88] tracking-widest mb-1">Bondgenoot Toevoegen</h3>
                <p className="text-[9px] text-gray-500 mb-3 uppercase">Voer de referral code in van je vriend</p>
                <div className="flex gap-2">
                  <input
                    value={allyInput}
                    onChange={e => setAllyInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter' && allyInput.trim() && onAddAlly) { onAddAlly(allyInput.trim()); setAllyInput(''); } }}
                    placeholder="bijv. WOLF-X3K9"
                    className="flex-grow bg-black border border-[#222] p-3 text-[10px] text-white outline-none focus:border-[#00FF88] uppercase font-mono tracking-widest"
                  />
                  <button
                    onClick={() => { if (allyInput.trim() && onAddAlly) { onAddAlly(allyInput.trim()); setAllyInput(''); } }}
                    className="px-4 bg-[#00FF88] text-black font-black uppercase text-[10px] tracking-widest hover:bg-[#00CC6A] transition-colors"
                  >Voeg toe</button>
                </div>
                {profile?.referralCode && (
                  <p className="text-[8px] text-gray-600 mt-3 uppercase">Jouw code: <span className="text-[#00FF88] font-black tracking-widest font-mono">{profile.referralCode}</span></p>
                )}
              </div>

              {/* Bondgenotenlijst */}
              {allyProfiles.length === 0 ? (
                <div className="text-center py-12 text-gray-600 text-[10px] uppercase font-bold tracking-widest leading-loose">
                  Nog geen bondgenoten.<br />Deel jouw code of voer die van een vriend in.
                </div>
              ) : (
                allyProfiles.map(ally => (
                  <div key={ally.id} className="flex items-center justify-between border border-[#222] bg-[#0a0a0a] p-4 hover:border-[#00FF88]/40 transition-colors">
                    <div className="flex items-center gap-3">
                      {ally.profilePic
                        ? <img src={ally.profilePic} className="w-10 h-10 object-cover border border-[#00FF88]/30" />
                        : <div className="w-10 h-10 border border-[#00FF88]/30 flex items-center justify-center bg-black"><span className="text-[10px] toxic-text font-black">{ally.tierId?.slice(0,2).toUpperCase() || 'HU'}</span></div>
                      }
                      <div>
                        <p className="text-xs font-black text-white uppercase">{ally.username}</p>
                        <p className="text-[9px] text-gray-600 uppercase">{ally.tierId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openPrivateChat(ally)}
                      className="px-4 py-2 border border-[#00FF88] text-[#00FF88] font-black uppercase text-[9px] hover:bg-[#00FF88] hover:text-black transition-all tracking-widest"
                    >Chat</button>
                  </div>
                ))
              )}
            </div>
          )
        )}
      </main>

      {/* ALGEMENE CHAT COMPOSER */}
      {activeTab === 'pack' && (
        <div className="fixed bottom-20 left-0 w-full bg-[#050505]/95 backdrop-blur-md border-t border-[#00FF88]/20 p-4 z-40">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => composerFileRef.current?.click()} className="text-gray-500 hover:text-[#00FF88] p-3 border border-[#222] bg-black">📷</button>
            <input type="file" ref={composerFileRef} className="hidden" accept="image/*" onChange={handleChatUpload} />
            <input value={composerText} onChange={e => setComposerText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDeploy()} placeholder="Transmit intelligence..." className="flex-grow bg-black border border-[#222] p-3 text-[11px] font-black text-white outline-none focus:border-[#00FF88]" />
            <button onClick={handleDeploy} className="px-6 py-3 bg-[#00FF88] text-black font-black uppercase text-[10px] tracking-widest">Deploy</button>
          </div>
        </div>
      )}

      {/* PRIVÉCHAT COMPOSER */}
      {hasPrivateChat && (
        <div className="fixed bottom-20 left-0 w-full bg-[#050505]/95 backdrop-blur-md border-t border-[#00FF88]/20 p-4 z-40">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => privateChatFileRef.current?.click()} className="text-gray-500 hover:text-[#00FF88] p-3 border border-[#222] bg-black">📷</button>
            <input type="file" ref={privateChatFileRef} className="hidden" accept="image/*,video/*" onChange={handlePrivateUpload} />
            <input value={privateText} onChange={e => setPrivateText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendPrivateMessage()} placeholder={`Bericht naar ${activeAllyChat?.username}...`} className="flex-grow bg-black border border-[#222] p-3 text-[11px] font-black text-white outline-none focus:border-[#00FF88]" />
            <button onClick={sendPrivateMessage} className="px-6 py-3 bg-[#00FF88] text-black font-black uppercase text-[10px] tracking-widest">Stuur</button>
          </div>
        </div>
      )}

      {/* RAID UPLOAD MODAL */}
      {selectedOrder && !isCropping && (
        <div className="fixed inset-0 z-[1001] bg-black/95 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-[#00FF88] p-6 shadow-[0_0_30px_#00FF8830] my-auto">
            <h3 className="text-xl font-black text-white uppercase italic mb-1">{selectedOrder.title}</h3>
            <p className="text-xs text-gray-500 mb-6 uppercase">Mission Proof Upload</p>
            <div onClick={() => raidFileRef.current?.click()} className="h-[150px] aspect-[9/16] bg-black border border-dashed border-[#333] mb-4 flex items-center justify-center cursor-pointer hover:border-[#00FF88] transition-all relative overflow-hidden group mx-auto">
              {proofMedia ? <img src={proofMedia} className="w-full h-full object-cover" /> : (
                <div className="text-center"><div className="text-3xl mb-2">📷</div><span className="text-[9px] uppercase font-black text-gray-500">Tap to Upload (9:16)</span></div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-xs font-black text-[#00FF88] uppercase">Change Image</span></div>
            </div>
            <input type="file" ref={raidFileRef} className="hidden" accept="image/*" onChange={handleRaidUpload} />
            <input value={proofText} onChange={e => setProofText(e.target.value)} placeholder="Mission Report (Optional)..." className="w-full bg-black border border-[#222] p-3 text-xs text-white mb-4 outline-none focus:border-[#00FF88]" />
            <div className="flex gap-3">
              <button translate="no" onClick={() => setSelectedOrder(null)} className="flex-1 py-3 border border-gray-800 text-gray-500 font-black uppercase text-[10px]">Sluiten</button>
              <button onClick={submitRaid} disabled={!proofMedia} className="flex-1 py-3 bg-[#00FF88] text-black font-black uppercase text-[10px] disabled:opacity-50">Upload & Strike</button>
            </div>
          </div>
        </div>
      )}

      {/* CROPPER MODAL (9:16) */}
      {isCropping && tempCropImg && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-4">
          <canvas ref={canvasRef} className="hidden" />
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center"><h3 className="text-[#00FF88] uppercase font-black">Align Tactical Feed</h3></div>
            <div ref={viewportRef} className="relative w-full h-[300px] border-2 border-[#00FF88] overflow-hidden bg-[#111]" onMouseDown={onPanStart} onMouseMove={onPanMove} onTouchStart={onPanStart} onTouchMove={onPanMove}>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-px bg-[#00FF88]/30"></div>
                <div className="h-full w-px bg-[#00FF88]/30 absolute"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})` }}>
                <img src={tempCropImg} className="max-w-none max-h-none pointer-events-none" style={{ minWidth: '100%', minHeight: '100%' }} />
              </div>
            </div>
            <div className="bg-[#111] p-4 border border-[#222]">
              <input type="range" min="0.5" max="3" step="0.01" value={cropScale} onChange={e => setCropScale(parseFloat(e.target.value))} className="w-full accent-[#00FF88] mb-4" />
              <div className="flex gap-4">
                <button translate="no" onClick={() => { setIsCropping(false); setTempCropImg(null); }} className="flex-1 py-3 border border-gray-700 text-gray-500 font-black uppercase text-[10px]">Sluiten</button>
                <button onClick={finalizeCrop} className="flex-1 py-3 bg-[#00FF88] text-black font-black uppercase text-[10px]">Confirm Feed</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

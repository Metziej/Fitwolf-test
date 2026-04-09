
import React, { useState, useRef } from 'react';
import { UserProfile, Goal, UnitSystem, CropConfig } from '../types.ts';

interface ProfileEditProps {
  profile: UserProfile;
  onSave: (data: any) => void;
  onBack: () => void;
  onLogout: () => void;
  onNavigate?: (screen: string) => void;
}

export default function ProfileEdit({ profile, onSave, onBack, onLogout, onNavigate }: ProfileEditProps) {
  const [formData, setFormData] = useState({
    weight: profile.weight,
    height: profile.height,
    age: profile.age,
    goal: profile.goal,
    units: profile.units || UnitSystem.METRIC,
    activityLevel: profile.activityLevel || 1.55,
    email: profile.email,
    username: profile.username,
    phone: profile.phone || '',
    fullName: profile.username,
    shippingAddress: profile.shippingAddress || '',
    bankAccount: profile.bankAccount || '',
    bankName: profile.bankName || '',
    paymentMethod: profile.paymentMethod || 'IDEAL',
    profilePic: profile.profilePic || '',
    profilePicCrop: profile.profilePicCrop || { x: 0, y: 0, scale: 1, aspectRatio: '1:1' },
    characterConfig: profile.characterConfig
  });

  const [tempPic, setTempPic] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1.0);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempPic(reader.result as string);
        setCropScale(1.0);
        setCropPos({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const finalizeAvatarCrop = () => {
    if (tempPic && canvasRef.current && viewportRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        const outputSize = 512;
        canvas.width = outputSize;
        canvas.height = outputSize;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, outputSize, outputSize);
        const viewportWidth = viewportRef.current!.clientWidth;
        const scaleFactor = outputSize / viewportWidth;
        ctx.save();
        ctx.translate(outputSize / 2 + (cropPos.x * scaleFactor), outputSize / 2 + (cropPos.y * scaleFactor));
        ctx.scale(cropScale, cropScale);
        const imgAspect = img.width / img.height;
        let drawW, drawH;
        if (imgAspect > 1) { drawW = outputSize * imgAspect; drawH = outputSize; }
        else { drawW = outputSize; drawH = outputSize / imgAspect; }
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setFormData(prev => ({ ...prev, profilePic: croppedDataUrl }));
        setTempPic(null);
      };
      img.src = tempPic;
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

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-24 animate-fade-in" onMouseUp={() => setIsDragging(false)} onTouchEnd={() => setIsDragging(false)}>
      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        .section-header { font-size: 10px; font-weight: 900; color: #FF2A2A; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 1rem; display: block; border-left: 2px solid #FF2A2A; padding-left: 10px; }
      `}</style>
      
      <header className="mb-10 flex justify-between items-start border-b border-[#FF2A2A]/20 pb-4">
        <div>
            <h2 className="text-xs uppercase tracking-[0.5em] text-[#FF2A2A] mb-1 font-bold">System Settings</h2>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">COMMAND OVERRIDE</h1>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest font-black">Close</button>
      </header>

      <div className="space-y-12">
        {/* IDENTITY SECTION */}
        <section className="bg-[#0a0a0a] border border-[#222] p-8">
            <span className="section-header">Neural Identity</span>
            <div className="flex flex-col items-center mb-8">
               <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-[#FF2A2A] bg-black overflow-hidden flex items-center justify-center cursor-pointer hover:shadow-[0_0_15px_#FF2A2A] transition-all relative group">
                  {formData.profilePic ? <img src={formData.profilePic} className="w-full h-full object-cover" alt="Profile" /> : <span className="text-3xl">🐺</span>}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10"><span className="text-[8px] font-black uppercase text-white tracking-widest">Update</span></div>
               </div>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="text-[8px] text-gray-500 uppercase font-black">Designation</label>
                       <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white focus:border-[#FF2A2A] outline-none uppercase" />
                   </div>
                   <div>
                       <label className="text-[8px] text-gray-500 uppercase font-black">Comms Channel</label>
                       <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white focus:border-[#FF2A2A] outline-none" />
                   </div>
                </div>
            </div>
        </section>

        {/* LOGISTICS & FINANCIAL */}
        <section className="bg-[#0a0a0a] border border-[#222] p-8">
            <span className="section-header">Logistics & Financial Nodes</span>
            <div className="space-y-4">
                <div>
                    <label className="text-[8px] text-gray-500 uppercase font-black">Base Coordinates (Shipping)</label>
                    <input type="text" value={formData.shippingAddress} onChange={e => setFormData({...formData, shippingAddress: e.target.value})} placeholder="SECTOR, CITY, POSTCODE" className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white focus:border-[#FF2A2A] outline-none uppercase" />
                </div>
                
                <div>
                    <label className="text-[8px] text-gray-500 uppercase font-black">Payment Protocol (Automatic Direct Debit)</label>
                    <select 
                        value={formData.paymentMethod} 
                        onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}
                        className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white uppercase outline-none focus:border-[#FF2A2A]"
                    >
                        <option value="IDEAL">iDEAL</option>
                        <option value="PAYPAL">PayPal</option>
                        <option value="CARD">Credit Card</option>
                        <option value="SEPA">SEPA Direct Debit</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[8px] text-gray-500 uppercase font-black">Bank / Provider Name</label>
                        <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="BANK / PAYPAL EMAIL" className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white focus:border-[#FF2A2A] outline-none uppercase" />
                    </div>
                    <div>
                        <label className="text-[8px] text-gray-500 uppercase font-black">Account Link (IBAN / Card)</label>
                        <input type="text" value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} placeholder="IBAN / ACCOUNT" className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white focus:border-[#FF2A2A] outline-none uppercase" />
                    </div>
                </div>
            </div>
        </section>

        {/* PHYSICAL SECTION */}
        <section className="bg-[#0a0a0a] border border-[#222] p-8">
            <span className="section-header">Biometric Telemetry</span>
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="space-y-1">
                   <label className="text-[8px] uppercase text-gray-600 font-black">Weight ({formData.units === UnitSystem.METRIC ? 'KG' : 'LBS'})</label>
                   <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-4 text-sm font-black text-[#FF2A2A] outline-none focus:border-[#FF2A2A]" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] uppercase text-gray-600 font-black">Height (CM)</label>
                   <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-4 text-sm font-black text-white outline-none focus:border-[#FF2A2A]" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] uppercase text-gray-600 font-black">Age</label>
                   <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-4 text-sm font-black text-white outline-none focus:border-[#FF2A2A]" />
                </div>
            </div>
            <div className="space-y-1">
               <label className="text-[8px] uppercase text-gray-600 font-black">Evolution Protocol</label>
               <select 
                  value={formData.goal} 
                  onChange={e => setFormData({...formData, goal: e.target.value as Goal})}
                  className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white uppercase outline-none focus:border-[#FF2A2A]"
               >
                  <option value={Goal.CUT}>Path of the Predator (Cut)</option>
                  <option value={Goal.BULK}>Path of the Juggernaut (Bulk)</option>
               </select>
            </div>
        </section>

        <button onClick={() => onSave(formData)} className="w-full bg-[#FF2A2A] text-black font-black py-6 uppercase tracking-[0.5em] shadow-[0_0_30px_rgba(255,42,42,0.3)] hover:scale-[1.01] transition-all">Synchronize Parameters</button>

        {/* Quick navigation naar gerelateerde screens */}
        {onNavigate && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { onBack(); onNavigate('subscription'); }}
              className="border border-[#222] py-3 text-[8px] font-black uppercase text-gray-500 hover:text-white hover:border-[#FF2A2A] transition-all"
            >
              💳 Abonnement
            </button>
            <button
              onClick={() => { onBack(); onNavigate('referral'); }}
              className="border border-[#222] py-3 text-[8px] font-black uppercase text-gray-500 hover:text-white hover:border-[#FF2A2A] transition-all"
            >
              🐺 Referral
            </button>
            <button
              onClick={() => { onBack(); onNavigate('progress'); }}
              className="border border-[#222] py-3 text-[8px] font-black uppercase text-gray-500 hover:text-white hover:border-[#FF2A2A] transition-all"
            >
              📈 Progressie
            </button>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full bg-transparent border border-gray-800 text-gray-600 hover:text-[#FF2A2A] hover:border-[#FF2A2A] font-black py-4 uppercase tracking-[0.3em] transition-all text-[10px]"
        >
          Terminate Session (Logout)
        </button>
      </div>

      {tempPic && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-4">
           <div className="w-full max-w-md space-y-6 animate-fade-in relative z-20">
              <div className="text-center"><h2 className="text-xl font-black text-[#FF2A2A] uppercase italic mb-1">Avatar Calibration</h2></div>
              <div ref={viewportRef} className="relative w-full border-2 border-[#FF2A2A] overflow-hidden crop-viewport aspect-square" onMouseDown={onPanStart} onMouseMove={onPanMove} onTouchStart={onPanStart} onTouchMove={onPanMove}>
                 <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})` }}>
                    <img src={tempPic} className="max-w-none max-h-none pointer-events-none w-full h-auto" />
                 </div>
              </div>
              <div className="space-y-4 px-4 bg-black/60 p-6 rounded border border-[#222]">
                 <input type="range" min="0.1" max="5" step="0.01" value={cropScale} onChange={e => setCropScale(parseFloat(e.target.value))} className="w-full accent-[#FF2A2A]" />
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setTempPic(null)} className="py-4 border border-gray-800 text-gray-500 text-[10px] font-black uppercase">Abort</button>
                    <button onClick={finalizeAvatarCrop} className="py-4 bg-[#FF2A2A] text-black text-[10px] font-black uppercase shadow-[0_0_15px_#FF2A2A]">Seal Identity</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

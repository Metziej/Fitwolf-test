import React, { useState, useEffect, useMemo } from 'react';
import { t } from '../translations.ts';
import { UserProfile, Product, DiscountCode } from '../types.ts';

interface ArmoryProps {
  language?: string;
  profile?: UserProfile;
  products: Product[];
  discountCodes: DiscountCode[];
  onPurchase?: (product: Product) => void;
}

const BANKS = ["ING", "Rabobank", "ABN AMRO", "SNS Bank", "ASN Bank", "Bunq"];

export default function Armory({ language = 'en', profile, products, discountCodes, onPurchase }: ArmoryProps) {
  const lang = language;
  const [filter, setFilter] = useState<'All' | 'Supplements' | 'Gear' | 'Apparel'>('All');
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>(() => {
    const saved = localStorage.getItem('fitwolf_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<number>(0); 
  const [payMethod, setPayMethod] = useState<'IDEAL' | 'CARD' | 'PAYPAL' | 'SEPA' | null>(null);
  const [shippingAddress, setShippingAddress] = useState(profile?.shippingAddress || 'Sector 7, Hunter District, Neo-City');
  const [coupon, setCoupon] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  useEffect(() => {
    localStorage.setItem('fitwolf_cart', JSON.stringify(cart));
  }, [cart]);

  const filteredProducts = useMemo(() => {
    if (filter === 'All') return products;
    return products.filter(p => p.category === filter);
  }, [filter, products]);

  const applyCoupon = () => {
    const found = discountCodes.find(d => d.code === coupon.toUpperCase());
    if (found) {
      setAppliedDiscount(found.percentage);
      alert(`COUPON APPLIED: ${found.percentage}% OFF`);
    } else {
      alert("INVALID ACCESS CODE.");
      setAppliedDiscount(0);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutStep(4);
      setIsCartOpen(true);
      setCart([]);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        setCheckoutStep(0);
        setIsCartOpen(false);
      }, 4000);
    }
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({ name: c.product.name, price: c.product.price, qty: c.qty })),
          successUrl: window.location.origin + '?checkout=success',
          cancelUrl: window.location.origin + '?checkout=cancel',
        })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate checkout.');
    }
  };

  const rawTotal = cart.reduce((acc, item) => acc + item.product.price * item.qty, 0);
  const cartTotal = rawTotal * (1 - appliedDiscount / 100);

  return (
    <div className="max-w-4xl mx-auto p-4 pt-8 pb-32 animate-fade-in">
      <header className="mb-8 flex justify-between items-end border-b border-[#00F0FF]/20 pb-4">
        <div>
          <h2 className="text-[9px] uppercase tracking-[0.4em] text-[#00F0FF] mb-1 font-bold">{t(lang, 'armory_supply_depot')}</h2>
          <h1 className="text-4xl font-black uppercase italic text-white tracking-tighter leading-none">{t(lang, 'armory_title')}</h1>
        </div>
        <button onClick={() => setIsCartOpen(true)} className="relative p-3 border border-[#00F0FF]/30 hover:border-[#00F0FF] transition-all bg-[#00F0FF]/5 group">
          <span className="text-[10px] uppercase font-black tracking-widest text-[#00F0FF]">{t(lang, 'armory_loot_bag')}</span>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#00F0FF] text-black text-[10px] font-black flex items-center justify-center rounded-sm animate-pulse">{cart.reduce((a, b) => a + b.qty, 0)}</span>
          )}
        </button>
      </header>

      <nav className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {(['All', 'Supplements', 'Gear', 'Apparel'] as const).map((cat) => (
          <button
            key={cat} onClick={() => setFilter(cat)}
            className={`px-6 py-2 text-[10px] uppercase font-black tracking-widest transition-all border whitespace-nowrap ${
              filter === cat ? 'bg-[#00F0FF] text-black border-[#00F0FF]' : 'border-[#222] text-gray-500 hover:border-[#00F0FF]/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="relative bg-[#0a0a0a] border border-[#222] hover:border-[#00F0FF]/50 transition-all overflow-hidden flex flex-col group">
            {product.discountLabel && (
              <div className="absolute top-2 right-2 z-10 bg-[#FF2A2A] px-2 py-0.5 text-[8px] font-black text-white uppercase italic tracking-tighter shadow-lg">{product.discountLabel}</div>
            )}
            <div className="absolute top-2 left-2 z-10 bg-black/80 px-2 py-0.5 border border-[#00F0FF]/30 text-[8px] font-black text-[#00F0FF] uppercase tracking-tighter">{product.buff}</div>
            <div className="aspect-square bg-[#111] flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-500">{product.image}</div>
            <div className="p-4 border-t border-[#111] flex-grow flex flex-col">
              <h3 className="text-[11px] font-black uppercase text-white tracking-widest mb-1">{product.name}</h3>
              <div className="flex items-center gap-2 mb-4">
                 <span className="text-[10px] data-font text-[#00F0FF] font-black">${product.price.toFixed(2)}</span>
                 {product.originalPrice && (
                   <span className="text-[9px] data-font text-gray-600 line-through">${product.originalPrice.toFixed(2)}</span>
                 )}
              </div>
              <button onClick={() => addToCart(product)} className="mt-auto w-full bg-[#111] border border-[#222] py-2 text-[9px] uppercase font-black tracking-widest hover:bg-[#00F0FF] hover:text-black transition-all">{t(lang, 'armory_acquire')}</button>
            </div>
          </div>
        ))}
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-black border-l border-[#00F0FF]/30 flex flex-col h-full animate-slide-in z-[1001] pb-20">
            <header className="p-6 border-b border-[#111] flex justify-between items-center">
              <h2 className="text-xl font-black uppercase text-[#00F0FF] italic tracking-tighter">Loot Bag</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500">✕</button>
            </header>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar min-h-0">
               {checkoutStep === 4 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#00FF88] text-center space-y-4 py-20">
                     <div className="w-16 h-16 border-4 border-[#00FF88] rounded-full flex items-center justify-center text-2xl animate-bounce">✓</div>
                     <h3 className="text-xl font-black uppercase tracking-tighter">Supplies Dispatched</h3>
                  </div>
               ) : (
                 cart.length === 0 ? <p className="text-center text-gray-600 text-[10px] uppercase font-black pt-20">Bag is empty.</p> :
                 cart.map(item => (
                   <div key={item.product.id} className="flex gap-4 p-4 bg-[#0a0a0a] border border-[#111] items-center">
                      <span className="text-2xl">{item.product.image}</span>
                      <div className="flex-grow">
                         <h4 className="text-[10px] font-black text-white uppercase">{item.product.name}</h4>
                         <p className="text-[9px] text-[#00F0FF] data-font">${(item.product.price * item.qty).toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-900 text-[8px] font-black">REMOVE</button>
                   </div>
                 ))
               )}
            </div>

            {cart.length > 0 && checkoutStep < 4 && (
              <div className="p-6 border-t border-[#111] bg-black space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.8)]">
                <div className="flex gap-2">
                   <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="DISCOUNT CODE" className="flex-grow bg-[#111] border border-[#222] p-3 text-[10px] font-black text-white uppercase focus:border-[#00F0FF] outline-none" />
                   <button onClick={applyCoupon} className="bg-[#00F0FF] text-black px-4 text-[10px] font-black">APPLY</button>
                </div>
                <div className="flex justify-between border-t border-[#111] pt-4">
                  <span className="text-gray-600 text-[10px] uppercase font-black">Subtotal</span>
                  <span className="text-white data-font font-black">${rawTotal.toFixed(2)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-[#00FF88]">
                    <span className="text-[10px] uppercase font-black">Override Bonus</span>
                    <span className="data-font font-black">-{appliedDiscount}%</span>
                  </div>
                )}
                <div className="flex justify-between pb-4">
                  <span className="text-white text-[10px] uppercase font-black italic">Final Credits</span>
                  <span className="text-[#00F0FF] data-font font-black text-lg">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCheckout} className="flex-grow bg-[#00F0FF] text-black font-black py-4 uppercase italic tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                    {t(lang, 'armory_initiate_transfer')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
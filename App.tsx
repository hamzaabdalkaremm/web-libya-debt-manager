
import React, { useState, useEffect, useMemo } from 'react';
import { Debt, DebtType, DebtStatus, DashboardStats } from './types';
import { Dashboard } from './components/Dashboard';
import { DebtCard } from './components/DebtCard';
import { getFinancialAdvice } from './services/geminiService';

const App: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('wb_debts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTab, setActiveTab] = useState<'all' | 'lent' | 'borrowed' | 'ai'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // استماع لحدث التثبيت (PWA)
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('wb_debts', JSON.stringify(debts));
  }, [debts]);

  const stats = useMemo<DashboardStats>(() => {
    const pending = debts.filter(d => d.status === DebtStatus.PENDING);
    const lent = pending.filter(d => d.type === DebtType.LENT).reduce((acc, curr) => acc + curr.amount, 0);
    const borrowed = pending.filter(d => d.type === DebtType.BORROWED).reduce((acc, curr) => acc + curr.amount, 0);
    return {
      totalLent: lent,
      totalBorrowed: borrowed,
      balance: lent - borrowed
    };
  }, [debts]);

  const filteredDebts = useMemo(() => {
    const sorted = [...debts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (activeTab === 'all') return sorted;
    if (activeTab === 'lent') return sorted.filter(d => d.type === DebtType.LENT);
    if (activeTab === 'borrowed') return sorted.filter(d => d.type === DebtType.BORROWED);
    return sorted;
  }, [debts, activeTab]);

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amountInput = (e.target as any).elements.amount.value;
    const nameInput = (e.target as any).elements.contactName.value;
    const notesInput = (e.target as any).elements.notes.value;
    const typeInput = (e.target as any).elements.debtType.value;

    if (!nameInput || !amountInput) return;

    const debt: Debt = {
      id: Date.now().toString(),
      contactName: nameInput,
      amount: Number(amountInput),
      type: typeInput as DebtType,
      date: new Date().toLocaleDateString('ar-LY'),
      notes: notesInput || '',
      status: DebtStatus.PENDING
    };

    setDebts(prev => [debt, ...prev]);
    setIsFormOpen(false);
  };

  const toggleStatus = (id: string) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, status: d.status === DebtStatus.PAID ? DebtStatus.PENDING : DebtStatus.PAID } : d));
  };

  const deleteDebt = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      setDebts(prev => prev.filter(d => d.id !== id));
    }
  };

  const fetchAdvice = async () => {
    setIsAiLoading(true);
    const advice = await getFinancialAdvice(debts);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col pb-28">
      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[40px] shadow-sm sticky top-0 z-30 border-b border-indigo-50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-indigo-900 leading-none">ويب ليبيا</h1>
            <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-tighter">Debt Manager Pro</p>
          </div>
          <div className="flex gap-2">
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="bg-indigo-100 text-indigo-700 p-2 rounded-xl text-[10px] font-bold animate-pulse"
              >
                تثبيت التطبيق 📱
              </button>
            )}
            <div className="bg-indigo-600 p-2 rounded-2xl shadow-lg shadow-indigo-100">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/></svg>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 mt-6 flex-grow">
        {activeTab === 'ai' ? (
          <div className="animate-fade-in">
             <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-[32px] text-white mb-6 shadow-xl shadow-purple-100">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🤖</span>
                <div>
                  <h2 className="font-black text-lg">المستشار الذكي</h2>
                  <p className="text-purple-100 text-xs">تحليل شركة ويب ليبيا</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                {aiAdvice || "أهلاً بك! دعني أحلل ديونك وأعطيك أفضل استراتيجية للسداد وتوفير المال."}
              </p>
              <button 
                onClick={fetchAdvice}
                disabled={isAiLoading}
                className="mt-6 w-full py-4 bg-white text-purple-700 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                {isAiLoading ? <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div> : "ابدأ التحليل الآن"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <Dashboard stats={stats} />
            
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar py-1">
              <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>الكل</button>
              <button onClick={() => setActiveTab('lent')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'lent' ? 'bg-green-600 text-white shadow-lg shadow-green-100 scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>لي عند الناس</button>
              <button onClick={() => setActiveTab('borrowed')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'borrowed' ? 'bg-red-600 text-white shadow-lg shadow-red-100 scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}>عليّ للناس</button>
            </div>

            <div className="space-y-1 pb-10">
              {filteredDebts.length > 0 ? (
                filteredDebts.map(debt => (
                  <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    onToggleStatus={toggleStatus} 
                    onDelete={deleteDebt}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold text-sm">السجل فارغ حالياً</p>
                  <button onClick={() => setIsFormOpen(true)} className="mt-2 text-indigo-600 text-xs font-bold underline">إضافة أول معاملة</button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer Branding */}
      <div className="py-6 text-center">
        <p className="text-[10px] text-gray-300 font-black tracking-[0.2em] uppercase">Powered by Web Libya 🇱🇾</p>
      </div>

      {/* FAB - Fixed Bottom */}
      {!isFormOpen && (
        <button 
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center text-4xl font-light active:scale-90 transition-transform z-40 border-4 border-white"
        >
          <span className="mb-1">+</span>
        </button>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-gray-100 px-10 py-5 flex justify-between items-center z-30 rounded-t-[32px]">
        <button onClick={() => setActiveTab('all')} className={`flex flex-col items-center gap-1 transition-all ${activeTab !== 'ai' ? 'text-indigo-600 scale-110' : 'text-gray-300'}`}>
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className="text-[9px] font-black">الرئيسية</span>
        </button>
        <div className="w-16"></div> {/* Spacer for FAB */}
        <button onClick={() => setActiveTab('ai')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ai' ? 'text-indigo-600 scale-110' : 'text-gray-300'}`}>
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span className="text-[9px] font-black">المستشار</span>
        </button>
      </nav>

      {/* Add Debt Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-md z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[48px] p-8 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-indigo-950">معاملة جديدة</h2>
              <button onClick={() => setIsFormOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddDebt} className="space-y-6">
              <div className="flex p-1.5 bg-gray-100 rounded-[24px]">
                <label className="flex-1">
                    <input type="radio" name="debtType" value={DebtType.BORROWED} defaultChecked className="hidden peer" />
                    <div className="text-center py-4 rounded-[20px] text-sm font-black transition-all cursor-pointer peer-checked:bg-white peer-checked:text-red-600 peer-checked:shadow-sm text-gray-400">عليّ دين</div>
                </label>
                <label className="flex-1">
                    <input type="radio" name="debtType" value={DebtType.LENT} className="hidden peer" />
                    <div className="text-center py-4 rounded-[20px] text-sm font-black transition-all cursor-pointer peer-checked:bg-white peer-checked:text-green-600 peer-checked:shadow-sm text-gray-400">لي دين</div>
                </label>
              </div>

              <div>
                <input 
                  name="contactName"
                  type="text" 
                  required
                  className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-[24px] outline-none transition-all text-sm font-bold"
                  placeholder="اسم الشخص أو الجهة..."
                />
              </div>

              <div>
                <input 
                  name="amount"
                  type="number" 
                  required
                  className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-[24px] outline-none transition-all font-black text-2xl text-center"
                  placeholder="0.00 د.ل"
                />
              </div>

              <div>
                <textarea 
                  name="notes"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-[24px] outline-none transition-all h-28 resize-none text-sm font-medium"
                  placeholder="ملاحظات (اختياري)..."
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-[28px] font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 transition-all mb-4"
              >
                تأكيد وحفظ
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
};

export default App;

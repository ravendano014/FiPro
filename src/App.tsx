import React, { useState, ReactNode } from 'react';
import { format } from 'date-fns';
import { useFinance } from './hooks/useFinance';
import { 
  LayoutDashboard, 
  CreditCard, 
  Wallet, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Info,
  Target,
  Building2,
  Edit2,
  Download,
  Upload,
  Menu,
  X,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Settings,
  Moon,
  Sun,
  Globe,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Activity,
  Zap,
  Calendar
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from './lib/utils';
import { Loan, BudgetEntry, Goal, Asset } from './types/finance';
import { useSettings, Language } from './contexts/SettingsContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

type Tab = 'dashboard' | 'loans' | 'budget' | 'goals' | 'assets' | 'settings' | 'help' | 'tips';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { language, theme, setLanguage, setTheme, t } = useSettings();
  const { 
    state, 
    addLoan, 
    updateLoan,
    deleteLoan, 
    addExtraPayment, 
    deleteExtraPayment,
    addRecurringExtraPayment,
    deleteRecurringExtraPayment,
    addBudgetEntry, 
    updateBudgetEntry,
    deleteBudgetEntry,
    addGoal,
    updateGoal,
    deleteGoal,
    addAsset,
    updateAsset,
    deleteAsset,
    importData,
    calculateAmortization 
  } = useFinance();

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `finpro_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          importData(parsed);
          alert('Datos importados correctamente');
        } catch (error) {
          console.error('Error importing data', error);
          alert('Error al importar el archivo. Asegúrate de que sea un JSON válido.');
        }
      };
      reader.readAsText(file);
    }
  };
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [editingBudgetEntry, setEditingBudgetEntry] = useState<BudgetEntry | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Derived stats
  const totalIncome = state.budget
    .filter(b => b.type === 'income' && !b.isExternal)
    .reduce((sum, b) => sum + b.amount, 0);
  
  const totalExpenses = state.budget
    .filter(b => b.type === 'expense' && !b.isExternal)
    .reduce((sum, b) => sum + b.amount, 0);

  const totalCoveredByOthers = state.budget
    .filter(b => b.isExternal)
    .reduce((sum, b) => sum + b.amount, 0);

  const monthlyLoanObligation = state.loans.reduce((sum, loan) => {
    const schedule = calculateAmortization(loan);
    return sum + (schedule[0]?.totalPayment || 0);
  }, 0);

  const totalDebt = state.loans.reduce((sum, loan) => sum + loan.amount, 0);

  const totalPassiveIncome = state.assets.reduce((sum, asset) => sum + asset.monthlyIncome, 0);
  const totalAssetValue = state.assets.reduce((sum, asset) => sum + asset.value, 0);
  
  const currentTotalDebt = state.loans.reduce((sum, loan) => {
    const schedule = calculateAmortization(loan);
    const now = new Date();
    const startDate = new Date(loan.startDate);
    const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    const currentMonthIndex = Math.max(0, Math.min(monthsDiff, schedule.length - 1));
    return sum + (schedule[currentMonthIndex]?.remainingBalance || 0);
  }, 0);

  const loanInterestStats = state.loans.reduce((acc, loan) => {
    const schedule = calculateAmortization(loan);
    const now = new Date();
    const startDate = new Date(loan.startDate);
    const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    
    let paid = 0;
    let pending = 0;
    
    schedule.forEach((row, index) => {
      if (index < monthsDiff) {
        paid += row.interest;
      } else {
        pending += row.interest;
      }
    });
    
    return {
      paid: acc.paid + paid,
      pending: acc.pending + pending
    };
  }, { paid: 0, pending: 0 });

  const netWorth = totalAssetValue - currentTotalDebt;
  
  const goalProgress = state.goals.length > 0 
    ? (state.goals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / state.goals.length) * 100
    : 0;

  return (
    <div className={cn(
      "min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300",
      theme === 'dark' ? "bg-[#121212] text-[#f5f5f5]" : "bg-[#f5f5f5] text-[#1a1a1a]"
    )}>
      {/* Mobile Header */}
      <div className={cn(
        "md:hidden border-b p-4 flex justify-between items-center sticky top-0 z-40 transition-colors",
        theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
      )}>
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white",
            theme === 'dark' ? "bg-blue-600" : "bg-[#1a1a1a]"
          )}>
            <TrendingUp size={18} />
          </div>
          FinPro
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            "p-2 rounded-xl transition-all",
            theme === 'dark' ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f5f5f5]"
          )}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col transition-all duration-300 z-50 border-r",
        theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]",
        "fixed inset-y-0 left-0 md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
        isSidebarCollapsed ? "md:w-20" : "md:w-64"
      )}>
        <div className={cn(
          "p-6 border-b flex items-center justify-between",
          theme === 'dark' ? "border-[#2d2d2d]" : "border-[#e5e5e5]",
          isSidebarCollapsed && "md:justify-center md:px-0"
        )}>
          <h1 className={cn(
            "text-xl font-semibold tracking-tight flex items-center gap-2 transition-all",
            isSidebarCollapsed && "md:hidden"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-white",
              theme === 'dark' ? "bg-blue-600" : "bg-[#1a1a1a]"
            )}>
              <TrendingUp size={18} />
            </div>
            FinPro
          </h1>
          {isSidebarCollapsed && (
            <div className={cn(
              "hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-white",
              theme === 'dark' ? "bg-blue-600" : "bg-[#1a1a1a]"
            )}>
              <TrendingUp size={18} />
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "hidden md:flex p-1.5 rounded-lg transition-all",
              theme === 'dark' ? "hover:bg-[#2d2d2d] text-[#9e9e9e] hover:text-[#f5f5f5]" : "hover:bg-[#f5f5f5] text-[#9e9e9e] hover:text-[#1a1a1a]"
            )}
          >
            {isSidebarCollapsed ? <ChevronRightIcon size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            icon={<LayoutDashboard size={20} />}
            label={t('dashboard')}
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'loans'} 
            onClick={() => { setActiveTab('loans'); setIsMobileMenuOpen(false); }}
            icon={<CreditCard size={20} />}
            label={t('loans')}
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'budget'} 
            onClick={() => { setActiveTab('budget'); setIsMobileMenuOpen(false); }}
            icon={<Wallet size={20} />}
            label={t('budget')}
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'goals'} 
            onClick={() => { setActiveTab('goals'); setIsMobileMenuOpen(false); }}
            icon={<Target size={20} />}
            label={t('goals')}
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'assets'} 
            onClick={() => { setActiveTab('assets'); setIsMobileMenuOpen(false); }}
            icon={<Building2 size={20} />}
            label={t('assets')}
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
            icon={<Settings size={20} />}
            label={t('settings')}
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'help'} 
            onClick={() => { setActiveTab('help'); setIsMobileMenuOpen(false); }}
            icon={<Info size={20} />}
            label={t('help')}
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'tips'} 
            onClick={() => { setActiveTab('tips'); setIsMobileMenuOpen(false); }}
            icon={<Sparkles size={20} />}
            label={t('financialTips')}
            collapsed={isSidebarCollapsed}
          />
          
          <div className={cn(
            "pt-4 mt-4 border-t space-y-2",
            theme === 'dark' ? "border-[#2d2d2d]" : "border-[#e5e5e5]",
            isSidebarCollapsed && "md:pt-2 md:mt-2"
          )}>
            <button 
              onClick={handleExport}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                theme === 'dark' ? "text-[#9e9e9e] hover:bg-[#2d2d2d] hover:text-[#f5f5f5]" : "text-[#9e9e9e] hover:bg-[#f0f0f0] hover:text-[#1a1a1a]",
                isSidebarCollapsed && "md:justify-center md:px-0"
              )}
              title={t('export')}
            >
              <Download size={20} />
              <span className={cn("font-medium", isSidebarCollapsed && "md:hidden")}>{t('export')}</span>
            </button>
            <label className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer",
              theme === 'dark' ? "text-[#9e9e9e] hover:bg-[#2d2d2d] hover:text-[#f5f5f5]" : "text-[#9e9e9e] hover:bg-[#f0f0f0] hover:text-[#1a1a1a]",
              isSidebarCollapsed && "md:justify-center md:px-0"
            )} title={t('import')}>
              <Upload size={20} />
              <span className={cn("font-medium", isSidebarCollapsed && "md:hidden")}>{t('import')}</span>
              <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
          </div>
        </nav>

        <div className={cn(
          "p-6 border-t",
          theme === 'dark' ? "border-[#2d2d2d]" : "border-[#e5e5e5]",
          isSidebarCollapsed && "md:p-4 md:flex md:justify-center"
        )}>
          <div className="flex items-center gap-3 text-sm text-[#9e9e9e]">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-medium shrink-0",
              theme === 'dark' ? "bg-[#2d2d2d] text-[#f5f5f5]" : "bg-[#e5e5e5] text-[#1a1a1a]"
            )}>
              RA
            </div>
            {!isSidebarCollapsed && (
              <div className="truncate">
                <p className={cn("font-medium truncate", theme === 'dark' ? "text-[#f5f5f5]" : "text-[#1a1a1a]")}>Ronald A.</p>
                <p className="text-xs">{t('premiumPlan')}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-light tracking-tight">{t('summary')}</h2>
                <p className="text-[#9e9e9e]">{t('dashboardDescription')}</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label={t('monthlyBalance')} 
                  value={formatCurrency(totalIncome + totalPassiveIncome - totalExpenses - monthlyLoanObligation)} 
                  trend={totalIncome + totalPassiveIncome > totalExpenses + monthlyLoanObligation ? 'up' : 'down'}
                  subtext="Ingresos + Pasivos - Gastos - Préstamos"
                />
                <StatCard 
                  label={t('netWorth')} 
                  value={formatCurrency(totalAssetValue - totalDebt)} 
                  subtext="Activos - Deudas"
                />
                <StatCard 
                  label={t('goalProgress')} 
                  value={`${goalProgress.toFixed(1)}%`} 
                  subtext={`${state.goals.length} metas activas`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={cn(
                  "p-6 rounded-3xl border transition-colors",
                  theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                )}>
                  <h3 className="text-lg font-medium mb-6">{t('incomeVsExpenses')}</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: t('income'), amount: totalIncome },
                        { name: t('expenses'), amount: totalExpenses },
                        { name: t('loans'), amount: monthlyLoanObligation }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(v: number) => formatCurrency(v)}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          <Cell fill="#1a1a1a" />
                          <Cell fill="#9e9e9e" />
                          <Cell fill="#e5e5e5" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={cn(
                  "p-6 rounded-3xl border transition-colors",
                  theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                )}>
                  <h3 className="text-lg font-medium mb-6">{t('debtDistribution')}</h3>
                  <div className="h-64 flex items-center justify-center">
                    {state.loans.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={state.loans}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                          >
                            {state.loans.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1a1a1a' : '#9e9e9e'} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
                              color: theme === 'dark' ? '#f5f5f5' : '#1a1a1a'
                            }}
                            itemStyle={{ color: theme === 'dark' ? '#f5f5f5' : '#1a1a1a' }}
                            formatter={(v: number) => formatCurrency(v)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-[#9e9e9e]">{t('noLoans')}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'loans' && (
            <motion.div
              key="loans"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-light tracking-tight">{t('loans')}</h2>
                  <p className="text-[#9e9e9e]">{t('loansDescription')}</p>
                </div>
                <button 
                  onClick={() => setSelectedLoanId('new')}
                  className={cn(
                    "text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all",
                    theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
                  )}
                >
                  <Plus size={18} />
                  {t('newLoan')}
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={cn(
                  "px-6 py-4 rounded-2xl border shadow-sm transition-colors",
                  theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                )}>
                  <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('totalDebtPending')}</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(currentTotalDebt)}
                  </p>
                </div>
                <div className={cn(
                  "px-6 py-4 rounded-2xl border shadow-sm transition-colors",
                  theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                )}>
                  <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('totalInterestPending')}</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(loanInterestStats.pending)}
                  </p>
                </div>
                <div className={cn(
                  "px-6 py-4 rounded-2xl border shadow-sm transition-colors",
                  theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                )}>
                  <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('totalInterestPaid')}</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(loanInterestStats.paid)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {state.loans.map(loan => (
                  <LoanCard 
                    key={loan.id} 
                    loan={loan} 
                    onSelect={() => setSelectedLoanId(loan.id)}
                    onDelete={() => deleteLoan(loan.id)}
                  />
                ))}
              </div>

              {selectedLoanId && (
                <LoanModal 
                  loan={selectedLoanId === 'new' ? null : state.loans.find(l => l.id === selectedLoanId) || null}
                  onClose={() => setSelectedLoanId(null)}
                  onSave={(loanData) => {
                    if (selectedLoanId === 'new') addLoan(loanData);
                    else updateLoan(selectedLoanId, loanData);
                    setSelectedLoanId(null);
                  }}
                  onAddExtraPayment={addExtraPayment}
                  onDeleteExtraPayment={deleteExtraPayment}
                  onAddRecurringExtraPayment={addRecurringExtraPayment}
                  onDeleteRecurringExtraPayment={deleteRecurringExtraPayment}
                  calculateAmortization={calculateAmortization}
                />
              )}

              <DebtTimeline loans={state.loans} calculateAmortization={calculateAmortization} />
              <DebtHealthAnalyzer loans={state.loans} totalIncome={totalIncome} calculateAmortization={calculateAmortization} />
            </motion.div>
          )}

          {activeTab === 'budget' && (
            <motion.div
              key="budget"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-light tracking-tight">{t('budget')}</h2>
                  <p className="text-[#9e9e9e]">{t('budgetDescription')}</p>
                </div>
                <div className="flex gap-4">
                  <div className={cn(
                    "px-6 py-3 rounded-2xl border shadow-sm transition-colors",
                    theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                  )}>
                    <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('totalIncome')}</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                  <div className={cn(
                    "px-6 py-3 rounded-2xl border shadow-sm transition-colors",
                    theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                  )}>
                    <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('totalExpenses')}</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                  <div className={cn(
                    "px-6 py-3 rounded-2xl border shadow-sm transition-colors",
                    theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                  )}>
                    <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('totalCoveredByOthers')}</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(totalCoveredByOthers)}
                    </p>
                  </div>
                  <div className={cn(
                    "px-6 py-3 rounded-2xl border shadow-sm transition-colors",
                    theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                  )}>
                    <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('currentBalance')}</p>
                    <p className={cn("text-lg font-bold", totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(totalIncome - totalExpenses)}
                    </p>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <BudgetForm 
                    onAdd={addBudgetEntry} 
                    onUpdate={updateBudgetEntry}
                    editingEntry={editingBudgetEntry}
                    onCancelEdit={() => setEditingBudgetEntry(null)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <BudgetList 
                    entries={state.budget} 
                    onDelete={deleteBudgetEntry} 
                    onEdit={setEditingBudgetEntry}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-light tracking-tight">{t('goals')}</h2>
                  <p className="text-[#9e9e9e]">{t('goalsDescription')}</p>
                </div>
                <button 
                  onClick={() => setSelectedGoalId('new')}
                  className={cn(
                    "text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all",
                    theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
                  )}
                >
                  <Plus size={18} />
                  {t('newGoal')}
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.goals.map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={() => setSelectedGoalId(goal.id)}
                    onDelete={() => deleteGoal(goal.id)}
                    onUpdateAmount={(amount) => {
                      updateGoal(goal.id, { ...goal, currentAmount: goal.currentAmount + amount });
                    }}
                  />
                ))}
              </div>

              {selectedGoalId && (
                <GoalModal 
                  goal={selectedGoalId === 'new' ? null : state.goals.find(g => g.id === selectedGoalId) || null}
                  onClose={() => setSelectedGoalId(null)}
                  onSave={(data) => {
                    if (selectedGoalId === 'new') addGoal(data);
                    else updateGoal(selectedGoalId, data);
                    setSelectedGoalId(null);
                  }}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'assets' && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-light tracking-tight">{t('assets')}</h2>
                  <p className="text-[#9e9e9e]">{t('assetsDescription')}</p>
                </div>
                <button 
                  onClick={() => setSelectedAssetId('new')}
                  className={cn(
                    "text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all",
                    theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
                  )}
                >
                  <Plus size={18} />
                  {t('newAsset')}
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label={t('totalAssets')} value={formatCurrency(totalAssetValue)} />
                <StatCard label={t('totalLiabilities')} value={formatCurrency(currentTotalDebt)} trend="up" />
                <StatCard label={t('netWorth')} value={formatCurrency(netWorth)} trend={netWorth >= 0 ? 'up' : 'down'} />
                <StatCard label={t('passiveIncome')} value={formatCurrency(totalPassiveIncome)} subtext={t('perMonth')} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.assets.map(asset => (
                  <AssetCard 
                    key={asset.id} 
                    asset={asset} 
                    onEdit={() => setSelectedAssetId(asset.id)}
                    onDelete={() => deleteAsset(asset.id)}
                  />
                ))}
              </div>

              {selectedAssetId && (
                <AssetModal 
                  asset={selectedAssetId === 'new' ? null : state.assets.find(a => a.id === selectedAssetId) || null}
                  onClose={() => setSelectedAssetId(null)}
                  onSave={(data) => {
                    if (selectedAssetId === 'new') addAsset(data);
                    else updateAsset(selectedAssetId, data);
                    setSelectedAssetId(null);
                  }}
                />
              )}
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-light tracking-tight">{t('settings')}</h2>
                <p className="text-[#9e9e9e]">{t('settingsDescription')}</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={cn(
                  "p-8 rounded-3xl border transition-colors",
                  theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                )}>
                  <div className="flex items-center gap-3 mb-6">
                    <Globe className="text-blue-500" size={24} />
                    <h3 className="text-xl font-medium">{t('language')}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'en', name: 'English' },
                      { id: 'es', name: 'Español' },
                      { id: 'it', name: 'Italiano' },
                      { id: 'fr', name: 'Français' },
                      { id: 'pt', name: 'Português' }
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setLanguage(lang.id as Language)}
                        className={cn(
                          "flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                          language === lang.id 
                            ? (theme === 'dark' ? "bg-blue-600/20 border-blue-600 text-blue-400" : "bg-blue-50 border-blue-600 text-blue-600")
                            : (theme === 'dark' ? "bg-[#2d2d2d] border-transparent text-[#9e9e9e] hover:bg-[#3d3d3d]" : "bg-[#f5f5f5] border-transparent text-[#9e9e9e] hover:bg-[#f0f0f0]")
                        )}
                      >
                        <span className="font-medium">{lang.name}</span>
                        {language === lang.id && <div className="w-2 h-2 rounded-full bg-current" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn(
                  "p-8 rounded-3xl border transition-colors",
                  theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                )}>
                  <div className="flex items-center gap-3 mb-6">
                    {theme === 'dark' ? <Moon className="text-purple-500" size={24} /> : <Sun className="text-orange-500" size={24} />}
                    <h3 className="text-xl font-medium">{t('theme')}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                        theme === 'light' 
                          ? "bg-blue-50 border-blue-600 text-blue-600"
                          : (theme === 'dark' ? "bg-[#2d2d2d] border-transparent text-[#9e9e9e] hover:bg-[#3d3d3d]" : "bg-[#f5f5f5] border-transparent text-[#9e9e9e] hover:bg-[#f0f0f0]")
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Sun size={20} />
                        <span className="font-medium">{t('lightMode')}</span>
                      </div>
                      {theme === 'light' && <div className="w-2 h-2 rounded-full bg-current" />}
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                        theme === 'dark' 
                          ? "bg-blue-600/20 border-blue-600 text-blue-400"
                          : "bg-[#f5f5f5] border-transparent text-[#9e9e9e] hover:bg-[#f0f0f0]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Moon size={20} />
                        <span className="font-medium">{t('darkMode')}</span>
                      </div>
                      {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-current" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'help' && (
            <motion.div
              key="help"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-light tracking-tight">{t('help')}</h2>
                <p className="text-[#9e9e9e]">{t('helpDescription')}</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: <CreditCard className="text-blue-500" />, title: t('loans'), description: t('loansHelp') },
                  { icon: <Wallet className="text-green-500" />, title: t('budget'), description: t('budgetHelp') },
                  { icon: <Target className="text-purple-500" />, title: t('goals'), description: t('goalsHelp') },
                  { icon: <Building2 className="text-orange-500" />, title: t('assets'), description: t('assetsHelp') },
                  { icon: <Settings className="text-gray-500" />, title: t('settings'), description: t('settingsHelp') }
                ].map((item, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "p-6 rounded-3xl border flex gap-4 items-start transition-all",
                      theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      theme === 'dark' ? "bg-[#2d2d2d]" : "bg-[#f5f5f5]"
                    )}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">{item.title}</h3>
                      <p className="text-sm text-[#9e9e9e] leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {activeTab === 'tips' && (
            <FinancialTips state={state} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function FinancialTips({ state }: { state: any }) {
  const { theme, t, language } = useSettings();
  const [tips, setTips] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectionYears, setProjectionYears] = useState(5);
  const [analysisType, setAnalysisType] = useState<'general' | 'budget' | 'loans'>('general');

  const { calculateAmortization } = useFinance();

  const totalAssetValue = state.assets.reduce((sum: any, asset: any) => sum + asset.value, 0);
  const currentTotalDebt = state.loans.reduce((sum: any, loan: any) => {
    const schedule = calculateAmortization(loan);
    const now = new Date();
    const startDate = new Date(loan.startDate);
    const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    const currentMonthIndex = Math.max(0, Math.min(monthsDiff, schedule.length - 1));
    return sum + (schedule[currentMonthIndex]?.remainingBalance || 0);
  }, 0);

  const generateTips = async () => {
    setIsLoading(true);
    try {
      // Calculate projected debt in N years
      const projectedDebt = state.loans.reduce((sum, loan) => {
        const schedule = calculateAmortization(loan);
        const now = new Date();
        const startDate = new Date(loan.startDate);
        const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        const projectionMonths = projectionYears * 12;
        const targetMonthIndex = monthsDiff + projectionMonths;
        
        if (targetMonthIndex < 0) return sum + loan.amount;
        if (targetMonthIndex >= schedule.length) return sum + 0;
        return sum + (schedule[targetMonthIndex]?.remainingBalance || 0);
      }, 0);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let systemPrompt = `You are a professional Financial Advisor. Analyze the following financial data and provide a comprehensive strategy.
        Data: ${JSON.stringify(state)}
        
        CRITICAL ANALYSIS CONTEXT:
        - Current Assets (Patrimonio): ${formatCurrency(totalAssetValue)}
        - Current Total Debt: ${formatCurrency(currentTotalDebt)}
        - Projected Total Debt in ${projectionYears} years: ${formatCurrency(projectedDebt)}
        
        You MUST compare the asset value against both the current debt and the projected debt in ${projectionYears} years.
        Determine the user's financial position at both points in time.
        
        Note: Some budget entries may be marked as 'isExternal: true', meaning they are covered by others (family, shared) and do not deduct from personal income, but represent total cost of living.
        Projection Period: ${projectionYears} years
        Language: ${language}`;

      let specificPrompt = '';

      if (analysisType === 'general') {
        specificPrompt = `
          Structure your response in Markdown with the following sections:
          1. **${t('advisorFocus')}**: A high-level summary of the user's current financial health. Compare the total asset value against the current total debt.
          2. **${projectionYears}-Year Financial Projection**: A detailed projection of where the user will be in ${projectionYears} years. Compare the projected asset value (assuming current assets as baseline) against the projected total debt (${formatCurrency(projectedDebt)}). Determine if the user will be in a position of "Net Positive Wealth" or "Net Debt".
          3. **${t('priorities')}**: A numbered list of the most urgent actions to take to optimize financial efficiency and accelerate wealth building.
          4. **${t('alternatives')}**: Different paths the user could take depending on their risk tolerance or changing goals.
          
          Focus on maximizing financial efficiency, debt reduction, and strategic asset growth.
        `;
      } else if (analysisType === 'budget') {
        specificPrompt = `
          Perform a deep analysis of the user's personal budget at the expense level, considering the ${projectionYears}-year horizon.
          1. **${t('potentialSavings')}**: Identify specific categories where saving money now will have the greatest impact on the ${projectionYears}-year debt projection.
          2. **${t('qualityOfLife')}**: Suggest proactive strategies to improve the user's quality of life through better resource allocation.
          3. **Proactive Adjustments**: Recommend changes to the budget to prepare for the projected financial state in ${projectionYears} years.
          
          Provide multiple actionable options for each point.
        `;
      } else if (analysisType === 'loans') {
        specificPrompt = `
          Analyze the user's loans and provide strategies to minimize interest payments over the next ${projectionYears} years.
          1. **${t('interestSavings')}**: Compare different actions (extra payments, refinancing) to reduce the projected debt of ${formatCurrency(projectedDebt)} even further.
          2. **Comparative Analysis**: Consider the total interest remaining and how each action impacts the ${projectionYears}-year net worth projection.
          3. **Priorities & Time Benefit**: Identify which loans offer the best "return on investment" to reach a debt-free state faster than the current projection.
          4. **Decision Matrix**: Provide multiple clear options (e.g., "Option A: Aggressive Payoff", "Option B: Balanced Approach") to optimize financial efficiency.
          
          Include calculations or estimated savings for each option where possible.
        `;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: systemPrompt + specificPrompt,
      });
      
      setTips(response.text || '');
    } catch (error) {
      console.error('Error generating tips:', error);
      setTips('Error generating tips. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4 w-full lg:w-auto">
          <div>
            <h2 className="text-3xl font-light tracking-tight">{t('financialTips')}</h2>
            <p className="text-[#9e9e9e]">{t('tipsDescription')}</p>
          </div>
          
          <div className="flex gap-2 p-1 rounded-2xl bg-[#f5f5f5] dark:bg-[#2d2d2d] w-fit">
            {[
              { id: 'general', label: t('generalStrategy') },
              { id: 'budget', label: t('budgetAnalysis') },
              { id: 'loans', label: t('loanStrategies') }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setAnalysisType(type.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  analysisType === type.id 
                    ? (theme === 'dark' ? "bg-[#1e1e1e] text-blue-400 shadow-sm" : "bg-white text-[#1a1a1a] shadow-sm")
                    : "text-[#9e9e9e] hover:text-[#1a1a1a] dark:hover:text-[#f5f5f5]"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 w-full lg:w-auto">
          <div className="w-32">
            <label className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1 block">{t('projectionYears')}</label>
            <input 
              type="number" 
              value={projectionYears} 
              onChange={(e) => setProjectionYears(Math.max(1, Math.min(50, Number(e.target.value))))}
              className={cn(
                "w-full border-none rounded-xl px-4 py-2.5 transition-all text-sm",
                theme === 'dark' ? "bg-[#2d2d2d] text-[#f5f5f5]" : "bg-[#f5f5f5] text-[#1a1a1a]"
              )}
            />
          </div>
          <button 
            onClick={generateTips}
            disabled={isLoading}
            className={cn(
              "text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 flex-1 lg:flex-none justify-center",
              theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
            )}
          >
            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Sparkles size={18} />}
            <span className="whitespace-nowrap">{isLoading ? t('analyzingFinances') : t('getSmartAdvice')}</span>
          </button>
        </div>
      </header>

      <div className={cn(
        "p-8 rounded-3xl border min-h-[400px] transition-colors",
        theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
      )}>
        {tips ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#e5e5e5] dark:border-[#2d2d2d]">
              <Lightbulb className="text-yellow-500" size={24} />
              <h3 className="text-xl font-medium m-0">{t('aiAdvice')}</h3>
            </div>
            <div className="markdown-body">
              <Markdown>{tips}</Markdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              theme === 'dark' ? "bg-[#2d2d2d] text-[#9e9e9e]" : "bg-[#f5f5f5] text-[#9e9e9e]"
            )}>
              <Sparkles size={32} />
            </div>
            <p className="text-[#9e9e9e] max-w-xs">{t('noTipsYet')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NavItem({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: ReactNode, label: string, collapsed?: boolean }) {
  const { theme } = useSettings();
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active 
          ? (theme === 'dark' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "bg-[#1a1a1a] text-white shadow-lg") 
          : (theme === 'dark' ? "text-[#9e9e9e] hover:bg-[#2d2d2d] hover:text-[#f5f5f5]" : "text-[#9e9e9e] hover:bg-[#f0f0f0] hover:text-[#1a1a1a]"),
        collapsed && "md:justify-center md:px-0"
      )}
      title={collapsed ? label : undefined}
    >
      {icon}
      <span className={cn("font-medium", collapsed && "md:hidden")}>{label}</span>
    </button>
  );
}

function StatCard({ label, value, trend, subtext }: { label: string, value: string, trend?: 'up' | 'down', subtext?: string }) {
  const { theme } = useSettings();
  return (
    <div className={cn(
      "p-6 rounded-3xl border transition-colors",
      theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
    )}>
      <p className="text-sm font-medium text-[#9e9e9e] mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className={cn(
          "text-2xl font-semibold tracking-tight",
          theme === 'dark' ? "text-[#f5f5f5]" : "text-[#1a1a1a]"
        )}>{value}</h4>
        {trend && (
          <span className={cn("text-xs font-medium", trend === 'up' ? "text-green-600" : "text-red-600")}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-[#9e9e9e] mt-2">{subtext}</p>}
    </div>
  );
}

interface LoanCardProps {
  loan: Loan;
  onSelect: () => void;
  onDelete: () => void;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, onSelect, onDelete }) => {
  const { calculateAmortization } = useFinance();
  const { theme, t } = useSettings();
  const schedule = calculateAmortization(loan);
  const monthlyPayment = schedule[0]?.totalPayment || 0;
  
  // Calculate avoided costs (Savings)
  const standardLoan = { ...loan, extraPayments: [], recurringExtraPayments: [] };
  const standardSchedule = calculateAmortization(standardLoan);
  
  const totalActualCost = schedule.reduce((sum, item) => sum + item.interest + item.vat + item.insurance, 0);
  const totalStandardCost = standardSchedule.reduce((sum, item) => sum + item.interest + item.vat + item.insurance, 0);
  
  const totalAvoided = Math.max(0, totalStandardCost - totalActualCost);
  const monthsSaved = Math.max(0, standardSchedule.length - schedule.length);

  // Find current balance based on current date
  const now = new Date();
  const startDate = new Date(loan.startDate);
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  const currentMonthIndex = Math.max(0, Math.min(monthsDiff, schedule.length - 1));
  const currentBalance = schedule[currentMonthIndex]?.remainingBalance || 0;

  // Calculate total interest paid and pending
  const totalInterestPaid = schedule.slice(0, currentMonthIndex + 1).reduce((sum, item) => sum + item.interest, 0);
  const totalInterestPending = schedule.slice(currentMonthIndex + 1).reduce((sum, item) => sum + item.interest, 0);
  const finalPayoffDate = schedule.length > 0 ? schedule[schedule.length - 1].date : '';

  return (
    <div 
      className={cn(
        "p-6 rounded-3xl border transition-all group cursor-pointer",
        theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d] hover:border-blue-600" : "bg-white border-[#e5e5e5] hover:border-[#1a1a1a]"
      )} 
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          loan.type === 'mortgage' 
            ? (theme === 'dark' ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600") 
            : (theme === 'dark' ? "bg-orange-900/20 text-orange-400" : "bg-orange-50 text-orange-600")
        )}>
          {loan.type === 'mortgage' ? <CreditCard size={20} /> : <TrendingUp size={20} />}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-[#9e9e9e] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <h3 className="font-medium text-lg">{loan.name}</h3>
      <p className="text-sm text-[#9e9e9e] mb-4 uppercase tracking-wider">{t(loan.type)}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#9e9e9e]">{t('monthlyPayment')}</span>
          <span className={cn("font-semibold", theme === 'dark' ? "text-[#f5f5f5]" : "text-[#1a1a1a]")}>{formatCurrency(monthlyPayment)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#9e9e9e]">{t('currentBalance')}</span>
          <span className="font-semibold text-blue-600">{formatCurrency(currentBalance)}</span>
        </div>
        
        <div className={cn(
          "pt-2 mt-2 border-t space-y-2",
          theme === 'dark' ? "border-[#2d2d2d]" : "border-[#f5f5f5]"
        )}>
          <div className="flex justify-between text-sm">
            <span className="text-[#9e9e9e]">{t('totalInterestPaid')}</span>
            <span className="font-medium text-red-400">{formatCurrency(totalInterestPaid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#9e9e9e]">{t('totalInterestPending')}</span>
            <span className="font-medium text-orange-400">{formatCurrency(totalInterestPending)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#9e9e9e]">{t('finalPayoffDate')}</span>
            <span className="font-medium">{finalPayoffDate}</span>
          </div>
        </div>

        {(totalAvoided > 0 || monthsSaved > 0) && (
          <div className={cn(
            "pt-2 mt-2 border-t space-y-2",
            theme === 'dark' ? "border-[#2d2d2d]" : "border-[#f5f5f5]"
          )}>
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">{t('totalSavings')}</p>
            <div className="flex justify-between text-sm">
              <span className="text-[#9e9e9e]">{t('moneySaved')}</span>
              <span className="font-bold text-green-600">{formatCurrency(totalAvoided)}</span>
            </div>
            {monthsSaved > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#9e9e9e]">{t('timeSaved')}</span>
                <span className="font-bold text-green-600">{monthsSaved} {t('months')}</span>
              </div>
            )}
          </div>
        )}

        <div className={cn(
          "flex justify-between text-sm pt-2 border-t",
          theme === 'dark' ? "border-[#2d2d2d]" : "border-[#f5f5f5]"
        )}>
          <span className="text-[#9e9e9e]">{t('originalAmount')}</span>
          <span className="font-medium">{formatCurrency(loan.amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#9e9e9e]">{t('annualRate')}</span>
          <span className="font-medium">{loan.annualRate}%</span>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t border-[#e5e5e5] flex justify-between items-center">
        <span className="text-xs font-medium text-[#1a1a1a]">Ver tabla de amortización</span>
        <ChevronRight size={16} className="text-[#9e9e9e]" />
      </div>
    </div>
  );
}

function LoanModal({ 
  loan, 
  onClose, 
  onSave, 
  onAddExtraPayment, 
  onDeleteExtraPayment, 
  onAddRecurringExtraPayment,
  onDeleteRecurringExtraPayment,
  calculateAmortization 
}: { 
  loan: Loan | null, 
  onClose: () => void, 
  onSave: (data: any) => void,
  onAddExtraPayment: (id: string, date: string, amount: number) => void,
  onDeleteExtraPayment: (loanId: string, paymentId: string) => void,
  onAddRecurringExtraPayment: (id: string, startDate: string, endDate: string, amount: number) => void,
  onDeleteRecurringExtraPayment: (loanId: string, paymentId: string) => void,
  calculateAmortization: (loan: Loan) => any[]
}) {
  const { theme, t } = useSettings();
  const [formData, setFormData] = useState({
    name: loan?.name || '',
    type: loan?.type || 'mortgage',
    amount: loan?.amount || 0,
    annualRate: loan?.annualRate || 0,
    years: loan?.years || 0,
    insuranceMonthly: loan?.insuranceMonthly || 0,
    vatFixed: loan?.vatFixed || 0,
    startDate: loan?.startDate || new Date().toISOString().split('T')[0]
  });

  const [isEditing, setIsEditing] = useState(!loan);

  const [extraAmount, setExtraAmount] = useState(0);
  const [extraDate, setExtraDate] = useState(new Date().toISOString().split('T')[0]);

  const [recurringAmount, setRecurringAmount] = useState(0);
  const [recurringStart, setRecurringStart] = useState(new Date().toISOString().split('T')[0]);
  const [recurringEnd, setRecurringEnd] = useState(new Date().toISOString().split('T')[0]);

  const schedule = loan ? calculateAmortization(loan) : [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col transition-colors",
          theme === 'dark' ? "bg-[#1e1e1e]" : "bg-white"
        )}
      >
        <div className={cn(
          "p-6 border-b flex justify-between items-center",
          theme === 'dark' ? "border-[#2d2d2d]" : "border-[#e5e5e5]"
        )}>
          <h3 className="text-xl font-medium">{loan ? `${t('details')}: ${loan.name}` : t('newLoan')}</h3>
          <div className="flex items-center gap-2">
            {loan && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className={cn(
                  "p-2 rounded-full transition-all text-[#9e9e9e]",
                  theme === 'dark' ? "hover:bg-[#2d2d2d] hover:text-[#f5f5f5]" : "hover:bg-[#f0f0f0] hover:text-[#1a1a1a]"
                )}
              >
                <Edit2 size={20} />
              </button>
            )}
            <button onClick={onClose} className={cn(
              "p-2 rounded-full transition-all",
              theme === 'dark' ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f0f0f0]"
            )}>
              <Plus size={24} className="rotate-45" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input label={t('loanName')} value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{t('category')}</label>
                  <select 
                    className={cn(
                      "w-full border-none rounded-xl px-4 py-3 focus:ring-2 transition-all",
                      theme === 'dark' ? "bg-[#2d2d2d] text-[#f5f5f5] focus:ring-blue-600" : "bg-[#f5f5f5] text-[#1a1a1a] focus:ring-[#1a1a1a]"
                    )}
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="mortgage">{t('mortgage')}</option>
                    <option value="auto">{t('auto')}</option>
                  </select>
                </div>
                <Input label={t('amount')} type="number" value={formData.amount} onChange={v => setFormData({...formData, amount: Number(v)})} />
                <Input label={t('annualRate')} type="number" value={formData.annualRate} onChange={v => setFormData({...formData, annualRate: Number(v)})} />
              </div>
              <div className="space-y-4">
                <Input label={t('years')} type="number" value={formData.years} onChange={v => setFormData({...formData, years: Number(v)})} />
                <Input label={t('insuranceMonthly')} type="number" value={formData.insuranceMonthly} onChange={v => setFormData({...formData, insuranceMonthly: Number(v)})} />
                <Input label={t('vatFixed')} type="number" value={formData.vatFixed} onChange={v => setFormData({...formData, vatFixed: Number(v)})} />
                <Input label={t('startDate')} type="date" value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} />
              </div>
              <div className="md:col-span-2 pt-6 flex gap-4">
                {loan && (
                  <button 
                    onClick={() => setIsEditing(false)}
                    className={cn(
                      "flex-1 border py-4 rounded-xl font-medium transition-all",
                      theme === 'dark' ? "border-[#2d2d2d] hover:bg-[#2d2d2d]" : "border-[#e5e5e5] hover:bg-[#f5f5f5]"
                    )}
                  >
                    {t('cancel')}
                  </button>
                )}
                <button 
                  onClick={() => {
                    onSave(formData);
                    if (loan) setIsEditing(false);
                  }}
                  className={cn(
                    "flex-1 text-white py-4 rounded-xl font-medium transition-all",
                    theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
                  )}
                >
                  {loan ? t('save') : t('add')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label={t('monthlyPayment')} value={formatCurrency(schedule[0]?.payment || 0)} />
                <StatCard label={t('insurance') + " + IVA"} value={formatCurrency((schedule[0]?.insurance || 0) + (schedule[0]?.vat || 0))} />
                <StatCard label={t('totalPayment')} value={formatCurrency(schedule[0]?.totalPayment || 0)} />
                <StatCard label={t('remainingMonths')} value={schedule.length.toString()} />
              </div>

              <div className={cn(
                "p-6 rounded-2xl transition-colors",
                theme === 'dark' ? "bg-[#2d2d2d]" : "bg-[#f5f5f5]"
              )}>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Plus size={18} />
                  {t('extraPayment')}
                </h4>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Input label={t('amount')} type="number" value={extraAmount} onChange={v => setExtraAmount(Number(v))} />
                  </div>
                  <div className="flex-1">
                    <Input label={t('date')} type="date" value={extraDate} onChange={v => setExtraDate(v)} />
                  </div>
                  <button 
                    onClick={() => {
                      onAddExtraPayment(loan.id, extraDate, extraAmount);
                      setExtraAmount(0);
                    }}
                    className={cn(
                      "self-end text-white px-8 py-3 rounded-xl transition-all",
                      theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
                    )}
                  >
                    {t('apply')}
                  </button>
                </div>

                {loan.extraPayments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{t('extraPayments')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {loan.extraPayments.map(ep => (
                        <div key={ep.id} className={cn(
                          "p-3 rounded-xl flex justify-between items-center border transition-colors",
                          theme === 'dark' ? "bg-[#1e1e1e] border-[#3d3d3d]" : "bg-white border-[#e5e5e5]"
                        )}>
                          <div>
                            <p className="font-medium">{formatCurrency(ep.amount)}</p>
                            <p className="text-xs text-[#9e9e9e]">{ep.date}</p>
                          </div>
                          <button 
                            onClick={() => onDeleteExtraPayment(loan.id, ep.id)}
                            className="p-2 text-[#9e9e9e] hover:text-red-600 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={cn(
                "p-6 rounded-2xl transition-colors",
                theme === 'dark' ? "bg-[#2d2d2d]" : "bg-[#f5f5f5]"
              )}>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <TrendingUp size={18} />
                  {t('recurringExtraPayment')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="md:col-span-1">
                    <Input label={t('amount')} type="number" value={recurringAmount} onChange={v => setRecurringAmount(Number(v))} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label={t('startDate')} type="date" value={recurringStart} onChange={v => setRecurringStart(v)} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label={t('endDate')} type="date" value={recurringEnd} onChange={v => setRecurringEnd(v)} />
                  </div>
                  <button 
                    onClick={() => {
                      onAddRecurringExtraPayment(loan.id, recurringStart, recurringEnd, recurringAmount);
                      setRecurringAmount(0);
                    }}
                    className={cn(
                      "self-end text-white px-8 py-3 rounded-xl transition-all",
                      theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
                    )}
                  >
                    {t('apply')}
                  </button>
                </div>

                {(loan.recurringExtraPayments || []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{t('recurringExtraPayments')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(loan.recurringExtraPayments || []).map(rep => (
                        <div key={rep.id} className={cn(
                          "p-3 rounded-xl flex justify-between items-center border transition-colors",
                          theme === 'dark' ? "bg-[#1e1e1e] border-[#3d3d3d]" : "bg-white border-[#e5e5e5]"
                        )}>
                          <div>
                            <p className="font-medium">{formatCurrency(rep.amount)} / {t('month')}</p>
                            <p className="text-xs text-[#9e9e9e]">{rep.startDate} {t('to')} {rep.endDate}</p>
                          </div>
                          <button 
                            onClick={() => onDeleteRecurringExtraPayment(loan.id, rep.id)}
                            className="p-2 text-[#9e9e9e] hover:text-red-600 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={cn(
                      "text-xs uppercase tracking-wider border-b transition-colors",
                      theme === 'dark' ? "text-[#9e9e9e] border-[#2d2d2d]" : "text-[#9e9e9e] border-[#e5e5e5]"
                    )}>
                      <th className="pb-4 font-semibold">{t('month')}</th>
                      <th className="pb-4 font-semibold">{t('date')}</th>
                      <th className="pb-4 font-semibold">{t('interest')}</th>
                      <th className="pb-4 font-semibold">{t('principal')}</th>
                      <th className="pb-4 font-semibold">{t('extra')}</th>
                      <th className="pb-4 font-semibold">{t('total')}</th>
                      <th className="pb-4 font-semibold text-right">{t('balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {schedule.map((row, i) => (
                      <tr key={i} className={cn(
                        "border-b transition-colors",
                        theme === 'dark' ? "border-[#2d2d2d] hover:bg-[#2d2d2d]" : "border-[#f5f5f5] hover:bg-[#f9f9f9]",
                        row.extraPayment > 0 && (theme === 'dark' ? "bg-green-900/10" : "bg-green-50/50")
                      )}>
                        <td className="py-4">{row.month}</td>
                        <td className="py-4">{row.date}</td>
                        <td className="py-4">{formatCurrency(row.interest)}</td>
                        <td className="py-4">{formatCurrency(row.principal)}</td>
                        <td className="py-4 text-green-600 font-medium">{row.extraPayment > 0 ? formatCurrency(row.extraPayment) : '-'}</td>
                        <td className="py-4 font-medium">{formatCurrency(row.totalPayment)}</td>
                        <td className="py-4 text-right font-mono">{formatCurrency(row.remainingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function BudgetForm({ onAdd, onUpdate, editingEntry, onCancelEdit }: { 
  onAdd: (data: any) => void,
  onUpdate: (id: string, data: any) => void,
  editingEntry: BudgetEntry | null,
  onCancelEdit: () => void
}) {
  const { theme, t } = useSettings();
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'General',
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    isExternal: false
  });

  React.useEffect(() => {
    if (editingEntry) {
      setFormData({
        description: editingEntry.description,
        amount: editingEntry.amount,
        category: editingEntry.category,
        type: editingEntry.type,
        date: editingEntry.date,
        isExternal: editingEntry.isExternal || false
      });
    } else {
      setFormData({
        description: '',
        amount: 0,
        category: 'General',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        isExternal: false
      });
    }
  }, [editingEntry]);

  return (
    <div className={cn(
      "p-6 rounded-3xl border transition-colors space-y-4",
      theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
    )}>
      <h3 className="text-lg font-medium mb-2">{editingEntry ? t('edit') : t('add')}</h3>
      <div className={cn(
        "flex gap-2 p-1 rounded-xl",
        theme === 'dark' ? "bg-[#2d2d2d]" : "bg-[#f5f5f5]"
      )}>
        <button 
          onClick={() => setFormData({...formData, type: 'income'})}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-all", 
            formData.type === 'income' 
              ? (theme === 'dark' ? "bg-[#3d3d3d] shadow-sm text-[#f5f5f5]" : "bg-white shadow-sm text-[#1a1a1a]") 
              : "text-[#9e9e9e]"
          )}
        >
          {t('income')}
        </button>
        <button 
          onClick={() => setFormData({...formData, type: 'expense'})}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-all", 
            formData.type === 'expense' 
              ? (theme === 'dark' ? "bg-[#3d3d3d] shadow-sm text-[#f5f5f5]" : "bg-white shadow-sm text-[#1a1a1a]") 
              : "text-[#9e9e9e]"
          )}
        >
          {t('expense')}
        </button>
      </div>
      <Input label={t('description')} value={formData.description} onChange={v => setFormData({...formData, description: v})} />
      <Input label={t('amount')} type="number" value={formData.amount} onChange={v => setFormData({...formData, amount: Number(v)})} />
      <Input label={t('category')} value={formData.category} onChange={v => setFormData({...formData, category: v})} />
      <Input label={t('date')} type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
      
      <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-[#e5e5e5] dark:border-[#2d2d2d]">
        <input 
          type="checkbox" 
          id="isExternal"
          checked={formData.isExternal}
          onChange={(e) => setFormData({...formData, isExternal: e.target.checked})}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
        />
        <label htmlFor="isExternal" className="text-sm cursor-pointer select-none">
          <span className="font-medium block">{t('coveredByOthers')}</span>
          <span className="text-xs text-[#9e9e9e]">{t('externalExpense')}</span>
        </label>
      </div>

      <div className="flex gap-2">
        {editingEntry && (
          <button 
            onClick={onCancelEdit}
            className={cn(
              "flex-1 border py-3 rounded-xl font-medium transition-all",
              theme === 'dark' ? "border-[#2d2d2d] hover:bg-[#2d2d2d]" : "border-[#e5e5e5] hover:bg-[#f5f5f5]"
            )}
          >
            {t('cancel')}
          </button>
        )}
        <button 
          onClick={() => {
            if (editingEntry) {
              onUpdate(editingEntry.id, formData);
              onCancelEdit();
            } else {
              onAdd(formData);
              setFormData({ ...formData, description: '', amount: 0 });
            }
          }}
          className={cn(
            "flex-[2] text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
            theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
          )}
        >
          {editingEntry ? <Edit2 size={18} /> : <Plus size={18} />}
          {editingEntry ? t('save') : t('add')}
        </button>
      </div>
    </div>
  );
}

function BudgetList({ entries, onDelete, onEdit }: { 
  entries: BudgetEntry[], 
  onDelete: (id: string) => void,
  onEdit: (entry: BudgetEntry) => void
}) {
  const { theme, t } = useSettings();
  return (
    <div className={cn(
      "rounded-3xl border overflow-hidden transition-colors",
      theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
    )}>
      <div className={cn(
        "p-6 border-b",
        theme === 'dark' ? "border-[#2d2d2d]" : "border-[#e5e5e5]"
      )}>
        <h3 className="text-lg font-medium">{t('budgetHistory')}</h3>
      </div>
      <div className={cn(
        "divide-y",
        theme === 'dark' ? "divide-[#2d2d2d]" : "divide-[#f5f5f5]"
      )}>
        {entries.length > 0 ? (
          entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
            <div key={entry.id} className={cn(
              "p-4 flex items-center justify-between transition-all",
              theme === 'dark' ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f9f9f9]"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  entry.type === 'income' 
                    ? (theme === 'dark' ? "bg-green-900/20 text-green-400" : "bg-green-50 text-green-600") 
                    : (theme === 'dark' ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600")
                )}>
                  {entry.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {entry.description}
                    {entry.isExternal && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold uppercase tracking-wider">
                        {t('coveredByOthers')}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#9e9e9e]">{entry.category} • {entry.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-semibold mr-4", 
                  entry.type === 'income' ? "text-green-600" : (theme === 'dark' ? "text-[#f5f5f5]" : "text-[#1a1a1a]")
                )}>
                  {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                </span>
                <button 
                  onClick={() => onEdit(entry)}
                  className="p-2 text-[#9e9e9e] hover:text-[#1a1a1a] dark:hover:text-[#f5f5f5] transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="p-2 text-[#9e9e9e] hover:text-red-600 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-[#9e9e9e]">
            <Info size={48} className="mx-auto mb-4 opacity-20" />
            <p>{t('noRecords')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateAmount: (amount: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onEdit, onDelete, onUpdateAmount }) => {
  const { theme, t } = useSettings();
  const [isUpdating, setIsUpdating] = useState(false);
  const [addAmount, setAddAmount] = useState<number>(0);
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  
  return (
    <div 
      onClick={() => {
        if (window.innerWidth < 768) {
          setIsUpdating(!isUpdating);
        }
      }}
      className={cn(
        "p-6 rounded-3xl border transition-all group cursor-pointer md:cursor-default",
        theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d] hover:border-blue-600" : "bg-white border-[#e5e5e5] hover:border-[#1a1a1a]"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          theme === 'dark' ? "bg-purple-900/20 text-purple-400" : "bg-purple-50 text-purple-600"
        )}>
          <Target size={20} />
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsUpdating(!isUpdating);
            }} 
            className="p-2 text-[#9e9e9e] hover:text-blue-600 transition-colors" 
            title={t('updateProgress')}
          >
            <TrendingUp size={18} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }} 
            className="p-2 text-[#9e9e9e] hover:text-[#1a1a1a] dark:hover:text-[#f5f5f5] transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }} 
            className="p-2 text-[#9e9e9e] hover:text-red-600 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <h3 className="font-medium text-lg">{goal.name}</h3>
      <p className="text-xs text-[#9e9e9e] uppercase tracking-wider mb-4">{t(goal.category)}</p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#9e9e9e]">{t('goalProgress')}</span>
            <span className="font-medium">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className={cn(
            "w-full h-2 rounded-full overflow-hidden",
            theme === 'dark' ? "bg-[#2d2d2d]" : "bg-[#f5f5f5]"
          )}>
            <div className={cn(
              "h-full transition-all",
              theme === 'dark' ? "bg-blue-600" : "bg-[#1a1a1a]"
            )} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="text-right text-xs text-[#9e9e9e]">{progress.toFixed(1)}%</p>
        </div>

        <AnimatePresence>
          {isUpdating && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={addAmount || ''} 
                  onChange={(e) => setAddAmount(Number(e.target.value))}
                  placeholder={t('addAmount')}
                  className={cn(
                    "flex-1 text-sm rounded-xl px-3 py-2 border-none focus:ring-2 transition-all",
                    theme === 'dark' ? "bg-[#2d2d2d] text-[#f5f5f5] focus:ring-blue-600" : "bg-[#f5f5f5] text-[#1a1a1a] focus:ring-[#1a1a1a]"
                  )}
                />
                <button 
                  onClick={() => {
                    onUpdateAmount(addAmount);
                    setAddAmount(0);
                    setIsUpdating(false);
                  }}
                  className={cn(
                    "text-white px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
                  )}
                >
                  {t('add')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GoalModal({ goal, onClose, onSave }: { goal: Goal | null, onClose: () => void, onSave: (data: any) => void }) {
  const { theme, t } = useSettings();
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    targetAmount: goal?.targetAmount || 0,
    currentAmount: goal?.currentAmount || 0,
    deadline: goal?.deadline || new Date().toISOString().split('T')[0],
    category: goal?.category || 'savings'
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className={cn(
          "w-full max-w-md rounded-3xl overflow-hidden flex flex-col transition-colors",
          theme === 'dark' ? "bg-[#1e1e1e]" : "bg-white"
        )}
      >
        <div className={cn(
          "p-6 border-b flex justify-between items-center",
          theme === 'dark' ? "border-[#2d2d2d]" : "border-[#e5e5e5]"
        )}>
          <h3 className="text-xl font-medium">{goal ? t('edit') : t('newGoal')}</h3>
          <button onClick={onClose} className={cn(
            "p-2 rounded-full transition-all",
            theme === 'dark' ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f0f0f0]"
          )}>
            <Plus size={24} className="rotate-45" />
          </button>
        </div>
        <div className="p-4 md:p-8 space-y-6">
        <Input label={t('goalName')} value={formData.name} onChange={v => setFormData({...formData, name: v})} />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('targetAmount')} type="number" value={formData.targetAmount} onChange={v => setFormData({...formData, targetAmount: Number(v)})} />
          <Input label={t('currentAmount')} type="number" value={formData.currentAmount} onChange={v => setFormData({...formData, currentAmount: Number(v)})} />
        </div>
        <Input label={t('deadline')} type="date" value={formData.deadline} onChange={v => setFormData({...formData, deadline: v})} />
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{t('category')}</label>
          <select 
            className={cn(
              "w-full border-none rounded-xl px-4 py-3 transition-all",
              theme === 'dark' ? "bg-[#2d2d2d] text-[#f5f5f5]" : "bg-[#f5f5f5] text-[#1a1a1a]"
            )} 
            value={formData.category} 
            onChange={e => setFormData({...formData, category: e.target.value as any})}
          >
            <option value="savings">{t('savings')}</option>
            <option value="investment">{t('investment')}</option>
          </select>
        </div>
        <div className="flex gap-4 pt-4">
          <button 
            onClick={onClose} 
            className={cn(
              "flex-1 border py-3 rounded-xl font-medium transition-all",
              theme === 'dark' ? "border-[#2d2d2d] hover:bg-[#2d2d2d]" : "border-[#e5e5e5] hover:bg-[#f5f5f5]"
            )}
          >
            {t('cancel')}
          </button>
          <button 
            onClick={() => onSave(formData)} 
            className={cn(
              "flex-1 text-white py-3 rounded-xl font-medium transition-all",
              theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
            )}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);
}

interface AssetCardProps {
  asset: Asset;
  onEdit: () => void;
  onDelete: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onEdit, onDelete }) => {
  const { theme, t } = useSettings();
  return (
    <div className={cn(
      "p-6 rounded-3xl border transition-all group",
      theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d] hover:border-blue-600" : "bg-white border-[#e5e5e5] hover:border-[#1a1a1a]"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          theme === 'dark' ? "bg-green-900/20 text-green-400" : "bg-green-50 text-green-600"
        )}>
          <Building2 size={20} />
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onEdit} className="p-2 text-[#9e9e9e] hover:text-[#1a1a1a] dark:hover:text-[#f5f5f5] transition-colors"><Edit2 size={18} /></button>
          <button onClick={onDelete} className="p-2 text-[#9e9e9e] hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
        </div>
      </div>
      <h3 className="font-medium text-lg">{asset.name}</h3>
      <p className="text-xs text-[#9e9e9e] uppercase tracking-wider mb-4">{t(asset.type)}</p>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#9e9e9e]">{t('estimatedValue')}</span>
          <span className="font-medium">{formatCurrency(asset.value)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#9e9e9e]">{t('passiveIncome')}</span>
          <span className="font-medium text-green-600">+{formatCurrency(asset.monthlyIncome)}/{t('month')}</span>
        </div>
      </div>
    </div>
  );
}

function AssetModal({ asset, onClose, onSave }: { asset: Asset | null, onClose: () => void, onSave: (data: any) => void }) {
  const { theme, t } = useSettings();
  const [formData, setFormData] = useState({
    name: asset?.name || '',
    value: asset?.value || 0,
    type: asset?.type || 'property',
    monthlyIncome: asset?.monthlyIncome || 0,
    description: asset?.description || ''
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className={cn(
          "w-full max-w-md rounded-3xl overflow-hidden flex flex-col transition-colors",
          theme === 'dark' ? "bg-[#1e1e1e]" : "bg-white"
        )}
      >
        <div className={cn(
          "p-6 border-b flex justify-between items-center",
          theme === 'dark' ? "border-[#2d2d2d]" : "border-[#e5e5e5]"
        )}>
          <h3 className="text-xl font-medium">{asset ? t('edit') : t('newAsset')}</h3>
          <button onClick={onClose} className={cn(
            "p-2 rounded-full transition-all",
            theme === 'dark' ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f0f0f0]"
          )}>
            <Plus size={24} className="rotate-45" />
          </button>
        </div>
        <div className="p-4 md:p-8 space-y-6">
        <Input label={t('assetName')} value={formData.name} onChange={v => setFormData({...formData, name: v})} />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('estimatedValue')} type="number" value={formData.value} onChange={v => setFormData({...formData, value: Number(v)})} />
          <Input label={t('passiveIncome')} type="number" value={formData.monthlyIncome} onChange={v => setFormData({...formData, monthlyIncome: Number(v)})} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{t('category')}</label>
          <select 
            className={cn(
              "w-full border-none rounded-xl px-4 py-3 transition-all",
              theme === 'dark' ? "bg-[#2d2d2d] text-[#f5f5f5]" : "bg-[#f5f5f5] text-[#1a1a1a]"
            )} 
            value={formData.type} 
            onChange={e => setFormData({...formData, type: e.target.value as any})}
          >
            <option value="property">{t('property')}</option>
            <option value="investment">{t('investment')}</option>
            <option value="other">{t('other')}</option>
          </select>
        </div>
        <Input label={t('description')} value={formData.description} onChange={v => setFormData({...formData, description: v})} />
        <div className="flex gap-4 pt-4">
          <button 
            onClick={onClose} 
            className={cn(
              "flex-1 border py-3 rounded-xl font-medium transition-all",
              theme === 'dark' ? "border-[#2d2d2d] hover:bg-[#2d2d2d]" : "border-[#e5e5e5] hover:bg-[#f5f5f5]"
            )}
          >
            {t('cancel')}
          </button>
          <button 
            onClick={() => onSave(formData)} 
            className={cn(
              "flex-1 text-white py-3 rounded-xl font-medium transition-all",
              theme === 'dark' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a1a1a] hover:bg-opacity-90"
            )}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);
}

function DebtTimeline({ loans, calculateAmortization }: { loans: Loan[], calculateAmortization: (l: Loan) => any[] }) {
  const { theme, t } = useSettings();
  
  if (loans.length === 0) return null;

  const now = new Date();
  const currentMonthStr = format(now, 'MMM yyyy');

  // Calculate schedules and filter for current/future months
  const processedSchedules = loans.map(loan => {
    const fullSchedule = calculateAmortization(loan);
    const startDate = new Date(loan.startDate);
    const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    
    // We want to start from the current month's remaining balance
    // If monthsDiff is negative, the loan hasn't started yet, so we take the whole schedule
    // If monthsDiff is positive, we take from that index onwards
    const startIndex = Math.max(0, monthsDiff);
    return {
      name: loan.name,
      schedule: fullSchedule.slice(startIndex)
    };
  });

  // Find all unique dates across all schedules to build a unified timeline
  const allDates = Array.from(new Set(
    processedSchedules.flatMap(ps => ps.schedule.map(row => row.date))
  )).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  const timelineData = allDates.map(date => {
    const dataPoint: any = { date };
    let total = 0;
    processedSchedules.forEach(ps => {
      const row = ps.schedule.find(r => r.date === date);
      const balance = row ? row.remainingBalance : 0;
      dataPoint[ps.name] = balance;
      total += balance;
    });
    dataPoint.total = total;
    return dataPoint;
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className={cn(
      "p-6 rounded-3xl border transition-colors",
      theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
    )}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
          <Calendar size={20} />
        </div>
        <h3 className="text-lg font-medium">{t('debtTimeline')}</h3>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#2d2d2d" : "#f0f0f0"} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10 }}
              interval={Math.floor(allDates.length / 6)}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `$${v/1000}k`}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
                color: theme === 'dark' ? '#f5f5f5' : '#1a1a1a'
              }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Legend verticalAlign="top" height={36}/>
            {processedSchedules.map((ps, index) => (
              <Area 
                key={ps.name}
                type="monotone" 
                dataKey={ps.name} 
                stackId="1"
                stroke={colors[index % colors.length]} 
                fill={colors[index % colors.length]} 
                fillOpacity={0.4}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DebtHealthAnalyzer({ loans, totalIncome, calculateAmortization }: { loans: Loan[], totalIncome: number, calculateAmortization: (l: Loan) => any[] }) {
  const { theme, t } = useSettings();
  
  if (loans.length === 0) return null;

  const now = new Date();

  const loanMetrics = loans.map(loan => {
    const schedule = calculateAmortization(loan);
    const startDate = new Date(loan.startDate);
    const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    const startIndex = Math.max(0, monthsDiff);
    
    const remainingSchedule = schedule.slice(startIndex);
    const currentBalance = remainingSchedule[0]?.remainingBalance || 0;
    const monthlyPayment = remainingSchedule[0]?.totalPayment || 0;
    const interestPending = remainingSchedule.reduce((sum, row) => sum + row.interest, 0);
    const payoffDate = remainingSchedule[remainingSchedule.length - 1]?.date || '';
    
    return {
      name: loan.name,
      currentBalance,
      monthlyPayment,
      interestPending,
      payoffDate,
      dtiImpact: totalIncome > 0 ? (monthlyPayment / totalIncome) * 100 : 0
    };
  });

  const totalMonthlyObligation = loanMetrics.reduce((sum, m) => sum + m.monthlyPayment, 0);
  const totalDti = totalIncome > 0 ? (totalMonthlyObligation / totalIncome) * 100 : 0;
  const totalInterestPending = loanMetrics.reduce((sum, m) => sum + m.interestPending, 0);
  const totalCurrentBalance = loanMetrics.reduce((sum, m) => sum + m.currentBalance, 0);
  
  // Efficiency score based on remaining principal vs total remaining cost
  const efficiency = totalCurrentBalance > 0 ? (totalCurrentBalance / (totalCurrentBalance + totalInterestPending)) * 100 : 100;
  
  const latestPayoffDate = loanMetrics.reduce((latest, m) => {
    if (!latest) return m.payoffDate;
    return new Date(m.payoffDate) > new Date(latest) ? m.payoffDate : latest;
  }, '');

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={cn(
          "p-6 rounded-3xl border transition-colors",
          theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-medium">{t('debtAnalyzer')}</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm text-[#9e9e9e]">{t('overIndebtedness')}</span>
                <span className={cn(
                  "text-sm font-bold",
                  totalDti < 30 ? "text-green-600" : totalDti < 45 ? "text-yellow-600" : "text-red-600"
                )}>{totalDti.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-[#f5f5f5] dark:bg-[#2d2d2d] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, totalDti)}%` }}
                  className={cn(
                    "h-full transition-all",
                    totalDti < 30 ? "bg-green-600" : totalDti < 45 ? "bg-yellow-600" : "bg-red-600"
                  )}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm text-[#9e9e9e]">{t('efficiencyScore')}</span>
                <span className="text-sm font-bold text-blue-600">{efficiency.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-[#f5f5f5] dark:bg-[#2d2d2d] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${efficiency}%` }}
                  className="h-full bg-blue-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-[#f5f5f5] dark:bg-[#2d2d2d]">
                <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('debtFreeDate')}</p>
                <p className="text-sm font-bold">{latestPayoffDate}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#f5f5f5] dark:bg-[#2d2d2d]">
                <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">{t('totalInterestPending')}</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(totalInterestPending)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "p-6 rounded-3xl border transition-colors overflow-hidden",
          theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-medium">{t('loanStrategies')}</h3>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
            {loanMetrics.map(m => (
              <div key={m.name} className={cn(
                "p-4 rounded-2xl border transition-colors",
                theme === 'dark' ? "bg-[#2d2d2d] border-[#3d3d3d]" : "bg-[#f9f9f9] border-[#eeeeee]"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{m.name}</h4>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    m.dtiImpact < 10 ? "bg-green-100 text-green-700" : m.dtiImpact < 20 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                  )}>
                    {m.dtiImpact.toFixed(1)}% DTI
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#9e9e9e] block">{t('remainingBalance')}</span>
                    <span className="font-semibold">{formatCurrency(m.currentBalance)}</span>
                  </div>
                  <div>
                    <span className="text-[#9e9e9e] block">{t('finalPayoffDate')}</span>
                    <span className="font-semibold">{m.payoffDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={cn(
        "p-6 rounded-3xl border transition-colors",
        theme === 'dark' ? "bg-[#1e1e1e] border-[#2d2d2d]" : "bg-white border-[#e5e5e5]"
      )}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
            <Zap size={20} />
          </div>
          <h3 className="text-lg font-medium">{t('optimizationFocus')}</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Lightbulb size={14} />
            </div>
            <div>
              <p className="text-sm font-medium">{t('globalVision')}</p>
              <p className="text-xs text-[#9e9e9e]">Prioriza préstamos con mayor impacto en el ahorro total de intereses, no solo la tasa nominal.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 p-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <TrendingUp size={14} />
            </div>
            <div>
              <p className="text-sm font-medium">{t('financialFreedom')}</p>
              <p className="text-xs text-[#9e9e9e]">Acelera pagos en préstamos que liberan flujo de caja más rápido para reinvertir.</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-2xl border border-dashed border-blue-200 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">{t('viableAlternatives')}</p>
            <ul className="text-xs space-y-2 text-[#666] dark:text-[#aaa]">
              <li>• Consolidación de deudas si la tasa promedio baja {'>'}2%.</li>
              <li>• Método Avalancha para eficiencia matemática estricta.</li>
              <li>• Método Bola de Nieve para salud mental y victorias rápidas.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string, value: any, onChange: (v: string) => void, type?: string }) {
  const { theme } = useSettings();
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "w-full border-none rounded-xl px-4 py-3 focus:ring-2 transition-all",
          theme === 'dark' ? "bg-[#2d2d2d] text-[#f5f5f5] focus:ring-blue-600" : "bg-[#f5f5f5] text-[#1a1a1a] focus:ring-[#1a1a1a]"
        )}
      />
    </div>
  );
}

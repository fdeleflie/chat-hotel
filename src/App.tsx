export interface Client {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
}

export interface Cat {
  id: string;
  owner_id: string;
  owner_name?: string;
  name: string;
  species: string;
  breed: string;
  color: string;
  chip_number: string;
  vaccine_tc_date?: string;
  vaccine_l_date?: string;
  parasite_treatment_date?: string;
  birth_date?: string;
  age?: string;
}

export interface Stay {
  id: string;
  cat_id: string;
  cat_name?: string;
  cat_species?: string;
  cat_breed?: string;
  cat_color?: string;
  cat_chip_number?: string;
  cat_vaccine_tc_date?: string;
  cat_vaccine_l_date?: string;
  cat_parasite_treatment_date?: string;
  cat_birth_date?: string;
  cat_age?: string;
  owner_name?: string;
  owner_email?: string;
  owner_address?: string;
  owner_phone?: string;
  box_number: number;
  arrival_date: string;
  planned_departure: string;
  actual_departure?: string;
  comments: string;
  is_archived: boolean;
  ate_well?: boolean;
  abnormal_behavior?: boolean;
  medication?: string;
  incident?: string;
  health_comments?: string;
  contract_scan_url?: string;
}

export interface HealthLog {
  id: string;
  stay_id: string;
  date: string;
  ate_well: boolean;
  abnormal_behavior: boolean;
  medication: string;
  incident: string;
  comments: string;
}

export interface Media {
  id: string;
  stay_id: string;
  type: 'image' | 'video';
  url: string;
  filename: string;
}

export type InvoiceStatus = 'draft' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface Invoice {
  id: string;
  stay_id: string;
  amount: number;
  service_type: string;
  created_at: string;
  invoice_number: string;
  type: 'standard' | 'deposit' | 'final';
  status: InvoiceStatus;
  payment_method?: string;
  deposit_amount?: number;
  reference_total?: number; // Original total for deposit calculation
  related_invoice_number?: string;
  arrival_date?: string;
  departure_date?: string;
  owner_name?: string; // Cache for central view
  cat_name?: string;   // Cache for central view
}


export interface InvoiceStatusConfig {
  label: string;
  color: string;
  bg: string;
}

export interface Settings {
  logo?: string;
  total_boxes?: string;
  general_conditions?: string;
  company_name?: string;
  company_owner?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_siret?: string;
  company_acaced?: string;
  payment_methods?: string[];
  invoice_statuses?: Record<string, InvoiceStatusConfig>;
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Users, 
  Cat as CatIcon, 
  Calendar, 
  HeartPulse, 
  FileText, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Film,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Camera,
  Menu,
  CreditCard,
  ExternalLink
} from "lucide-react";
import { format, isValid } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const formatDateSafe = (dateString: string | undefined | null, fallback: string = "-") => {
  if (!dateString) return fallback;
  const date = new Date(dateString);
  if (!isValid(date)) return fallback;
  return format(date, "dd/MM/yyyy");
};

const calculateAge = (birthDate: string): string => {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  if (now.getDate() < birth.getDate()) {
    months--;
  }
  if (years > 0) {
    return `${years} an${years > 1 ? 's' : ''}${months > 0 ? ` ${months} mois` : ''}`;
  } else if (months > 0) {
    return `${months} mois`;
  } else {
    return "< 1 mois";
  }
};
import { useDropzone } from "react-dropzone";
import { MigrationView } from "./MigrationView";
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';

// ... (Types are already there)

function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmer", 
  cancelText = "Annuler",
  isDanger = false
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string, 
  confirmText?: string, 
  cancelText?: string,
  isDanger?: boolean
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 transform animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-stone-900">
          {isDanger ? <AlertCircle className="text-red-500" size={24} /> : <CheckCircle2 className="text-emerald-500" size={24} />}
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">{message}</p>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-stone-200 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-lg border flex items-center gap-3 z-[110] animate-in slide-in-from-right-10 duration-300 ${type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <span className="text-sm font-bold">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={16} /></button>
    </div>
  );
}

export const DEFAULT_INVOICE_STATUS_LABELS: Record<string, InvoiceStatusConfig> = {
  draft: { label: 'Brouillon', color: 'text-stone-500', bg: 'bg-stone-100' },
  pending: { label: 'Emise / En attente', color: 'text-orange-600', bg: 'bg-orange-50' },
  partially_paid: { label: 'Partiellement payée', color: 'text-blue-600', bg: 'bg-blue-50' },
  paid: { label: 'Acquittée / Payée', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  overdue: { label: 'En retard', color: 'text-red-600', bg: 'bg-red-50' },
  cancelled: { label: 'Annulée / Avoir', color: 'text-stone-400', bg: 'bg-stone-200' },
  refunded: { label: 'Remboursée', color: 'text-purple-600', bg: 'bg-purple-50' }
};

export const getInvoiceStatusConfig = (status: string, settings?: Settings): InvoiceStatusConfig => {
  return settings?.invoice_statuses?.[status] || DEFAULT_INVOICE_STATUS_LABELS[status] || DEFAULT_INVOICE_STATUS_LABELS.draft;
};

export default function App() {
  const [showMigration, setShowMigration] = useState(window.location.hash === '#migrate');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"clients" | "cats" | "stays" | "stats" | "calendar" | "reports" | "contracts" | "settings" | "all-invoices">("stays");
  const [allInvoicesTabMonth, setAllInvoicesTabMonth] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void,
    isDanger?: boolean
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleHash = () => setShowMigration(window.location.hash === '#migrate');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const askConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, isDanger });
  };

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      console.log("Fetching data...");
      const t = Date.now();
      const [clientsRes, catsRes, staysRes, settingsRes, statsRes] = await Promise.all([
        fetch(`/api/clients?t=${t}`),
        fetch(`/api/cats?t=${t}`),
        fetch(`/api/stays?all=true&t=${t}`),
        fetch(`/api/settings?t=${t}`),
        fetch(`/api/stats?t=${t}`)
      ]);
      
      const clientsData = await clientsRes.json();
      const catsData = await catsRes.json();
      const staysData = await staysRes.json();
      const settingsData = await settingsRes.json();
      const statsData = await statsRes.json();

      if (Array.isArray(clientsData)) setClients(clientsData);
      if (Array.isArray(catsData)) setCats(catsData);
      if (Array.isArray(staysData)) setStays(staysData);
      if (settingsData && !settingsData.error) setSettings(settingsData);
      if (statsData && !statsData.error) setStats(statsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Erreur lors de la récupération des données. Vérifiez votre connexion.", "error");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.email === 'fdeleflie@gmail.com') {
      fetchData(true);
    }
  }, [currentUser]);

  // 1. Loader pendant la vérification initiale de l'auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium">Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  // 2. Si non connecté, écran de login uniquement
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-stone-100 text-center space-y-8">
          <div className="bg-indigo-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-xl rotate-3">
            <CatIcon size={48} className="text-white -rotate-3" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">ChatHotel</h1>
            <p className="text-stone-500 text-sm font-medium">Système de Gestion Sécurisé</p>
          </div>
          <div className="p-4 bg-stone-50 rounded-2xl text-xs text-stone-500 leading-relaxed italic">
            "Cet accès est strictement réservé au personnel autorisé. Toute tentative de connexion non autorisée est enregistrée."
          </div>
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
            S'identifier avec Google
          </button>
        </div>
      </div>
    );
  }

  // 3. Vérification de l'email autorisé
  const isAdmin = currentUser.email === 'fdeleflie@gmail.com';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-100 text-center space-y-4">
          <AlertCircle size={48} className="text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-stone-900">Accès Refusé</h1>
          <p className="text-stone-600">Désolé, votre adresse ({currentUser.email}) n'est pas autorisée à accéder à ce système.</p>
          <button 
            onClick={() => signOut(auth)}
            className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl transition-all"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // 4. Si admin, on peut montrer l'outil de migration si demandé, sinon l'app principale
  if (showMigration) {
    return <MigrationView onComplete={() => window.location.hash = ''} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium">Chargement du Chat'Hotel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans tracking-tight">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center">
              <CatIcon size={16} />
            </div>
          )}
          <span className="font-bold text-lg tracking-tight">Chat'Hotel</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-600">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden" 
          onClick={() => setIsMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-stone-200 flex flex-col z-[70] transition-transform duration-300 lg:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-stone-100 hidden lg:flex items-center gap-3">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
              <CatIcon size={24} />
            </div>
          )}
          <h1 className="font-bold text-xl tracking-tight">Chat'Hotel</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem 
            active={activeTab === "stays"} 
            onClick={() => { setActiveTab("stays"); setIsMenuOpen(false); }} 
            icon={<Calendar size={20} />} 
            label="Séjours" 
          />
          <NavItem 
            active={activeTab === "calendar"} 
            onClick={() => { setActiveTab("calendar"); setIsMenuOpen(false); }} 
            icon={<Calendar size={20} className="text-blue-500" />} 
            label="Calendrier" 
          />
          <NavItem 
            active={activeTab === "clients"} 
            onClick={() => { setActiveTab("clients"); setIsMenuOpen(false); }} 
            icon={<Users size={20} />} 
            label="Clients" 
          />
          <NavItem 
            active={activeTab === "cats"} 
            onClick={() => { setActiveTab("cats"); setIsMenuOpen(false); }} 
            icon={<CatIcon size={20} />} 
            label="Animaux" 
          />
          <NavItem 
            active={activeTab === "stats"} 
            onClick={() => { setActiveTab("stats"); setIsMenuOpen(false); }} 
            icon={<FileText size={20} className="text-orange-500" />} 
            label="Statistiques" 
          />
          <NavItem 
            active={activeTab === "reports"} 
            onClick={() => { setActiveTab("reports"); setIsMenuOpen(false); }} 
            icon={<FileText size={20} className="text-purple-500" />} 
            label="Rapports" 
          />
          <NavItem 
            active={activeTab === "contracts"} 
            onClick={() => { setActiveTab("contracts"); setIsMenuOpen(false); }} 
            icon={<FileText size={20} className="text-indigo-500" />} 
            label="Contrats" 
          />
          <NavItem 
            active={activeTab === "all-invoices"} 
            onClick={() => { setActiveTab("all-invoices"); setIsMenuOpen(false); }} 
            icon={<FileText size={20} className="text-emerald-500" />} 
            label="Facturations" 
          />
          <div className="pt-4 mt-4 border-t border-stone-100 flex flex-col gap-2">
            <NavItem 
              active={activeTab === "settings"} 
              onClick={() => { setActiveTab("settings"); setIsMenuOpen(false); }} 
              icon={<SettingsIcon size={20} />} 
              label="Configuration" 
            />
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={20} />
              <span>Se déconnecter</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className={`p-3 rounded-xl flex items-center gap-3 ${stays.filter(s => s.arrival_date <= format(new Date(), "yyyy-MM-dd") && (s.actual_departure || s.planned_departure) >= format(new Date(), "yyyy-MM-dd")).length >= parseInt(settings.total_boxes || "3") ? "bg-red-50" : "bg-emerald-50"}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${stays.filter(s => s.arrival_date <= format(new Date(), "yyyy-MM-dd") && (s.actual_departure || s.planned_departure) >= format(new Date(), "yyyy-MM-dd")).length >= parseInt(settings.total_boxes || "3") ? "bg-red-500" : "bg-emerald-500"}`}></div>
            <span className={`text-xs font-medium ${stays.filter(s => s.arrival_date <= format(new Date(), "yyyy-MM-dd") && (s.actual_departure || s.planned_departure) >= format(new Date(), "yyyy-MM-dd")).length >= parseInt(settings.total_boxes || "3") ? "text-red-700" : "text-emerald-700"}`}>
              {Math.max(0, parseInt(settings.total_boxes || "3") - stays.filter(s => s.arrival_date <= format(new Date(), "yyyy-MM-dd") && (s.actual_departure || s.planned_departure) >= format(new Date(), "yyyy-MM-dd")).length)} Box Disponibles
            </span>
          </div>
          <button 
            onClick={() => fetchData(true)}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-bold text-stone-400 hover:text-stone-600 transition-colors border border-stone-100 rounded-lg"
          >
            <CheckCircle2 size={10} />
            <span>Version 1.0.3 - Forcer l'actualisation</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 transition-all duration-300">
        {activeTab === "stays" && <StaysView stays={stays} cats={cats} onUpdate={fetchData} settings={settings} showToast={showToast} askConfirm={askConfirm} />}
        {activeTab === "calendar" && <CalendarView stays={stays} onUpdate={fetchData} settings={settings} showToast={showToast} askConfirm={askConfirm} />}
        {activeTab === "clients" && <ClientsView clients={clients} cats={cats} stays={stays} settings={settings} onUpdate={fetchData} showToast={showToast} askConfirm={askConfirm} />}
        {activeTab === "cats" && <CatsView cats={cats} clients={clients} onUpdate={fetchData} showToast={showToast} askConfirm={askConfirm} />}
        {activeTab === "stats" && (
          <StatsView 
            stats={stats} 
            onNavigateToInvoices={(month) => {
              setAllInvoicesTabMonth(month);
              setActiveTab("all-invoices");
            }} 
          />
        )}
        {activeTab === "reports" && <ReportsView stays={stays} onUpdate={fetchData} settings={settings} showToast={showToast} askConfirm={askConfirm} />}
        {activeTab === "contracts" && <ContractsView stays={stays} settings={settings} onUpdate={fetchData} showToast={showToast} askConfirm={askConfirm} />}
        {activeTab === "all-invoices" && (
          <AllInvoicesView 
            settings={settings} 
            onUpdate={fetchData} 
            stays={stays} 
            showToast={showToast} 
            askConfirm={askConfirm}
            initialMonth={allInvoicesTabMonth}
            onClearInitialMonth={() => setAllInvoicesTabMonth(null)}
          />
        )}
        {activeTab === "settings" && <SettingsView settings={settings} onUpdate={fetchData} showToast={showToast} askConfirm={askConfirm} />}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen} 
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
      />
    </div>
  );
}

function StaysView({ stays, cats, onUpdate, settings, showToast, askConfirm }: { stays: Stay[], cats: Cat[], onUpdate: () => void, settings: Settings, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null);

  useEffect(() => {
    if (selectedStay) {
      const updatedStay = stays.find(s => s.id === selectedStay.id);
      if (updatedStay) {
        setSelectedStay(updatedStay);
      }
    }
  }, [stays]);
  const [formData, setFormData] = useState({ cat_id: "", box_number: 1, arrival_date: format(new Date(), "yyyy-MM-dd"), planned_departure: "", comments: "" });
  const [status, setStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));

  const totalBoxes = parseInt(settings.total_boxes || "3");
  const boxOptions = Array.from({ length: totalBoxes }, (_, i) => i + 1);

  const filteredStays = stays.filter(s => s.arrival_date.startsWith(filterMonth));

  const isBoxAvailable = (box: number, arrival: string, departure: string, excludeStayId?: string) => {
    return !stays.some(s => {
      if (s.id === excludeStayId) return false;
      if (s.box_number !== box) return false;
      
      const sArrival = s.arrival_date;
      const sDeparture = s.actual_departure || s.planned_departure;
      
      // Overlap check: (StartA <= EndB) and (EndA >= StartB)
      return arrival <= sDeparture && departure >= sArrival;
    });
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cat_id) {
      showToast("Veuillez sélectionner un chat", "error");
      return;
    }
    if (!formData.planned_departure) {
      showToast("Veuillez indiquer une date de départ prévue", "error");
      return;
    }

    if (!isBoxAvailable(formData.box_number, formData.arrival_date, formData.planned_departure)) {
      showToast(`Le Box ${formData.box_number} est déjà occupé sur cette période.`, "error");
      return;
    }

    handleSave();
  };

  const handleSave = async () => {
    setStatus("Enregistrement...");
    try {
      const response = await fetch("/api/stays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || response.statusText);
      }

      setStatus("Succès !");
      showToast("Séjour enregistré avec succès !");
      setIsAdding(false);
      onUpdate();
    } catch (error: any) {
      console.error("Save error:", error);
      setStatus("Erreur: " + error.message);
      showToast("Erreur: " + error.message, "error");
    } finally {
      setTimeout(() => setStatus(""), 3000);
    }
  };

  const handleDelete = (id: string) => {
    askConfirm(
      "Supprimer le séjour ?", 
      "ATTENTION: Cette action est irréversible. Supprimer définitivement ce séjour et toutes ses données associées (santé, factures, médias) ?",
      async () => {
        setStatus("Suppression en cours...");
        try {
          const res = await fetch(`/api/stays/${id}`, { method: "DELETE" });
          const result = await res.json();
          
          if (!res.ok) {
            throw new Error(result.error || "Erreur lors de la suppression");
          }
          
          showToast("Séjour supprimé avec succès !");
          await onUpdate();
        } catch (err: any) {
          console.error("Delete error:", err);
          showToast("ERREUR: " + err.message, "error");
        } finally {
          setStatus("");
        }
      },
      true
    );
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingStays = stays
    .filter(s => s.arrival_date >= today)
    .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date));

  return (
    <div className="space-y-6">
      {/* Upcoming Stays Section */}
      {upcomingStays.length > 0 && (
        <section className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-emerald-600" size={20} />
            <h3 className="text-lg font-bold text-emerald-900">Prochains séjours à venir</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingStays.slice(0, 6).map(stay => (
              <div 
                key={stay.id} 
                onClick={() => {
                  setFilterMonth(stay.arrival_date.substring(0, 7));
                  setSelectedStay(stay);
                  setTimeout(() => {
                    document.getElementById(`stay-card-${stay.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col gap-2 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-stone-900">{stay.cat_name}</span>
                    {(stay.cat_age || stay.cat_birth_date) && <span className="text-[10px] text-stone-500 uppercase">{stay.cat_age || calculateAge(stay.cat_birth_date || "")}</span>}
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                    J-{Math.ceil((new Date(stay.arrival_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  Propriétaire: <span className="font-medium text-stone-700">{stay.owner_name}</span>
                </div>
                <div className="text-xs text-stone-500">
                  Arrivée: <span className="font-medium text-stone-700">{format(new Date(stay.arrival_date), "dd/MM/yyyy")}</span>
                </div>
                <div className="text-xs text-stone-500">
                  Box: <span className="font-medium text-stone-700">{stay.box_number}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Suivi des Séjours</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <input 
            type="month" 
            className="flex-1 sm:flex-initial p-2 border border-stone-200 rounded-lg text-sm" 
            value={filterMonth} 
            onChange={e => setFilterMonth(e.target.value)} 
          />
          <button 
            onClick={() => { setIsAdding(true); setFormData({ ...formData, cat_id: cats[0]?.id || "" }); }}
            className="flex-1 sm:flex-initial bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors text-sm font-bold"
          >
            <Plus size={18} /> Nouveau Séjour
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-lg text-sm font-bold ${status.startsWith("Erreur") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {status}
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <form onSubmit={onFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Chat</label>
              <select 
                required
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.cat_id}
                onChange={e => setFormData({ ...formData, cat_id: e.target.value })}
              >
                <option value="">Sélectionner un chat</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name} ({c.owner_name})</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Box</label>
              <select 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.box_number}
                onChange={e => setFormData({ ...formData, box_number: parseInt(e.target.value) })}
              >
                {boxOptions.map(box => {
                  const available = isBoxAvailable(box, formData.arrival_date, formData.planned_departure);
                  return (
                    <option key={box} value={box} className={available ? "" : "text-stone-300"}>
                      Box {box} {!available && "(Occupé)"}
                    </option>
                  );
                })}
              </select>
              {boxOptions.every(box => !isBoxAvailable(box, formData.arrival_date, formData.planned_departure)) && (
                <p className="text-[10px] text-red-500 font-bold mt-1">⚠️ Aucun box disponible sur cette période !</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Arrivée</label>
              <input 
                type="date"
                required
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.arrival_date}
                onChange={e => setFormData({ ...formData, arrival_date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Départ Prévu</label>
              <input 
                type="date"
                required
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.planned_departure}
                onChange={e => setFormData({ ...formData, planned_departure: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Commentaires</label>
              <textarea 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                value={formData.comments}
                onChange={e => setFormData({ ...formData, comments: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-500 font-medium">Annuler</button>
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredStays.map(stay => (
          <div key={stay.id} id={`stay-card-${stay.id}`} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${selectedStay?.id === stay.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-stone-200'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                  {stay.box_number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{stay.cat_name}</h3>
                    {(stay.actual_departure || stay.planned_departure) < today && (
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold uppercase">Terminé</span>
                    )}
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold uppercase">ID: {stay.id}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">{stay.cat_species}</span>
                    {(stay.cat_age || stay.cat_birth_date) && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase">{stay.cat_age || calculateAge(stay.cat_birth_date || "")}</span>}
                  </div>
                  <p className="text-stone-500 text-sm">Propriétaire: {stay.owner_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Dates</p>
                  <p className="text-sm font-medium">{stay.arrival_date} → {stay.actual_departure || stay.planned_departure}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedStay(selectedStay?.id === stay.id ? null : stay)}
                    className="bg-stone-100 text-stone-600 px-4 py-2 rounded-lg font-medium hover:bg-stone-200 transition-colors"
                  >
                    {selectedStay?.id === stay.id ? "Fermer" : "Gérer"}
                  </button>
                  <button 
                    onClick={() => handleDelete(stay.id)}
                    className="p-2 text-red-300 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>

            {selectedStay?.id === stay.id && (
              <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <HealthSection stay={stay} onUpdate={onUpdate} showToast={showToast} askConfirm={askConfirm} />
                <MediaSection stay={stay} showToast={showToast} askConfirm={askConfirm} />
                <InvoiceSection stay={stay} settings={settings} showToast={showToast} askConfirm={askConfirm} onUpdate={onUpdate} />
                <StayDetailsSection stay={stay} onUpdate={onUpdate} settings={settings} stays={stays} showToast={showToast} askConfirm={askConfirm} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthSection({ stay, onUpdate, showToast, askConfirm }: { stay: Stay, onUpdate: () => void, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLog, setEditingLog] = useState<HealthLog | null>(null);
  const initialForm = { date: format(new Date(), "yyyy-MM-dd"), ate_well: true, abnormal_behavior: false, medication: "", incident: "", comments: "" };
  const [formData, setFormData] = useState(initialForm);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (editingLog) {
      setIsAdding(false);
      setFormData({
        date: editingLog.date,
        ate_well: editingLog.ate_well,
        abnormal_behavior: editingLog.abnormal_behavior,
        medication: editingLog.medication || "",
        incident: editingLog.incident || "",
        comments: editingLog.comments || ""
      });
    } else if (isAdding) {
      setFormData(initialForm);
    }
  }, [editingLog, isAdding]);

  useEffect(() => { fetchLogs(); }, [stay.id]);

  const fetchLogs = async () => {
    const res = await fetch(`/api/health-logs/${stay.id}`);
    const data = await res.json();
    // Convert 0/1 to boolean
    setLogs(data.map((l: any) => ({
      ...l,
      ate_well: l.ate_well === 1,
      abnormal_behavior: l.abnormal_behavior === 1
    })));
  };

  const handleSave = async () => {
    setStatus("Enregistrement...");
    try {
      const url = editingLog ? `/api/health-logs/${editingLog.id}` : "/api/health-logs";
      const method = editingLog ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, stay_id: stay.id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || response.statusText);
      }

      setStatus("Succès !");
      showToast("Suivi de santé enregistré !");
      setIsAdding(false);
      setEditingLog(null);
      setFormData(initialForm);
      await fetchLogs();
      onUpdate(); // Refresh parent to update the "Latest Health" section
    } catch (error: any) {
      console.error("Save error:", error);
      setStatus("Erreur: " + error.message);
      showToast("Erreur: " + error.message, "error");
    } finally {
      setTimeout(() => setStatus(""), 3000);
    }
  };

  const handleDelete = (id: string) => {
    askConfirm(
      "Supprimer le suivi ?", 
      "Supprimer définitivement ce suivi de santé ?",
      async () => {
        try {
          const res = await fetch(`/api/health-logs/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Erreur lors de la suppression");
          }
          showToast("Suivi supprimé !");
          await fetchLogs();
        } catch (err: any) {
          showToast("Erreur: " + err.message, "error");
        }
      },
      true
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold flex items-center gap-2"><HeartPulse size={18} className="text-red-500" /> Suivi de Santé</h4>
        <button onClick={() => { setIsAdding(!isAdding); if (!isAdding) setFormData(initialForm); }} className="text-emerald-600 text-sm font-bold flex items-center gap-1">
          <Plus size={16} /> Ajouter un suivi
        </button>
      </div>

      {status && (
        <div className={`p-2 rounded text-[10px] font-bold ${status.startsWith("Erreur") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {status}
        </div>
      )}

      {isAdding || editingLog ? (
        <div className="bg-stone-50 p-4 rounded-xl space-y-3 border border-stone-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.ate_well} onChange={e => setFormData({ ...formData, ate_well: e.target.checked })} />
              <label className="text-sm">A bien mangé</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.abnormal_behavior} onChange={e => setFormData({ ...formData, abnormal_behavior: e.target.checked })} />
              <label className="text-sm">Comportement anormal</label>
            </div>
          </div>
          <input type="date" className="w-full p-2 text-sm border border-stone-200 rounded-lg" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
          <input placeholder="Médicament (sur ordonnance)" className="w-full p-2 text-sm border border-stone-200 rounded-lg" value={formData.medication} onChange={e => setFormData({ ...formData, medication: e.target.value })} />
          <input placeholder="Incident particulier" className="w-full p-2 text-sm border border-stone-200 rounded-lg" value={formData.incident} onChange={e => setFormData({ ...formData, incident: e.target.value })} />
          <textarea placeholder="Commentaires" className="w-full p-2 text-sm border border-stone-200 rounded-lg h-20" value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setIsAdding(false); setEditingLog(null); }} className="text-xs font-bold text-stone-500">Annuler</button>
            <button type="button" onClick={handleSave} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Enregistrer</button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {logs.map(log => (
          <div key={log.id} className="p-3 bg-white border border-stone-100 rounded-xl text-sm group relative">
            <div className="flex justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-400">{log.date}</span>
                <span className="text-[10px] text-stone-300 font-bold">ID: {log.id}</span>
              </div>
              <div className="flex gap-2">
                {log.ate_well && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">MANGÉ</span>}
                {log.abnormal_behavior && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">ANORMAL</span>}
              </div>
            </div>
            {log.medication && <p className="text-xs text-stone-600 mb-1">💊 {log.medication}</p>}
            {log.incident && <p className="text-xs text-red-600 font-medium mb-1">⚠️ {log.incident}</p>}
            <p className="text-stone-500 italic">{log.comments}</p>
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingLog(log)} className="p-1 text-stone-400 hover:text-emerald-600"><Edit size={14} /></button>
              <button onClick={() => handleDelete(log.id)} className="p-1 text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaSection({ stay, showToast, askConfirm }: { stay: Stay, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchMedia(); }, [stay.id]);

  const fetchMedia = async () => {
    const res = await fetch(`/api/media/${stay.id}`);
    setMedia(await res.json());
  };

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/media/${stay.id}`, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Erreur lors du téléchargement");
      }
      fetchMedia();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [], 'video/*': [] } 
  } as any);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    onDrop(Array.from(e.target.files));
  };

  const handleDelete = (id: string) => {
    askConfirm(
      "Supprimer le média ?", 
      "Supprimer définitivement ce média ?",
      async () => {
        try {
          const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Erreur lors de la suppression");
          }
          showToast("Média supprimé !");
          await fetchMedia();
        } catch (err: any) {
          showToast("Erreur: " + err.message, "error");
        }
      },
      true
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="font-bold flex items-center gap-2"><Camera size={18} className="text-blue-500" /> Photos & Vidéos</h4>
      
      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer ${isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-emerald-400'}`}>
        <input {...getInputProps()} />
        <Upload className="mx-auto text-stone-400 mb-2" size={24} />
        <p className="text-xs text-stone-500 font-medium">Glissez-déposez ou cliquez pour ajouter</p>
        <input type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />
        {uploading && <p className="text-xs text-emerald-600 font-bold mt-2">Téléchargement...</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {media.map(m => (
          <div key={m.id} className="relative aspect-square group rounded-lg overflow-hidden border border-stone-200">
            {m.type === 'image' ? (
              <img src={m.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-stone-900 flex items-center justify-center text-white">
                <Film size={24} />
              </div>
            )}
            <button 
              onClick={() => handleDelete(m.id)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoiceSection({ stay, settings, showToast, askConfirm, onUpdate }: { stay: Stay, settings: Settings, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void, onUpdate: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({ 
    amount: 0, 
    service_type: "Pension complète", 
    arrival_date: stay.arrival_date, 
    departure_date: stay.actual_departure || stay.planned_departure,
    type: 'standard' as 'standard' | 'deposit' | 'final',
    status: 'draft' as InvoiceStatus,
    payment_method: "",
    deposit_amount: 0,
    related_invoice_number: "",
    created_at: format(new Date(), "yyyy-MM-dd")
  });
  const [status, setStatus] = useState("");
  const [calcTotal, setCalcTotal] = useState(0);
  const [calcPercent, setCalcPercent] = useState(30);

  useEffect(() => { fetchInvoices(); }, [stay.id]);

  const fetchInvoices = async () => {
    const res = await fetch(`/api/invoices/${stay.id}`);
    setInvoices(await res.json());
  };

  const depositInvoices = useMemo(() => invoices.filter(inv => inv.type === 'deposit'), [invoices]);
  const paymentMethods = settings.payment_methods || ["CB", "Chèque", "Espèces", "Virement"];

  const handleSave = async () => {
    setStatus("Génération...");
    try {
      const url = editingInvoice ? `/api/invoices/${editingInvoice.id}` : "/api/invoices";
      const method = editingInvoice ? "PUT" : "POST";
      
      const payload = { 
        ...formData, 
        stay_id: stay.id, 
        owner_name: stay.owner_name,
        cat_name: stay.cat_name,
        reference_total: formData.type === 'deposit' ? calcTotal : undefined
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || response.statusText);
      }

      setStatus("Succès !");
      showToast(editingInvoice ? "Facture modifiée !" : "Facture générée !");
      setIsAdding(false);
      setEditingInvoice(null);
      onUpdate(); // Update central stats if needed
      fetchInvoices();
    } catch (error: any) {
      console.error("Save error:", error);
      setStatus("Erreur: " + error.message);
      showToast("Erreur: " + error.message, "error");
    } finally {
      setTimeout(() => setStatus(""), 3000);
    }
  };

  const generatePDF = (invoice: Invoice) => {
    try {
      const doc = new jsPDF();
      
      // Header - Company Info
      // ... (rest of PDF logic is the same, just keep it or update slightly if needed to show status)
      // Actually, let's update it to show status and payment method on PDF
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(settings.company_name || "LA PENSION DU CHEMIN VERT", 20, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let yPos = 25;
      if (settings.company_owner) { doc.text(settings.company_owner, 20, yPos); yPos += 4; }
      if (settings.company_address) { doc.text(settings.company_address, 20, yPos); yPos += 4; }
      if (settings.company_phone) { doc.text(settings.company_phone, 20, yPos); yPos += 4; }
      if (settings.company_email) { doc.text(settings.company_email, 20, yPos); yPos += 4; }
      if (settings.company_siret) { doc.text(`SIRET : ${settings.company_siret}`, 20, yPos); yPos += 4; }
      if (settings.company_acaced) { doc.text(`ACACED : ${settings.company_acaced}`, 20, yPos); yPos += 4; }
      
      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129); // Emerald-500
      doc.setFont("helvetica", "bold");
      const title = invoice.type === 'deposit' ? "FACTURE D'ACOMPTE" : "FACTURE";
      doc.text(title, 105, 25, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${formatDateSafe(invoice.created_at)}`, 190, 20, { align: "right" });
      doc.text(`Facture N°: ${invoice.invoice_number || invoice.id}`, 190, 25, { align: "right" });
      if (invoice.status) {
        const statusConfig = getInvoiceStatusConfig(invoice.status, settings);
        const s = statusConfig;
        doc.setFontSize(9);
        doc.text(`Statut: ${s.label.toUpperCase()}`, 190, 30, { align: "right" });
      }
      
      // Client Info
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("DESTINATAIRE:", 20, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`${stay.owner_name || "Client"}`, 20, 67);
      if (stay.owner_address) doc.text(`${stay.owner_address}`, 20, 74);
      if (stay.owner_phone) doc.text(`${stay.owner_phone}`, 20, 81);
      if (stay.owner_email) doc.text(`${stay.owner_email}`, 20, 88);
      
      // Animal Info
      doc.setFont("helvetica", "bold");
      doc.text("DÉTAILS SÉJOUR:", 120, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`Animal: ${stay.cat_name || "Animal"}`, 120, 67);
      doc.text(`Période: ${invoice.arrival_date || stay.arrival_date} au ${invoice.departure_date || stay.actual_departure || stay.planned_departure}`, 120, 74);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Santé de l'animal:", 120, 81);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Vaccins (TC): ${formatDateSafe(stay.cat_vaccine_tc_date, "___/___/_____")}`, 120, 86);
      doc.text(`Leucose (L): ${formatDateSafe(stay.cat_vaccine_l_date, "___/___/_____")}`, 120, 91);
      doc.text(`Parasitaire: ${formatDateSafe(stay.cat_parasite_treatment_date, "___/___/_____")}`, 120, 96);

      // Table
      const start = new Date(invoice.arrival_date || stay.arrival_date);
      const end = new Date(invoice.departure_date || stay.actual_departure || stay.planned_departure);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      const rows = [[
        invoice.service_type, 
        invoice.type === 'deposit' ? '1' : diffDays.toString(), 
        invoice.type === 'deposit' ? `${invoice.amount.toFixed(2)} €` : `${(invoice.amount / diffDays).toFixed(2)} €`, 
        `${invoice.amount.toFixed(2)} €`
      ]];

      if (invoice.type === 'final' && invoice.deposit_amount) {
        rows.push([
          `Acompte (Facture N° ${invoice.related_invoice_number || 'N/A'})`,
          '1',
          `-${invoice.deposit_amount.toFixed(2)} €`,
          `-${invoice.deposit_amount.toFixed(2)} €`
        ]);
      }

      autoTable(doc, {
        startY: 105,
        head: [['Description', 'Quantité', 'Prix Unitaire', 'Total']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 110;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const totalAmount = invoice.type === 'final' ? (invoice.amount - (invoice.deposit_amount || 0)) : invoice.amount;
      doc.text(`TOTAL : ${totalAmount.toFixed(2)} €`, 190, finalY + 15, { align: "right" });

      if (invoice.payment_method) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Moyen de paiement: ${invoice.payment_method}`, 20, finalY + 10);
      }

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("TVA non applicable, art. 293 B du CGI", 105, 280, { align: "center" });

      doc.save(`Facture_${stay.cat_name || "Animal"}_${invoice.invoice_number || invoice.id}.pdf`);
    } catch (err: any) {
      console.error("PDF Generation error:", err);
      showToast("Erreur lors de la génération du PDF: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold flex items-center gap-2"><FileText size={18} className="text-emerald-500" /> Facturation</h4>
        {!isAdding && !editingInvoice && (
          <button onClick={() => {
            setIsAdding(true);
            setFormData({
              amount: 0,
              service_type: "Pension complète",
              arrival_date: stay.arrival_date,
              departure_date: stay.actual_departure || stay.planned_departure,
              type: 'standard',
              status: 'draft',
              payment_method: "",
              deposit_amount: 0,
              related_invoice_number: "",
              created_at: format(new Date(), "yyyy-MM-dd")
            });
          }} className="text-emerald-600 text-sm font-bold flex items-center gap-1">
            <Plus size={16} /> Créer facture
          </button>
        )}
      </div>

      {status && (
        <div className={`p-2 rounded text-[10px] font-bold ${status.startsWith("Erreur") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {status}
        </div>
      )}

      {(isAdding || editingInvoice) && (
        <div className="bg-stone-50 p-4 rounded-xl space-y-3 border border-stone-200">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Type</label>
              <select 
                className="w-full p-2 text-sm border border-stone-200 rounded-lg bg-white"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="standard">Standard</option>
                <option value="deposit">Acompte</option>
                <option value="final">Finale</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Statut</label>
              <select 
                className="w-full p-2 text-sm border border-stone-200 rounded-lg bg-white"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                {Object.entries(settings.invoice_statuses || DEFAULT_INVOICE_STATUS_LABELS).map(([val, config]) => (
                  <option key={val} value={val}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Prestation</label>
              <input placeholder="Ex: Pension complète" className="w-full p-2 text-sm border border-stone-200 rounded-lg" value={formData.service_type} onChange={e => setFormData({ ...formData, service_type: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Mode de paiement</label>
              <select 
                className="w-full p-2 text-sm border border-stone-200 rounded-lg bg-white"
                value={formData.payment_method}
                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="">-- Sélectionner --</option>
                {paymentMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase">Date de facturation</label>
            <input 
              type="date"
              className="w-full p-2 text-sm border border-stone-200 rounded-lg bg-white"
              value={formData.created_at}
              onChange={e => setFormData({ ...formData, created_at: e.target.value })}
            />
          </div>

          {formData.type === 'deposit' && (
            <div className="grid grid-cols-2 gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-700 uppercase">Montant Total de réf.</label>
                <input 
                  type="number" 
                  className="w-full p-2 text-sm border border-indigo-200 rounded-lg bg-white" 
                  value={calcTotal || ""} 
                  onChange={e => {
                    const total = parseFloat(e.target.value) || 0;
                    setCalcTotal(total);
                    setFormData({ ...formData, amount: parseFloat(((total * calcPercent) / 100).toFixed(2)) });
                  }} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-700 uppercase">Acompte %</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    className="w-full p-2 text-sm border border-indigo-200 rounded-lg bg-white" 
                    value={calcPercent} 
                    onChange={e => {
                      const pct = parseFloat(e.target.value) || 0;
                      setCalcPercent(pct);
                      setFormData({ ...formData, amount: parseFloat(((calcTotal * pct) / 100).toFixed(2)) });
                    }} 
                  />
                  <span className="font-bold text-indigo-700">%</span>
                </div>
              </div>
              <p className="col-span-2 text-[9px] text-indigo-500 italic mt-1">Saisir le total et le % pour calculer l'acompte automatiquement below.</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase">{formData.type === 'deposit' ? 'Montant de l\'acompte' : 'Montant Total'}</label>
            <div className="relative">
              <input 
                type="number" 
                className="w-full p-2 text-sm border border-stone-200 rounded-lg" 
                value={isNaN(formData.amount) ? "" : formData.amount} 
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })} 
              />
              <span className="absolute right-3 top-2 text-stone-300 pointer-events-none">€</span>
            </div>
          </div>

          {formData.type === 'final' && depositInvoices.length > 0 && (
            <div className="space-y-1 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
              <label className="text-[10px] font-bold text-emerald-700 uppercase">Déduire un acompte</label>
              <select 
                className="w-full p-2 text-sm border border-emerald-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-stone-700"
                onChange={(e) => {
                  const inv = depositInvoices.find(i => i.id === e.target.value);
                  if (inv) {
                    setFormData({ 
                      ...formData, 
                      deposit_amount: inv.amount, 
                      related_invoice_number: inv.invoice_number,
                      amount: inv.reference_total || formData.amount
                    });
                  } else {
                    setFormData({ ...formData, deposit_amount: 0, related_invoice_number: "", amount: 0 });
                  }
                }}
              >
                <option value="">-- Sélectionner l'acompte --</option>
                {depositInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>Facture {inv.invoice_number} ({inv.amount}€)</option>
                ))}
              </select>
              {formData.deposit_amount > 0 && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-100 text-[10px] font-medium text-emerald-700 shadow-sm">
                  <div className="flex justify-between">
                    <span>Acompte déduit :</span>
                    <span className="font-bold text-red-500">-{formData.deposit_amount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-emerald-50 mt-1 pt-1 text-sm">
                    <span>RESTE À PAYER :</span>
                    <span>{(formData.amount - formData.deposit_amount).toFixed(2)} €</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Du</label>
              <input type="date" className="w-full p-2 text-sm border border-stone-200 rounded-lg" value={formData.arrival_date} onChange={e => setFormData({ ...formData, arrival_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Au</label>
              <input type="date" className="w-full p-2 text-sm border border-stone-200 rounded-lg" value={formData.departure_date} onChange={e => setFormData({ ...formData, departure_date: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsAdding(false); setEditingInvoice(null); }} className="text-xs font-bold text-stone-500">Annuler</button>
            <button type="button" onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold">{editingInvoice ? "Modifier" : "Générer la facture"}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {invoices.map(inv => {
          const statusConfig = getInvoiceStatusConfig(inv.status, settings);
          return (
            <div key={inv.id} className={`flex justify-between items-center p-3 bg-white border border-stone-100 rounded-xl group relative ${inv.type === 'deposit' ? 'border-l-4 border-l-orange-400' : inv.type === 'final' ? 'border-l-4 border-l-emerald-600' : ''}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">
                    {inv.type === 'final' ? (inv.amount - (inv.deposit_amount || 0)).toFixed(2) : inv.amount.toFixed(2)} €
                  </p>
                  {inv.type === 'deposit' && <span className="text-[8px] bg-orange-100 text-orange-700 px-1 rounded font-bold uppercase">Acompte</span>}
                  {inv.type === 'final' && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold uppercase">Finale</span>}
                  <span className={`text-[8px] ${statusConfig.bg} ${statusConfig.color} px-1 rounded font-bold uppercase`}>{statusConfig.label}</span>
                </div>
                <p className="text-[10px] text-stone-400 uppercase font-bold flex items-center gap-1">
                  {inv.invoice_number} • {inv.service_type}
                  {inv.payment_method && <span className="text-stone-500 italic">({inv.payment_method})</span>}
                  {inv.related_invoice_number && <span className="text-emerald-600 ml-1">(Réf: {inv.related_invoice_number})</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <button title="Télécharger" onClick={() => generatePDF(inv)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Download size={18} /></button>
                <button 
                  title="Modifier"
                  onClick={() => { 
                    setEditingInvoice(inv); 
                    setFormData({ 
                      amount: inv.amount, 
                      service_type: inv.service_type, 
                      arrival_date: inv.arrival_date || stay.arrival_date, 
                      departure_date: inv.departure_date || stay.actual_departure || stay.planned_departure,
                      type: inv.type || 'standard',
                      status: inv.status || 'draft',
                      payment_method: inv.payment_method || "",
                      deposit_amount: inv.deposit_amount || 0,
                      related_invoice_number: inv.related_invoice_number || "",
                      created_at: inv.created_at
                    }); 
                  }} 
                  className="p-2 text-stone-400 hover:text-emerald-600"
                >
                  <Edit size={18} />
                </button>
                <button 
                  title="Supprimer"
                  onClick={() => { 
                    askConfirm(
                      "Supprimer la facture ?", 
                      "Supprimer définitivement cette facture ?",
                      async () => {
                        try {
                          const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || "Erreur lors de la suppression");
                          }
                          showToast("Facture supprimée !");
                          fetchInvoices();
                          onUpdate();
                        } catch (err: any) {
                          showToast("Erreur: " + err.message, "error");
                        }
                      },
                      true
                    );
                  }} className="p-2 text-stone-300 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StayDetailsSection({ stay, onUpdate, settings, stays, showToast, askConfirm }: { stay: Stay, onUpdate: () => void, settings: Settings, stays: Stay[], showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [formData, setFormData] = useState({
    ...stay,
    ate_well: stay.ate_well ?? true,
    abnormal_behavior: stay.abnormal_behavior ?? false,
    medication: stay.medication ?? "",
    incident: stay.incident ?? "",
    health_comments: stay.health_comments ?? ""
  });

  useEffect(() => {
    setFormData({
      ...stay,
      ate_well: stay.ate_well ?? true,
      abnormal_behavior: stay.abnormal_behavior ?? false,
      medication: stay.medication ?? "",
      incident: stay.incident ?? "",
      health_comments: stay.health_comments ?? ""
    });
  }, [stay]);
  const [status, setStatus] = useState("");

  const totalBoxes = parseInt(settings.total_boxes || "3");
  const boxOptions = Array.from({ length: totalBoxes }, (_, i) => i + 1);

  const isBoxAvailable = (box: number, arrival: string, departure: string, excludeStayId?: string) => {
    return !stays.some(s => {
      if (s.id === excludeStayId) return false;
      if (s.box_number !== box) return false;
      
      const sArrival = s.arrival_date;
      const sDeparture = s.actual_departure || s.planned_departure;
      
      return arrival <= sDeparture && departure >= sArrival;
    });
  };

  const handleDelete = (id: string) => {
    askConfirm(
      "Supprimer le séjour ?", 
      "ATTENTION: Cette action est irréversible. Supprimer définitivement ce séjour et toutes ses données associées (santé, factures, médias) ?",
      async () => {
        setStatus("Suppression en cours...");
        try {
          const res = await fetch(`/api/stays/${id}`, { method: "DELETE" });
          const result = await res.json();
          
          if (!res.ok) {
            throw new Error(result.error || "Erreur lors de la suppression");
          }
          
          showToast("Séjour supprimé avec succès !");
          await onUpdate();
        } catch (err: any) {
          console.error("Delete error:", err);
          showToast("ERREUR: " + err.message, "error");
        } finally {
          setStatus("");
        }
      },
      true
    );
  };

  const handleUpdate = async () => {
    const departure = formData.actual_departure || formData.planned_departure;
    if (!isBoxAvailable(formData.box_number, formData.arrival_date, departure, stay.id)) {
      showToast(`Le Box ${formData.box_number} est déjà occupé sur cette période.`, "error");
      return;
    }

    setStatus("Enregistrement...");
    try {
      const response = await fetch(`/api/stays/${stay.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || response.statusText);
      }

      setStatus("Succès !");
      showToast("Modifications enregistrées !");
      await onUpdate();
    } catch (error: any) {
      console.error("Save error:", error);
      setStatus("Erreur: " + error.message);
      showToast("Erreur: " + error.message, "error");
    } finally {
      setTimeout(() => setStatus(""), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-bold flex items-center gap-2"><Edit size={18} className="text-stone-500" /> Détails du Séjour</h4>
      
      {status && (
        <div className={`p-2 rounded text-[10px] font-bold ${status.startsWith("Erreur") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase">Arrivée</label>
          <input 
            type="date"
            className="w-full p-2 text-sm border border-stone-200 rounded-lg"
            value={formData.arrival_date || ""}
            onChange={e => setFormData({ ...formData, arrival_date: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase">Départ Prévu</label>
          <input 
            type="date"
            className="w-full p-2 text-sm border border-stone-200 rounded-lg"
            value={formData.planned_departure || ""}
            onChange={e => setFormData({ ...formData, planned_departure: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase">Départ Réel</label>
          <input 
            type="date"
            className="w-full p-2 text-sm border border-stone-200 rounded-lg"
            value={formData.actual_departure || ""}
            onChange={e => setFormData({ ...formData, actual_departure: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase">Box</label>
          <select 
            className="w-full p-2 text-sm border border-stone-200 rounded-lg"
            value={formData.box_number}
            onChange={e => setFormData({ ...formData, box_number: parseInt(e.target.value) })}
          >
            {boxOptions.map(box => <option key={box} value={box}>Box {box}</option>)}
          </select>
        </div>
        <div className="col-span-1 sm:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase">Commentaires Généraux</label>
          <textarea 
            className="w-full p-2 text-sm border border-stone-200 rounded-lg h-20"
            value={formData.comments}
            onChange={e => setFormData({ ...formData, comments: e.target.value })}
          />
        </div>

        <div className="col-span-1 sm:col-span-2 pt-4 border-t border-stone-100">
          <h5 className="text-xs font-bold text-emerald-700 uppercase mb-3 flex items-center gap-2">
            <HeartPulse size={14} /> Dernier Suivi Santé
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="ate_well"
                checked={formData.ate_well} 
                onChange={e => setFormData({ ...formData, ate_well: e.target.checked })} 
              />
              <label htmlFor="ate_well" className="text-sm text-stone-600">Bien mangé ?</label>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="abnormal_behavior"
                checked={formData.abnormal_behavior} 
                onChange={e => setFormData({ ...formData, abnormal_behavior: e.target.checked })} 
              />
              <label htmlFor="abnormal_behavior" className="text-sm text-stone-600">Comportement anormal ?</label>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Médicament</label>
              <input 
                type="text"
                placeholder="Ex: 1/2 comprimé matin"
                className="w-full p-2 text-sm border border-stone-200 rounded-lg"
                value={formData.medication}
                onChange={e => setFormData({ ...formData, medication: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Incident Toilettage / Autre</label>
              <input 
                type="text"
                placeholder="Ex: Petite griffure"
                className="w-full p-2 text-sm border border-stone-200 rounded-lg"
                value={formData.incident}
                onChange={e => setFormData({ ...formData, incident: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Commentaire Santé</label>
              <textarea 
                placeholder="Détails sur l'état de santé..."
                className="w-full p-2 text-sm border border-stone-200 rounded-lg h-20"
                value={formData.health_comments}
                onChange={e => setFormData({ ...formData, health_comments: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 pt-4 border-t border-stone-100">
        <button 
          onClick={handleUpdate} 
          className="flex-1 bg-stone-800 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-900 transition-colors"
        >
          <Save size={18} /> Enregistrer les modifications
        </button>
        <button 
          onClick={() => handleDelete(stay.id)} 
          className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          title="Supprimer définitivement"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function ClientsView({ clients, cats, stays, settings, onUpdate, showToast, askConfirm }: { clients: Client[], cats: Cat[], stays: Stay[], settings: Settings, onUpdate: () => void, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "", email: "", phone: "" });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  if (selectedClient) {
    return (
      <ClientDashboard 
        client={selectedClient} 
        cats={cats} 
        stays={stays} 
        settings={settings} 
        onBack={() => setSelectedClient(null)} 
        onUpdate={onUpdate}
        showToast={showToast} 
        askConfirm={askConfirm} 
      />
    );
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Le nom est obligatoire", "error");
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    setStatus("Enregistrement...");
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(err.error || response.statusText);
      }
      
      setStatus("Succès !");
      showToast("Client enregistré avec succès !");
      setIsAdding(false);
      setEditingClient(null);
      setFormData({ name: "", address: "", email: "", phone: "" });
      onUpdate();
    } catch (error: any) {
      console.error("Save error:", error);
      setStatus("Erreur: " + error.message);
      showToast("Erreur: " + error.message, "error");
    } finally {
      setTimeout(() => setStatus(""), 3000);
    }
  };

  const handleDelete = (id: string) => {
    askConfirm(
      "Supprimer le client ?", 
      "ATTENTION: Supprimer un client supprimera également TOUS ses animaux et TOUS leurs séjours associés. Continuer ?",
      async () => {
        try {
          const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Erreur lors de la suppression");
          }
          showToast("Client et toutes ses données supprimés !");
          await onUpdate();
        } catch (err: any) {
          showToast("Erreur: " + err.message, "error");
        }
      },
      true
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Gestion des Clients</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input 
            placeholder="Rechercher un client..." 
            className="p-2 border border-stone-200 rounded-lg text-sm w-full sm:w-48"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button 
            onClick={() => { setIsAdding(true); setEditingClient(null); setFormData({ name: "", address: "", email: "", phone: "" }); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors text-sm font-bold"
          >
            <Plus size={18} /> Nouveau Client
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-lg text-sm font-bold ${status.startsWith("Erreur") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {status}
        </div>
      )}

      {(isAdding || editingClient) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <form onSubmit={onFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Nom Complet</label>
              <input 
                required
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Téléphone</label>
              <input 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Email</label>
              <input 
                type="email"
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Adresse</label>
              <input 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => { setIsAdding(false); setEditingClient(null); }} className="px-4 py-2 text-stone-500 font-medium">Annuler</button>
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{client.name}</h3>
                <p className="text-stone-500 text-sm">{client.email}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingClient(client); setFormData(client); }} className="p-2 text-stone-400 hover:text-emerald-600"><Edit size={18} /></button>
                <button onClick={() => handleDelete(client.id)} className="p-2 text-stone-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-stone-600 mb-4">
              <div className="flex items-center gap-2"><span className="text-stone-400">Tél:</span> {client.phone}</div>
              <div className="flex items-center gap-2"><span className="text-stone-400">Adr:</span> {client.address}</div>
            </div>
            <button 
              onClick={() => setSelectedClient(client)} 
              className="w-full bg-stone-50 text-emerald-700 py-2 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-50 transition-colors"
            >
              Ouvrir la fiche client
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientDashboard({ client, cats, stays, settings, onBack, onUpdate, showToast, askConfirm }: { client: Client, cats: Cat[], stays: Stay[], settings: Settings, onBack: () => void, onUpdate: () => void, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const clientCats = cats.filter(c => c.owner_id === client.id);
  const [activeMenu, setActiveMenu] = useState<"overview" | "add_cat" | "add_stay">("overview");
  
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [catFormData, setCatFormData] = useState({ owner_id: client.id, name: "", species: "Chat", breed: "", color: "", chip_number: "", vaccine_tc_date: "", vaccine_l_date: "", parasite_treatment_date: "", birth_date: "", age: "" });
  
  const [stayFormData, setStayFormData] = useState({ 
    cat_id: "", 
    arrival_date: format(new Date(), "yyyy-MM-dd"), 
    planned_departure: "", 
    box_number: 1, 
    comments: "" 
  });
  
  const [status, setStatus] = useState("");
  const boxOptions = Array.from({ length: settings.total_boxes ? parseInt(settings.total_boxes) : 3 }, (_, i) => i + 1);

  const isBoxAvailable = (box: number, start: string, end: string) => {
    if (!start || !end) return true;
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    return !stays.some(stay => {
      if (stay.is_archived || stay.box_number !== box) return false;
      const stayStart = new Date(stay.arrival_date).getTime();
      const stayEnd = new Date(stay.actual_departure || stay.planned_departure).getTime();
      return (startDate <= stayEnd && endDate >= stayStart);
    });
  };

  const handleEditCatClick = (cat: Cat) => {
    setCatFormData({
      owner_id: cat.owner_id,
      name: cat.name,
      species: cat.species || "Chat",
      breed: cat.breed || "",
      color: cat.color || "",
      chip_number: cat.chip_number || "",
      vaccine_tc_date: cat.vaccine_tc_date || "",
      vaccine_l_date: cat.vaccine_l_date || "",
      parasite_treatment_date: cat.parasite_treatment_date || "",
      birth_date: cat.birth_date || "",
      age: cat.age || ""
    });
    setEditingCat(cat);
    setActiveMenu("add_cat");
  };

  const handleDeleteCatClick = (id: string) => {
    askConfirm(
      "Supprimer cet animal ?", 
      "ATTENTION: Supprimer cet animal supprimera également TOUS ses séjours. Continuer ?",
      async () => {
        try {
          const res = await fetch(`/api/cats/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Erreur de suppression");
          showToast("Animal supprimé.");
          onUpdate();
        } catch (err: any) {
          showToast(err.message, "error");
        }
      },
      true
    );
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.name.trim()) return showToast("Nom du chat obligatoire", "error");
    setStatus("Enregistrement...");
    try {
      const url = editingCat ? `/api/cats/${editingCat.id}` : "/api/cats";
      const method = editingCat ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catFormData)
      });
      if (!response.ok) throw new Error("Erreur serveur");
      showToast(editingCat ? "Animal modifié" : "Animal ajouté !");
      setCatFormData({ owner_id: client.id, name: "", species: "Chat", breed: "", color: "", chip_number: "", vaccine_tc_date: "", vaccine_l_date: "", parasite_treatment_date: "", birth_date: "", age: "" });
      setEditingCat(null);
      setActiveMenu("overview");
      onUpdate();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setStatus("");
    }
  };

  const handleSaveStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stayFormData.cat_id) return showToast("Choisir un animal", "error");
    if (!stayFormData.planned_departure) return showToast("Date de départ prévue requise", "error");
    if (!isBoxAvailable(stayFormData.box_number, stayFormData.arrival_date, stayFormData.planned_departure)) {
      return showToast(`Le Box ${stayFormData.box_number} n'est pas disponible.`, "error");
    }
    setStatus("Enregistrement...");
    try {
      const response = await fetch("/api/stays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stayFormData)
      });
      if (!response.ok) throw new Error("Erreur serveur");
      showToast("Séjour créé !");
      setStayFormData({ cat_id: "", arrival_date: format(new Date(), "yyyy-MM-dd"), planned_departure: "", box_number: 1, comments: "" });
      setActiveMenu("overview");
      onUpdate();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setStatus("");
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors">
        <ChevronLeft size={20} /> Retour aux clients
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <p className="text-stone-500">{client.email} • {client.phone}</p>
            <p className="text-stone-500 text-sm">{client.address}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveMenu("add_cat")} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-200">
              <Plus size={16} className="inline mr-1"/> Animal
            </button>
            <button onClick={() => setActiveMenu("add_stay")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700">
              <Plus size={16} className="inline mr-1"/> Séjour
            </button>
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-lg text-sm font-bold bg-emerald-100 text-emerald-700`}>{status}</div>
      )}

      {activeMenu === "add_cat" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="font-bold text-lg mb-4">{editingCat ? `Modifier ${editingCat.name}` : `Ajouter un animal pour ${client.name}`}</h3>
          <form onSubmit={handleSaveCat} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Nom de l'animal</label>
              <input required className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={catFormData.name} onChange={e => setCatFormData({ ...catFormData, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Espèce</label>
              <select className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={catFormData.species} onChange={e => setCatFormData({ ...catFormData, species: e.target.value })}>
                <option value="Chat">Chat</option><option value="Chien">Chien</option><option value="NAC">NAC</option><option value="Autre">Autre</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Race</label>
              <input className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={catFormData.breed} onChange={e => setCatFormData({ ...catFormData, breed: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Couleur</label>
              <input className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={catFormData.color} onChange={e => setCatFormData({ ...catFormData, color: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Numéro de puce</label>
              <input className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={catFormData.chip_number} onChange={e => setCatFormData({ ...catFormData, chip_number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Age (manuel)</label>
              <input className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={catFormData.age || ""} onChange={e => setCatFormData({ ...catFormData, age: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Date de Naissance</label>
              <input type="date" className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={catFormData.birth_date || ""} onChange={e => { const val = e.target.value; setCatFormData({ ...catFormData, birth_date: val, age: val ? calculateAge(val) : catFormData.age }); }} />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => { setActiveMenu("overview"); setEditingCat(null); }} className="px-4 py-2 text-stone-500 font-medium">Annuler</button>
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium">{editingCat ? "Mettre à jour" : "Enregistrer l'animal"}</button>
            </div>
          </form>
        </div>
      )}

      {activeMenu === "add_stay" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="font-bold text-lg mb-4">Créer un séjour</h3>
          <form onSubmit={handleSaveStay} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Animal</label>
              <select required className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={stayFormData.cat_id} onChange={e => setStayFormData({ ...stayFormData, cat_id: e.target.value })}>
                <option value="">Sélectionner un animal</option>
                {clientCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Box</label>
              <select className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={stayFormData.box_number} onChange={e => setStayFormData({ ...stayFormData, box_number: parseInt(e.target.value) })}>
                {boxOptions.map(b => (
                  <option key={b} value={b} className={isBoxAvailable(b, stayFormData.arrival_date, stayFormData.planned_departure) ? "" : "text-stone-300"}>
                    Box {b} {!isBoxAvailable(b, stayFormData.arrival_date, stayFormData.planned_departure) && "(Occupé)"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Arrivée</label>
              <input type="date" required className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={stayFormData.arrival_date} onChange={e => setStayFormData({ ...stayFormData, arrival_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Départ Prévu</label>
              <input type="date" required className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={stayFormData.planned_departure} onChange={e => setStayFormData({ ...stayFormData, planned_departure: e.target.value })} />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setActiveMenu("overview")} className="px-4 py-2 text-stone-500 font-medium">Annuler</button>
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium">Réserver le séjour</button>
            </div>
          </form>
        </div>
      )}

      {activeMenu === "overview" && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Animaux rattachés ({clientCats.length})</h3>
          {clientCats.length === 0 && <p className="text-stone-500 text-sm">Ce client n'a aucun animal enregistré.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientCats.map(cat => {
              const catStays = stays.filter(s => s.cat_id === cat.id).sort((a,b) => b.arrival_date.localeCompare(a.arrival_date));
              return (
                <div key={cat.id} className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 group flex flex-col">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                        {cat.name} <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold uppercase">{cat.species}</span>
                      </h4>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditCatClick(cat)} className="p-1 text-stone-400 hover:text-emerald-600"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteCatClick(cat.id)} className="p-1 text-stone-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="text-xs text-stone-500 grid grid-cols-2 gap-2 mb-4">
                      <div><span className="font-bold block uppercase text-[10px]">Race</span> {cat.breed || "-"}</div>
                      <div><span className="font-bold block uppercase text-[10px]">Puce</span> {cat.chip_number || "-"}</div>
                      <div className="col-span-2"><span className="font-bold block uppercase text-[10px]">Age</span> {cat.age || (cat.birth_date ? calculateAge(cat.birth_date) : "-")}</div>
                    </div>
                    {catStays.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-stone-400">Derniers Séjours</p>
                        {catStays.slice(0, 3).map(cs => (
                          <div key={cs.id} className="text-xs flex justify-between bg-stone-50 p-2 rounded-lg border border-stone-100">
                            <span>{formatDateSafe(cs.arrival_date)} → {formatDateSafe(cs.actual_departure || cs.planned_departure)}</span>
                            <span className="font-bold text-emerald-700">Box {cs.box_number} {cs.is_archived && "(Terminé)"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setStayFormData(s => ({ ...s, cat_id: cat.id })); setActiveMenu("add_stay"); }} className="w-full bg-stone-100 py-2 rounded-lg text-sm font-bold text-stone-700 hover:bg-stone-200 transition-colors mt-auto">
                    <Plus size={14} className="inline mr-1"/> Nouveau séjour pour {cat.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CatsView({ cats, clients, onUpdate, showToast, askConfirm }: { cats: Cat[], clients: Client[], onUpdate: () => void, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [formData, setFormData] = useState({ 
    owner_id: "", 
    name: "", 
    species: "Chat", 
    breed: "", 
    color: "", 
    chip_number: "",
    vaccine_tc_date: "",
    vaccine_l_date: "",
    parasite_treatment_date: "",
    birth_date: "",
    age: ""
  });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const handleDelete = (id: string) => {
    askConfirm(
      "Supprimer l'animal ?", 
      "ATTENTION: Supprimer cet animal supprimera également TOUS ses séjours associés. Continuer ?",
      async () => {
        try {
          const res = await fetch(`/api/cats/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Erreur lors de la suppression");
          }
          showToast("Animal et ses séjours supprimés !");
          await onUpdate();
        } catch (err: any) {
          showToast("Erreur: " + err.message, "error");
        }
      },
      true
    );
  };

  const filteredCats = cats.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.chip_number.includes(search)
  );

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Le nom du chat est obligatoire", "error");
      return;
    }
    if (!formData.owner_id) {
      showToast("Veuillez sélectionner un propriétaire", "error");
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    setStatus("Enregistrement...");
    try {
      const url = editingCat ? `/api/cats/${editingCat.id}` : "/api/cats";
      const method = editingCat ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || response.statusText);
      }
      
      setStatus("Succès !");
      showToast("Chat enregistré avec succès !");
      setIsAdding(false);
      setEditingCat(null);
      onUpdate();
    } catch (error: any) {
      console.error("Save error:", error);
      setStatus("Erreur: " + error.message);
      showToast("Erreur: " + error.message, "error");
    } finally {
      setTimeout(() => setStatus(""), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Registre des Animaux</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input 
            placeholder="Rechercher un animal..." 
            className="p-2 border border-stone-200 rounded-lg text-sm w-full sm:w-48"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button 
            onClick={() => { setIsAdding(true); setEditingCat(null); setFormData({ owner_id: clients[0]?.id || "", name: "", species: "Chat", breed: "", color: "", chip_number: "", vaccine_tc_date: "", vaccine_l_date: "", parasite_treatment_date: "", birth_date: "", age: "" }); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors text-sm font-bold"
          >
            <Plus size={18} /> Nouveau
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-lg text-sm font-bold ${status.startsWith("Erreur") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {status}
        </div>
      )}

      {(isAdding || editingCat) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <form onSubmit={onFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editingCat && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-500 uppercase">Propriétaire</label>
                <select 
                  required
                  className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.owner_id}
                  onChange={e => setFormData({ ...formData, owner_id: e.target.value })}
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Espèce</label>
              <select 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.species}
                onChange={e => setFormData({ ...formData, species: e.target.value })}
              >
                <option value="Chat">Chat</option>
                <option value="Chien">Chien</option>
                <option value="NAC">NAC</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Nom de l'animal</label>
              <input 
                required
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Race</label>
              <input 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.breed}
                onChange={e => setFormData({ ...formData, breed: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Couleur</label>
              <input 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.color}
                onChange={e => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Age (manuel)</label>
              <input 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="ex: 3 ans"
                value={formData.age || ""}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Date de Naissance</label>
              <input 
                type="date"
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.birth_date || ""}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ ...formData, birth_date: val, age: val ? calculateAge(val) : formData.age });
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Numéro de Puce</label>
              <input 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.chip_number}
                onChange={e => setFormData({ ...formData, chip_number: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Derniers vaccins (TC)</label>
              <input 
                type="date"
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.vaccine_tc_date || ""}
                onChange={e => setFormData({ ...formData, vaccine_tc_date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Leucose (L)</label>
              <input 
                type="date"
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.vaccine_l_date || ""}
                onChange={e => setFormData({ ...formData, vaccine_l_date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase">Dernier traitement Parasitaire</label>
              <input 
                type="date"
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.parasite_treatment_date || ""}
                onChange={e => setFormData({ ...formData, parasite_treatment_date: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => { setIsAdding(false); setEditingCat(null); }} className="px-4 py-2 text-stone-500 font-medium">Annuler</button>
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCats.map(cat => (
          <div key={cat.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
                  <CatIcon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{cat.name}</h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">{cat.species}</span>
                  </div>
                  <p className="text-emerald-600 text-xs font-semibold uppercase tracking-wider">{cat.owner_name}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingCat(cat); setFormData({ ...cat, owner_id: cat.owner_id }); }} className="p-2 text-stone-400 hover:text-emerald-600"><Edit size={18} /></button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-stone-300 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
              <div className="col-span-2">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Age</span> 
                {cat.age || (cat.birth_date ? calculateAge(cat.birth_date) : "-")} {cat.birth_date && `(Né(e) le ${formatDateSafe(cat.birth_date)})`}
              </div>
              <div><span className="text-stone-400 block text-[10px] uppercase font-bold">Race</span> {cat.breed || "-"}</div>
              <div><span className="text-stone-400 block text-[10px] uppercase font-bold">Couleur</span> {cat.color || "-"}</div>
              <div className="col-span-2"><span className="text-stone-400 block text-[10px] uppercase font-bold">Puce</span> {cat.chip_number || "-"}</div>
              
              <div className="col-span-2 pt-2 border-t border-stone-100">
                <span className="text-stone-400 block text-[10px] uppercase font-bold mb-1">Santé</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div><span className="text-stone-500">Vaccins TC:</span> {formatDateSafe(cat.vaccine_tc_date)}</div>
                  <div><span className="text-stone-500">Leucose L:</span> {formatDateSafe(cat.vaccine_l_date)}</div>
                  <div className="col-span-2"><span className="text-stone-500">Parasitaire:</span> {formatDateSafe(cat.parasite_treatment_date)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ settings, onUpdate, showToast, askConfirm }: { settings: Settings, onUpdate: () => void, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [restoring, setRestoring] = useState(false);
  const [restoreLogs, setRestoreLogs] = useState<string[]>([]);
  const [totalBoxes, setTotalBoxes] = useState(settings.total_boxes || "3");
  const [generalConditions, setGeneralConditions] = useState(settings.general_conditions || "");
  const [companyInfo, setCompanyInfo] = useState({
    company_name: settings.company_name || "",
    company_owner: settings.company_owner || "",
    company_address: settings.company_address || "",
    company_phone: settings.company_phone || "",
    company_email: settings.company_email || "",
    company_siret: settings.company_siret || "",
    company_acaced: settings.company_acaced || ""
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const paymentMethods = settings.payment_methods || ["CB", "Chèque", "Espèces", "Virement"];
  const [tempStatuses, setTempStatuses] = useState<Record<string, InvoiceStatusConfig>>(settings.invoice_statuses || DEFAULT_INVOICE_STATUS_LABELS);

  useEffect(() => {
    setGeneralConditions(settings.general_conditions || "");
    setTotalBoxes(settings.total_boxes || "3");
    setTempStatuses(settings.invoice_statuses || DEFAULT_INVOICE_STATUS_LABELS);
    setCompanyInfo({
      company_name: settings.company_name || "",
      company_owner: settings.company_owner || "",
      company_address: settings.company_address || "",
      company_phone: settings.company_phone || "",
      company_email: settings.company_email || "",
      company_siret: settings.company_siret || "",
      company_acaced: settings.company_acaced || ""
    });
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      showToast("Téléchargement du logo en cours...", "success");
      const formData = new FormData();
      formData.append("logo", e.target.files[0]);
      const res = await fetch("/api/settings", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erreur lors de l'upload");
      onUpdate();
      showToast("Logo mis à jour avec succès !", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      e.target.value = ""; // Reset input
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      const res = await fetch(`/api/settings?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'enregistrement");
      }
      onUpdate();
      showToast("Paramètre enregistré avec succès !", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      for (const [key, value] of Object.entries(companyInfo)) {
        const res = await fetch(`/api/settings?t=${Date.now()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Erreur lors de l'enregistrement de ${key}`);
        }
      }
      onUpdate();
      showToast("Informations de l'entreprise enregistrées", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleBackup = async (full: boolean) => {
    const res = await fetch(`/api/backup?full=${full}`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chathotel_backup_${full ? 'full' : 'data'}_${format(new Date(), "yyyyMMdd")}.json`;
    a.click();
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    askConfirm(
      "Restaurer les données ?", 
      "Attention: Cela va écraser TOUTES les données actuelles de la base de données. Cette action est irréversible. Voulez-vous continuer ?",
      () => {
        setRestoring(true);
        setRestoreLogs(["Lecture du fichier..."]);
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const text = event.target?.result as string;
            if (!text) throw new Error("Fichier vide");
            const data = JSON.parse(text);
            setRestoreLogs(prev => [...prev, "Fichier parsé, envoi au serveur..."]);
            
            const res = await fetch("/api/restore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data)
            });
            
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`Erreur serveur (${res.status}): ${text.substring(0, 100)}`);
            }
            
            const result = await res.json();
            if (result.logs) setRestoreLogs(result.logs);
            onUpdate();
            showToast("Restauration terminée avec succès !");
          } catch (err: any) {
            setRestoreLogs(prev => [...prev, `ERREUR: ${err.message}`]);
            showToast("Erreur lors de la restauration: " + err.message, "error");
          } finally {
            setRestoring(false);
            e.target.value = ""; // Reset input
          }
        };
        reader.readAsText(file);
      },
      true
    );
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold">Configuration</h2>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><SettingsIcon size={20} className="text-emerald-600" /> Informations de l'entreprise</h3>
          <div className="flex items-center gap-4">
            {settings.logo && (
              <img src={settings.logo} alt="Logo" className="h-12 w-auto object-contain rounded border border-stone-100" referrerPolicy="no-referrer" />
            )}
            <div className="relative overflow-hidden group">
              <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs group-hover:bg-emerald-700 transition-colors flex items-center justify-center">
                Changer le logo
              </div>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                style={{ fontSize: '100px' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    showToast("Fichier sélectionné : " + e.target.files[0].name, "success");
                    handleLogoUpload(e);
                  }
                }} 
                accept="image/*" 
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Nom de l'entreprise</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={companyInfo.company_name}
              onChange={e => setCompanyInfo({...companyInfo, company_name: e.target.value})}
              placeholder="Ex: La Pension du Chemin Vert"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Nom et prénom du gérant</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={companyInfo.company_owner}
              onChange={e => setCompanyInfo({...companyInfo, company_owner: e.target.value})}
              placeholder="Ex: Jean Dupont"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-stone-500 uppercase">Adresse complète</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={companyInfo.company_address}
              onChange={e => setCompanyInfo({...companyInfo, company_address: e.target.value})}
              placeholder="Ex: 123 Rue des Chats, 75000 Paris"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Numéro de téléphone</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={companyInfo.company_phone}
              onChange={e => setCompanyInfo({...companyInfo, company_phone: e.target.value})}
              placeholder="Ex: 01 23 45 67 89"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Email</label>
            <input 
              type="email" 
              className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={companyInfo.company_email}
              onChange={e => setCompanyInfo({...companyInfo, company_email: e.target.value})}
              placeholder="Ex: contact@pension.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Numéro SIRET</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={companyInfo.company_siret}
              onChange={e => setCompanyInfo({...companyInfo, company_siret: e.target.value})}
              placeholder="Ex: 123 456 789 00012"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Numéro ACACED</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={companyInfo.company_acaced}
              onChange={e => setCompanyInfo({...companyInfo, company_acaced: e.target.value})}
              placeholder="Ex: 2021/1234-5678"
            />
          </div>
        </div>
        <button 
          onClick={handleSaveCompanyInfo}
          className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-bold mt-2"
        >
          Enregistrer les informations
        </button>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><SettingsIcon size={20} className="text-emerald-600" /> Paramètres de la pension</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Nombre total de box</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="w-24 p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={totalBoxes || ""}
                onChange={e => setTotalBoxes(e.target.value)}
              />
              <button 
                onClick={() => handleSaveSetting("total_boxes", totalBoxes)}
                className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
              >
                Enregistrer
              </button>
            </div>
            <p className="text-xs text-stone-400">Définit le nombre de box disponibles dans les menus déroulants et les statistiques.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 uppercase">Conditions Générales (Contrat)</label>
            <div className="flex flex-col gap-2">
              <textarea 
                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-y"
                value={generalConditions}
                onChange={e => setGeneralConditions(e.target.value)}
                placeholder="Saisissez ici les conditions générales qui apparaîtront sur les contrats..."
              />
              <button 
                onClick={() => handleSaveSetting("general_conditions", generalConditions)}
                className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-bold self-start"
              >
                Enregistrer les conditions
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><CreditCard size={20} className="text-emerald-600" /> Modes de Paiement</h3>
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map(m => (
            <div key={m} className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
              <span className="text-sm font-medium text-stone-600">{m}</span>
              <button 
                onClick={() => {
                  const updated = paymentMethods.filter(p => p !== m);
                  handleSaveSetting("payment_methods", JSON.stringify(updated));
                }}
                className="text-stone-300 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input 
            placeholder="Ajouter un mode (ex: PayPal)" 
            className="flex-1 p-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
            value={newPaymentMethod}
            onChange={e => setNewPaymentMethod(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newPaymentMethod.trim()) {
                const updated = [...paymentMethods, newPaymentMethod.trim()];
                handleSaveSetting("payment_methods", JSON.stringify(updated));
                setNewPaymentMethod("");
              }
            }}
          />
          <button 
            onClick={() => {
              if (newPaymentMethod.trim()) {
                const updated = [...paymentMethods, newPaymentMethod.trim()];
                handleSaveSetting("payment_methods", JSON.stringify(updated));
                setNewPaymentMethod("");
              }
            }}
            className="bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            Ajouter
          </button>
        </div>
        <p className="text-xs text-stone-400 italic">Ces modes apparaîtront lors de la création d'une facture.</p>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-600" /> Libellés des Statuts</h3>
          <button 
            onClick={() => handleSaveSetting("invoice_statuses", JSON.stringify(tempStatuses))}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
          >
            Enregistrer les libellés
          </button>
        </div>
        <p className="text-xs text-stone-400">Personnalisez les noms des statuts de vos factures.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {Object.entries(tempStatuses).map(([key, config]: [string, any]) => (
            <div key={key} className="flex flex-col gap-1 p-3 bg-stone-50 rounded-xl border border-stone-100">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Clé : {key}</label>
              <input 
                type="text" 
                className={`w-full p-2 border border-stone-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none ${config.color}`}
                value={config.label}
                onChange={(e) => {
                  setTempStatuses({
                    ...tempStatuses,
                    [key]: { ...config, label: e.target.value }
                  });
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
        <h3 className="font-bold flex items-center gap-2"><Save size={20} className="text-emerald-600" /> Sauvegarde & Restauration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h4 className="font-bold text-sm">Exporter les données</h4>
            <p className="text-xs text-stone-500">Sauvegardez vos clients, chats, séjours et factures.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleBackup(false)} className="w-full bg-white border border-stone-200 text-stone-700 py-2 rounded-lg text-xs font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2">
                <Download size={14} /> Données uniquement (JSON)
              </button>
              <button onClick={() => handleBackup(true)} className="w-full bg-white border border-stone-200 text-stone-700 py-2 rounded-lg text-xs font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2">
                <Camera size={14} /> Sauvegarde complète (avec médias)
              </button>
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h4 className="font-bold text-sm">Importer / Restaurer</h4>
            <p className="text-xs text-stone-500">Réintégrez une sauvegarde précédente. Attention: écrase tout !</p>
            <div className={`relative overflow-hidden w-full flex items-center justify-center gap-2 bg-stone-800 text-white py-2 rounded-lg text-xs font-bold transition-colors ${restoring ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-900 cursor-pointer'}`}>
              <Upload size={14} /> {restoring ? 'Restauration...' : 'Sélectionner un fichier'}
              {!restoring && (
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  style={{ fontSize: '100px' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      showToast("Fichier de sauvegarde sélectionné", "success");
                      handleRestore(e);
                    }
                  }} 
                  accept=".json" 
                />
              )}
            </div>
          </div>
        </div>

        {restoring && (
          <div className="p-4 bg-stone-900 rounded-xl font-mono text-[10px] text-emerald-400 space-y-1 max-h-40 overflow-y-auto">
            {restoreLogs.map((log, i) => <div key={i}>{`> ${log}`}</div>)}
            <div className="animate-pulse">_</div>
          </div>
        )}
        {!restoring && restoreLogs.length > 0 && (
          <div className="p-4 bg-stone-100 rounded-xl font-mono text-[10px] text-stone-600 space-y-1 max-h-40 overflow-y-auto">
             <div className="flex justify-between items-center mb-2 border-b border-stone-200 pb-1">
               <span className="font-bold uppercase">Derniers logs d'import</span>
               <button onClick={() => setRestoreLogs([])} className="hover:text-red-500">Effacer</button>
             </div>
             {restoreLogs.map((log, i) => <div key={i}>{`> ${log}`}</div>)}
          </div>
        )}
      </section>

      <section className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-2">
        <h3 className="font-bold text-red-700 flex items-center gap-2"><AlertCircle size={20} /> Zone de danger</h3>
        <p className="text-sm text-red-600">La suppression des données est irréversible. Assurez-vous d'avoir une sauvegarde.</p>
      </section>
    </div>
  );
}

function CalendarView({ stays, onUpdate, settings, showToast, askConfirm }: { stays: Stay[], onUpdate: () => void, settings: Settings, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null);
  const [viewMode, setViewMode] = useState<"global" | "boxes">("global");
  const [boxesTimeRange, setBoxesTimeRange] = useState<"month" | "quarter" | "year">("month");

  const totalBoxes = parseInt(settings.total_boxes || "3");
  const boxOptions = Array.from({ length: totalBoxes }, (_, i) => i + 1);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  let daysToRender: Date[] = [];
  let displayLabel = format(currentDate, "MMMM yyyy");
  
  if (viewMode === "boxes") {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    
    if (boxesTimeRange === "month") {
      const dim = new Date(y, m + 1, 0).getDate();
      for (let i = 1; i <= dim; i++) daysToRender.push(new Date(y, m, i));
      displayLabel = format(currentDate, "MMMM yyyy");
    } else if (boxesTimeRange === "quarter") {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      for (let i = 0; i < 3; i++) {
        const d = new Date(y, quarterStartMonth + i + 1, 0).getDate();
        for (let j = 1; j <= d; j++) daysToRender.push(new Date(y, quarterStartMonth + i, j));
      }
      displayLabel = `Trimestre ${Math.floor(m / 3) + 1} ${y}`;
    } else if (boxesTimeRange === "year") {
      for (let month = 0; month < 12; month++) {
        const d = new Date(y, month + 1, 0).getDate();
        for (let j = 1; j <= d; j++) daysToRender.push(new Date(y, month, j));
      }
      displayLabel = `Année ${y}`;
    }
  }

  const getStaysForDay = (day: number) => {
    const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), "yyyy-MM-dd");
    return stays.filter(s => s.arrival_date <= dateStr && (s.actual_departure || s.planned_departure) >= dateStr);
  };

  const getStaysForBoxAndDate = (box: number, d: Date) => {
    const dateStr = format(d, "yyyy-MM-dd");
    return stays.filter(s => s.box_number === box && s.arrival_date <= dateStr && (s.actual_departure || s.planned_departure) >= dateStr);
  };

  const getBoxStyle = (boxNumber: number) => {
    const styles = [
      'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
      'bg-blue-100 text-blue-700 hover:bg-blue-200',
      'bg-amber-100 text-amber-700 hover:bg-amber-200',
      'bg-purple-100 text-purple-700 hover:bg-purple-200',
      'bg-rose-100 text-rose-700 hover:bg-rose-200',
      'bg-sky-100 text-sky-700 hover:bg-sky-200',
      'bg-orange-100 text-orange-700 hover:bg-orange-200',
      'bg-violet-100 text-violet-700 hover:bg-violet-200',
    ];
    return styles[(boxNumber - 1) % styles.length];
  };

  const getBoxSolidColor = (boxNumber: number) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500',
      'bg-rose-500', 'bg-sky-500', 'bg-orange-500', 'bg-violet-500',
    ];
    return colors[(boxNumber - 1) % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Calendrier des Séjours</h2>
          <div className="flex bg-stone-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode("global")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "global" ? "bg-white text-emerald-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              Vue Globale
            </button>
            <button 
              onClick={() => setViewMode("boxes")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "boxes" ? "bg-white text-emerald-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              Par Box
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - (viewMode === "boxes" && boxesTimeRange === "quarter" ? 3 : viewMode === "boxes" && boxesTimeRange === "year" ? 12 : 1)))} className="p-2 hover:bg-stone-100 rounded-lg"><ChevronLeft /></button>
          <span className="font-bold text-lg min-w-[150px] text-center uppercase tracking-widest">{displayLabel}</span>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (viewMode === "boxes" && boxesTimeRange === "quarter" ? 3 : viewMode === "boxes" && boxesTimeRange === "year" ? 12 : 1)))} className="p-2 hover:bg-stone-100 rounded-lg"><ChevronRight /></button>
        </div>
      </div>
      
      {viewMode === "boxes" && (
        <div className="flex gap-2">
          {["month", "quarter", "year"].map((r) => (
             <button
               key={r}
               onClick={() => setBoxesTimeRange(r as any)}
               className={`px-3 py-1 text-xs font-bold rounded-lg ${boxesTimeRange === r ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
             >
               {r === "month" ? "Mois" : r === "quarter" ? "Trimestre" : "Année"}
             </button>
          ))}
        </div>
      )}

      {viewMode === "global" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-200">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="p-3 text-center text-xs font-bold text-stone-400 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => (
              <div key={i} className={`min-h-[120px] p-2 border-r border-b border-stone-100 last:border-r-0 ${day === null ? 'bg-stone-50/50' : ''}`}>
                {day && (
                  <>
                    <span className="text-sm font-bold text-stone-400">{day}</span>
                    <div className="mt-2 space-y-1">
                      {getStaysForDay(day).map(stay => (
                        <button 
                          key={stay.id} 
                          onClick={() => setSelectedStay(stay)}
                          className={`w-full text-left text-[10px] p-1 rounded font-bold truncate transition-colors ${getBoxStyle(stay.box_number)}`}
                        >
                          {stay.cat_name} (Box {stay.box_number})
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(1200, daysToRender.length * 30 + 100)}px` }}>
            <div className="bg-stone-50 border-b border-stone-200" style={{ display: 'grid', gridTemplateColumns: `100px repeat(${daysToRender.length}, minmax(30px, 1fr))`}}>
              <div className="p-3 text-xs font-bold text-stone-400 uppercase border-r border-stone-200 sticky left-0 bg-stone-50">Box</div>
              {daysToRender.map((d, i) => (
                <div key={i} className="p-2 text-center border-r border-stone-100 last:border-r-0 flex flex-col items-center justify-center">
                  <span className="text-[8px] uppercase text-stone-400">{format(d, "MMM")}</span>
                  <span className="text-[10px] font-bold text-stone-600">{format(d, "dd")}</span>
                </div>
              ))}
            </div>
            {boxOptions.map(box => (
              <div key={box} className="border-b border-stone-100 last:border-b-0" style={{ display: 'grid', gridTemplateColumns: `100px repeat(${daysToRender.length}, minmax(30px, 1fr))`}}>
                <div className="p-3 text-sm font-bold text-stone-600 bg-stone-50/90 border-r border-stone-200 sticky left-0 z-10 flex items-center">Box {box}</div>
                {daysToRender.map((d, i) => {
                  const dayStays = getStaysForBoxAndDate(box, d);
                  return (
                    <div key={i} className={`p-0.5 border-r border-stone-50 last:border-r-0 min-h-[40px] flex flex-col gap-0.5 ${[0, 6].includes(d.getDay()) ? 'bg-stone-50/50' : ''}`}>
                      {dayStays.map(stay => (
                        <button 
                          key={stay.id}
                          onClick={() => setSelectedStay(stay)}
                          className={`w-full h-full rounded text-[8px] p-0.5 font-bold truncate ${stay.is_archived ? 'bg-stone-200 text-stone-500' : `${getBoxSolidColor(stay.box_number)} text-white`}`}
                          title={`${stay.cat_name} (${stay.arrival_date} - ${stay.actual_departure || stay.planned_departure})`}
                        >
                          {stay.cat_name.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedStay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button onClick={() => setSelectedStay(null)} className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full"><X /></button>
            <h3 className="text-xl font-bold mb-6">Édition du Séjour #{selectedStay.id}</h3>
            <StayDetailsSection stay={selectedStay} onUpdate={() => { onUpdate(); setSelectedStay(null); }} settings={settings} stays={stays} showToast={showToast} askConfirm={askConfirm} />
            <div className="mt-8 pt-8 border-t border-stone-100">
               <HealthSection stay={selectedStay} onUpdate={onUpdate} showToast={showToast} askConfirm={askConfirm} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsView({ stats, onNavigateToInvoices }: { stats: any, onNavigateToInvoices: (month: string) => void }) {
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor((new Date().getMonth() + 3) / 3));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  if (!stats) return <div className="p-8 text-center text-stone-500">Chargement des statistiques...</div>;

  let displayRevenue = 0;
  let displayOccupancy = 0;
  let label = "";

  if (timeRange === "month") {
    displayRevenue = stats.revenue.find((r: any) => r.month === selectedMonth)?.total || 0;
    displayOccupancy = stats.occupancy.find((o: any) => o.month === selectedMonth)?.stays_count || 0;
    label = selectedMonth;
  } else if (timeRange === "quarter") {
    displayRevenue = stats.revenue.filter((r: any) => {
      const m = parseInt(r.month.split("-")[1]);
      const q = Math.floor((m + 2) / 3);
      return r.month.startsWith(selectedYear.toString()) && q === selectedQuarter;
    }).reduce((acc: number, curr: any) => acc + curr.total, 0);
    displayOccupancy = stats.occupancy.filter((o: any) => {
      const m = parseInt(o.month.split("-")[1]);
      const q = Math.floor((m + 2) / 3);
      return o.month.startsWith(selectedYear.toString()) && q === selectedQuarter;
    }).reduce((acc: number, curr: any) => acc + curr.stays_count, 0);
    label = `Trimestre ${selectedQuarter} ${selectedYear}`;
  } else {
    displayRevenue = stats.revenue.filter((r: any) => r.month.startsWith(selectedYear.toString())).reduce((acc: number, curr: any) => acc + curr.total, 0);
    displayOccupancy = stats.occupancy.filter((o: any) => o.month.startsWith(selectedYear.toString())).reduce((acc: number, curr: any) => acc + curr.stays_count, 0);
    label = `Année ${selectedYear}`;
  }

  const occupancyRate = Math.min(100, Math.round((displayOccupancy / (stats.totalBoxes * (timeRange === "month" ? 30 : timeRange === "quarter" ? 90 : 365))) * 100));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Statistiques & Rapports</h2>
        <div className="flex items-center gap-4">
          <div className="flex bg-stone-100 p-1 rounded-xl">
            {(["month", "quarter", "year"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  timeRange === range ? "bg-white text-emerald-600 shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {range === "month" ? "Mois" : range === "quarter" ? "Trimestre" : "Année"}
              </button>
            ))}
          </div>

          {timeRange === "month" && (
            <input 
              type="month" 
              className="p-2 border border-stone-200 rounded-lg text-sm"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          )}

          {timeRange === "quarter" && (
            <div className="flex gap-2">
              <select 
                className="p-2 border border-stone-200 rounded-lg text-sm"
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Trimestre {q}</option>)}
              </select>
              <input 
                type="number" 
                className="p-2 border border-stone-200 rounded-lg text-sm w-24"
                value={isNaN(selectedYear) ? "" : selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
              />
            </div>
          )}

          {timeRange === "year" && (
            <input 
              type="number" 
              className="p-2 border border-stone-200 rounded-lg text-sm w-24"
              value={isNaN(selectedYear) ? "" : selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Taux de remplissage ({label})</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-emerald-600">{occupancyRate}%</span>
            <span className="text-sm text-stone-400 mb-1">estimé</span>
          </div>
          <div className="mt-4 w-full bg-stone-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Chiffre d'Affaires ({label})</p>
          <span className="text-3xl font-bold text-stone-900">{displayRevenue} €</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs font-bold text-stone-400 uppercase mb-1">Jours Occupés ({label})</p>
          <span className="text-3xl font-bold text-blue-600">{displayOccupancy}</span>
        </div>
      </div>
      
      {/* ... rest of StatsView (Revenue History) ... */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="font-bold mb-6 flex items-center gap-2"><FileText size={18} /> Historique du CA</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {stats.revenue.map((r: any) => (
              <button 
                key={r.month} 
                onClick={() => onNavigateToInvoices(r.month)}
                className="w-full flex justify-between items-center p-3 bg-stone-50 hover:bg-emerald-50 hover:ring-1 hover:ring-emerald-200 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-600 group-hover:text-emerald-700">{r.month}</span>
                  <ExternalLink size={12} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="font-bold text-emerald-600">{r.total.toFixed(2)} €</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="font-bold mb-6 flex items-center gap-2"><Calendar size={18} /> Activité par mois</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {stats.occupancy.map((o: any) => (
              <button 
                key={o.month} 
                onClick={() => onNavigateToInvoices(o.month)}
                className="w-full flex justify-between items-center p-3 bg-stone-50 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-600 group-hover:text-blue-700">{o.month}</span>
                  <ExternalLink size={12} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="font-bold text-blue-600">{o.stays_count} jours occupés</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ stays, onUpdate, settings, showToast, askConfirm }: { stays: Stay[], onUpdate: () => void, settings: Settings, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [reportTab, setReportTab] = useState<"register" | "health">("register");
  const [filterDate, setFilterDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStayForEdit, setSelectedStayForEdit] = useState<Stay | null>(null);
  const [healthReports, setHealthReports] = useState<any[]>([]);

  const handleDelete = (id: string) => {
    askConfirm(
      "Supprimer le séjour ?", 
      "ATTENTION: Cette action est irréversible. Supprimer définitivement ce séjour et toutes ses données associées (santé, factures, médias) ?",
      async () => {
        try {
          const res = await fetch(`/api/stays/${id}`, { method: "DELETE" });
          const result = await res.json();
          
          if (!res.ok) {
            throw new Error(result.error || "Erreur lors de la suppression");
          }
          
          showToast("Séjour supprimé avec succès !");
          await onUpdate();
        } catch (err: any) {
          console.error("Delete error:", err);
          showToast("ERREUR: " + err.message, "error");
        }
      },
      true
    );
  };

  useEffect(() => {
    if (reportTab === "health") {
      fetch(`/api/health-reports?all=true`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHealthReports(data);
          else setHealthReports([]);
        })
        .catch(() => setHealthReports([]));
    }
  }, [reportTab, stays]);

  const filtered = stays.filter(s => {
    const matchesDate = (reportTab === "register" && filterDate) ? s.arrival_date.startsWith(filterDate) : true;
    const matchesSearch = s.cat_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const filteredHealth = healthReports.filter(h => {
    const matchesSearch = h.cat_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         h.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const generateRegisterPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Registre des Entrées et Sorties", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Édité le: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 30);
    doc.text(`Période: ${filterDate || "Toutes"}`, 14, 35);

    const tableData = filtered.map(s => [
      `#${s.id}`,
      `${s.cat_name}\n(${s.cat_breed || ""})`,
      s.owner_name,
      s.arrival_date,
      s.actual_departure || s.planned_departure,
      `Box ${s.box_number}`,
      s.comments || ""
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["ID", "Animal", "Propriétaire", "Arrivée", "Départ", "Box", "Commentaire"]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 }
    });

    doc.save(`registre_${filterDate || "global"}.pdf`);
  };

  const generateHealthReportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Suivi de Santé Global", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Édité le: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 30);

    const tableData = filteredHealth.map(h => [
      `#${h.stay_id}`,
      h.cat_name,
      h.owner_name,
      h.ate_well ? "OUI" : "NON",
      h.abnormal_behavior ? "OUI" : "NON",
      h.medication || "-",
      h.incident || "-",
      h.health_comments || "-"
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["ID", "Animal", "Propriétaire", "Appétit", "Comportement", "Médicament", "Incident", "Commentaire"]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 8 }
    });

    doc.save(`suivi_sante_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-2xl font-bold">Rapports & Registres</h2>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <button 
            onClick={reportTab === "register" ? generateRegisterPDF : generateHealthReportPDF}
            className="flex-1 sm:flex-initial bg-stone-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-stone-900 transition-colors text-sm font-bold"
          >
            <FileText size={18} /> Imprimer
          </button>
          {reportTab === "register" && (
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <input 
                type="month" 
                className="w-full p-2 border border-stone-200 rounded-lg text-sm" 
                value={filterDate} 
                onChange={e => setFilterDate(e.target.value)} 
              />
            </div>
          )}
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="flex-1 sm:flex-initial p-2 border border-stone-200 rounded-lg text-sm min-w-0" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row border-b border-stone-200">
        <button 
          onClick={() => setReportTab("register")}
          className={`flex-1 px-6 py-3 font-bold text-sm transition-colors border-b-2 ${reportTab === "register" ? "border-emerald-500 text-emerald-600" : "border-transparent text-stone-400 hover:text-stone-600"}`}
        >
          Registre Entrées/Sorties
        </button>
        <button 
          onClick={() => setReportTab("health")}
          className={`flex-1 px-6 py-3 font-bold text-sm transition-colors border-b-2 ${reportTab === "health" ? "border-emerald-500 text-emerald-600" : "border-transparent text-stone-400 hover:text-stone-600"}`}
        >
          Suivi de Santé Global
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">ID</th>
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">Animal (Race, Couleur, Puce)</th>
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">Propriétaire</th>
              {reportTab === "register" ? (
                <>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Arrivée</th>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Départ Réel/Prévu</th>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Box</th>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Commentaire</th>
                </>
              ) : (
                <>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Bien mangé ?</th>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Comportement anormal ?</th>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Médicament</th>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Incident Toilettage</th>
                  <th className="p-4 text-xs font-bold text-stone-400 uppercase">Commentaire Santé</th>
                </>
              )}
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportTab === "register" ? filtered.map(stay => (
              <tr key={stay.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="p-4 text-sm font-bold text-stone-400">#{stay.id}</td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-stone-900">{stay.cat_name}</span>
                    <span className="text-[10px] text-stone-500">
                      {stay.cat_breed || "N/A"}, {stay.cat_color || "N/A"}, Puce: {stay.cat_chip_number || "N/A"}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-sm text-stone-600">{stay.owner_name}</td>
                <td className="p-4 text-sm text-stone-600">{stay.arrival_date}</td>
                <td className="p-4 text-sm text-stone-600">{stay.actual_departure || stay.planned_departure}</td>
                <td className="p-4 text-sm font-bold text-emerald-600">Box {stay.box_number}</td>
                <td className="p-4 text-sm text-stone-500 italic max-w-xs truncate">{stay.comments || "-"}</td>
                <td className="p-4 flex gap-3">
                  <button onClick={() => setSelectedStayForEdit(stay)} className="text-emerald-600 hover:text-emerald-800 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-lg transition-colors">Éditer</button>
                  <button onClick={() => handleDelete(stay.id)} className="text-red-400 hover:text-red-600 transition-colors bg-red-50 p-1.5 rounded-lg"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : filteredHealth.map(report => (
              <tr key={report.stay_id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="p-4 text-sm font-bold text-stone-400">#{report.stay_id}</td>
                <td className="p-4">
                  <span className="font-bold text-stone-900">{report.cat_name}</span>
                </td>
                <td className="p-4 text-sm text-stone-600">{report.owner_name}</td>
                <td className="p-4 text-sm">
                  {report.date ? (report.ate_well ? "✅ Oui" : "❌ Non") : "-"}
                </td>
                <td className="p-4 text-sm">
                  {report.date ? (report.abnormal_behavior ? "⚠️ Oui" : "✅ Non") : "-"}
                </td>
                <td className="p-4 text-sm text-stone-600">{report.medication || "-"}</td>
                <td className="p-4 text-sm text-stone-600">{report.incident || "-"}</td>
                <td className="p-4 text-sm text-stone-500 italic max-w-xs truncate">{report.health_comments || "-"}</td>
                <td className="p-4 flex gap-3">
                  <button onClick={() => setSelectedStayForEdit(stays.find(s => s.id === report.stay_id) || null)} className="text-emerald-600 hover:text-emerald-800 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-lg transition-colors">Éditer</button>
                  <button onClick={() => handleDelete(report.stay_id)} className="text-red-400 hover:text-red-600 transition-colors bg-red-50 p-1.5 rounded-lg"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && reportTab === "register" && (
          <div className="p-12 text-center text-stone-400">Aucun résultat pour cette période.</div>
        )}
      </div>

      {selectedStayForEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button onClick={() => setSelectedStayForEdit(null)} className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full"><X /></button>
            <h3 className="text-xl font-bold mb-6">Édition du Séjour #{selectedStayForEdit.id}</h3>
            <StayDetailsSection stay={selectedStayForEdit} onUpdate={() => { onUpdate(); setSelectedStayForEdit(null); }} settings={settings} stays={stays} showToast={showToast} askConfirm={askConfirm} />
            <div className="mt-8 pt-8 border-t border-stone-100 grid grid-cols-1 gap-8">
               <HealthSection stay={selectedStayForEdit} onUpdate={onUpdate} showToast={showToast} askConfirm={askConfirm} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthSummary({ stayId }: { stayId: number }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  useEffect(() => {
    fetch(`/api/health-logs/${stayId}`).then(res => res.json()).then(setLogs);
  }, [stayId]);

  if (logs.length === 0) return <span className="text-xs text-stone-400 italic">Aucun suivi</span>;

  const lastLog = logs[0];
  return (
    <div className="flex gap-1">
      {lastLog.ate_well ? <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-bold uppercase">OK</span> : <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold uppercase">APPÉTIT</span>}
      {lastLog.abnormal_behavior && <span className="text-[9px] bg-orange-100 text-orange-700 px-1 py-0.5 rounded font-bold uppercase">COMPORTEMENT</span>}
    </div>
  );
}

function ContractsView({ stays, settings, onUpdate, showToast, askConfirm }: { stays: Stay[], settings: Settings, onUpdate: () => void, showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const filteredStays = stays.filter(s => 
    s.cat_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadScan = async (stay: Stay, file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return showToast("Le fichier doit être une image ou un PDF.", "error");
    }
    
    setUploadingId(stay.id);
    
    try {
      let base64 = "";
      if (file.type.startsWith('image/')) {
         // Compress image to save database space
         base64 = await new Promise<string>((resolve, reject) => {
           const reader = new FileReader();
           reader.onload = (e) => {
             const img = new Image();
             img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1600;
                let width = img.width;
                let height = img.height;
                if (width > height && width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                } else if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
             };
             img.onerror = () => reject(new Error("Erreur de compression d'image"));
             img.src = e.target?.result as string;
           };
           reader.readAsDataURL(file);
         });
      } else {
         if (file.size > 1000000) { // 1MB max for PDF
             setUploadingId(null);
             return showToast("Le PDF est trop lourd (Max 1Mo).", "error");
         }
         base64 = await new Promise<string>((resolve) => {
           const reader = new FileReader();
           reader.onload = (e) => resolve(e.target?.result as string);
           reader.readAsDataURL(file);
         });
      }

      const res = await fetch(`/api/stays/${stay.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stay, contract_scan_url: base64 })
      });
      if (!res.ok) throw new Error("Erreur de sauvegarde.");
      showToast("Contrat scanné ajouté avec succès !");
      onUpdate();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setUploadingId(null);
    }
  };

  const generateContractPDF = (stay: Stay) => {
    const doc = new jsPDF();
    
    // Logo
    if (settings.logo) {
      try {
        const formatMatch = settings.logo.match(/data:image\/([a-zA-Z]*);base64,/);
        const imageFormat = formatMatch ? formatMatch[1].toUpperCase() : "JPEG";
        doc.addImage(settings.logo, imageFormat, 14, 10, 30, 30);
      } catch (e) {
        console.error("Error adding logo to PDF:", e);
      }
    }

    doc.setFontSize(20);
    doc.text("Contrat de Pension", 105, 25, { align: "center" });

    // Company Info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    
    let yPos = 45;
    const companyName = settings.company_name || "LA PENSION DU CHEMIN VERT";
    const nameLines = doc.splitTextToSize(companyName, 120);
    doc.text(nameLines, 14, yPos);
    yPos += (nameLines.length * 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (settings.company_owner) { doc.text(settings.company_owner, 14, yPos); yPos += 4; }
    if (settings.company_address) { 
      const addrLines = doc.splitTextToSize(settings.company_address, 120);
      doc.text(addrLines, 14, yPos);
      yPos += (addrLines.length * 4);
    }
    if (settings.company_phone) { doc.text(settings.company_phone, 14, yPos); yPos += 4; }
    if (settings.company_email) { doc.text(settings.company_email, 14, yPos); yPos += 4; }
    if (settings.company_siret) { doc.text(`SIRET : ${settings.company_siret}`, 14, yPos); yPos += 4; }
    if (settings.company_acaced) { doc.text(`ACACED : ${settings.company_acaced}`, 14, yPos); yPos += 4; }

    const clientInfoY = Math.max(95, yPos + 25);
    let currentY = clientInfoY;

    doc.setFontSize(12);
    doc.text(`Date d'édition: ${format(new Date(), "dd/MM/yyyy")}`, 140, 45);
    
    // Client & Animal Info (Side by Side)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Informations du Client", 14, currentY - 10);
    doc.text("Informations de l'Animal", 105, currentY - 10);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Left Column: Client
    doc.text(`Nom: ${stay.owner_name || "N/A"}`, 14, currentY);
    let leftY = currentY + 7;
    if (stay.owner_address) {
      const addrLines = doc.splitTextToSize(`Adresse: ${stay.owner_address}`, 80);
      doc.text(addrLines, 14, leftY);
      leftY += (addrLines.length * 5);
    }
    if (stay.owner_phone) {
      const phoneLines = doc.splitTextToSize(`Téléphone: ${stay.owner_phone}`, 80);
      doc.text(phoneLines, 14, leftY);
      leftY += (phoneLines.length * 5);
    }
    if (stay.owner_email) {
      doc.text(`Email: ${stay.owner_email}`, 14, leftY);
      leftY += 7;
    }

    // Right Column: Animal
    doc.text(`Nom: ${stay.cat_name || "N/A"}`, 105, currentY);
    let rightY = currentY + 7;
    doc.text(`Age: ${stay.cat_age || (stay.cat_birth_date ? calculateAge(stay.cat_birth_date) : "N/A")}`, 105, rightY); rightY += 7;
    doc.text(`Race: ${stay.cat_breed || "N/A"}`, 105, rightY); rightY += 7;
    doc.text(`Couleur: ${stay.cat_color || "N/A"}`, 105, rightY); rightY += 7;
    doc.text(`N° Puce: ${stay.cat_chip_number || "N/A"}`, 105, rightY); rightY += 7;
    
    // Health Info (Right Column)
    doc.setFont("helvetica", "bold");
    doc.text("Santé de l'animal:", 105, rightY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    rightY += 10;
    doc.text(`Vaccins (TC): ${formatDateSafe(stay.cat_vaccine_tc_date, "___/___/_____")}`, 105, rightY); rightY += 5;
    doc.text(`Leucose (L): ${formatDateSafe(stay.cat_vaccine_l_date, "___/___/_____")}`, 105, rightY); rightY += 5;
    doc.text(`Parasitaire: ${formatDateSafe(stay.cat_parasite_treatment_date, "___/___/_____")}`, 105, rightY); rightY += 5;

    // Stay Details (Below Client Info)
    currentY = Math.max(leftY, rightY) + 15;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Détails du Séjour", 14, currentY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    currentY += 10;
    doc.text(`Date d'arrivée: ${format(new Date(stay.arrival_date), "dd/MM/yyyy")}`, 14, currentY); currentY += 7;
    doc.text(`Date de départ prévue: ${format(new Date(stay.planned_departure), "dd/MM/yyyy")}`, 14, currentY); currentY += 7;
    doc.text(`Box attribué: ${stay.box_number}`, 14, currentY); currentY += 7;

    currentY += 10;

    if (settings.general_conditions) {
      doc.setFontSize(14);
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      doc.text("Conditions Générales", 14, currentY);
      currentY += 10;
      doc.setFontSize(8);
      
      const splitText = doc.splitTextToSize(settings.general_conditions, 180);
      for (let i = 0; i < splitText.length; i++) {
        if (currentY > 280) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(splitText[i], 14, currentY);
        currentY += 4;
      }
      currentY += 10;
    }

    // Signatures
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.text("Signatures", 14, currentY);
    doc.setFontSize(10);
    doc.text("Le Client (lu et approuvé)", 14, currentY + 10);
    doc.text(settings.company_name || "La Pension", 120, currentY + 10);

    doc.save(`Contrat_${stay.owner_name}_${stay.cat_name}_${stay.arrival_date}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Contrats</h2>
        <input 
          type="text" 
          placeholder="Rechercher un séjour..." 
          className="p-2 border border-stone-200 rounded-lg text-sm w-full sm:w-64" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">ID</th>
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">Client</th>
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">Animal</th>
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">Dates</th>
              <th className="p-4 text-xs font-bold text-stone-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStays.map(stay => (
              <tr key={stay.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="p-4 text-sm font-bold text-stone-400">#{stay.id}</td>
                <td className="p-4 text-sm text-stone-600">{stay.owner_name}</td>
                <td className="p-4 text-sm text-stone-600">{stay.cat_name}</td>
                <td className="p-4 text-sm text-stone-600">
                  {format(new Date(stay.arrival_date), "dd/MM/yyyy")} au {format(new Date(stay.planned_departure), "dd/MM/yyyy")}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => generateContractPDF(stay)} 
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-bold bg-indigo-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FileText size={16} /> Générer PDF
                    </button>
                    {!stay.contract_scan_url ? (
                      <label className={`cursor-pointer text-emerald-600 hover:text-emerald-800 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-2 ${uploadingId === stay.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={16} /> {uploadingId === stay.id ? "Envoi..." : "Uploader Signé"}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadScan(stay, e.target.files[0]);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-1">
                         <a 
                           href={stay.contract_scan_url} 
                           download={`Contrat_Signe_${stay.owner_name}_${stay.cat_name}.pdf`} 
                           className="text-emerald-700 hover:text-emerald-900 text-sm font-bold border border-emerald-200 bg-emerald-50 px-3 py-1 rounded-l-lg transition-colors flex items-center gap-2"
                         >
                           <FileText size={16} /> Signé
                         </a>
                         <label className="cursor-pointer text-emerald-700 hover:text-emerald-900 text-sm font-bold border border-l-0 border-emerald-200 bg-emerald-50 px-2 py-1 transition-colors flex items-center" title="Remplacer">
                           <Upload size={14} />
                           <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleUploadScan(stay, e.target.files[0]);
                            }}
                           />
                         </label>
                         <button 
                           onClick={() => {
                             askConfirm(
                               "Supprimer le contrat signé ?", 
                               `Êtes-vous sûr de vouloir supprimer le contrat signé pour le séjour de ${stay.cat_name} ?`, 
                               async () => {
                                 try {
                                   const res = await fetch(`/api/stays/${stay.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ ...stay, contract_scan_url: null })
                                   });
                                   if (!res.ok) throw new Error("Erreur");
                                   onUpdate();
                                   showToast("Contrat supprimé");
                                 } catch(e) {
                                   showToast("Erreur de suppression", "error");
                                 }
                               }, 
                               true
                             );
                           }}
                           className="text-red-500 hover:text-red-700 text-sm font-bold border border-l-0 border-red-200 bg-red-50 px-2 py-1 rounded-r-lg transition-colors flex items-center" title="Supprimer">
                           <Trash2 size={14} />
                         </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredStays.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-400">Aucun séjour trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllInvoicesView({ settings, onUpdate, stays, showToast, askConfirm, initialMonth, onClearInitialMonth }: { settings: Settings, onUpdate: () => void, stays: Stay[], showToast: (m: string, t?: 'success' | 'error') => void, askConfirm: (t: string, m: string, c: () => void, d?: boolean) => void, initialMonth?: string | null, onClearInitialMonth?: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(initialMonth || format(new Date(), "yyyy-MM"));

  useEffect(() => {
    if (initialMonth) {
      setFilterMonth(initialMonth);
      if (onClearInitialMonth) onClearInitialMonth();
    }
  }, [initialMonth]);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchStay, setSearchStay] = useState("");

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices/all");
      setInvoices(await res.json());
    } catch (err) {
      showToast("Erreur lors de la récupération des factures", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchMonth = inv.created_at.startsWith(filterMonth);
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      return matchMonth && matchStatus;
    });
  }, [invoices, filterMonth, filterStatus]);

  const totalCA = useMemo(() => {
     return filteredInvoices.reduce((acc, inv) => {
        const isEncashed = !inv.status || inv.status === 'paid' || inv.status === 'partially_paid';
        if (isEncashed) {
          const amount = inv.type === 'final' ? (inv.amount - (inv.deposit_amount || 0)) : inv.amount;
          return acc + amount;
        }
        return acc;
     }, 0);
  }, [filteredInvoices]);

  const handleQuickPaid = async (inv: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inv, status: 'paid' })
      });
      if (!res.ok) throw new Error();
      showToast("Facture marquée comme Payée !");
      fetchInvoices();
      onUpdate();
    } catch (e) {
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Chargement des données comptables...</div>;

  const currentStay = stays.find(s => s.id === selectedStayId);

  return (
    <div className="space-y-6">
      {/* Stay Selector Modal for NEW invoice */}
      {isAddingNew && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 transform animate-in zoom-in-95 duration-200 border border-stone-100">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-stone-900 tracking-tight">Nouvelle Facture</h3>
              <button onClick={() => setIsAddingNew(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors"><X size={24} className="text-stone-400" /></button>
            </div>
            
            <div className="space-y-4">
              <p className="text-stone-500 text-sm font-medium">Sélectionnez le séjour concerné :</p>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full p-4 pl-12 bg-stone-50 border border-stone-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Rechercher Client ou Animal..."
                  value={searchStay}
                  onChange={e => setSearchStay(e.target.value)}
                />
                <Edit className="absolute left-4 top-4 text-stone-300" size={20} />
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {stays
                  .filter(s => s.owner_name?.toLowerCase().includes(searchStay.toLowerCase()) || s.cat_name?.toLowerCase().includes(searchStay.toLowerCase()))
                  .slice(0, 10)
                  .map(s => (
                    <button 
                      key={s.id}
                      onClick={() => { setSelectedStayId(s.id); setIsAddingNew(false); }}
                      className="w-full p-4 text-left bg-stone-50 hover:bg-emerald-50 border border-stone-100 rounded-2xl transition-all flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-bold text-stone-900 group-hover:text-emerald-700">{s.owner_name}</p>
                        <p className="text-xs text-stone-400 font-medium italic group-hover:text-emerald-600">Pour {s.cat_name} ({formatDateSafe(s.arrival_date)})</p>
                      </div>
                      <ChevronRight size={20} className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Form Modal (when a stay is selected) */}
      {selectedStayId && currentStay && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 my-8 space-y-6 transform animate-in zoom-in-95 duration-200 border border-stone-100">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight">Gestion Facture</h3>
                <p className="text-stone-400 text-sm font-medium italic">{currentStay.owner_name} • {currentStay.cat_name}</p>
              </div>
              <button 
                onClick={() => { setSelectedStayId(null); fetchInvoices(); }} 
                className="p-2 hover:bg-stone-50 rounded-full transition-colors"
              >
                <X size={24} className="text-stone-400" />
              </button>
            </div>
            
            <InvoiceSection 
              stay={currentStay} 
              settings={settings} 
              showToast={showToast} 
              askConfirm={askConfirm} 
              onUpdate={() => { fetchInvoices(); onUpdate(); }} 
            />
            
            <div className="pt-4 border-t border-stone-50 flex justify-end">
              <button 
                onClick={() => { setSelectedStayId(null); fetchInvoices(); }}
                className="px-6 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">Journal des Facturations</h2>
          <p className="text-stone-400 text-sm font-medium italic mt-1">Pilotage de la trésorerie et suivi des encaissements</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setIsAddingNew(true)}
            className="flex-1 sm:flex-none p-4 bg-stone-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} /> Nouvelle Facture
          </button>
          <div className="bg-emerald-600 text-white p-4 px-8 rounded-2xl shadow-xl shadow-emerald-100 flex flex-col items-center min-w-[160px]">
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">CA Encaissé (Période)</span>
             <span className="text-3xl font-black">{totalCA.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-6">
        <div className="flex flex-wrap items-center gap-3 bg-stone-50 p-2 rounded-2xl">
          <div className="flex-1 min-w-[200px] relative">
            <input 
              type="month" 
              className="w-full p-3 bg-white border border-stone-100 rounded-xl text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>
          <select 
            className="flex-1 min-w-[180px] p-3 bg-white border border-stone-100 rounded-xl text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(settings.invoice_statuses || DEFAULT_INVOICE_STATUS_LABELS).map(([val, config]) => (
              <option key={val} value={val}>{config.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-100">
          <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-stone-50/50 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                 <th className="p-5">Date</th>
                 <th className="p-5">N° Facture</th>
                 <th className="p-5">Client / Animal</th>
                 <th className="p-5">Statut / Paiement</th>
                 <th className="p-5">Montant</th>
                 <th className="p-5 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredInvoices.map(inv => {
                const statusConfig = getInvoiceStatusConfig(inv.status, settings);
                return (
                  <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="p-5 text-sm text-stone-500 font-medium">{formatDateSafe(inv.created_at)}</td>
                    <td className="p-5 font-black text-stone-900 tracking-tight">{inv.invoice_number}</td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-800">{inv.owner_name || "N/A"}</span>
                        <span className="text-xs text-stone-400 font-medium italic">{inv.cat_name || "N/A"}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1.5">
                        <div 
                          onClick={() => inv.status === 'partially_paid' && handleQuickPaid(inv)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit flex items-center gap-1.5 border transition-all cursor-default ${inv.status === 'partially_paid' ? 'hover:scale-105 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 cursor-pointer' : ''} ${statusConfig.bg} ${statusConfig.color} border-current/20`}
                          title={inv.status === 'partially_paid' ? "Cliquer pour marquer comme Payé" : ""}
                        >
                          {inv.status === 'partially_paid' && <CreditCard size={12} />}
                          {statusConfig.label}
                        </div>
                        {inv.payment_method && (
                          <span className="text-[10px] text-stone-400 font-bold ml-1 flex items-center gap-1 uppercase tracking-tight">
                            <span className="w-1 h-1 rounded-full bg-stone-300"></span>
                            {inv.payment_method}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-black text-stone-900 text-base">
                          {inv.type === 'final' ? (inv.amount - (inv.deposit_amount || 0)).toFixed(2) : inv.amount.toFixed(2)} €
                        </span>
                        {inv.type === 'final' && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                            Final (Acompte déduit)
                          </span>
                        )}
                        {inv.type === 'deposit' && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                            Acompte
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          title="Gérer / Éditer"
                          onClick={() => setSelectedStayId(inv.stay_id)}
                          className="p-3 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                        >
                          <Edit size={20} />
                        </button>
                        <button 
                          title="Supprimer"
                          onClick={() => {
                            askConfirm(
                              "Supprimer la facture ?", 
                              "Supprimer définitivement cette facture ? Cela impactera le CA.",
                              async () => {
                                try {
                                  const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
                                  if (!res.ok) throw new Error();
                                  showToast("Facture supprimée !");
                                  fetchInvoices();
                                  onUpdate();
                                } catch (err) {
                                  showToast("Erreur suppression", "error");
                                }
                              },
                              true
                            );
                          }}
                          className="p-3 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="text-stone-300" size={40} />
                    </div>
                    <h4 className="text-stone-900 font-bold">Aucune facturation</h4>
                    <p className="text-stone-400 text-sm">Ajustez vos filtres ou créez votre première facture.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active 
          ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

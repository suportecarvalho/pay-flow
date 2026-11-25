import { useEffect, useState } from 'react';
import { BoletoModal } from './components/BoletoModal';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { BarcodeScannerScreen } from './pages/BarcodeScannerScreen';
import { ExtractScreen } from './pages/ExtractScreen';
import { HomeScreen } from './pages/HomeScreen';
import { InsertBoletoScreen } from './pages/InsertBoletoScreen';
import { LoginScreen } from './pages/LoginScreen';
import { SplashScreen } from './pages/SplashScreen';
import {
  createUserBoleto,
  deleteUserBoleto,
  fetchUserBoletos,
  loadLocalBoletos,
  saveLocalBoletos,
  setBoletoPaidStatus,
  updateUserBoleto,
  uploadBoletoReceipt,
} from './services/boletosService';
import type { Boleto } from './types/boleto';
import type { AuthUser } from './types/user';
import { getNextMonthDueDate } from './utils/boletoParser';

type Screen = 'splash' | 'login' | 'app' | 'scanner' | 'insert_boleto';

const USER_STORAGE_KEY = 'payflow_user_v1';

function loadUserFromStorage(): AuthUser | null {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as AuthUser;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [editingBoleto, setEditingBoleto] = useState<Boleto | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage);
  const [boletos, setBoletos] = useState<Boleto[]>(() => {
    const savedUser = loadUserFromStorage();
    return savedUser ? loadLocalBoletos(savedUser.id) : [];
  });

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchUserBoletos(user.id, user.email).then((remoteBoletos) => {
      if (active) {
        setBoletos(remoteBoletos);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    saveLocalBoletos(user.id, boletos);
  }, [boletos, user]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [user]);

  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        setScreen(user ? 'app' : 'login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [screen, user]);

  const handleMarkPaid = async (id: string) => {
    const target = boletos.find((b) => b.id === id);
    setBoletos((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paid: true } : b))
    );
    setSelectedBoleto(null);

    if (user) {
      void setBoletoPaidStatus(id, true);

      if (target?.recurring) {
        try {
          const nextBoleto = await createUserBoleto(user.id, {
            name: target.name,
            dueDate: getNextMonthDueDate(target.dueDate),
            value: target.value,
            barcode: target.barcode,
            recurring: true,
            sharedWith: target.sharedWith,
            ownerEmail: target.ownerEmail ?? user.email,
          });
          setBoletos((prev) => [nextBoleto, ...prev]);
        } catch (err) {
          console.error('Erro ao gerar próximo boleto recorrente:', err);
        }
      }
    }
  };

  const handleMarkUnpaid = (id: string) => {
    setBoletos((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paid: false } : b))
    );
    setSelectedBoleto(null);
    if (user) {
      void setBoletoPaidStatus(id, false);
    }
  };

  const handleDeleteBoleto = (id: string) => {
    setBoletos((prev) => prev.filter((b) => b.id !== id));
    setSelectedBoleto(null);
    if (user) {
      void deleteUserBoleto(id);
    }
  };

  const handleAttachReceipt = async (id: string, file: File) => {
    if (!user) return;
    const receiptUrl = await uploadBoletoReceipt(user.id, id, file);
    setBoletos((prev) =>
      prev.map((b) => (b.id === id ? { ...b, receiptUrl } : b))
    );
    setSelectedBoleto((prev) =>
      prev && prev.id === id ? { ...prev, receiptUrl } : prev
    );
  };

  const handleLogin = (loggedUser: AuthUser) => {
    setBoletos(loadLocalBoletos(loggedUser.id));
    setUser(loggedUser);
    setScreen('app');
    setActiveTab('home');
  };

  const handleLogout = () => {
    setUser(null);
    setBoletos([]);
    setSelectedBoleto(null);
    setEditingBoleto(null);
    setScreen('login');
  };

  const handleSaveBoleto = async (data: {
    name: string;
    dueDate: string;
    value: number;
    barcode?: string;
    recurring: boolean;
    sharedWith?: string;
  }) => {
    if (!user) return;

    if (editingBoleto) {
      await updateUserBoleto(editingBoleto.id, data);
      setBoletos((prev) =>
        prev.map((b) =>
          b.id === editingBoleto.id
            ? {
                ...b,
                name: data.name,
                dueDate: data.dueDate,
                value: data.value,
                barcode: data.barcode,
                recurring: data.recurring,
                sharedWith: data.sharedWith?.trim().toLowerCase() || undefined,
              }
            : b
        )
      );
      setEditingBoleto(null);
      setScreen('app');
      return;
    }

    const created = await createUserBoleto(user.id, {
      ...data,
      ownerEmail: user.email,
    });
    setBoletos((prev) => [created, ...prev]);
    setScannedBarcode('');
    setActiveTab('home');
    setScreen('app');
  };

  return (
    <div className="w-full h-[100dvh] lg:max-w-[430px] lg:h-[844px] lg:rounded-[36px] lg:shadow-2xl bg-white flex flex-col overflow-hidden relative">
      {screen === 'splash' && <SplashScreen />}

      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}

      {screen === 'app' && (
        <>
          {activeTab === 'home' ? (
            <HomeScreen
              userName={user?.givenName}
              avatarUrl={user?.picture}
              onLogout={handleLogout}
              boletos={boletos}
              onSelectBoleto={setSelectedBoleto}
            />
          ) : (
            <ExtractScreen
              userName={user?.givenName}
              avatarUrl={user?.picture}
              onLogout={handleLogout}
              boletos={boletos}
              onSelectBoleto={setSelectedBoleto}
            />
          )}

          <BottomNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onAddBoleto={() => {
              const devOrient = window.DeviceOrientationEvent as unknown as {
                requestPermission?: () => Promise<string>;
              };
              if (typeof devOrient?.requestPermission === 'function') {
                void devOrient.requestPermission().catch(() => {});
              }
              setEditingBoleto(null);
              setScreen('scanner');
            }}
          />

          {selectedBoleto && (
            <BoletoModal
              boleto={selectedBoleto}
              onClose={() => setSelectedBoleto(null)}
              onMarkPaid={(id) => {
                void handleMarkPaid(id);
              }}
              onMarkUnpaid={handleMarkUnpaid}
              onEdit={(boleto) => {
                setSelectedBoleto(null);
                setEditingBoleto(boleto);
                setScreen('insert_boleto');
              }}
              onDelete={handleDeleteBoleto}
              onAttachReceipt={handleAttachReceipt}
            />
          )}
        </>
      )}

      {screen === 'scanner' && (
        <BarcodeScannerScreen
          onBack={() => setScreen('app')}
          onManualInsert={() => {
            setScannedBarcode('');
            setEditingBoleto(null);
            setScreen('insert_boleto');
          }}
          onScanSuccess={(code) => {
            setScannedBarcode(code);
            setEditingBoleto(null);
            setScreen('insert_boleto');
          }}
        />
      )}

      {screen === 'insert_boleto' && (
        <InsertBoletoScreen
          initialBarcode={scannedBarcode}
          editingBoleto={editingBoleto}
          onCancel={() => {
            setScannedBarcode('');
            setEditingBoleto(null);
            setScreen('app');
          }}
          onSubmit={handleSaveBoleto}
        />
      )}
    </div>
  );
}

export default App;

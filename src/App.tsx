import { useEffect, useState } from 'react';
import { BoletoModal } from './components/BoletoModal';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { BarcodeScannerScreen } from './pages/BarcodeScannerScreen';
import { ExtractScreen } from './pages/ExtractScreen';
import { HomeScreen } from './pages/HomeScreen';
import { InsertBoletoScreen } from './pages/InsertBoletoScreen';
import { LoginScreen } from './pages/LoginScreen';
import { SplashScreen } from './pages/SplashScreen';
import type { Boleto } from './types/boleto';
import type { AuthUser } from './types/user';

type Screen = 'splash' | 'login' | 'app' | 'scanner' | 'insert_boleto';

const USER_STORAGE_KEY = 'payflow_user_v1';

function getBoletosStorageKey(userId: string): string {
  return `payflow_boletos_v1_${userId}`;
}

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

function loadBoletosForUser(userId: string | undefined): Boleto[] {
  if (!userId) return [];
  try {
    const saved = localStorage.getItem(getBoletosStorageKey(userId));
    if (saved) {
      return JSON.parse(saved) as Boleto[];
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

export function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage);
  const [boletos, setBoletos] = useState<Boleto[]>(() =>
    loadBoletosForUser(loadUserFromStorage()?.id)
  );

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(
        getBoletosStorageKey(user.id),
        JSON.stringify(boletos)
      );
    } catch {
      // Ignore storage errors
    }
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

  const handleMarkPaid = (id: string) => {
    setBoletos((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paid: true } : b))
    );
    setSelectedBoleto(null);
  };

  const handleMarkUnpaid = (id: string) => {
    setBoletos((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paid: false } : b))
    );
    setSelectedBoleto(null);
  };

  const handleDeleteBoleto = (id: string) => {
    setBoletos((prev) => prev.filter((b) => b.id !== id));
    setSelectedBoleto(null);
  };

  const handleLogin = (loggedUser: AuthUser) => {
    const accountBoletos = loadBoletosForUser(loggedUser.id);
    setBoletos(accountBoletos);
    setUser(loggedUser);
    setScreen('app');
    setActiveTab('home');
  };

  const handleLogout = () => {
    setUser(null);
    setBoletos([]);
    setSelectedBoleto(null);
    setScreen('login');
  };

  return (
    <div className="w-full max-w-[430px] min-h-[100dvh] sm:min-h-0 sm:h-[844px] sm:rounded-[36px] sm:shadow-2xl bg-white flex flex-col overflow-hidden relative">
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
              setScreen('scanner');
            }}
          />

          {selectedBoleto && (
            <BoletoModal
              boleto={selectedBoleto}
              onClose={() => setSelectedBoleto(null)}
              onMarkPaid={handleMarkPaid}
              onMarkUnpaid={handleMarkUnpaid}
              onDelete={handleDeleteBoleto}
            />
          )}
        </>
      )}

      {screen === 'scanner' && (
        <BarcodeScannerScreen
          onBack={() => setScreen('app')}
          onManualInsert={() => {
            setScannedBarcode('');
            setScreen('insert_boleto');
          }}
          onScanSuccess={(code) => {
            setScannedBarcode(code);
            setScreen('insert_boleto');
          }}
        />
      )}

      {screen === 'insert_boleto' && (
        <InsertBoletoScreen
          initialBarcode={scannedBarcode}
          onCancel={() => {
            setScannedBarcode('');
            setScreen('app');
          }}
          onSubmit={(data) => {
            const newBoleto: Boleto = {
              id: String(Date.now()),
              name: data.name,
              dueDate: data.dueDate,
              value: data.value,
              barcode: data.barcode,
              paid: false,
            };
            setBoletos((prev) => [newBoleto, ...prev]);
            setScannedBarcode('');
            setActiveTab('home');
            setScreen('app');
          }}
        />
      )}
    </div>
  );
}

export default App;

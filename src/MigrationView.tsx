import React, { useState } from 'react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export function MigrationView({ onComplete }: { onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>(["Prêt pour la migration."]);
  const [migrating, setMigrating] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  auth.onAuthStateChanged(setUser);

  const log = (msg: string) => setLogs(prev => [...prev, msg]);

  const runMigration = async () => {
    if (!user) {
      log("ERREUR: Vous devez être connecté.");
      return;
    }
    
    setMigrating(true);
    try {
      log("Téléchargement des données locales...");
      const res = await fetch('/api/backup?full=true');
      if (!res.ok) throw new Error("Impossible de lire /api/backup");
      
      const data = await res.json();
      log(`Données lues: ${data.clients?.length || 0} clients, ${data.cats?.length || 0} chats, ${data.stays?.length || 0} séjours.`);

      if (data.settings && data.settings.length > 0) {
        log("Migration des paramètres...");
        for (const s of data.settings) {
          if (!s.key) continue;
          await setDoc(doc(db, 'settings', s.key), { value: s.value });
        }
      }

      if (data.clients && data.clients.length > 0) {
        log("Migration des clients...");
        for (const c of data.clients) {
          await setDoc(doc(db, 'clients', c.id.toString()), c);
        }
      }

      if (data.cats && data.cats.length > 0) {
        log("Migration des chats...");
        for (const c of data.cats) {
          await setDoc(doc(db, 'cats', c.id.toString()), c);
        }
      }

      if (data.stays && data.stays.length > 0) {
        log("Migration des séjours...");
        for (const s of data.stays) {
          await setDoc(doc(db, 'stays', s.id.toString()), s);
        }
      }

      if (data.health_logs && data.health_logs.length > 0) {
        log("Migration des journaux de santé...");
        for (const hl of data.health_logs) {
          await setDoc(doc(db, 'health_logs', hl.id.toString()), hl);
        }
      }
      
      log("MIGRATION TERMINÉE AVEC SUCCÈS ! Vous pouvez me prévenir.");
    } catch (err: any) {
      log("ERREUR: " + err.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[999] flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-stone-50 p-8 rounded-3xl shadow-xl space-y-6">
        <h1 className="text-3xl font-black text-stone-900 border-b pb-4">🌟 Migration vers le Cloud</h1>
        <p className="text-stone-600">
          Nous allons transférer vos données locales vers Google Firebase pour qu'elles soient sécurisées et disponibles en ligne.
        </p>

        {!user ? (
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition"
          >
            1. Se connecter avec Google (fdeleflie@gmail.com)
          </button>
        ) : (
          <div className="space-y-4">
            <p className="font-bold text-emerald-600">✓ Connecté en tant que {user.email}</p>
            <button 
              onClick={runMigration}
              disabled={migrating}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
              2. Lancer la copie intégrale des données
            </button>
          </div>
        )}

        <div className="bg-black text-emerald-400 p-4 rounded-xl font-mono text-sm h-64 overflow-y-auto flex flex-col-reverse">
          <div>
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
        
        <button 
          onClick={onComplete}
          className="text-stone-500 hover:text-stone-900 underline text-sm block mx-auto pt-4"
        >
          Retour à l'application sans migrer (Test)
        </button>
      </div>
    </div>
  );
}

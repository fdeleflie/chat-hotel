import { db } from './firebase';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, orderBy, where, onSnapshot, QuerySnapshot 
} from 'firebase/firestore';

const CACHE: Record<string, QuerySnapshot> = {};
const cacheWaits: Record<string, Promise<QuerySnapshot>> = {};

class FilteredSnapshot {
  docs: any[];
  constructor(docs: any[]) {
    this.docs = docs;
  }
  forEach(cb: any) {
    this.docs.forEach(cb);
  }
}

async function getCachedDocs(colName: string): Promise<QuerySnapshot> {
  if (CACHE[colName]) return CACHE[colName];
  if (!cacheWaits[colName]) {
    cacheWaits[colName] = new Promise((resolve, reject) => {
      onSnapshot(collection(db, colName), (snap) => {
        CACHE[colName] = snap;
        resolve(snap);
      }, (err) => {
        console.error(`Error in onSnapshot for ${colName}:`, err);
        reject(err);
      });
    });
  }
  return cacheWaits[colName];
}

export const handleFirebaseApi = async (url: string, init?: RequestInit): Promise<Response> => {
  const method = init?.method || 'GET';
  const parsedUrl = new URL(url, window.location.origin);
  const path = parsedUrl.pathname; // /api/clients
  let body: any = null;
  
  if (init?.body) {
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        body = init.body;
      }
    } else {
      body = init.body;
    }
  }

  const searchParams = parsedUrl.searchParams;

  const jsonResponse = (data: any) => new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    // --- SETTINGS ---
    if (path.startsWith('/api/settings')) {
      if (method === 'GET') {
        const snap = await getCachedDocs('settings');
        const config: any = {};
        snap.forEach(d => { 
          const data = d.data();
          if ((d.id === 'payment_methods' || d.id === 'invoice_statuses') && data.value) {
            try {
              config[d.id] = JSON.parse(data.value);
            } catch (e) {
              if (d.id === 'payment_methods') config[d.id] = ["CB", "Chèque", "Espèces", "Virement"];
              else config[d.id] = undefined;
            }
          } else {
            config[d.id] = data.value; 
          }
        });
        return jsonResponse(config);
      }
      if (method === 'POST') {
        // Handle Logo Upload (FormData)
        if (init?.body instanceof FormData) {
          const formData = init.body as FormData;
          const logoFile = formData.get('logo') as File;
          if (logoFile) {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(logoFile);
            });
            await setDoc(doc(db, 'settings', 'logo'), { value: base64 });
            return jsonResponse({ success: true });
          }
        }

        // Handle normal settings (JSON)
        if (body?.key) {
          await setDoc(doc(db, 'settings', body.key), { value: String(body.value) });
          return jsonResponse({ success: true });
        }
      }
    }

    // Helper function for stay deletion
    async function deleteStayRelatedData(db: any, stayId: string) {
       // Delete health logs
       const hlSnapAll = await getCachedDocs('health_logs');
       const hlDocs = hlSnapAll.docs.filter((d: any) => d.data()['stay_id'] === stayId);
       for (const d of hlDocs) await deleteDoc(doc(db, 'health_logs', d.id));

       // Delete media
       const mSnapAll = await getCachedDocs('media');
       const mDocs = mSnapAll.docs.filter((d: any) => d.data()['stay_id'] === stayId);
       for (const d of mDocs) await deleteDoc(doc(db, 'media', d.id));

       // Delete invoices
       const iSnapAll = await getCachedDocs('invoices');
       const iDocs = iSnapAll.docs.filter((d: any) => d.data()['stay_id'] === stayId);
       for (const d of iDocs) await deleteDoc(doc(db, 'invoices', d.id));
    }

    // --- CLIENTS ---
    if (path === '/api/clients') {
      if (method === 'GET') {
        const snap = await getCachedDocs('clients');
        return jsonResponse(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }
      if (method === 'POST') {
        const docRef = await addDoc(collection(db, 'clients'), body);
        return jsonResponse({ id: docRef.id });
      }
    }
    if (path.startsWith('/api/clients/')) {
      const id = path.split('/').pop()!;
      if (method === 'PUT') {
        await updateDoc(doc(db, 'clients', id), body);
        return jsonResponse({ success: true });
      }
      if (method === 'DELETE') {
        // Recursive delete: Cats -> Stays -> Related
        const catsSnapAll = await getCachedDocs('cats');
        const catsDocs = catsSnapAll.docs.filter((d: any) => d.data()['owner_id'] === id);
        for(const catDoc of catsDocs) {
           const staysSnapAll = await getCachedDocs('stays');
           const staysDocs = staysSnapAll.docs.filter((d: any) => d.data()['cat_id'] === catDoc.id);
           for(const stayDoc of staysDocs) {
              await deleteStayRelatedData(db, stayDoc.id);
              await deleteDoc(doc(db, 'stays', stayDoc.id));
           }
           await deleteDoc(doc(db, 'cats', catDoc.id));
        }
        await deleteDoc(doc(db, 'clients', id));
        return jsonResponse({ success: true });
      }
    }

    // --- CATS ---
    if (path === '/api/cats') {
      if (method === 'GET') {
        const [catsSnap, clientsSnap] = await Promise.all([
          getCachedDocs('cats'),
          getCachedDocs('clients')
        ]);
        const clientsMap = new Map(clientsSnap.docs.map(d => [d.id, d.data().name]));
        return jsonResponse(catsSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, ...data, owner_name: clientsMap.get(data.owner_id?.toString()) };
        }));
      }
      if (method === 'POST') {
        const docRef = await addDoc(collection(db, 'cats'), body);
        return jsonResponse({ id: docRef.id });
      }
    }
    if (path.startsWith('/api/cats/')) {
      const id = path.split('/').pop()!;
      if (method === 'PUT') {
        await updateDoc(doc(db, 'cats', id), body);
        return jsonResponse({ success: true });
      }
      if (method === 'DELETE') {
        const staysSnapAll = await getCachedDocs('stays');
        const staysDocs = staysSnapAll.docs.filter((d: any) => d.data()['cat_id'] === id);
        for(const stayDoc of staysDocs) {
          await deleteStayRelatedData(db, stayDoc.id);
          await deleteDoc(doc(db, 'stays', stayDoc.id));
        }
        await deleteDoc(doc(db, 'cats', id));
        return jsonResponse({ success: true });
      }
    }

    // --- STAYS ---
    if (path === '/api/stays') {
      if (method === 'GET') {
        const staysSnap = await getCachedDocs('stays');
        const catsSnap = await getCachedDocs('cats');
        const clientsSnap = await getCachedDocs('clients');
        const healthSnap = await getCachedDocs('health_logs');

        const catsMap = new Map(catsSnap.docs.map(d => [d.id, d.data()]));
        const clientsMap = new Map(clientsSnap.docs.map(d => [d.id, d.data()]));
        
        // Find latest health logs per stay
        const latestLogs = new Map();
        healthSnap.docs.forEach(d => {
          const data = d.data();
          const stayId = data.stay_id?.toString();
          if (!latestLogs.has(stayId) || data.date > latestLogs.get(stayId).date) {
            latestLogs.set(stayId, data);
          }
        });

        const stays = staysSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .map((s: any) => {
            const cat = catsMap.get(s.cat_id?.toString()) || {};
            const owner = clientsMap.get(cat.owner_id?.toString()) || {};
            const log = latestLogs.get(s.id?.toString()) || {};
            return {
              ...s,
              cat_name: cat.name, cat_species: cat.species, cat_breed: cat.breed, cat_color: cat.color,
              cat_chip_number: cat.chip_number, cat_vaccine_tc_date: cat.vaccine_tc_date,
              cat_birth_date: cat.birth_date, cat_age: cat.age,
              owner_name: owner.name, owner_email: owner.email, owner_phone: owner.phone, owner_address: owner.address,
              ate_well: log.ate_well, abnormal_behavior: log.abnormal_behavior, medication: log.medication,
              incident: log.incident, health_comments: log.comments
            };
          });
        return jsonResponse(stays.sort((a, b) => b.arrival_date.localeCompare(a.arrival_date)));
      }
      if (method === 'POST') {
        const docRef = await addDoc(collection(db, 'stays'), body);
        return jsonResponse({ id: docRef.id });
      }
    }
    if (path.startsWith('/api/stays/')) {
      const id = path.split('/').pop()!;
      if (method === 'PUT') {
        const { box_number, arrival_date, planned_departure, actual_departure, comments, ate_well, abnormal_behavior, medication, incident, health_comments, contract_scan_url } = body;
        
        const updateData: any = {};
        if (box_number !== undefined) updateData.box_number = box_number;
        if (arrival_date !== undefined) updateData.arrival_date = arrival_date;
        if (planned_departure !== undefined) updateData.planned_departure = planned_departure;
        updateData.actual_departure = actual_departure === undefined ? null : actual_departure;
        if (comments !== undefined) updateData.comments = comments;
        if (contract_scan_url !== undefined) updateData.contract_scan_url = contract_scan_url;

        await updateDoc(doc(db, 'stays', id), updateData);

        const healthSnapAll = await getCachedDocs('health_logs');
        const healthDocs = healthSnapAll.docs.filter((d: any) => d.data()['stay_id'] === id);
        let latestLogId = null;
        let latestDate = '';
        healthDocs.forEach(d => {
          if (d.data().date > latestDate) {
            latestDate = d.data().date;
            latestLogId = d.id;
          }
        });

        const healthUpdateData: any = {
          ate_well: !!ate_well, 
          abnormal_behavior: !!abnormal_behavior
        };
        if (medication !== undefined) healthUpdateData.medication = medication === null ? "" : medication;
        if (incident !== undefined) healthUpdateData.incident = incident === null ? "" : incident;
        if (health_comments !== undefined) healthUpdateData.comments = health_comments === null ? "" : health_comments;

        if (latestLogId) {
          await updateDoc(doc(db, 'health_logs', latestLogId), healthUpdateData);
        } else {
          await addDoc(collection(db, 'health_logs'), {
            stay_id: id, date: new Date().toISOString().split('T')[0],
            ...healthUpdateData
          });
        }
        return jsonResponse({ success: true });
      }
      if (method === 'DELETE') {
        await deleteStayRelatedData(db, id);
        await deleteDoc(doc(db, 'stays', id));
        return jsonResponse({ success: true });
      }
    }

    // --- HEALTH LOGS ---
    if (path === '/api/health-reports') {
      const staysSnap = await getCachedDocs('stays');
      const catsSnap = await getCachedDocs('cats');
      const clientsSnap = await getCachedDocs('clients');
      const healthSnap = await getCachedDocs('health_logs');

      const catsMap = new Map(catsSnap.docs.map(d => [d.id, d.data()]));
      const clientsMap = new Map(clientsSnap.docs.map(d => [d.id, d.data()]));
      
      const latestLogs = new Map();
      healthSnap.docs.forEach(d => {
        const data = d.data();
        const stayId = data.stay_id?.toString();
        if (!latestLogs.has(stayId) || data.date > latestLogs.get(stayId).date) {
          latestLogs.set(stayId, data);
        }
      });

      const reports = staysSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .map((s: any) => {
          const cat = catsMap.get(s.cat_id?.toString()) || {};
          const owner = clientsMap.get(cat.owner_id?.toString()) || {};
          const log = latestLogs.get(s.id?.toString()) || {};
          return {
            stay_id: s.id,
            cat_name: cat.name,
            owner_name: owner.name,
            date: log.date,
            ate_well: log.ate_well,
            abnormal_behavior: log.abnormal_behavior,
            medication: log.medication,
            incident: log.incident,
            health_comments: log.comments
          };
        });
      return jsonResponse(reports.sort((a, b: any) => b.stay_id.localeCompare(a.stay_id)));
    }
    if (path.startsWith('/api/health-logs')) {
      if (method === 'GET') {
        const stayId = path.split('/').pop()!;
        const snapAll = await getCachedDocs('health_logs');
        const snap = { docs: snapAll.docs.filter((d: any) => d.data()['stay_id'] === stayId) };
        const logs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.date.localeCompare(a.date));
        return jsonResponse(logs);
      }
      if (method === 'POST') {
        const docRef = await addDoc(collection(db, 'health_logs'), body);
        return jsonResponse({ id: docRef.id });
      }
    }
    const hlMatch = path.match(/^\/api\/health-logs\/([^\/]+)$/);
    if (hlMatch && method === 'DELETE') {
      await deleteDoc(doc(db, 'health_logs', hlMatch[1]));
      return jsonResponse({ success: true });
    }
    
    // --- STATS ---
    if (path === '/api/stats') {
      const dbSettings = await getCachedDocs('settings');
      let totalBoxes = 3;
      dbSettings.forEach((d: any) => {
        if (d.id === 'total_boxes') {
          totalBoxes = parseInt(d.data().value) || 3;
        }
      });
      
      const invoicesSnap = await getCachedDocs('invoices');
      const revenueMap: Record<string, number> = {};
      invoicesSnap.forEach((d: any) => {
        const inv = d.data();
        if (inv.created_at) {
          // CA Encaissé: only count paid or partially_paid invoices
          const isEncashed = !inv.status || inv.status === 'paid' || inv.status === 'partially_paid';
          if (isEncashed) {
            const month = inv.created_at.substring(0, 7);
            const amount = inv.type === 'final' ? (Number(inv.amount) - (Number(inv.deposit_amount) || 0)) : (Number(inv.amount) || 0);
            revenueMap[month] = (revenueMap[month] || 0) + amount;
          }
        }
      });
      const revenue = Object.keys(revenueMap).map(month => ({ month, total: revenueMap[month] })).sort((a, b) => b.month.localeCompare(a.month));

      const staysSnap = await getCachedDocs('stays');
      const occupancyMap: Record<string, number> = {};
      staysSnap.forEach((d: any) => {
        const stay = d.data();
        if (stay.arrival_date && stay.planned_departure) {
          const arrival = new Date(stay.arrival_date);
          const departure = new Date(stay.actual_departure || stay.planned_departure);
          
          let currentDate = new Date(arrival);
          while (currentDate < departure) {
            const month = currentDate.toISOString().substring(0, 7);
            occupancyMap[month] = (occupancyMap[month] || 0) + 1;
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
      const occupancy = Object.keys(occupancyMap).map(month => ({ month, stays_count: occupancyMap[month] })).sort((a, b) => b.month.localeCompare(a.month));

      return jsonResponse({ revenue, occupancy, totalBoxes });
    }

    // --- INVOICES ---
    if (path === '/api/invoices/all') {
      if (method === 'GET') {
        const snap = await getCachedDocs('invoices');
        return jsonResponse(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }
    }
    if (path.startsWith('/api/invoices')) {
      if (method === 'GET') {
        const stayId = path.split('/').pop()!;
        const snapAll = await getCachedDocs('invoices');
        const snap = { docs: snapAll.docs.filter((d: any) => d.data()['stay_id'] === stayId) };
        return jsonResponse(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }
      if (method === 'POST') {
        const year = body.created_at ? body.created_at.substring(0, 4) : new Date().getFullYear().toString();
        // Generate number correctly if not provided
        if (!body.invoice_number) {
          body.invoice_number = `${year}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        }
        if (!body.type) body.type = 'standard';
        
        const docRef = await addDoc(collection(db, 'invoices'), body);
        return jsonResponse({ id: docRef.id, invoice_number: body.invoice_number });
      }
      if (method === 'PUT') {
        const id = path.split('/').pop()!;
        await updateDoc(doc(db, 'invoices', id), body);
        return jsonResponse({ success: true });
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop()!;
        await deleteDoc(doc(db, 'invoices', id));
        return jsonResponse({ success: true });
      }
    }

    // --- MEDIA ---
    if (path.startsWith('/api/media')) {
      if (method === 'GET') {
        const stayId = path.split('/').pop()!;
        const snapAll = await getCachedDocs('media');
        const snap = { docs: snapAll.docs.filter((d: any) => d.data()['stay_id'] === stayId) };
        return jsonResponse(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop()!;
        await deleteDoc(doc(db, 'media', id));
        return jsonResponse({ success: true });
      }
      if (method === 'POST') {
        const stayId = path.split('/').pop()!;
        if (init?.body instanceof FormData) {
          const formData = init.body as FormData;
          const files = formData.getAll('media') as File[];
          for (const file of files) {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            await addDoc(collection(db, 'media'), {
              stay_id: stayId,
              type: file.type.startsWith('image') ? 'image' : 'video',
              url: base64,
              filename: file.name
            });
          }
          return jsonResponse({ success: true });
        }
      }
      // Note: POST to /api/media handled above for FormData case.
    }

    // --- BACKUP ---
    if (path === '/api/backup') {
      const full = searchParams.get('full') === 'true';
      const collections = ['clients', 'cats', 'stays', 'health_logs', 'invoices', 'settings'];
      if (full) collections.push('media');
      
      const backupData: any = {};
      for (const col of collections) {
        const snap = await getCachedDocs(col);
        backupData[col] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      }
      return jsonResponse(backupData);
    }

    // --- RESTORE ---
    if (path === '/api/restore') {
      if (method === 'POST') {
        const logs: string[] = ["Démarrage de la restauration Cloud..."];
        const collections = ['clients', 'cats', 'stays', 'health_logs', 'invoices', 'settings', 'media'];
        
        for (const col of collections) {
          if (body[col] && Array.isArray(body[col])) {
            logs.push(`Injection de ${body[col].length} entrées dans ${col}...`);
            for (const item of body[col]) {
              const { id, ...data } = item;
              // On utilise setDoc pour préserver les IDs et maintenir les relations (très important)
              await setDoc(doc(db, col, id.toString()), data);
            }
          }
        }
        logs.push("Importation terminée avec succès.");
        return jsonResponse({ success: true, logs });
      }
    }

    // Unmatched
    console.log("Unhandled Firebase Intercept:", method, path);
    return new Response(JSON.stringify({ error: 'Not implemented in Firebase mock' }), { status: 404 });

  } catch (err: any) {
    console.error("Firebase API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

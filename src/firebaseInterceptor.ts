import { db } from './firebase';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, orderBy, where 
} from 'firebase/firestore';

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
    if (path === '/api/settings') {
      if (method === 'GET') {
        const snap = await getDocs(collection(db, 'settings'));
        const config: any = {};
        snap.forEach(d => { config[d.id] = d.data().value; });
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

    // --- CLIENTS ---
    if (path === '/api/clients') {
      if (method === 'GET') {
        const snap = await getDocs(collection(db, 'clients'));
        return jsonResponse(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
        await deleteDoc(doc(db, 'clients', id));
        return jsonResponse({ success: true });
      }
    }

    // --- CATS ---
    if (path === '/api/cats') {
      if (method === 'GET') {
        const [catsSnap, clientsSnap] = await Promise.all([
          getDocs(collection(db, 'cats')),
          getDocs(collection(db, 'clients'))
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
        await deleteDoc(doc(db, 'cats', id));
        return jsonResponse({ success: true });
      }
    }

    // --- STAYS ---
    if (path === '/api/stays') {
      if (method === 'GET') {
        const isArchived = searchParams.get('archived') === 'true';
        const staysSnap = await getDocs(collection(db, 'stays'));
        const catsSnap = await getDocs(collection(db, 'cats'));
        const clientsSnap = await getDocs(collection(db, 'clients'));
        const healthSnap = await getDocs(collection(db, 'health_logs'));

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
          .filter((s: any) => s.is_archived === isArchived)
          .map((s: any) => {
            const cat = catsMap.get(s.cat_id?.toString()) || {};
            const owner = clientsMap.get(cat.owner_id?.toString()) || {};
            const log = latestLogs.get(s.id?.toString()) || {};
            return {
              ...s,
              cat_name: cat.name, cat_species: cat.species, cat_breed: cat.breed, cat_color: cat.color,
              cat_chip_number: cat.chip_number, cat_vaccine_tc_date: cat.vaccine_tc_date,
              owner_name: owner.name, owner_email: owner.email, owner_phone: owner.phone, owner_address: owner.address,
              ate_well: log.ate_well, abnormal_behavior: log.abnormal_behavior, medication: log.medication,
              incident: log.incident, health_comments: log.comments
            };
          });
        return jsonResponse(stays.sort((a, b) => b.arrival_date.localeCompare(a.arrival_date)));
      }
      if (method === 'POST') {
        body.is_archived = false;
        const docRef = await addDoc(collection(db, 'stays'), body);
        return jsonResponse({ id: docRef.id });
      }
    }
    if (path.startsWith('/api/stays/')) {
      const id = path.split('/').pop()!;
      if (method === 'PUT') {
        const { box_number, arrival_date, planned_departure, actual_departure, comments, is_archived, ate_well, abnormal_behavior, medication, incident, health_comments } = body;
        
        await updateDoc(doc(db, 'stays', id), {
          box_number, arrival_date, planned_departure, actual_departure, comments, is_archived: !!is_archived
        });

        const q = query(collection(db, 'health_logs'), where('stay_id', '==', id));
        const healthSnap = await getDocs(q);
        let latestLogId = null;
        let latestDate = '';
        healthSnap.docs.forEach(d => {
          if (d.data().date > latestDate) {
            latestDate = d.data().date;
            latestLogId = d.id;
          }
        });

        if (latestLogId) {
          await updateDoc(doc(db, 'health_logs', latestLogId), {
            ate_well: !!ate_well, abnormal_behavior: !!abnormal_behavior, medication, incident, comments: health_comments
          });
        } else {
          await addDoc(collection(db, 'health_logs'), {
            stay_id: id, date: new Date().toISOString().split('T')[0],
            ate_well: !!ate_well, abnormal_behavior: !!abnormal_behavior, medication, incident, comments: health_comments
          });
        }
        return jsonResponse({ success: true });
      }
      if (method === 'DELETE') {
        await deleteDoc(doc(db, 'stays', id));
        return jsonResponse({ success: true });
      }
    }

    // --- HEALTH LOGS ---
    if (path === '/api/health-reports') {
      const isArchived = searchParams.get('archived') === 'true';
      const staysSnap = await getDocs(collection(db, 'stays'));
      const catsSnap = await getDocs(collection(db, 'cats'));
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const healthSnap = await getDocs(collection(db, 'health_logs'));

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
        .filter((s: any) => s.is_archived === isArchived)
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
        const q = query(collection(db, 'health_logs'), where('stay_id', '==', stayId));
        const snap = await getDocs(q);
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.date.localeCompare(a.date));
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
      // Return dummy for now to prevent crash
      return jsonResponse({ revenue: [], occupancy: [], totalBoxes: 3 });
    }

    // --- INVOICES ---
    if (path.startsWith('/api/invoices')) {
      if (method === 'GET') {
        const stayId = path.split('/').pop()!;
        const q = query(collection(db, 'invoices'), where('stay_id', '==', stayId));
        const snap = await getDocs(q);
        return jsonResponse(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      if (method === 'POST') {
        const year = body.created_at ? body.created_at.substring(0, 4) : new Date().getFullYear().toString();
        body.invoice_number = `${year}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
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
        const q = query(collection(db, 'media'), where('stay_id', '==', stayId));
        const snap = await getDocs(q);
        return jsonResponse(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

    // Unmatched
    console.log("Unhandled Firebase Intercept:", method, path);
    return new Response(JSON.stringify({ error: 'Not implemented in Firebase mock' }), { status: 404 });

  } catch (err: any) {
    console.error("Firebase API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

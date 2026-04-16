console.log("SERVER.TS MODULE LOADED");
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;

const app = express();
app.use(express.json({ limit: '50mb' }));

// Storage setup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// API Routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.get("/api/settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM settings").all();
  const config = settings.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(config);
});

app.post("/api/settings", upload.single("logo"), (req: any, res) => {
  console.log("POST /api/settings", { 
    hasFile: !!req.file, 
    body: req.body,
    contentType: req.headers['content-type']
  });
  if (req.file) {
    const logoUrl = `/uploads/${req.file.filename}`;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("logo", logoUrl);
    res.json({ logo: logoUrl });
  } else if (req.body.key !== undefined && req.body.value !== undefined) {
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(req.body.key, String(req.body.value));
      res.json({ success: true });
    } catch (dbErr: any) {
      console.error("Database error in /api/settings:", dbErr);
      res.status(500).json({ error: dbErr.message });
    }
  } else {
    console.warn("Invalid request to /api/settings:", req.body);
    res.status(400).json({ error: "No data provided" });
  }
});

// Clients
app.get("/api/clients", (req, res) => {
  const clients = db.prepare("SELECT * FROM clients").all();
  res.json(clients);
});

app.post("/api/clients", (req, res) => {
  console.log("Creating client:", req.body);
  const { name, address, email, phone } = req.body;
  if (!name) {
    console.error("Client name is missing");
    return res.status(400).json({ error: "Name is required" });
  }
  try {
    const result = db.prepare("INSERT INTO clients (name, address, email, phone) VALUES (?, ?, ?, ?)").run(name, address, email, phone);
    console.log("Client created with ID:", result.lastInsertRowid);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    console.error("Error creating client:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/clients/:id", (req, res) => {
  const { name, address, email, phone } = req.body;
  db.prepare("UPDATE clients SET name = ?, address = ?, email = ?, phone = ? WHERE id = ?").run(name, address, email, phone, req.params.id);
  res.json({ success: true });
});

app.delete("/api/clients/:id", (req, res) => {
  console.log(`Attempting to delete client ${req.params.id}`);
  try {
    const result = db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
    console.log(`Deleted client ${req.params.id}. Rows affected: ${result.changes}`);
    res.json({ success: true, changes: result.changes });
  } catch (err: any) {
    console.error(`Error deleting client ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Cats
app.get("/api/cats", (req, res) => {
  const cats = db.prepare(`
    SELECT cats.*, clients.name as owner_name 
    FROM cats 
    JOIN clients ON cats.owner_id = clients.id
  `).all();
  res.json(cats);
});

app.post("/api/cats", (req, res) => {
  console.log("Creating cat:", req.body);
  const { owner_id, name, species, breed, color, chip_number, vaccine_tc_date, vaccine_l_date, parasite_treatment_date } = req.body;
  try {
    const result = db.prepare("INSERT INTO cats (owner_id, name, species, breed, color, chip_number, vaccine_tc_date, vaccine_l_date, parasite_treatment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(owner_id, name, species || 'Chat', breed, color, chip_number, vaccine_tc_date, vaccine_l_date, parasite_treatment_date);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    console.error("Error creating cat:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/cats/:id", (req, res) => {
  const { name, species, breed, color, chip_number, vaccine_tc_date, vaccine_l_date, parasite_treatment_date } = req.body;
  db.prepare("UPDATE cats SET name = ?, species = ?, breed = ?, color = ?, chip_number = ?, vaccine_tc_date = ?, vaccine_l_date = ?, parasite_treatment_date = ? WHERE id = ?").run(name, species, breed, color, chip_number, vaccine_tc_date, vaccine_l_date, parasite_treatment_date, req.params.id);
  res.json({ success: true });
});

app.delete("/api/cats/:id", (req, res) => {
  console.log(`Attempting to delete cat ${req.params.id}`);
  try {
    const result = db.prepare("DELETE FROM cats WHERE id = ?").run(req.params.id);
    console.log(`Deleted cat ${req.params.id}. Rows affected: ${result.changes}`);
    res.json({ success: true, changes: result.changes });
  } catch (err: any) {
    console.error(`Error deleting cat ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stays
app.get("/api/stays", (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const stays = db.prepare(`
    SELECT 
      stays.*, 
      cats.name as cat_name, 
      cats.species as cat_species, 
      cats.breed as cat_breed,
      cats.color as cat_color,
      cats.chip_number as cat_chip_number,
      cats.vaccine_tc_date as cat_vaccine_tc_date,
      cats.vaccine_l_date as cat_vaccine_l_date,
      cats.parasite_treatment_date as cat_parasite_treatment_date,
      clients.name as owner_name, 
      clients.email as owner_email,
      clients.address as owner_address,
      clients.phone as owner_phone,
      hl.ate_well,
      hl.abnormal_behavior,
      hl.medication,
      hl.incident,
      hl.comments as health_comments
    FROM stays 
    JOIN cats ON stays.cat_id = cats.id
    JOIN clients ON cats.owner_id = clients.id
    LEFT JOIN (
      SELECT * FROM health_logs 
      WHERE id IN (SELECT MAX(id) FROM health_logs GROUP BY stay_id)
    ) hl ON stays.id = hl.stay_id
    WHERE is_archived = ?
    ORDER BY arrival_date DESC
  `).all(archived);
  
  // Convert 0/1 to boolean for the frontend, preserving null
  const sanitizedStays = stays.map((s: any) => ({
    ...s,
    ate_well: s.ate_well === null ? null : s.ate_well === 1,
    abnormal_behavior: s.abnormal_behavior === null ? null : s.abnormal_behavior === 1
  }));
  
  res.json(sanitizedStays);
});

app.post("/api/stays", (req, res) => {
  console.log("Creating stay:", req.body);
  const { cat_id, box_number, arrival_date, planned_departure, comments } = req.body;
  try {
    const result = db.prepare("INSERT INTO stays (cat_id, box_number, arrival_date, planned_departure, comments, is_archived) VALUES (?, ?, ?, ?, ?, 0)").run(cat_id, box_number, arrival_date, planned_departure, comments);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    console.error("Error creating stay:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/stays/:id", (req, res) => {
  const { box_number, arrival_date, planned_departure, actual_departure, comments, is_archived, ate_well, abnormal_behavior, medication, incident, health_comments } = req.body;
  
  const updateStay = db.transaction(() => {
    db.prepare("UPDATE stays SET box_number = ?, arrival_date = ?, planned_departure = ?, actual_departure = ?, comments = ?, is_archived = ? WHERE id = ?").run(
      box_number, arrival_date, planned_departure, actual_departure, comments, is_archived ? 1 : 0, req.params.id
    );

    // Update or create health log
    const latestLog = db.prepare("SELECT id FROM health_logs WHERE stay_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id);
    
    if (latestLog) {
      db.prepare("UPDATE health_logs SET ate_well = ?, abnormal_behavior = ?, medication = ?, incident = ?, comments = ? WHERE id = ?").run(
        ate_well ? 1 : 0, abnormal_behavior ? 1 : 0, medication, incident, health_comments, latestLog.id
      );
    } else {
      db.prepare("INSERT INTO health_logs (stay_id, date, ate_well, abnormal_behavior, medication, incident, comments) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        req.params.id, new Date().toISOString().split('T')[0], ate_well ? 1 : 0, abnormal_behavior ? 1 : 0, medication, incident, health_comments
      );
    }
  });

  updateStay();
  res.json({ success: true });
});

app.delete("/api/stays/:id", (req, res) => {
  console.log(`Attempting to delete stay ${req.params.id}`);
  try {
    const result = db.prepare("DELETE FROM stays WHERE id = ?").run(req.params.id);
    console.log(`Deleted stay ${req.params.id}. Rows affected: ${result.changes}`);
    res.json({ success: true, changes: result.changes });
  } catch (err: any) {
    console.error(`Error deleting stay ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health Logs
app.get("/api/health-reports", (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const reports = db.prepare(`
    SELECT 
      stays.id as stay_id,
      cats.name as cat_name,
      clients.name as owner_name,
      hl.date,
      hl.ate_well,
      hl.abnormal_behavior,
      hl.medication,
      hl.incident,
      hl.comments as health_comments
    FROM stays
    JOIN cats ON stays.cat_id = cats.id
    JOIN clients ON cats.owner_id = clients.id
    LEFT JOIN (
      SELECT * FROM health_logs 
      WHERE id IN (SELECT MAX(id) FROM health_logs GROUP BY stay_id)
    ) hl ON stays.id = hl.stay_id
    WHERE stays.is_archived = ?
    ORDER BY stays.arrival_date DESC
  `).all(archived);
  
  // Convert 0/1 to boolean for the frontend, preserving null
  const sanitizedReports = reports.map((r: any) => ({
    ...r,
    ate_well: r.ate_well === null ? null : r.ate_well === 1,
    abnormal_behavior: r.abnormal_behavior === null ? null : r.abnormal_behavior === 1
  }));
  
  res.json(sanitizedReports);
});

app.get("/api/health-logs/:stayId", (req, res) => {
  const logs = db.prepare("SELECT * FROM health_logs WHERE stay_id = ? ORDER BY date DESC").all(req.params.stayId);
  res.json(logs);
});

app.post("/api/health-logs", (req, res) => {
  console.log("Creating health log:", req.body);
  const { stay_id, date, ate_well, abnormal_behavior, medication, incident, comments } = req.body;
  try {
    const result = db.prepare("INSERT INTO health_logs (stay_id, date, ate_well, abnormal_behavior, medication, incident, comments) VALUES (?, ?, ?, ?, ?, ?, ?)").run(stay_id, date, ate_well ? 1 : 0, abnormal_behavior ? 1 : 0, medication, incident, comments);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    console.error("Error creating health log:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/health-logs/:id", (req, res) => {
  const { date, ate_well, abnormal_behavior, medication, incident, comments } = req.body;
  db.prepare("UPDATE health_logs SET date = ?, ate_well = ?, abnormal_behavior = ?, medication = ?, incident = ?, comments = ? WHERE id = ?").run(date, ate_well ? 1 : 0, abnormal_behavior ? 1 : 0, medication, incident, comments, req.params.id);
  res.json({ success: true });
});

app.delete("/api/health-logs/:id", (req, res) => {
  console.log(`Deleting health log ${req.params.id}`);
  try {
    const result = db.prepare("DELETE FROM health_logs WHERE id = ?").run(req.params.id);
    console.log(`Deleted ${result.changes} rows`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting health log:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Media
app.get("/api/media/:stayId", (req, res) => {
  const media = db.prepare("SELECT * FROM media WHERE stay_id = ?").all(req.params.stayId);
  res.json(media);
});

app.post("/api/media/:stayId", upload.single("file"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const type = req.file.mimetype.startsWith("video") ? "video" : "image";
  const url = `/uploads/${req.file.filename}`;
  const result = db.prepare("INSERT INTO media (stay_id, type, url, filename) VALUES (?, ?, ?, ?)").run(req.params.stayId, type, url, req.file.filename);
  res.json({ id: result.lastInsertRowid, url, type });
});

app.delete("/api/media/:id", (req, res) => {
  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(req.params.id) as any;
  if (media) {
    const filePath = path.join(uploadDir, media.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare("DELETE FROM media WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

// Invoices
app.get("/api/invoices/:stayId", (req, res) => {
  const invoices = db.prepare("SELECT * FROM invoices WHERE stay_id = ?").all(req.params.stayId);
  res.json(invoices);
});

app.post("/api/invoices", (req, res) => {
  const { stay_id, amount, service_type, created_at } = req.body;
  
  const year = created_at ? created_at.substring(0, 4) : new Date().getFullYear().toString();
  const lastInvoice = db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1").get(`${year}-%`) as {invoice_number: string} | undefined;
  
  let nextNum = 1;
  if (lastInvoice && lastInvoice.invoice_number) {
    const parts = lastInvoice.invoice_number.split('-');
    if (parts.length === 2) {
      nextNum = parseInt(parts[1], 10) + 1;
    }
  }
  const invoice_number = `${year}-${String(nextNum).padStart(4, '0')}`;
  
  const result = db.prepare("INSERT INTO invoices (stay_id, amount, service_type, created_at, invoice_number) VALUES (?, ?, ?, ?, ?)").run(stay_id, amount, service_type, created_at, invoice_number);
  res.json({ id: result.lastInsertRowid, invoice_number });
});

app.put("/api/invoices/:id", (req, res) => {
  const { amount, service_type, created_at } = req.body;
  db.prepare("UPDATE invoices SET amount = ?, service_type = ?, created_at = ? WHERE id = ?").run(amount, service_type, created_at, req.params.id);
  res.json({ success: true });
});

app.delete("/api/invoices/:id", (req, res) => {
  console.log(`Deleting invoice ${req.params.id}`);
  try {
    const result = db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
    console.log(`Deleted ${result.changes} rows`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting invoice:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Statistics
app.get("/api/stats", (req, res) => {
  const totalBoxesSetting = db.prepare("SELECT value FROM settings WHERE key = 'total_boxes'").get();
  const totalBoxes = totalBoxesSetting ? parseInt(totalBoxesSetting.value) : 3;
  
  // Monthly Revenue
  const revenue = db.prepare(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      SUM(amount) as total
    FROM invoices
    GROUP BY month
    ORDER BY month DESC
  `).all();

  // Box Occupancy
  const occupancy = db.prepare(`
    SELECT 
      strftime('%Y-%m', arrival_date) as month,
      COUNT(*) as stays_count
    FROM stays
    GROUP BY month
    ORDER BY month DESC
  `).all();

  res.json({ revenue, occupancy, totalBoxes });
});

// Backup & Restore
app.get("/api/backup", (req, res) => {
  const full = req.query.full === 'true';
  const data: any = {
    clients: db.prepare("SELECT * FROM clients").all(),
    cats: db.prepare("SELECT * FROM cats").all(),
    stays: db.prepare("SELECT * FROM stays").all(),
    health_logs: db.prepare("SELECT * FROM health_logs").all(),
    invoices: db.prepare("SELECT * FROM invoices").all(),
    settings: db.prepare("SELECT * FROM settings").all(),
  };
  if (full) {
    data.media = db.prepare("SELECT * FROM media").all();
  }
  res.json(data);
});

app.post("/api/restore", (req, res) => {
  const data = req.body;
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  log(`Starting restore process with data keys: ${Object.keys(data || {}).join(", ")}`);
  
  if (!data || typeof data !== 'object') {
    log("Invalid backup data format");
    return res.status(400).json({ error: "Invalid backup data format" });
  }

  try {
    const restoreTx = db.transaction((data: any) => {
      log("Clearing existing data...");
      db.prepare("DELETE FROM health_logs").run();
      db.prepare("DELETE FROM invoices").run();
      db.prepare("DELETE FROM media").run();
      db.prepare("DELETE FROM stays").run();
      db.prepare("DELETE FROM cats").run();
      db.prepare("DELETE FROM clients").run();
      db.prepare("DELETE FROM settings").run();
      db.prepare("DELETE FROM sqlite_sequence").run();

      if (data.clients && Array.isArray(data.clients)) {
        log(`Restoring ${data.clients.length} clients...`);
        const insert = db.prepare("INSERT INTO clients (id, name, address, email, phone) VALUES (?, ?, ?, ?, ?)");
        data.clients.forEach((c: any) => insert.run(c.id, c.name, c.address, c.email, c.phone));
      }
      if (data.cats && Array.isArray(data.cats)) {
        log(`Restoring ${data.cats.length} cats...`);
        const insert = db.prepare("INSERT INTO cats (id, owner_id, name, species, breed, color, chip_number, vaccine_tc_date, vaccine_l_date, parasite_treatment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        data.cats.forEach((c: any) => insert.run(c.id, c.owner_id, c.name, c.species || 'Chat', c.breed, c.color, c.chip_number, c.vaccine_tc_date, c.vaccine_l_date, c.parasite_treatment_date));
      }
      if (data.stays && Array.isArray(data.stays)) {
        log(`Restoring ${data.stays.length} stays...`);
        const insert = db.prepare("INSERT INTO stays (id, cat_id, box_number, arrival_date, planned_departure, actual_departure, comments, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        data.stays.forEach((s: any) => insert.run(s.id, s.cat_id, s.box_number, s.arrival_date, s.planned_departure, s.actual_departure, s.comments, s.is_archived ? 1 : 0));
      }
      if (data.health_logs && Array.isArray(data.health_logs)) {
        log(`Restoring ${data.health_logs.length} health logs...`);
        const insert = db.prepare("INSERT INTO health_logs (id, stay_id, date, ate_well, abnormal_behavior, medication, incident, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        data.health_logs.forEach((l: any) => insert.run(l.id, l.stay_id, l.date, l.ate_well ? 1 : 0, l.abnormal_behavior ? 1 : 0, l.medication, l.incident, l.comments));
      }
      if (data.invoices && Array.isArray(data.invoices)) {
        log(`Restoring ${data.invoices.length} invoices...`);
        const insert = db.prepare("INSERT INTO invoices (id, stay_id, amount, service_type, created_at) VALUES (?, ?, ?, ?, ?)");
        data.invoices.forEach((i: any) => insert.run(i.id, i.stay_id, i.amount, i.service_type, i.created_at));
      }
      if (data.settings && Array.isArray(data.settings)) {
        log(`Restoring settings...`);
        const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        data.settings.forEach((s: any) => insert.run(s.key, s.value));
      }
      if (data.media && Array.isArray(data.media)) {
        log(`Restoring ${data.media.length} media...`);
        const insert = db.prepare("INSERT INTO media (id, stay_id, type, url, filename) VALUES (?, ?, ?, ?, ?)");
        data.media.forEach((m: any) => insert.run(m.id, m.stay_id, m.type, m.url, m.filename));
      }
    });

    restoreTx(data);
    log("Restore successful.");
    res.json({ success: true, logs });
  } catch (err: any) {
    log(`Restore error: ${err.message}`);
    res.status(500).json({ error: "Restore failed: " + err.message, logs });
  }
});

app.use("/uploads", express.static(uploadDir));

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});


async function startServer() {
  console.log("Starting server process...");
  
  console.log("Starting database initialization...");
  db = new Database(path.join(__dirname, "chathotel.db"), { readonly: false });
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  console.log("Database connected.");

  // Initialize Database
  console.log("Initializing database tables...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      email TEXT,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS cats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER,
      name TEXT NOT NULL,
      species TEXT DEFAULT 'Chat',
      breed TEXT,
      color TEXT,
      chip_number TEXT,
      vaccine_tc_date TEXT,
      vaccine_l_date TEXT,
      parasite_treatment_date TEXT,
      FOREIGN KEY (owner_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cat_id INTEGER,
      box_number INTEGER,
      arrival_date TEXT,
      planned_departure TEXT,
      actual_departure TEXT,
      comments TEXT,
      is_archived INTEGER DEFAULT 0,
      FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stay_id INTEGER,
      date TEXT,
      ate_well BOOLEAN,
      abnormal_behavior BOOLEAN,
      medication TEXT,
      incident TEXT,
      comments TEXT,
      FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stay_id INTEGER,
      type TEXT, -- 'image' or 'video'
      url TEXT,
      filename TEXT,
      FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stay_id INTEGER,
      amount REAL,
      service_type TEXT,
      created_at TEXT,
      invoice_number TEXT,
      FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE
    );
  `);

  // Migration for existing tables
  try { db.exec("ALTER TABLE cats ADD COLUMN species TEXT DEFAULT 'Chat'"); } catch(e) {}
  try { db.exec("ALTER TABLE stays ADD COLUMN is_archived INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE cats ADD COLUMN vaccine_tc_date TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE cats ADD COLUMN vaccine_l_date TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE cats ADD COLUMN parasite_treatment_date TEXT"); } catch(e) {}
  try { 
    db.exec("ALTER TABLE invoices ADD COLUMN invoice_number TEXT"); 
    // Backfill existing invoices
    const existingInvoices = db.prepare("SELECT id, created_at FROM invoices ORDER BY created_at ASC, id ASC").all() as {id: number, created_at: string}[];
    let currentYear = '';
    let counter = 1;
    for (const inv of existingInvoices) {
      const year = inv.created_at ? inv.created_at.substring(0, 4) : new Date().getFullYear().toString();
      if (year !== currentYear) {
        currentYear = year;
        counter = 1;
      }
      const num = `${year}-${String(counter).padStart(4, '0')}`;
      db.prepare("UPDATE invoices SET invoice_number = ? WHERE id = ?").run(num, inv.id);
      counter++;
    }
  } catch(e) {}
  
  // Ensure default total_boxes
  try {
    const exists = db.prepare("SELECT * FROM settings WHERE key = 'total_boxes'").get();
    if (!exists) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("total_boxes", "3");
    }
  } catch(e) {}

  console.log("Database tables initialized.");

  // Parse command line arguments for port
  const args = process.argv.slice(2);
  console.log("Command line args:", args);
  
  let portArg: number | null = null;
  
  // Handle --port 3007
  const portArgIndex = args.indexOf('--port');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    portArg = parseInt(args[portArgIndex + 1]);
  }
  
  // Handle --port=3007
  if (!portArg) {
    const portEq = args.find(arg => arg.startsWith('--port='));
    if (portEq) {
      portArg = parseInt(portEq.split('=')[1]);
    }
  }

  const PORT = portArg || Number(process.env.PORT) || 3000;
  console.log(`Resolved PORT: ${PORT}`);

  app.get("/api/health", (req, res) => {
    console.log("Health check requested.");
    try {
      const clientsCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
      res.json({ 
        status: "ok", 
        db: "connected", 
        clients: clientsCount.count,
        serverTime: new Date().toISOString(),
        version: "1.0.1"
      });
    } catch (err: any) {
      console.error("Health check error:", err);
      res.status(500).json({ status: "error", db: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");
  } else {
    console.log("Serving production build...");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log("Ready to receive requests.");
  });
}

startServer().catch(err => {
  console.error("CRITICAL SERVER STARTUP ERROR:", err);
  process.exit(1);
});

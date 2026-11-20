const path = require('path');
const express = require('express');
const {
  normalizeBloodGroup,
  compatibleDonorGroups,
  DONATION_GAP_DAYS,
} = require('./compatibility');

const PHONE_RE = /^\+?[0-9]{10,13}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanPhone = (v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : '');
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const today = () => new Date().toISOString().slice(0, 10);

function createApp(pool) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  // ALB health check: kept shallow so a DB blip doesn't make the ASG
  // replace every instance.
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // ---- Donors -------------------------------------------------------------
  app.post('/api/donors', async (req, res, next) => {
    try {
      const name = clean(req.body.name, 100);
      const bloodGroup = normalizeBloodGroup(req.body.bloodGroup);
      const city = titleCase(clean(req.body.city, 60));
      const phone = cleanPhone(req.body.phone);
      const lastDonationDate = req.body.lastDonationDate || null;

      const errors = [];
      if (!name) errors.push('Name is required');
      if (!bloodGroup) errors.push('A valid blood group is required');
      if (!city) errors.push('City is required');
      if (!PHONE_RE.test(phone)) errors.push('Phone must be 10–13 digits');
      if (lastDonationDate && (!DATE_RE.test(lastDonationDate) || lastDonationDate > today()))
        errors.push('Last donation date must be a past date');
      if (req.body.consent !== true) errors.push('Consent to share your phone number is required');
      if (errors.length) return res.status(400).json({ errors });

      const [result] = await pool.query(
        `INSERT INTO donors (name, blood_group, city, phone, last_donation_date)
         VALUES (?, ?, ?, ?, ?)`,
        [name, bloodGroup, city, phone, lastDonationDate]
      );
      res.status(201).json({ id: result.insertId, message: 'Thank you for registering as a donor!' });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ errors: ['This phone number is already registered'] });
      next(err);
    }
  });

  // Finds donors in a city who can give to the patient's blood group and
  // are eligible today (no donation in the last 90 days).
  app.get('/api/donors/search', async (req, res, next) => {
    try {
      const bloodGroup = normalizeBloodGroup(req.query.bloodGroup);
      const city = clean(req.query.city, 60);
      if (!bloodGroup || !city)
        return res.status(400).json({ errors: ['Blood group and city are required'] });

      const groups = compatibleDonorGroups(bloodGroup);
      const [rows] = await pool.query(
        `SELECT id, name, blood_group, city, phone, last_donation_date
           FROM donors
          WHERE city = ?
            AND blood_group IN (?)
            AND is_available = TRUE
            AND (last_donation_date IS NULL
                 OR last_donation_date <= CURDATE() - INTERVAL ? DAY)
          ORDER BY (blood_group = ?) DESC, created_at DESC
          LIMIT 50`,
        [city, groups, DONATION_GAP_DAYS, bloodGroup]
      );

      res.json({
        recipientGroup: bloodGroup,
        compatibleGroups: groups,
        donors: rows.map((r) => ({
          id: r.id,
          name: r.name,
          bloodGroup: r.blood_group,
          city: r.city,
          phone: r.phone,
          exactMatch: r.blood_group === bloodGroup,
          lastDonationDate: r.last_donation_date,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // ---- Urgent blood requests ---------------------------------------------
  app.post('/api/requests', async (req, res, next) => {
    try {
      const patientName = clean(req.body.patientName, 100);
      const bloodGroup = normalizeBloodGroup(req.body.bloodGroup);
      const units = Number(req.body.units);
      const hospital = clean(req.body.hospital, 150);
      const city = titleCase(clean(req.body.city, 60));
      const contactPhone = cleanPhone(req.body.contactPhone);
      const neededBy = req.body.neededBy;

      const errors = [];
      if (!patientName) errors.push('Patient name is required');
      if (!bloodGroup) errors.push('A valid blood group is required');
      if (!Number.isInteger(units) || units < 1 || units > 20) errors.push('Units must be 1–20');
      if (!hospital) errors.push('Hospital is required');
      if (!city) errors.push('City is required');
      if (!PHONE_RE.test(contactPhone)) errors.push('Contact phone must be 10–13 digits');
      if (!DATE_RE.test(neededBy || '') || neededBy < today())
        errors.push('Needed-by date must be today or later');
      if (errors.length) return res.status(400).json({ errors });

      const [result] = await pool.query(
        `INSERT INTO blood_requests
           (patient_name, blood_group, units, hospital, city, contact_phone, needed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [patientName, bloodGroup, units, hospital, city, contactPhone, neededBy]
      );
      res.status(201).json({ id: result.insertId, message: 'Request posted' });
    } catch (err) {
      next(err);
    }
  });

  // Open requests (needed today or later), most urgent first.
  app.get('/api/requests', async (req, res, next) => {
    try {
      const city = clean(req.query.city, 60);
      const params = [];
      let where = 'needed_by >= CURDATE()';
      if (city) {
        where += ' AND city = ?';
        params.push(city);
      }
      const [rows] = await pool.query(
        `SELECT id, patient_name, blood_group, units, hospital, city, contact_phone, needed_by
           FROM blood_requests WHERE ${where}
          ORDER BY needed_by ASC, created_at DESC LIMIT 50`,
        params
      );
      res.json(
        rows.map((r) => ({
          id: r.id,
          patientName: r.patient_name,
          bloodGroup: r.blood_group,
          units: r.units,
          hospital: r.hospital,
          city: r.city,
          contactPhone: r.contact_phone,
          neededBy: r.needed_by,
        }))
      );
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', (req, res) => res.status(404).json({ errors: ['Not found'] }));

  // Local development only: serve the frontend from the same process.
  // On AWS the frontend is served by CloudFront + S3 instead.
  if (process.env.SERVE_FRONTEND === 'true') {
    const dir = process.env.FRONTEND_DIR || path.join(__dirname, '..', '..', 'frontend');
    app.use(express.static(dir));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')
      return res.status(400).json({ errors: ['Invalid request body'] });
    console.error(err);
    res.status(500).json({ errors: ['Something went wrong, please try again'] });
  });

  return app;
}

module.exports = { createApp };

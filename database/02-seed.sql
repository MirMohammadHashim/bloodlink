-- Sample data for local development only (fictional names and numbers).

INSERT INTO donors (name, blood_group, city, phone, last_donation_date) VALUES
  ('Aarav Sharma',  'O-',  'Pune',   '9000000001', NULL),
  ('Priya Nair',    'B+',  'Pune',   '9000000002', CURDATE() - INTERVAL 200 DAY),
  ('Rohan Mehta',   'B+',  'Pune',   '9000000003', CURDATE() - INTERVAL 30 DAY),  -- not eligible yet
  ('Sneha Kulkarni','O+',  'Pune',   '9000000004', CURDATE() - INTERVAL 120 DAY),
  ('Vikram Singh',  'A+',  'Pune',   '9000000005', NULL),
  ('Ananya Iyer',   'AB-', 'Mumbai', '9000000006', NULL),
  ('Kabir Khan',    'A-',  'Mumbai', '9000000007', CURDATE() - INTERVAL 95 DAY),
  ('Meera Joshi',   'O+',  'Mumbai', '9000000008', NULL),
  ('Arjun Reddy',   'B-',  'Delhi',  '9000000009', NULL),
  ('Isha Gupta',    'AB+', 'Delhi',  '9000000010', CURDATE() - INTERVAL 10 DAY);  -- not eligible yet

INSERT INTO blood_requests (patient_name, blood_group, units, hospital, city, contact_phone, needed_by) VALUES
  ('R. Patil',   'B+', 2, 'Sassoon General Hospital', 'Pune',   '9100000001', CURDATE() + INTERVAL 1 DAY),
  ('S. Desai',   'O-', 1, 'KEM Hospital',             'Mumbai', '9100000002', CURDATE() + INTERVAL 3 DAY);

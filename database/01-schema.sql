-- BloodLink schema (data tier).
-- The API also creates these tables automatically on startup, so you never
-- need to connect to the private RDS instance by hand.

CREATE TABLE IF NOT EXISTS donors (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(100) NOT NULL,
  blood_group        VARCHAR(3)   NOT NULL,
  city               VARCHAR(60)  NOT NULL,
  phone              VARCHAR(20)  NOT NULL UNIQUE,
  last_donation_date DATE NULL,
  is_available       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city_group (city, blood_group)
);

CREATE TABLE IF NOT EXISTS blood_requests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  patient_name  VARCHAR(100) NOT NULL,
  blood_group   VARCHAR(3)   NOT NULL,
  units         TINYINT      NOT NULL DEFAULT 1,
  hospital      VARCHAR(150) NOT NULL,
  city          VARCHAR(60)  NOT NULL,
  contact_phone VARCHAR(20)  NOT NULL,
  needed_by     DATE         NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city_needed (city, needed_by)
);

-- Reference schema for MySQL 8. The app also creates these tables automatically on startup
-- (SQLAlchemy create_all), so you only need this file if you prefer to create them by hand.

CREATE DATABASE IF NOT EXISTS click2clean CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a dedicated user (change the password!):
-- CREATE USER 'c2c_user'@'localhost' IDENTIFIED BY 'CHANGE_ME';
-- GRANT ALL PRIVILEGES ON click2clean.* TO 'c2c_user'@'localhost';
-- FLUSH PRIVILEGES;

USE click2clean;

CREATE TABLE IF NOT EXISTS admin_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL,
  created_at    DATETIME     NOT NULL,
  INDEX ix_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  tracking_code  VARCHAR(16)  NOT NULL UNIQUE,
  category       VARCHAR(20)  NOT NULL,            -- wet | dry | hazardous | other
  note           TEXT         NULL,
  photo_filename VARCHAR(100) NOT NULL,
  latitude       DOUBLE       NULL,
  longitude      DOUBLE       NULL,
  user_id        INT          NULL,
  assigned_worker_id INT      NULL,
  ward           VARCHAR(120) NULL,
  description    TEXT         NULL,
  remarks        TEXT         NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'reported',  -- reported | submitted | assigned | in_progress | cleaned | rejected | resolved
  created_at     DATETIME     NOT NULL,            -- UTC
  updated_at     DATETIME     NOT NULL,            -- UTC
  INDEX ix_reports_user_id (user_id),
  INDEX ix_reports_assigned_worker_id (assigned_worker_id),
  INDEX ix_reports_status (status),
  INDEX ix_reports_category (category),
  INDEX ix_reports_created_at (created_at)
) ENGINE=InnoDB;

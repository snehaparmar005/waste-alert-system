SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS wards;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('citizen', 'gov', 'admin') NOT NULL DEFAULT 'citizen',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    category_slug ENUM('biodegradable', 'hazardous', 'non_biodegradable') NOT NULL,
    corrected_slug ENUM('biodegradable', 'hazardous', 'non_biodegradable') NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    needs_retake BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    ward VARCHAR(120) DEFAULT 'Ward 12 - Morar',
    remarks TEXT,
    status ENUM('reported', 'assigned', 'cleaned') NOT NULL DEFAULT 'reported',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ward VARCHAR(120) NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL,
    telegram VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    ward VARCHAR(120) NOT NULL,
    channel VARCHAR(80) NOT NULL,
    delivery_status ENUM('queued', 'delivered', 'failed') NOT NULL DEFAULT 'queued',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

INSERT IGNORE INTO wards (ward, email, telegram) VALUES
('Ward 12 - Morar', 'ward12.nn@gov.in', '@ward12_alert_bot'),
('Ward 14 - City Center', 'ward14.nn@gov.in', '@ward14_alert_bot');

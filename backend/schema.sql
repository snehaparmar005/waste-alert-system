SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
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
    role ENUM('citizen', 'gov', 'worker', 'admin') NOT NULL DEFAULT 'citizen',
    phone VARCHAR(20) NULL,
    organisation VARCHAR(120) NULL,
    nagar_nigam_id INT NULL,
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
    description TEXT,
    reference_id VARCHAR(20) UNIQUE,
    status ENUM('submitted', 'assigned', 'in_progress', 'cleaned', 'rejected') NOT NULL DEFAULT 'submitted',
    assigned_worker_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_worker_id) REFERENCES users(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_report_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(120),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100),
    entity_id INT NULL,
    ip_address VARCHAR(45),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO wards (ward, email, telegram) VALUES
('Ward 12 - Morar', 'ward12.nn@gov.in', '@ward12_alert_bot'),
('Ward 14 - City Center', 'ward14.nn@gov.in', '@ward14_alert_bot');

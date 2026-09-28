CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id BIGINT UNSIGNED NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  platform ENUM('android', 'ios') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_tokens_token (expo_push_token),
  KEY idx_push_tokens_device_active (device_id, is_active),
  CONSTRAINT fk_push_tokens_device
    FOREIGN KEY (device_id) REFERENCES devices(id)
    ON DELETE CASCADE
);

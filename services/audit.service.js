const { AuditLog } = require('../models');

const logAudit = async ({
  actor_user_id,
  action,
  entity_type,
  entity_id = null,
  old_values = null,
  new_values = null,
  ip_address = null,
  transaction = null,
}) => {
  try {
    await AuditLog.create(
      {
        actor_user_id,
        action,
        entity_type,
        entity_id: entity_id ? String(entity_id) : null,
        old_values,
        new_values,
        ip_address,
      },
      { transaction }
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

module.exports = {
  logAudit,
};

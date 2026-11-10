module.exports = (sequelize, DataTypes) => {
  const OtpVerification = sequelize.define('OtpVerification', {
    phone: { type: DataTypes.STRING(50), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    code_hash: { type: DataTypes.STRING(128), allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_sent_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'otp_verifications', timestamps: true, underscored: true });
  return OtpVerification;
};

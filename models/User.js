const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ContactSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  relation: String,
}, { _id: false });

const ActivitySchema = new mongoose.Schema({
  id: String,
  type: String,
  title: String,
  detail: String,
  at: String,
}, { _id: false });

const ChatMessageSchema = new mongoose.Schema({
  role: String,
  content: String,
}, { _id: false });

const SettingsSchema = new mongoose.Schema({
  notifRoute: { type: Boolean, default: true },
  notifWalk: { type: Boolean, default: true },
  notifSos: { type: Boolean, default: true },
}, { _id: false });

const PersonalSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  dob: { type: String, default: '' },
  gender: { type: String, default: '' },
  address: { type: String, default: '' },
  idType: { type: String, default: '' },
  idNumber: { type: String, default: '' },
  weightKg: { type: String, default: '' },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  email: { type: String, default: null, unique: true, sparse: true, lowercase: true, trim: true },
  username: { type: String, default: null, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },

  verified: { type: Boolean, default: true },
  onboardingComplete: { type: Boolean, default: false },
  personal: { type: PersonalSchema, default: () => ({}) },
  contacts: { type: [ContactSchema], default: [] },
  country: { type: String, default: 'India' },
  emergencyNumber: { type: String, default: '112' },
  settings: { type: SettingsSchema, default: () => ({}) },
  activity: { type: [ActivitySchema], default: [] },
  chat: { type: [ChatMessageSchema], default: [] },
}, { timestamps: true });

UserSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

UserSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);

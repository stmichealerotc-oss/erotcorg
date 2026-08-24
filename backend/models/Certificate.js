const mongoose = require('mongoose');
const Counter  = require('./Counter');

const SignatureSchema = new mongoose.Schema({
  signedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signerName: String,
  signerTitle: String,
  signedAt:   { type: Date, default: Date.now }
}, { _id: false });

const CertificateSchema = new mongoose.Schema({
  // Auto-generated number e.g. BAP-2026-0042
  certificateNumber: { type: String, unique: true, sparse: true },

  type: {
    type: String,
    required: true,
    enum: ['baptism', 'marriage', 'membership', 'chrismation', 'death', 'other']
  },

  // Primary member (always required)
  primaryMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },

  // Secondary member — spouse for marriage certificates
  secondaryMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },

  // Date the sacrament / event took place
  eventDate: { type: Date, required: true },

  // Date the certificate was printed / issued
  issuedDate: { type: Date },

  officiant:  { type: String, trim: true },   // priest / officiant name
  witnesses:  [{ type: String, trim: true }],
  godparents: [{ type: String, trim: true }], // baptism (legacy - use baptismDetails.godparents for new records)
  notes:      { type: String, trim: true },

  status: {
    type: String,
    enum: ['draft', 'signed', 'issued', 'cancelled'],
    default: 'draft'
  },

  // Generated PDF stored in Azure Blob
  pdfUrl:     String,
  blobPath:   String,

  signatures: [SignatureSchema],

  // Optional fee tracking
  fee:               { type: Number, default: 0 },
  feeTransactionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },

  // ═══════════════════════════════════════════════════════════════
  // MARRIAGE-SPECIFIC DETAILS
  // ═══════════════════════════════════════════════════════════════
  marriageDetails: {
    groom: {
      fullName:    { type: String, trim: true },
      fatherName:  { type: String, trim: true },
      motherName:  { type: String, trim: true },
      birthDate:   Date,
      birthPlace:  { type: String, trim: true },
      occupation:  { type: String, trim: true },
      baptismCert: { type: String, trim: true }, // Certificate number
      age:         Number // Calculated or entered
    },
    bride: {
      fullName:    { type: String, trim: true },
      fatherName:  { type: String, trim: true },
      motherName:  { type: String, trim: true },
      birthDate:   Date,
      birthPlace:  { type: String, trim: true },
      occupation:  { type: String, trim: true },
      baptismCert: { type: String, trim: true },
      age:         Number
    },
    ceremony: {
      place:          { type: String, trim: true }, // Church location
      bestMan:        { type: String, trim: true },
      maidOfHonor:    { type: String, trim: true },
      bannsPublished: [Date], // Array of 3 dates when banns were announced
      bannsChurch:    { type: String, trim: true }  // Where banns were published
    },
    civil: {
      date:         Date,
      certNumber:   { type: String, trim: true },
      location:     { type: String, trim: true },
      required:     { type: Boolean, default: false }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BAPTISM-SPECIFIC DETAILS
  // ═══════════════════════════════════════════════════════════════
  baptismDetails: {
    child: {
      fullName:    { type: String, trim: true },
      baptismName: { type: String, trim: true }, // Christian name (may differ from legal)
      dob:         Date,
      birthPlace:  { type: String, trim: true },
      gender:      { type: String, enum: ['male', 'female', 'other'] },
      age:         Number, // At time of baptism
      nationality: { type: String, trim: true }  // e.g., "Ethiopian", "Australian"
    },
    parents: {
      fatherName:     { type: String, trim: true },
      fatherBaptized: { type: Boolean, default: false },
      fatherMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
      fatherSignature: String, // Signature image or "Signed" text
      
      motherName:     { type: String, trim: true },
      motherBaptized: { type: Boolean, default: false },
      motherMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
      
      married:        { type: Boolean, default: false }
    },
    godparents: {
      godfather: {
        name:      { type: String, trim: true },
        phone:     { type: String, trim: true },
        memberId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        signature: String // "Signed" or signature image path
      },
      godmother: {
        name:      { type: String, trim: true },
        phone:     { type: String, trim: true },
        memberId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        signature: String
      }
    },
    ceremony: {
      place:         { type: String, trim: true },
      baptismMethod: { type: String, enum: ['immersion', 'pouring', 'sprinkling', 'infant', 'adult'] }
    },
    // Confession father (for catechism)
    confessionFather: {
      name:      { type: String, trim: true },
      title:     { type: String, trim: true }, // "Fr.", "Abune", etc.
      signature: String // "Signed" or signature image path
    }
  },

  // Language preference for certificate
  language: {
    type: String,
    enum: ['english', 'tigrinya', 'bilingual'],
    default: 'bilingual'
  },

  // Church seal information
  churchSeal: {
    applied:   { type: Boolean, default: false },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedAt: Date
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate certificate number on save
CertificateSchema.pre('save', async function (next) {
  if (this.isNew && !this.certificateNumber) {
    try {
      const PREFIX = {
        baptism:    'BAP',
        marriage:   'MAR',
        membership: 'MEM',
        chrismation:'CHR',
        death:      'DTH',
        other:      'CRT'
      };
      const prefix = PREFIX[this.type] || 'CRT';
      const year   = new Date().getFullYear();
      const seq    = await Counter.getNextSequence(`certificate_${prefix}_${year}`);
      this.certificateNumber = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
    } catch (err) {
      console.error('Certificate number generation failed:', err);
    }
  }
  next();
});

CertificateSchema.index({ primaryMember: 1 });
CertificateSchema.index({ secondaryMember: 1 });
CertificateSchema.index({ type: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// HELPER METHODS
// ═══════════════════════════════════════════════════════════════

// Populate details from member records
CertificateSchema.methods.populateFromMembers = async function() {
  if (this.type === 'marriage' && this.primaryMember && this.secondaryMember) {
    const Member = mongoose.model('Member');
    const groom = await Member.findById(this.primaryMember);
    const bride = await Member.findById(this.secondaryMember);
    
    if (groom && bride) {
      this.marriageDetails = this.marriageDetails || {};
      
      this.marriageDetails.groom = {
        fullName: `${groom.firstName} ${groom.lastName}`.trim(),
        birthDate: groom.dob,
        birthPlace: groom.birthPlace || '',
        occupation: groom.occupation || '',
        age: groom.dob ? Math.floor((this.eventDate - groom.dob) / (365.25 * 24 * 60 * 60 * 1000)) : null
      };
      
      this.marriageDetails.bride = {
        fullName: `${bride.firstName} ${bride.lastName}`.trim(),
        birthDate: bride.dob,
        birthPlace: bride.birthPlace || '',
        occupation: bride.occupation || '',
        age: bride.dob ? Math.floor((this.eventDate - bride.dob) / (365.25 * 24 * 60 * 60 * 1000)) : null
      };
    }
  }
  
  if (this.type === 'baptism' && this.primaryMember) {
    const Member = mongoose.model('Member');
    const child = await Member.findById(this.primaryMember);
    
    if (child) {
      this.baptismDetails = this.baptismDetails || {};
      this.baptismDetails.child = {
        fullName: `${child.firstName} ${child.lastName}`.trim(),
        dob: child.dob,
        birthPlace: child.birthPlace || '',
        gender: child.gender || 'other',
        age: child.dob ? Math.floor((this.eventDate - child.dob) / (365.25 * 24 * 60 * 60 * 1000)) : null
      };
    }
  }
  
  return this;
};

// Validate marriage certificate requirements
CertificateSchema.methods.validateMarriage = function() {
  const errors = [];
  
  if (!this.marriageDetails) {
    errors.push('Marriage details are required');
    return { valid: false, errors };
  }
  
  // Check ages
  if (this.marriageDetails.groom?.age < 18) {
    errors.push('Groom must be at least 18 years old');
  }
  if (this.marriageDetails.bride?.age < 18) {
    errors.push('Bride must be at least 18 years old');
  }
  
  // Check baptism certificates
  if (!this.marriageDetails.groom?.baptismCert) {
    errors.push('Groom baptism certificate is required');
  }
  if (!this.marriageDetails.bride?.baptismCert) {
    errors.push('Bride baptism certificate is required');
  }
  
  // Check banns (should be published 3 times)
  if (!this.marriageDetails.ceremony?.bannsPublished || 
      this.marriageDetails.ceremony.bannsPublished.length < 3) {
    errors.push('Marriage banns must be published 3 times');
  }
  
  // Check witnesses
  if (!this.witnesses || this.witnesses.length < 2) {
    errors.push('At least 2 witnesses are required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate baptism certificate requirements
CertificateSchema.methods.validateBaptism = function() {
  const errors = [];
  
  if (!this.baptismDetails) {
    errors.push('Baptism details are required');
    return { valid: false, errors };
  }
  
  // Check at least one parent is Orthodox
  const hasOrthodoxParent = 
    this.baptismDetails.parents?.fatherBaptized || 
    this.baptismDetails.parents?.motherBaptized;
  
  if (!hasOrthodoxParent) {
    errors.push('At least one parent must be a baptized Orthodox Christian');
  }
  
  // Check godparents
  if (!this.baptismDetails.godparents?.godfather?.name && 
      !this.baptismDetails.godparents?.godmother?.name) {
    errors.push('At least one godparent is required');
  }
  
  // For adult baptisms, check catechism
  if (this.baptismDetails.child?.age >= 7) {
    if (!this.baptismDetails.catechism?.completed) {
      errors.push('Adult/child baptisms require completed catechism');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = mongoose.model('Certificate', CertificateSchema);

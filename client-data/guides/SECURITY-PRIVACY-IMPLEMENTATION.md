# 🛡️ Security & Privacy Implementation Guide

**SwanStudios Personal Training - Client Data Protection**
**Version:** 1.0
**Last Updated:** 2025-11-05
**Compliance:** HIPAA-Ready, GDPR-Compliant

---

## 🎯 Executive Summary

This guide implements comprehensive security and privacy controls for SwanStudios client data. While we are not a covered entity under HIPAA, we follow HIPAA technical safeguards as best practice to ensure maximum client trust and data protection.

**Security Posture:** Defense-in-depth with encryption at rest, encryption in transit, access controls, and audit logging.

---

## 📋 Table of Contents

1. [Data Classification](#data-classification)
2. [Encryption Standards](#encryption-standards)
3. [Access Control Matrix](#access-control-matrix)
4. [Consent Management](#consent-management)
5. [Photo & Media Security](#photo--media-security)
6. [PII Redaction Rules](#pii-redaction-rules)
7. [Spirit Name (Alias) System](#spirit-name-alias-system)
8. [Backup & Recovery](#backup--recovery)
9. [Breach Response Protocol](#breach-response-protocol)
10. [Audit & Compliance](#audit--compliance)

---

## 1. Data Classification

### **Tier 1: Public Data** (No Protection Needed)
- Anonymous statistics (e.g., "Average client loses 12 lbs in 8 weeks")
- Public SwanStudios content (marketing materials)
- Generic workout templates (not client-specific)

### **Tier 2: Confidential Data** (Encrypted, Access-Controlled)
- Client first name + last initial (e.g., "John D.")
- Spirit Name (alias for AI interactions)
- Workout plans and progress reports (no identifying details)
- Training notes

### **Tier 3: Sensitive Data** (Encrypted + Audited)
- Full client name and contact information
- Medical history and injury reports
- Body measurements and progress photos
- Payment information (Stripe tokens only, never raw CC)

### **Tier 4: Highly Sensitive Data** (Encrypted + Strict Access + Audit Trail)
- Full medical records (if provided by doctor)
- Mental health notes
- Consent forms with signatures
- Raw biometric data from wearables

---

## 2. Encryption Standards

### **Encryption at Rest**

#### **Method 1: Full Disk Encryption (Minimum Requirement)**
```bash
# macOS (FileVault)
# System Preferences → Security & Privacy → FileVault → Turn On

# Windows (BitLocker)
# Settings → System → Storage → Manage BitLocker → Turn On

# Linux (LUKS)
sudo cryptsetup luksFormat /dev/sdX
```

**Status:** ✅ REQUIRED for all devices storing client data

#### **Method 2: Encrypted Disk Images (Photos & Sensitive Files)**
```bash
# macOS: Create encrypted .dmg
hdiutil create -size 10g -encryption AES-256 -fs "HFS+J" \
  -volname "ClientPhotos" ~/ClientPhotos.dmg

# Mount when needed
hdiutil attach ~/ClientPhotos.dmg

# Unmount after use
hdiutil detach /Volumes/ClientPhotos
```

**Usage:**
- Store all client photos in encrypted disk image
- Only mount when actively working with photos
- Never commit photos to Git (see .gitignore policy)

#### **Method 3: File-Level Encryption (Ultra-Sensitive Files)**
```bash
# Encrypt individual files with GPG
gpg --symmetric --cipher-algo AES256 client-medical-records.pdf

# Creates: client-medical-records.pdf.gpg
# Delete original after encrypting
```

**Use For:**
- Medical records from doctors
- Mental health notes
- Signed consent forms with full legal names

### **Encryption in Transit**

#### **GitHub Repository**
- ✅ GitHub uses TLS 1.2+ (encrypted in transit)
- ✅ Repository set to PRIVATE (access-controlled)
- ⚠️ Do NOT commit photos or raw PII

#### **iCloud Drive**
- ✅ Apple encrypts data in transit (TLS)
- ✅ Apple encrypts data at rest (AES-256)
- ⚠️ Photos stored in iCloud are encrypted but Apple has keys
- ✅ Use encrypted disk images for ultra-sensitive files

#### **VS Code for Web / Working Copy**
- ✅ Uses HTTPS (encrypted in transit)
- ✅ GitHub API uses OAuth tokens (not passwords)
- ⚠️ Ensure device screen locks after 5 minutes of inactivity

---

## 3. Access Control Matrix

### **Role-Based Access Control (RBAC)**

| Data Type | Trainer (Sean) | Client | Admin Assistant | AI Systems |
|---|---|---|---|---|
| **Client Questionnaire** | ✅ Read/Write | ✅ Read Only | ✅ Read Only | ✅ Read (redacted) |
| **Progress Reports** | ✅ Read/Write | ✅ Read Only | ❌ No Access | ✅ Read (redacted) |
| **Medical History** | ✅ Read/Write | ✅ Read Only | ❌ No Access | ✅ Read (de-identified) |
| **Progress Photos** | ✅ Read/Write | ✅ Read Only | ❌ No Access | ✅ (Consent Required) |
| **Payment Info** | ✅ View Last 4 | ✅ View Last 4 | ✅ View Last 4 | ❌ No Access |
| **Master Prompt JSON** | ✅ Read/Write | ❌ No Access | ❌ No Access | ✅ Read (redacted) |
| **Red Flags/Injuries** | ✅ Read/Write | ✅ Read Only | ❌ No Access | ✅ Read (analysis) |

### **Device Access Policy**

#### **Authorized Devices:**
1. Sean's Desktop (primary workstation)
2. Sean's iPad Pro (gym/mobile use)
3. Sean's iPhone (emergency access only)

#### **Access Requirements:**
- ✅ Biometric login (Touch ID / Face ID) or strong password (16+ chars)
- ✅ Auto-lock after 5 minutes of inactivity
- ✅ Full disk encryption enabled
- ✅ Find My Device enabled (remote wipe capability)
- ✅ OS and apps kept up to date

#### **Prohibited:**
- ❌ Public computers (library, hotel business center)
- ❌ Shared devices (family computers)
- ❌ Unencrypted USB drives
- ❌ Public Wi-Fi without VPN

---

## 4. Consent Management

### **Consent Framework**

Every client must provide explicit consent for:
1. **Data Collection:** Questionnaire, measurements, photos
2. **AI Analysis:** Using external AI systems (Claude, ChatGPT, Gemini)
3. **Photo Analysis:** Using AI vision for form/posture analysis
4. **Wearable Integration:** Syncing data from Apple Watch, Whoop, etc.
5. **SMS Communication:** Twilio SMS check-ins
6. **Data Retention:** Storing data for 7 years post-termination

### **Consent Record Template**

Create: `client-data/[client]/notes/consent.md`

```markdown
# Consent Record - [Client Name]

**Date:** [YYYY-MM-DD]
**Consent Version:** 1.0
**Trainer:** Sean Swan, SwanStudios Personal Training

---

## Consent Scopes

I, [Client Full Name], consent to the following:

### 1. Data Collection & Storage
- [ ] ✅ Collect and store my health and fitness data
- [ ] ✅ Store data for 7 years after training ends
- [ ] ✅ Use encrypted storage for sensitive information

**Signature:** ________________  **Date:** ___/___/___

### 2. AI-Powered Analysis
- [ ] ✅ My data may be analyzed by AI systems (Claude, ChatGPT, Gemini)
- [ ] ✅ I understand my data is de-identified before AI analysis
- [ ] ✅ I understand AI analysis improves my training outcomes

**Note:** SwanStudios uses AI systems with strict privacy policies. Your full name and contact info are never sent to AI systems.

**Signature:** ________________  **Date:** ___/___/___

### 3. Photo & Video Analysis
- [ ] ✅ Progress photos may be taken and stored securely
- [ ] ✅ Form videos may be analyzed by AI for technique improvement
- [ ] ❌ I do NOT consent to photo analysis (client can opt out)

**Signature:** ________________  **Date:** ___/___/___

### 4. Wearable Device Integration
- [ ] ✅ Sync data from my wearable device (Apple Watch, Whoop, etc.)
- [ ] ✅ Use wearable data to optimize training and recovery
- [ ] ❌ I do NOT have a wearable device

**Device:** [Apple Watch / Whoop / Oura / Garmin / None]

**Signature:** ________________  **Date:** ___/___/___

### 5. SMS Communication
- [ ] ✅ Send me daily/weekly check-in SMS messages
- [ ] ✅ I understand responses are stored in my training records

**Phone Number:** ___-___-____
**Best Time for SMS:** [Morning / Afternoon / Evening]

**Signature:** ________________  **Date:** ___/___/___

---

## Withdrawal of Consent

I understand I can withdraw consent at any time by emailing sean@swanstudios.com with "WITHDRAW CONSENT" in the subject line.

Upon withdrawal:
- AI analysis will stop immediately
- Photos will be deleted within 30 days
- Wearable sync will be disabled
- SMS messages will cease

My training records will be retained for 7 years per industry standards, but no further analysis will occur.

---

## Client Rights

I have the right to:
- Access all my data at any time
- Request corrections to inaccurate data
- Request deletion of my data (within legal limits)
- Receive a copy of all my data in machine-readable format (JSON)
- Know which AI systems have analyzed my data

---

**Client Signature:** ________________
**Client Printed Name:** ________________
**Date:** ___/___/___

**Trainer Signature:** ________________
**Trainer Printed Name:** Sean Swan
**Date:** ___/___/___

---

**Storage:** This consent form is stored in encrypted format at:
`client-data/[client]/notes/consent.md` (encrypted disk image)
```

### **Consent Lifecycle**

1. **Pre-Onboarding:** Send consent form via email or in-person
2. **Session 1:** Review and sign consent form (physical or digital)
3. **Every 12 Months:** Re-confirm consent (email reminder)
4. **Upon Request:** Client can withdraw consent at any time
5. **Post-Training:** Retain consent forms for 7 years

---

## 5. Photo & Media Security

### **Photo Storage Policy**

#### **NEVER Store Photos In:**
- ❌ Git repositories (even private ones)
- ❌ Unencrypted iCloud Photos
- ❌ Email attachments
- ❌ Unencrypted cloud storage (Dropbox, Google Drive)

#### **ALWAYS Store Photos In:**
- ✅ Encrypted disk image (`.dmg` on macOS, BitLocker on Windows)
- ✅ Encrypted S3 bucket (if using cloud storage)
- ✅ Local encrypted folder on device

### **Photo Naming Convention**

```
Format: [client-id]_[date]_[view]_[purpose].jpg

Examples:
cd001_2025-11-05_front_progress.jpg
cd001_2025-11-05_side_progress.jpg
cd001_2025-11-05_back_progress.jpg
cd001_2025-11-05_deadlift_form-check.jpg
```

**Never use client names in filenames!** Use Spirit Name or client ID only.

### **EXIF Data Stripping**

Photos contain metadata (EXIF) including GPS location, device info, and timestamp. Strip this before storing.

```bash
# Install exiftool
brew install exiftool  # macOS
apt-get install libimage-exiftool-perl  # Linux

# Strip EXIF from all photos in folder
exiftool -all= *.jpg

# Verify EXIF removed
exiftool photo.jpg
```

**Automate this:** Create script to strip EXIF from all new photos automatically.

### **AI Photo Analysis Security**

When sending photos to AI for form analysis:

1. **Strip EXIF:** Remove all metadata
2. **Redact Background:** Blur or crop background if it shows identifiable location
3. **Use Spirit Name:** In prompt, refer to client by Spirit Name only
4. **Delete After Analysis:** AI services don't store images, but delete local copies of analysis-sent photos after 30 days

---

## 6. PII Redaction Rules

### **When Sending Data to External AI Systems**

**PII to ALWAYS Redact:**
- ❌ Full legal name → Use Spirit Name or "Client A"
- ❌ Email address → Redact entirely or use "client@example.com"
- ❌ Phone number → Redact entirely
- ❌ Home address → Use "Los Angeles area" not street address
- ❌ Date of birth → Use age only (e.g., "35 years old")
- ❌ Social Security Number → NEVER include
- ❌ Credit card info → NEVER include

**Safe to Include:**
- ✅ Spirit Name (e.g., "Orion Ascending")
- ✅ Age (not DOB)
- ✅ Gender
- ✅ Goals and motivations
- ✅ Training history
- ✅ Injury history (without doctor names)
- ✅ Nutrition preferences
- ✅ Progress metrics (weight, strength, etc.)

### **Example: Redacted AI Prompt**

**❌ BAD (Contains PII):**
```
Generate a workout for John Doe, 555-123-4567, living at 123 Main St.
He's 35 years old (DOB 1990-05-15), works at Google...
```

**✅ GOOD (Redacted):**
```
Generate a workout for "Orion Ascending", a 35-year-old male client.
Spirit Name: Orion Ascending
Client ID: cd001
Goals: Weight loss, strength gain
Training Age: Beginner (6 months experience)
Injuries: Previous right knee strain (2023), fully recovered
```

---

## 7. Spirit Name (Alias) System

### **Purpose**

Spirit Names provide:
- **Privacy:** Protect client identity in AI interactions
- **Personalization:** Create unique, memorable identity
- **Gamification:** Align with SwanStudios "Living Constellation" theme

### **Naming Conventions**

#### **Categories (Choose Based on Client Preference):**

**1. Celestial (Recommended Default)**
- Orion Ascending
- Lyra Nova
- Phoenix Rising
- Stellar Path
- Cosmic Tide

**2. Nature**
- Mountain Peak
- Ocean Wave
- Forest Guardian
- Thunder Strike
- Autumn Breeze

**3. Mythological**
- Atlas Strength
- Athena Wisdom
- Thor Might
- Freya Balance
- Hermes Speed

**4. Abstract**
- Iron Will
- Diamond Mind
- Golden Era
- Silver Lining
- Platinum Resolve

#### **Avoid:**
- ❌ Culturally sensitive names (e.g., religious figures)
- ❌ Names that could be perceived as mocking
- ❌ Names that reveal identity (e.g., "JohnD2025")

### **Spirit Name Assignment Process**

1. **During Onboarding:** Ask client for name preference or offer suggestions
2. **Record in Master Prompt:** `client_profile.alias` field
3. **Use Consistently:** All AI interactions use Spirit Name, never legal name
4. **Client Dashboard:** Display Spirit Name prominently (optional: show legal name in small text below)

### **Example: Master Prompt JSON with Spirit Name**

```json
{
  "client_profile": {
    "basic_info": {
      "client_id": "cd001",
      "alias": "Orion Ascending",
      "name": "[REDACTED FOR AI]",
      "age": 35,
      "gender": "Male"
    }
  }
}
```

When sending to AI, the `name` field is removed entirely.

---

## 8. Backup & Recovery

### **3-2-1 Backup Strategy**

**3 Copies** of all client data:
1. **Primary:** Working copy on desktop/iPad (encrypted)
2. **Secondary:** GitHub private repository (text only, no photos)
3. **Tertiary:** External encrypted backup drive

**2 Different Media:**
1. Digital (GitHub, encrypted disk image)
2. Physical (encrypted USB drive or external HDD)

**1 Off-site:**
1. GitHub (cloud, geographically distributed)

### **Backup Schedule**

| Frequency | What to Backup | Method |
|---|---|---|
| **Real-time** | Client data files (text, JSON, markdown) | GitHub auto-sync |
| **Daily** | Encrypted photos | Encrypted disk image → External drive |
| **Weekly** | Full system backup | Time Machine (macOS) or File History (Windows) |
| **Monthly** | Off-site backup verification | Download from GitHub, test restore |

### **Backup Verification**

**Monthly Checklist:**
- [ ] Download a client folder from GitHub
- [ ] Verify all files open correctly
- [ ] Check encrypted disk image mounts successfully
- [ ] Test restoring a client's Master Prompt JSON
- [ ] Verify external drive is readable
- [ ] Update backup log: `client-data/BACKUP-LOG.md`

### **Disaster Recovery Plan**

#### **Scenario 1: Laptop Stolen/Damaged**
1. **Immediate:** Report to police, remote wipe device (Find My Device)
2. **Recovery:** Buy new laptop, install Git, clone repository from GitHub
3. **Photos:** Restore from external encrypted backup drive
4. **Timeline:** 24-48 hours to full recovery

#### **Scenario 2: GitHub Account Compromised**
1. **Immediate:** Change GitHub password, enable 2FA
2. **Recovery:** Restore from local Git repo or external drive
3. **Timeline:** 1-2 hours to secure account and verify data integrity

#### **Scenario 3: Ransomware Attack**
1. **Immediate:** Disconnect from internet, do NOT pay ransom
2. **Recovery:** Wipe affected device, restore from external backup
3. **Timeline:** 4-8 hours to full recovery

---

## 9. Breach Response Protocol

### **Definition of a Data Breach**

A data breach occurs when:
- Unauthorized person accesses client data
- Client data is accidentally shared publicly
- Device containing client data is lost or stolen
- Cloud account (GitHub, iCloud) is compromised

### **Breach Response Steps**

#### **Step 1: Contain (Immediate, Within 1 Hour)**
1. Disconnect affected device from internet
2. Change all passwords (GitHub, iCloud, Stripe)
3. Enable 2FA on all accounts if not already enabled
4. Remote wipe lost/stolen devices (Find My Device)
5. Notify GitHub/Apple of potential compromise

#### **Step 2: Assess (Within 24 Hours)**
1. Determine scope: Which clients' data was exposed?
2. Determine severity: What type of data was exposed? (Tier 1-4)
3. Determine duration: How long was data accessible?
4. Document everything: Create breach incident report

#### **Step 3: Notify (Within 72 Hours)**
1. **Notify Affected Clients:**
   - Email: "URGENT: SwanStudios Data Security Notification"
   - Explain what happened (factual, no speculation)
   - Explain what data was exposed
   - Explain what you're doing to fix it
   - Offer free credit monitoring (if payment data exposed)

2. **Notify Authorities (If Required):**
   - If payment data exposed: Notify payment processor (Stripe)
   - If health data exposed: Document as potential HIPAA breach (even if not covered entity)
   - If breach affects >500 people: May need to notify state attorney general

#### **Step 4: Remediate (Within 1 Week)**
1. Implement fixes to prevent recurrence
2. Conduct security audit (review all access points)
3. Update this security guide with lessons learned
4. Provide clients with updated security protocols

#### **Step 5: Document & Learn (Within 2 Weeks)**
1. Create full post-mortem report
2. Share (redacted) lessons learned with AI Village
3. Update training materials for future breach prevention
4. Review and update consent forms if needed

### **Breach Notification Email Template**

```
Subject: URGENT: SwanStudios Data Security Notification

Dear [Client Name],

I am writing to inform you of a data security incident that may have affected your personal information.

What Happened:
On [Date], [brief description of incident, e.g., "my laptop was stolen from my vehicle"].

What Information Was Involved:
[List specific data types, e.g., "Your name, email, phone number, and training records from [dates]"]

What Information Was NOT Involved:
[e.g., "Your payment information, photos, and medical records were not affected."]

What We Are Doing:
- [e.g., "I have remotely wiped the device and all data is encrypted"]
- [e.g., "I have changed all passwords and enabled additional security measures"]
- [e.g., "I have filed a police report"]

What You Can Do:
- Monitor your email for any unusual activity
- [If payment data exposed: "I am providing you with 1 year of free credit monitoring via [service]"]
- Contact me at [phone/email] with any questions

I take your privacy extremely seriously and sincerely apologize for this incident. I have implemented additional security measures to prevent this from happening again.

Sincerely,
Sean Swan
SwanStudios Personal Training
[Contact Info]
```

---

## 10. Audit & Compliance

### **Monthly Security Audit Checklist**

**File:** `client-data/SECURITY-AUDIT-LOG.md`

```markdown
# Security Audit Log

## [Month YYYY-MM]

**Auditor:** Sean Swan
**Date:** [YYYY-MM-DD]

### Access Control
- [ ] All devices have biometric/strong password auth
- [ ] All devices have auto-lock enabled (5 min)
- [ ] All devices have full disk encryption enabled
- [ ] Find My Device enabled on all mobile devices

### Encryption
- [ ] Client photos stored in encrypted disk image
- [ ] Encrypted disk image mounts successfully
- [ ] GitHub repository is set to PRIVATE
- [ ] No PII accidentally committed to GitHub (spot check)

### Backups
- [ ] Verified GitHub backup (test restore)
- [ ] Verified external drive backup (test restore)
- [ ] Backup drive is encrypted
- [ ] Off-site backup accessible

### Consent
- [ ] All new clients have signed consent forms
- [ ] Consent forms stored securely (encrypted disk image)
- [ ] No expired consents (12-month review)

### PII Redaction
- [ ] Spot-check AI prompts for PII leaks
- [ ] Verify Spirit Names are used consistently
- [ ] No legal names in public-facing AI interactions

### Incidents
- [ ] No security incidents this month
- [ ] [If yes: Document incident, resolution, lessons learned]

**Signature:** ________________  **Date:** ___/___/___

---
```

### **Annual Compliance Review**

**Every January:**
1. Review all consent forms (12-month refresh)
2. Review this security guide for updates
3. Review data retention policy (delete data >7 years old)
4. Review third-party services (Claude, ChatGPT, Stripe) for policy changes
5. Update client-facing privacy policy (if any changes)
6. Conduct full penetration test (optional: hire security consultant)

### **Compliance Certifications (Future)**

**If SwanStudios Scales:**
- SOC 2 Type II (Service Organization Control)
- ISO 27001 (Information Security Management)
- HIPAA Compliance (if treating as covered entity)
- PCI DSS Level 1 (if processing >6M transactions/year)

---

## 🎓 Training & Awareness

### **For Sean (Primary Trainer)**

**Annual Security Training:**
- Review this guide annually (January)
- Complete online security awareness course (e.g., SANS Security Awareness)
- Stay updated on latest threats (phishing, ransomware)

**Daily Habits:**
- Lock screen when stepping away from desk
- Never access client data on public Wi-Fi without VPN
- Verify recipient before sending client data via email
- Use strong, unique passwords (password manager recommended)

### **For Future Staff**

**Before Access to Client Data:**
1. Sign confidentiality agreement (NDA)
2. Complete security training (2 hours)
3. Review this security guide
4. Pass security quiz (80% minimum)
5. Supervised access for first 30 days

---

## 📞 Security Contacts

### **Internal**
- **Security Lead:** Sean Swan (sean@swanstudios.com)

### **External**
- **GitHub Security:** support@github.com
- **Apple Security:** https://support.apple.com/security
- **Stripe Security:** https://stripe.com/docs/security/stripe

### **Emergency**
- **Police (Lost/Stolen Device):** 911 or local non-emergency
- **Legal (Data Breach):** [Your attorney if applicable]

---

## 📚 Additional Resources

- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **HIPAA Security Rule:** https://www.hhs.gov/hipaa/for-professionals/security/
- **GDPR Overview:** https://gdpr.eu/

---

**Last Updated:** 2025-11-05
**Version:** 1.0
**Next Review:** 2026-01-01

**Maintained By:** Sean Swan, SwanStudios Personal Training

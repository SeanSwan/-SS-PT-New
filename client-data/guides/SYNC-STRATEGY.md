# 🔄 Device Sync Strategy - SwanStudios Client Data

**Goal:** Keep client data synchronized across desktop, iPad, and other devices
**Recommended Method:** GitHub (version control + automatic sync)

---

## 📊 Sync Method Comparison

| Feature | GitHub | iCloud Drive | Manual (USB) |
|---|---|---|---|
| **Automatic Sync** | ✅ Yes | ✅ Yes | ❌ No |
| **Version Control** | ✅ Yes | ❌ No | ❌ No |
| **Undo Mistakes** | ✅ Easy | ⚠️ Hard | ❌ No |
| **Works Offline** | ✅ Yes* | ✅ Yes* | ✅ Yes |
| **Cost** | 🆓 Free | 🆓 Free (5GB) | 🆓 Free |
| **Setup Difficulty** | ⚠️ Medium | ✅ Easy | ✅ Easy |
| **Multi-Device** | ✅ Unlimited | ✅ All Apple devices | ❌ Manual |
| **Collaboration** | ✅ Yes | ⚠️ Limited | ❌ No |
| **Security** | ✅ Private repos | ✅ Encrypted | ⚠️ Device only |

*You can work offline, but need internet to sync

**Recommended:** GitHub for serious use, iCloud for simplicity

---

## 🚀 Method 1: GitHub Sync (Recommended)

### Setup (One-Time, 10 minutes)

#### On Desktop:

1. **Create Private GitHub Repository:**
   ```bash
   # In your SS-PT project directory
   cd client-data

   # Initialize git
   git init

   # Create .gitignore to exclude sensitive files
   echo "# Exclude sensitive client photos" > .gitignore
   echo "*/photos/*.jpg" >> .gitignore
   echo "*/photos/*.png" >> .gitignore
   echo "*.env" >> .gitignore

   # Add all files
   git add .

   # First commit
   git commit -m "Initial commit - SwanStudios client data management system"

   # Create GitHub repository (via CLI)
   gh repo create swanstudios-client-data --private --source=. --remote=origin

   # Push to GitHub
   git push -u origin main
   ```

   **Or create repository via GitHub website:**
   - Go to github.com
   - Click "+" → "New repository"
   - Name: `swanstudios-client-data`
   - ⚠️ **IMPORTANT:** Check "Private"
   - Click "Create repository"
   - Follow instructions to push existing repository

2. **Verify Repository is Private:**
   - Go to github.com/[your-username]/swanstudios-client-data
   - Look for "Private" badge next to repository name
   - If it says "Public" → Settings → Danger Zone → Change visibility → Private

#### On iPad:

1. **Install Working Copy** (App Store)
   - Free version: Read-only
   - Pro version ($19.99): Full editing + push

2. **Clone Repository:**
   - Open Working Copy
   - Tap + → "Clone repository"
   - Sign in to GitHub
   - Search "swanstudios-client-data"
   - Clone to iPad
   - Done! Files are now on iPad

### Daily Workflow

#### Desktop → iPad (Push Changes)

**After updating files on desktop:**
```bash
cd client-data

# Check what changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Update John Doe progress - Week 3"

# Push to GitHub
git push
```

**On iPad (pull changes):**
1. Open Working Copy
2. Tap repository name
3. Pull down to refresh (fetches latest changes)
4. Done! You now have desktop changes on iPad

#### iPad → Desktop (Pull Changes)

**After updating files on iPad (in Working Copy):**
1. Tap "Status" tab
2. Review changes
3. Tap "Commit"
4. Type commit message (e.g., "Add workout notes for Jane")
5. Tap ✓ to commit
6. Tap "Push"

**On desktop (pull changes):**
```bash
cd client-data
git pull
```
Done! You now have iPad changes on desktop.

### Automatic Sync Schedule

**Recommended:**
- Push after EVERY client session (right after updating notes)
- Pull before EVERY work session (to get latest data)
- Commit message format: "[Client Name] - [What changed]"

**Example commit messages:**
- "John Doe - Week 3 progress report"
- "Jane Smith - Updated meal plan"
- "Alex Jones - Added injury notes"
- "Update questionnaire template"

### Handling Merge Conflicts

**If you edited the same file on desktop and iPad:**

1. Git will say: "CONFLICT (content): Merge conflict in [filename]"
2. Open the file - you'll see:
   ```
   <<<<<<< HEAD
   [Your desktop changes]
   =======
   [Your iPad changes]
   >>>>>>> origin/main
   ```
3. Manually decide which version to keep (or merge both)
4. Delete the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
5. Save the file
6. Commit:
   ```bash
   git add [filename]
   git commit -m "Fix merge conflict"
   git push
   ```

**Prevent conflicts:**
- Always pull before editing
- Don't edit the same file on multiple devices at once
- Push immediately after editing

### Pros & Cons

✅ **Pros:**
- Full version control (can undo any change)
- See history of all changes (who changed what, when)
- Works across unlimited devices
- Private and secure
- Can collaborate with others (e.g., admin assistant)
- Free for private repositories

❌ **Cons:**
- Learning curve for Git commands
- Requires internet to sync
- Must manually commit/push changes (not automatic)

---

## 🚀 Method 2: iCloud Drive Sync

### Setup (One-Time, 2 minutes)

#### On Desktop:

1. **Open Finder**
2. Navigate to: iCloud Drive
3. Create folder: `SwanStudios`
4. **Move your client-data folder:**
   ```bash
   # In terminal
   mv ~/Desktop/quick-pt/SS-PT/client-data ~/Library/Mobile\ Documents/com~apple~CloudDocs/SwanStudios/client-data

   # Create symlink so it's still accessible from project
   ln -s ~/Library/Mobile\ Documents/com~apple~CloudDocs/SwanStudios/client-data ~/Desktop/quick-pt/SS-PT/client-data
   ```
5. Wait for sync (check iCloud icon in Finder)

#### On iPad:

1. **Open Files app**
2. Navigate to: iCloud Drive → SwanStudios → client-data
3. Verify files are there
4. Done!

### Daily Workflow

**There is no workflow - it syncs automatically! 🎉**

- Edit file on desktop → Syncs to iPad within seconds
- Edit file on iPad → Syncs to desktop within seconds
- Just make sure both devices are connected to internet

### Monitoring Sync Status

**On Desktop (macOS):**
- Look for cloud icon next to file in Finder
- ☁️ (cloud with arrow) = Uploading
- ✅ (checkmark) = Synced
- ⬇️ (arrow down) = Downloading

**On iPad:**
- Files app automatically syncs
- If file has cloud icon, tap to download
- Most files download automatically

### Handling Sync Conflicts

**If iCloud detects a conflict:**
1. You'll see a duplicate file: `[filename] (conflicted copy [date])`
2. Open both files
3. Manually merge the changes
4. Delete the conflicted copy
5. Keep the correct version

**Prevent conflicts:**
- Don't edit the same file on multiple devices at once
- Always wait for sync to complete (check cloud icon)
- Check Files app sync status before editing

### Pros & Cons

✅ **Pros:**
- Automatic sync (no commands to remember)
- Easy setup (2 minutes)
- Works across all Apple devices
- No Git learning curve
- Free (5GB included with iCloud account)

❌ **Cons:**
- No version control (can't undo mistakes easily)
- Only works on Apple devices
- No history of changes
- Sync conflicts are manual to resolve
- 5GB limit (can upgrade for $0.99/month)

---

## 🚀 Method 3: Hybrid (GitHub + iCloud)

### Best of Both Worlds

**Setup:**
1. Use iCloud for automatic sync (Method 2)
2. Also push to GitHub daily for version control (Method 1)

**Daily Workflow:**
1. Edit files → iCloud syncs automatically
2. End of day → Push to GitHub for backup:
   ```bash
   cd client-data
   git add .
   git commit -m "End of day backup - [date]"
   git push
   ```

**Why This Works:**
- ✅ iCloud = Instant sync across devices
- ✅ GitHub = Version control + backup
- ✅ Best of both methods

**Downside:**
- Requires both iCloud and GitHub setup
- More complex

---

## 📋 Sync Schedule Recommendations

### Daily (Recommended)

**Morning:**
- Pull latest changes (if using GitHub)
- Or check iCloud sync status

**After Each Client Session:**
- Update client progress files
- Push to GitHub immediately (if using GitHub)
- Or rely on iCloud auto-sync

**End of Day:**
- Review all changes
- Push to GitHub with summary commit message
- Backup to external drive (optional)

### Weekly

**Every Monday:**
- Verify sync status on all devices
- Check for any conflicted files
- Clean up old backup files

**Every Friday:**
- Push week's changes to GitHub
- Create weekly backup (optional)
- Review storage usage (iCloud or GitHub)

### Monthly

**First of Month:**
- Archive old client folders (completed clients)
- Compress photos to save space
- Verify GitHub repository is still private
- Check iCloud storage limits

---

## 🔐 Security Best Practices

### Never Store in Public Repositories
- ⚠️ **CRITICAL:** Client data is protected health information (PHI)
- Always use **private** GitHub repositories
- Never push to public repos
- Never share repository link publicly

### Exclude Sensitive Files

**Create `.gitignore` file:**
```bash
# In client-data/ folder
cat > .gitignore <<EOF
# Exclude client photos (large files + sensitive)
*/photos/*.jpg
*/photos/*.png
*/photos/*.heic

# Exclude environment variables
.env
.env.local

# Exclude database backups
*.sql
*.db

# Exclude personal notes
private-notes/
EOF
```

**What to exclude:**
- Client photos (use secure cloud storage instead)
- Full SSN or credit card info
- Personal trainer notes with sensitive details
- Database exports

**What to include:**
- Questionnaires (text data)
- Progress reports (text data)
- Workout plans
- Meal plans
- Master prompt JSON files

### Encrypt Sensitive Files

**For extremely sensitive data:**
1. Use encrypted disk image (macOS):
   ```bash
   hdiutil create -size 1g -encryption AES-256 -fs "HFS+J" -volname "ClientPhotos" ClientPhotos.dmg
   ```
2. Store in encrypted folder
3. Only mount when needed
4. Never sync encrypted data to cloud

### Two-Factor Authentication

**Enable 2FA on:**
- GitHub account (Settings → Password and authentication → Enable 2FA)
- iCloud account (Settings → Apple ID → Password & Security → Two-Factor Authentication)

### Regular Backups

**Weekly Backup:**
```bash
# Backup client-data to external drive
rsync -av ~/path/to/client-data /Volumes/BackupDrive/SwanStudios/client-data-backup-$(date +%Y-%m-%d)
```

**Monthly Backup:**
- External hard drive (1TB+ recommended)
- Encrypted USB drive
- Cloud backup (Backblaze, Arq)

---

## 🆘 Troubleshooting

### "iCloud is full"
1. Check storage: Settings → Apple ID → iCloud → Manage Storage
2. Options:
   - Delete old photos from client-data/*/photos/
   - Upgrade iCloud storage ($0.99/month for 50GB)
   - Use GitHub instead (no file size limits)

### "GitHub says repository is too large"
- GitHub limit: 100GB per repository
- Individual file limit: 100MB
- Solution: Exclude large photos via .gitignore
- Or use Git LFS (Large File Storage)

### "Files aren't syncing"
**iCloud:**
- Check internet connection
- Settings → Apple ID → iCloud → iCloud Drive (toggle off/on)
- Force sync: Files app → Pull down to refresh

**GitHub:**
```bash
# Check if you forgot to push
git status

# If there are uncommitted changes
git add .
git commit -m "Forgot to push earlier"
git push
```

### "I deleted a file by accident"
**GitHub (easy to recover):**
```bash
# See recent commits
git log

# Revert to previous commit
git checkout [commit-hash] -- path/to/file

# Or restore entire folder
git checkout HEAD~1 -- client-data/
```

**iCloud (harder to recover):**
- Check: Files app → Recently Deleted folder
- Or: iCloud.com → Settings → Restore Files
- Files are kept for 30 days

---

## 💡 Pro Tips

### Tip 1: Use Git Aliases
```bash
# Add to ~/.gitconfig
[alias]
    sync = !git pull && git add . && git commit -m "Auto-sync $(date)" && git push
```

Now you can just type: `git sync`

### Tip 2: Automate Daily Backups
**Create cron job (macOS/Linux):**
```bash
# Edit crontab
crontab -e

# Add this line (backups every day at 11 PM)
0 23 * * * cd ~/path/to/client-data && git add . && git commit -m "Auto-backup $(date +\%Y-\%m-\%d)" && git push
```

### Tip 3: Use GitHub Desktop (GUI)
- Don't like terminal commands?
- Download GitHub Desktop: desktop.github.com
- Graphical interface for Git (drag-and-drop commits)

### Tip 4: Set Up Shortcuts
**iOS Shortcuts app:**
- "Sync Client Data" shortcut:
  - Opens Working Copy
  - Pulls latest changes
  - Opens Files app → client-data folder

---

## 📚 Further Reading

- **Git Basics:** https://git-scm.com/book/en/v2
- **GitHub Docs:** https://docs.github.com
- **iCloud Drive:** https://support.apple.com/icloud-drive
- **Working Copy:** https://workingcopyapp.com/manual

---

**Recommended Setup:**
- **Solo trainer, new to Git:** Start with iCloud (Method 2)
- **Serious use, multiple devices:** Use GitHub (Method 1)
- **Best of both:** Hybrid method (iCloud + GitHub)

---

**Questions?** See [README.md](../README.md) or [IPAD-SETUP-GUIDE.md](IPAD-SETUP-GUIDE.md)

---

**Last Updated:** 2025-11-05
**System Version:** Personal Training v3.0

# SwanStudios Documentation

This directory contains all project documentation for SwanStudios.

## 📂 Directory Structure

```
docs/
├── index.md              # Master documentation index - START HERE
├── CONTRIBUTING.md       # Documentation maintenance guidelines
├── README.md            # This file
├── current/             # Active documentation
│   ├── Architecture docs
│   ├── Development guides
│   ├── UI/UX documentation
│   ├── deployment/      # Deployment guides
│   └── guides/          # Testing & verification
└── archive/             # Historical documentation
```

## 🚀 Quick Start

### For New Developers
1. Read [index.md](index.md) - Master documentation index
2. Follow the onboarding path in [Quick Links](index.md#quick-links)

### For Contributors
1. See [CONTRIBUTING.md](CONTRIBUTING.md) for documentation standards
2. Update [index.md](index.md) when adding/moving docs
3. Run `npm run check-docs-links` before committing

## 📖 Key Documents

- **[Current Architecture](current/CURRENT_ARCHITECTURE.md)** - Complete tech stack overview
- **[Development Guide](current/DEVELOPMENT_GUIDE.md)** - Development workflow and commands
- **[Golden Standard Pattern](current/GOLDEN-STANDARD-PATTERN.md)** - Component development guide
- **[Galaxy-Swan Theme](current/GALAXY-SWAN-THEME-DOCS.md)** - Design system documentation

## 🔧 Maintenance

### Link Checking

**Local:**
```bash
npm run check-docs-links
```

**CI/CD:**
- Runs automatically on push to `main`
- Runs weekly on Mondays
- See `.github/workflows/docs-check.yml`

### When to Update

- **Add docs**: Create in `current/`, update `index.md`
- **Archive docs**: Move to `archive/`, update `index.md`
- **Update docs**: Edit in place, update "Last Updated" date

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

*For questions about documentation, contact the tech lead or see [CONTRIBUTING.md](CONTRIBUTING.md).*

# COMPONENT DOCUMENTATION TEMPLATES

**Purpose:** Standardized templates for zero-error component documentation
**Version:** 1.0
**Last Updated:** 2025-10-29

---

## 📦 TEMPLATES INCLUDED

This folder contains templates for all required component documentation:

1. **component-template.mermaid.md** - Flowcharts, sequence diagrams, state diagrams
2. **component-template.wireframe.md** - Visual design annotations (all states, all breakpoints)
3. **component-template.flowchart.md** - Business logic, decision trees, error handling
4. **component-template.api-spec.md** - API endpoints, request/response formats, errors
5. **component-template.test-spec.md** - Unit tests, integration tests, E2E tests
6. **component-template.a11y.md** - WCAG compliance, ARIA labels, keyboard navigation

---

## 🚀 QUICK START: CREATE COMPONENT DOCUMENTATION

### **Step 1: Create Component Folder**

```bash
# Replace [component-name] with your component (e.g., progress-chart, user-profile)
mkdir -p docs/ai-workflow/component-docs/[component-name]
cd docs/ai-workflow/component-docs/[component-name]
```

### **Step 2: Copy Templates**

```bash
# Copy all templates to your component folder
cp ../templates/component-template.mermaid.md [component-name].mermaid.md
cp ../templates/component-template.wireframe.md [component-name].wireframe.md
cp ../templates/component-template.flowchart.md [component-name].flowchart.md
cp ../templates/component-template.api-spec.md [component-name].api-spec.md
cp ../templates/component-template.test-spec.md [component-name].test-spec.md
cp ../templates/component-template.a11y.md [component-name].a11y.md

# Create README
echo "# [Component Name] Documentation" > README.md
```

**Windows (PowerShell):**
```powershell
Copy-Item ..\templates\component-template.mermaid.md [component-name].mermaid.md
Copy-Item ..\templates\component-template.wireframe.md [component-name].wireframe.md
Copy-Item ..\templates\component-template.flowchart.md [component-name].flowchart.md
Copy-Item ..\templates\component-template.api-spec.md [component-name].api-spec.md
Copy-Item ..\templates\component-template.test-spec.md [component-name].test-spec.md
Copy-Item ..\templates\component-template.a11y.md [component-name].a11y.md
"# [Component Name] Documentation" | Out-File README.md
```

### **Step 3: Assign Documentation Tasks to AIs**

| AI | Documentation Files | Estimated Time |
|----|-------------------|----------------|
| **Roo Code** | `api-spec.md` (API endpoints, database interactions) | 40-50 min |
| **Gemini** | `wireframe.md` (UI design), `mermaid.md` (state diagram) | 60-70 min |
| **ChatGPT-5** | `test-spec.md` (test scenarios), `a11y.md` (accessibility) | 50-60 min |
| **Claude Code** | `flowchart.md` (business logic), `mermaid.md` (sequence diagram) | 30-40 min |
| **Claude Desktop** | Security review of all docs, audit trail diagrams | 20-30 min |

**Total Time:** 2-3 hours (with parallel execution)

### **Step 4: Fill Out Templates**

Each AI fills their assigned templates with component-specific details:
- Replace `[Component Name]` with actual component name
- Replace `[Description]` with component purpose
- Replace example data with real component data
- Add all edge cases, error states, loading states
- Document all API interactions, user flows, accessibility requirements

### **Step 5: AI Village Cross-Review**

All 5 AIs review ALL documentation files (not just their own):
- Check for completeness (all sections filled)
- Verify clarity (no ambiguity)
- Ensure consistency (docs align with each other)
- Flag concerns (security, performance, accessibility)

### **Step 6: Human Approval**

Human reviews complete documentation package:
- Business logic accuracy
- Alignment with product vision
- User experience considerations
- Final approval before implementation

---

## 📋 AI ASSIGNMENT MATRIX

**Use this matrix to quickly assign documentation tasks:**

```
Component: _______________________
Created: __________
Phase 0 Approval: [ ] Yes [ ] No

ASSIGNMENTS:
┌─────────────────┬──────────────────────────────────┬──────────┐
│ AI              │ Files                            │ Status   │
├─────────────────┼──────────────────────────────────┼──────────┤
│ Roo Code        │ api-spec.md                      │ [ ] Done │
├─────────────────┼──────────────────────────────────┼──────────┤
│ Gemini          │ wireframe.md, mermaid.md (state) │ [ ] Done │
├─────────────────┼──────────────────────────────────┼──────────┤
│ ChatGPT-5       │ test-spec.md, a11y.md            │ [ ] Done │
├─────────────────┼──────────────────────────────────┼──────────┤
│ Claude Code     │ flowchart.md, mermaid.md (seq)   │ [ ] Done │
├─────────────────┼──────────────────────────────────┼──────────┤
│ Claude Desktop  │ Security review (all files)      │ [ ] Done │
└─────────────────┴──────────────────────────────────┴──────────┘

CROSS-REVIEW (All AIs review all docs):
[ ] Roo Code reviewed all files
[ ] Gemini reviewed all files
[ ] ChatGPT-5 reviewed all files
[ ] Claude Code reviewed all files
[ ] Claude Desktop reviewed all files

HUMAN APPROVAL:
[ ] Human reviewed and approved
[ ] Documentation locked (ready for implementation)
```

---

## 🎯 TEMPLATE CUSTOMIZATION GUIDE

### **For Simple Components (<100 lines, no API calls):**
**Required Files:**
- `mermaid.md` (state diagram only)
- `wireframe.md` (UI design)
- `test-spec.md` (unit tests)
- `a11y.md` (accessibility)

**Optional Files:**
- `api-spec.md` (skip if no API calls)
- `flowchart.md` (skip if simple logic)

**Estimated Time:** 1-1.5 hours

---

### **For Standard Components (100-500 lines, 1-3 API calls):**
**Required Files:** All 6 templates

**Estimated Time:** 2-3 hours

---

### **For Complex Components (>500 lines, multiple APIs, many states):**
**Required Files:** All 6 templates + additional diagrams

**Additional Diagrams:**
- Multiple sequence diagrams (one per major user flow)
- Multiple state diagrams (one per sub-component)
- Database schema diagrams (if creates/modifies tables)
- Integration diagrams (if interacts with external services)

**Estimated Time:** 4-6 hours

---

## 📊 QUALITY CHECKLIST

Before submitting documentation for review, verify:

### **Completeness:**
- [ ] All template sections filled (no `[TODO]` or `[Description]` placeholders)
- [ ] All user interactions documented
- [ ] All API calls documented with error handling
- [ ] All component states defined (loading, empty, error, success)
- [ ] All edge cases covered (null, undefined, empty arrays)
- [ ] All responsive breakpoints specified (mobile, tablet, desktop)
- [ ] All accessibility requirements listed (ARIA, keyboard, screen reader)

### **Clarity:**
- [ ] No ambiguous language ("should", "might", "probably")
- [ ] All acronyms defined (RLS, JWT, WCAG)
- [ ] All dependencies listed (libraries, APIs, components)
- [ ] All assumptions stated explicitly
- [ ] All success criteria defined clearly

### **Safety:**
- [ ] Feature flags documented in flowcharts
- [ ] Rollback procedures specified
- [ ] Error boundaries defined
- [ ] Performance requirements specified (<2s load, <200KB bundle)
- [ ] Security considerations documented (auth, permissions, validation)

---

## 🚀 TIME-SAVING TIPS

1. **Use AI Autocomplete:**
   - Let GitHub Copilot or Cursor AI fill boilerplate sections
   - Review and customize AI-generated content

2. **Parallel Execution:**
   - Different AIs work on different files simultaneously
   - Coordinate through Slack/Discord for questions

3. **Reuse Patterns:**
   - Similar components use similar patterns
   - Reference existing docs for inspiration
   - Create project-specific templates (e.g., "dashboard-component-template")

4. **Focus on Critical Paths:**
   - Document happy path thoroughly
   - Document all error states
   - Edge cases can be brief if rare

---

## 📁 EXAMPLE: COMPLETED COMPONENT DOCUMENTATION

See `docs/ai-workflow/component-docs/examples/` for fully completed documentation:
- `progress-chart/` - Data visualization component (medium complexity)
- `user-authentication/` - Auth component with API integration (high complexity)
- `button/` - Simple UI component (low complexity)

---

## 🔧 TROUBLESHOOTING

### **"I don't know what to put in [section]"**
→ Refer to example components in `examples/` folder
→ Ask Claude Code for guidance
→ Leave `[TODO: Needs clarification]` and flag during review

### **"Template is too detailed for my simple component"**
→ Use the "Simple Component" customization (4 files instead of 6)
→ Skip optional sections
→ Focus on critical paths only

### **"My component doesn't fit the template"**
→ Create a custom template for your component type
→ Share with Claude Code for review
→ Add to `templates/` folder for future use

### **"This is taking longer than 3 hours"**
→ First 2-3 components may take 4-5 hours (learning curve)
→ Use parallel execution (multiple AIs working simultaneously)
→ Simplify: Focus on critical paths, defer edge cases to implementation
→ Escalate to Claude Code if stuck

---

## 📞 SUPPORT

**Questions? Issues? Suggestions?**
- Tag @ClaudeCode in your documentation file
- Create GitHub issue: `[COMPONENT DOCS] [Your Question]`
- Reference this README and specific template section

---

## 📚 RELATED DOCUMENTATION

- [AI Village Handbook - Section 12.6: Component Documentation Standards](../../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md#126-component-documentation-standards)
- [Phase 0 Design Review System](../PHASE-0-DESIGN-APPROVAL.md)
- [Component Documentation Examples](./examples/)
- [CI/CD Documentation Checker](../../../scripts/ci/documentation-completeness-checker.js)

---

**Version History:**
- **1.0** (2025-10-29): Initial template creation, AI assignment matrix, quality checklist

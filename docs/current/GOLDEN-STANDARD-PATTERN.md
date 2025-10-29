# 🏆 GOLDEN STANDARD PATTERN
# =========================
# Template for all V2 file refactoring using UI Kit + useTable hook

## ✅ Phase 1 Complete: Golden Standard Created

**Reference File**: `enhanced-admin-sessions-view.V2.tsx`

This file is now the **perfect template** for refactoring all other V2 files. It demonstrates:
- ✅ Table compound component usage
- ✅ Pagination compound component usage
- ✅ Badge component with `getStatusVariant()` helper
- ✅ EmptyState and LoadingState components
- ✅ useTable hook for all table logic
- ✅ Container components from ui-kit
- ✅ Zero local table/badge/empty state styled components
- ✅ Zero MUI dependencies

---

## 📚 GOLDEN STANDARD CHECKLIST

Use this checklist when refactoring each file:

### **1. Imports**
```typescript
// ✅ Required UI Kit Imports
import { PageTitle, SectionTitle, BodyText, SmallText, Caption } from '../../../ui-kit/Typography';
import { PrimaryButton, OutlinedButton, SecondaryButton } from '../../../ui-kit/Button';
import { Card, CardHeader, CardBody, GridContainer, FlexBox } from '../../../ui-kit/Card';
import { StyledInput } from '../../../ui-kit/Input';
import Table from '../../../ui-kit/Table';
import Pagination from '../../../ui-kit/Pagination';
import Badge, { getStatusVariant } from '../../../ui-kit/Badge';
import EmptyState, { LoadingState } from '../../../ui-kit/EmptyState';
import { PageContainer, ContentContainer, StatsGridContainer } from '../../../ui-kit/Container';

// ✅ Required Hook
import { useTable } from '../../../../hooks/useTable';
```

### **2. Remove Local Components**
- ❌ DELETE: Local `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell` styled components
- ❌ DELETE: Local `Badge`, `Chip`, `ChipContainer` styled components
- ❌ DELETE: Local `EmptyStateContainer`, `LoadingContainer` styled components
- ❌ DELETE: Local `PageContainer`, `ContentContainer` (use ui-kit versions)
- ✅ KEEP: Page-specific styled components (e.g., `StatsCard`, `Avatar`, custom filters)

### **3. Implement useTable Hook**

```typescript
const {
  paginatedData,      // Use this for table rows
  currentPage,
  totalPages,
  rowsPerPage,
  hasNextPage,
  hasPrevPage,
  totalItems,
  searchTerm,
  handlePageChange,
  handleRowsPerPageChange,
  handleSearch,
  handleSort,
  sortBy,
  sortOrder,
  goToNextPage,
  goToPrevPage
} = useTable<YourDataType>({
  data: yourData,
  initialRowsPerPage: 10,
  searchFields: ['field1', 'field2', 'nested.field'],
  customFilter: (item) => {
    // Custom filter logic (e.g., status filter)
    return statusFilter === 'all' || item.status === statusFilter;
  }
});
```

### **4. Table Implementation Pattern**

```typescript
{loading ? (
  <LoadingState message="Loading data..." />
) : paginatedData.length > 0 ? (
  <>
    <Table variant="default">
      <Table.Header>
        <Table.Row>
          <Table.Head>Column 1</Table.Head>
          <Table.Head>Column 2</Table.Head>
          <Table.Head align="right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {paginatedData.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.field1}</Table.Cell>
            <Table.Cell>
              <Badge variant={getStatusVariant(item.status)}>
                {item.status}
              </Badge>
            </Table.Cell>
            <Table.Cell align="right">
              <FlexBox gap="0.5rem" justify="end">
                <OutlinedButton onClick={() => handleView(item)}>
                  <Eye size={16} />
                </OutlinedButton>
                <SecondaryButton onClick={() => handleEdit(item)}>
                  <Edit size={16} />
                </SecondaryButton>
              </FlexBox>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>

    {/* Pagination */}
    <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <FlexBox justify="space-between" align="center">
        <SmallText style={{ color: '#94a3b8' }}>
          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalItems)} of {totalItems} items
        </SmallText>
        
        <Pagination>
          <Pagination.PrevButton onClick={goToPrevPage} disabled={!hasPrevPage} />
          <Pagination.PageNumber>Page {currentPage} of {totalPages}</Pagination.PageNumber>
          <Pagination.NextButton onClick={goToNextPage} disabled={!hasNextPage} />
          <Pagination.PageSizeSelector
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            options={[5, 10, 25, 50]}
          />
        </Pagination>
      </FlexBox>
    </div>
  </>
) : (
  <EmptyState
    icon={<Inbox size={48} />}
    title="No data found"
    message="Try adjusting your search filters"
    action={<PrimaryButton onClick={handleAdd}>Add New</PrimaryButton>}
  />
)}
```

### **5. Badge Usage Pattern**

```typescript
// ✅ USE: getStatusVariant() helper for automatic variant selection
<Badge variant={getStatusVariant(item.status)}>
  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
</Badge>

// ✅ OR: Explicit variant
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Cancelled</Badge>
```

### **6. Search & Filter Pattern**

```typescript
// Search input
<SearchContainer>
  <Search size={18} />
  <StyledInput
    placeholder="Search..."
    value={searchTerm}
    onChange={(e) => handleSearch(e.target.value)}
  />
</SearchContainer>

// Filter buttons (for custom filters like status)
<FilterButton 
  isActive={statusFilter === 'all'} 
  onClick={() => setStatusFilter('all')}
>
  All
</FilterButton>
```

---

## 🎯 BEFORE vs AFTER Comparison

### **BEFORE (Old Pattern)**
```typescript
// ❌ Local table components
const Table = styled.table`...`;
const TableRow = styled.tr`...`;
// ... hundreds of lines of table styling

// ❌ Local badge component
const Badge = styled.span<{ variant?: string }>`...`;

// ❌ Manual filtering logic in component
const filteredData = data.filter(item => {
  const matchesSearch = ...;
  const matchesStatus = ...;
  return matchesSearch && matchesStatus;
});

// ❌ Manual pagination logic
const startIndex = (currentPage - 1) * rowsPerPage;
const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

// ❌ Custom table markup
<TableContainer>
  <Table>
    <TableHead>
      <tr>
        <th>Column</th>
      </tr>
    </TableHead>
    <TableBody>
      {paginatedData.map(item => (
        <TableRow>
          <TableCell>{item.name}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>

// ❌ Custom pagination
<div>
  <button onClick={handlePrev}>Prev</button>
  <span>Page {currentPage}</span>
  <button onClick={handleNext}>Next</button>
</div>
```

### **AFTER (Golden Standard)**
```typescript
// ✅ Import from ui-kit
import Table from '../../../ui-kit/Table';
import Pagination from '../../../ui-kit/Pagination';
import Badge, { getStatusVariant } from '../../../ui-kit/Badge';
import { useTable } from '../../../../hooks/useTable';

// ✅ Use useTable hook (handles ALL logic)
const {
  paginatedData,
  currentPage,
  totalPages,
  handleSearch,
  goToNextPage,
  goToPrevPage,
  ...
} = useTable({ data, searchFields: ['name'] });

// ✅ Clean compound component usage
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Head>Column</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {paginatedData.map(item => (
      <Table.Row key={item.id}>
        <Table.Cell>{item.name}</Table.Cell>
        <Table.Cell>
          <Badge variant={getStatusVariant(item.status)}>
            {item.status}
          </Badge>
        </Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>

<Pagination>
  <Pagination.PrevButton onClick={goToPrevPage} disabled={currentPage === 1} />
  <Pagination.PageNumber>Page {currentPage} of {totalPages}</Pagination.PageNumber>
  <Pagination.NextButton onClick={goToNextPage} disabled={currentPage === totalPages} />
</Pagination>
```

---

## 📊 Code Reduction Metrics

**Per File Savings (Estimated)**:
- **Styled Components**: -200 to -300 lines (table, badge, empty state components)
- **Logic Code**: -50 to -100 lines (filtering, sorting, pagination logic)
- **JSX**: -30% cleaner (compound components vs custom markup)
- **Total Reduction**: ~30-40% per file

**Consistency Gains**:
- All tables work identically
- All pagination works identically
- All badges look the same
- All empty states look the same

---

## 🚀 Next Files to Refactor (Priority Order)

### **1. admin-client-progress-view.V2.tsx** (NEXT)
- **Complexity**: HIGH (multiple tables)
- **Estimated Time**: 25 minutes
- **Focus**: Apply golden standard pattern to progress tracking tables

### **2. admin-packages-view.V2.tsx**
- **Complexity**: HIGH (table + forms)
- **Estimated Time**: 25 minutes
- **Focus**: Package management table with compound components

### **3. client-dashboard-view.V2.tsx**
- **Complexity**: MEDIUM (may have lists/cards)
- **Estimated Time**: 15 minutes
- **Focus**: Badge usage for statuses, EmptyState for no data

### **4. orientation-dashboard-view.V2.tsx**
- **Complexity**: MEDIUM (dashboard cards)
- **Estimated Time**: 15 minutes
- **Focus**: Stats cards, container components

### **5. trainer-gamification-view.V2.tsx**
- **Complexity**: MEDIUM (leaderboards/tables)
- **Estimated Time**: 15 minutes
- **Focus**: Table/Pagination if leaderboards exist

---

## ✅ Success Criteria for Each File

After refactoring, each file should have:
- ✅ Zero local table styled components
- ✅ Zero local badge/chip styled components
- ✅ Zero local empty state components
- ✅ useTable hook for table logic (if applicable)
- ✅ Table compound component usage
- ✅ Pagination compound component usage
- ✅ Badge component with getStatusVariant
- ✅ EmptyState/LoadingState components
- ✅ Container components from ui-kit
- ✅ 30-40% code reduction
- ✅ Same functionality, cleaner code

---

## 🎯 Phase 1 Status: COMPLETE ✅

**Created**:
- ✅ useTable.ts hook (reusable table logic)
- ✅ enhanced-admin-sessions-view.V2.tsx (golden standard)
- ✅ This documentation file

**Ready for**: Phase 2 (Rapid Sprint through remaining 5 files)

---

*Golden Standard Pattern v1.0*
*Created: 2025-10-09*
*Reference: enhanced-admin-sessions-view.V2.tsx*

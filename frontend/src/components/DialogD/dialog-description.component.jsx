// Import DialogDescription
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog'
  
  // Update the DialogContent
  {selectedEmployee && (
    <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className={themeColors.goldText}>
            Employee Details: {selectedEmployee.name}
          </DialogTitle>
          <DialogDescription>
            View detailed information about {selectedEmployee.name}.
          </DialogDescription>
        </DialogHeader>
        {renderEmployeeDetails()}
      </DialogContent>
    </Dialog>
  )}
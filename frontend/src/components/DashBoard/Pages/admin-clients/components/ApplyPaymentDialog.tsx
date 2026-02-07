/**
 * ApplyPaymentDialog - P0 Idempotent Payment Application
 * =======================================================
 *
 * Dialog for admins to apply payment to pending orders
 * Implements MindBody-like idempotent payment (prevents double-charging)
 * Shows PAID badge with timestamp after successful application
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Payment,
  Close,
  CheckCircle,
  CreditCard,
  MonetizationOn,
  AccountBalance
} from '@mui/icons-material';

import { useApplyPayment } from '../../../../../hooks/useClientBillingOverview';

interface PendingOrder {
  id: number;
  packageName: string;
  sessions: number;
  amount: number;
  status: string;
  createdAt: string;
}

interface ApplyPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: number | null;
  pendingOrders: PendingOrder[];
  onSuccess?: () => void;
}

type PaymentMethod = 'stripe' | 'cash' | 'venmo' | 'check' | 'other';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'stripe', label: 'Credit Card (Stripe)', icon: <CreditCard /> },
  { value: 'cash', label: 'Cash', icon: <MonetizationOn /> },
  { value: 'venmo', label: 'Venmo', icon: <Payment /> },
  { value: 'check', label: 'Check', icon: <AccountBalance /> },
  { value: 'other', label: 'Other', icon: <Payment /> }
];

const ApplyPaymentDialog: React.FC<ApplyPaymentDialogProps> = ({
  open,
  onClose,
  orderId,
  pendingOrders,
  onSuccess
}) => {
  const applyPaymentMutation = useApplyPayment();

  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paidTimestamp, setPaidTimestamp] = useState<string | null>(null);

  // Set initial order ID when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedOrderId(orderId || (pendingOrders.length > 0 ? pendingOrders[0].id : ''));
      setPaymentMethod('stripe');
      setReference('');
      setError(null);
      setSuccess(false);
      setPaidTimestamp(null);
    }
  }, [open, orderId, pendingOrders]);

  const selectedOrder = pendingOrders.find((o) => o.id === selectedOrderId);

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedOrderId) {
      setError('Please select an order');
      return;
    }

    try {
      const result = await applyPaymentMutation.mutateAsync({
        orderId: selectedOrderId,
        paymentData: {
          method: paymentMethod,
          reference: reference.trim() || undefined
        }
      });

      // Check if already paid (idempotency)
      if (result.data?.alreadyPaid) {
        setPaidTimestamp(result.data.paymentAppliedAt);
        setSuccess(true);
        setError(null);
      } else {
        // Newly paid
        setPaidTimestamp(new Date().toISOString());
        setSuccess(true);
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply payment');
    }
  };

  const handleClose = () => {
    if (success) {
      onSuccess?.();
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: success
            ? '1px solid rgba(16, 185, 129, 0.5)'
            : '1px solid rgba(16, 185, 129, 0.2)'
        }
      }}
    >
      <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        {success ? (
          <>
            <CheckCircle sx={{ color: '#10b981' }} />
            Payment Applied
          </>
        ) : (
          <>
            <Payment sx={{ color: '#10b981' }} />
            Apply Payment
          </>
        )}
      </DialogTitle>

      <DialogContent>
        {/* Success State */}
        {success && (
          <Box
            sx={{
              textAlign: 'center',
              py: 4
            }}
          >
            <CheckCircle sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
              Payment Successfully Applied
            </Typography>
            <Chip
              icon={<CheckCircle />}
              label={`PAID - ${paidTimestamp ? formatDate(paidTimestamp) : 'Now'}`}
              color="success"
              sx={{ fontSize: '1rem', py: 2, px: 2 }}
            />
            {selectedOrder && (
              <Box sx={{ mt: 3, color: 'rgba(255,255,255,0.7)' }}>
                <Typography variant="body2">
                  {selectedOrder.packageName}
                </Typography>
                <Typography variant="body2">
                  {selectedOrder.sessions} sessions • {formatCurrency(selectedOrder.amount)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Form State */}
        {!success && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {/* Order Select */}
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Order</InputLabel>
                <Select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value as number)}
                  label="Order"
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(16, 185, 129, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10b981' }
                  }}
                >
                  {pendingOrders.length === 0 ? (
                    <MenuItem disabled>No pending orders</MenuItem>
                  ) : (
                    pendingOrders.map((order) => (
                      <MenuItem key={order.id} value={order.id}>
                        <Box>
                          <Typography variant="body2">
                            {order.packageName} - {formatCurrency(order.amount)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)' }}>
                            {order.sessions} sessions • Created {formatDate(order.createdAt)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {/* Selected Order Summary */}
              {selectedOrder && (
                <Box
                  sx={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#10b981', mb: 1 }}>
                    Order Details
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
                    {selectedOrder.packageName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {selectedOrder.sessions} sessions
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 700, mt: 1 }}>
                    {formatCurrency(selectedOrder.amount)}
                  </Typography>
                </Box>
              )}

              {/* Payment Method */}
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  label="Payment Method"
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(16, 185, 129, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10b981' }
                  }}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {method.icon}
                        {method.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Reference Number */}
              <TextField
                fullWidth
                label="Reference Number (Optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  paymentMethod === 'stripe'
                    ? 'Stripe Payment Intent ID (pi_...)'
                    : paymentMethod === 'check'
                    ? 'Check number'
                    : paymentMethod === 'venmo'
                    ? 'Venmo transaction ID'
                    : 'Receipt or reference number'
                }
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(16, 185, 129, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#10b981' }
                  }
                }}
              />

              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                This action will mark the order as paid and allocate session credits.
                If already paid, no duplicate charges will be applied (idempotent).
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {success ? (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              minHeight: 44
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button
              onClick={handleClose}
              startIcon={<Close />}
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={applyPaymentMutation.isPending || !selectedOrderId}
              startIcon={applyPaymentMutation.isPending ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                minHeight: 44
              }}
            >
              {applyPaymentMutation.isPending ? 'Applying...' : 'Apply Payment'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ApplyPaymentDialog;

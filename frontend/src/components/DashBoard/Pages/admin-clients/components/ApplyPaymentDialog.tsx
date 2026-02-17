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
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '../../../../ui/primitives/components';
import { CreditCard, X, CheckCircle, Banknote, Landmark, Wallet } from 'lucide-react';

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

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'stripe', label: 'Credit Card (Stripe)' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' }
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
        style: {
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: success
            ? '1px solid rgba(16, 185, 129, 0.5)'
            : '1px solid rgba(16, 185, 129, 0.2)'
        }
      }}
    >
      <DialogTitle style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
        {success ? (
          <>
            <CheckCircle size={20} style={{ color: '#10b981' }} />
            Payment Applied
          </>
        ) : (
          <>
            <Wallet size={20} style={{ color: '#10b981' }} />
            Apply Payment
          </>
        )}
      </DialogTitle>

      <DialogContent>
        {/* Success State */}
        {success && (
          <Box style={{ textAlign: 'center', padding: '32px 0' }}>
            <CheckCircle size={64} style={{ color: '#10b981', marginBottom: 16 }} />
            <Typography variant="h6" style={{ color: 'white', marginBottom: 8 }}>
              Payment Successfully Applied
            </Typography>
            <Chip
              label={`PAID - ${paidTimestamp ? formatDate(paidTimestamp) : 'Now'}`}
              style={{ fontSize: '1rem', padding: '8px 16px', background: '#10b981', color: 'white' }}
            />
            {selectedOrder && (
              <Box style={{ marginTop: 24, color: 'rgba(255,255,255,0.7)' }}>
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
              <Alert severity="error" style={{ marginBottom: 16 }}>
                {error}
              </Alert>
            )}

            <Box style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              {/* Order Select */}
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(Number(e.target.value))}
                  fullWidth
                >
                  {pendingOrders.length === 0 ? (
                    <option disabled>No pending orders</option>
                  ) : (
                    pendingOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.packageName} - {formatCurrency(order.amount)} ({order.sessions} sessions)
                      </option>
                    ))
                  )}
                </Select>
              </FormControl>

              {/* Selected Order Summary */}
              {selectedOrder && (
                <Box
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Typography variant="subtitle2" style={{ color: '#10b981', marginBottom: 8 }}>
                    Order Details
                  </Typography>
                  <Typography variant="body1" style={{ color: 'white', fontWeight: 500 }}>
                    {selectedOrder.packageName}
                  </Typography>
                  <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {selectedOrder.sessions} sessions
                  </Typography>
                  <Typography variant="h5" style={{ color: '#10b981', fontWeight: 700, marginTop: 8 }}>
                    {formatCurrency(selectedOrder.amount)}
                  </Typography>
                </Box>
              )}

              {/* Payment Method */}
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  fullWidth
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {/* Reference Number */}
              <TextField
                style={{ width: '100%' }}
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
              />

              <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.5)' }}>
                This action will mark the order as paid and allocate session credits.
                If already paid, no duplicate charges will be applied (idempotent).
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions style={{ padding: '16px 24px 24px' }}>
        {success ? (
          <Button
            variant="contained"
            onClick={handleClose}
            style={{
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
              startIcon={<X size={16} />}
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={applyPaymentMutation.isPending || !selectedOrderId}
              startIcon={applyPaymentMutation.isPending ? <CircularProgress size={20} /> : <CheckCircle size={16} />}
              style={{
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

/**
 * BillingSessionsCard - P0 Admin Billing & Sessions Management
 * ============================================================
 *
 * Displays session credits, pending orders, and upcoming sessions
 * Provides quick actions for booking sessions, adding credits, and applying payments
 *
 * Features:
 * - Session credits display (prominent)
 * - Last purchase info with PAID badge
 * - Pending orders list with Apply Payment action
 * - Next upcoming session
 * - Quick action buttons (Book Session, Add Sessions, Apply Payment)
 * - Mobile-friendly (44px touch targets)
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  CreditCard,
  EventAvailable,
  Add,
  Payment,
  Schedule,
  CheckCircle,
  Warning,
  AccessTime,
  Person,
  Refresh
} from '@mui/icons-material';

import { useClientBillingOverview } from '../../../../../hooks/useClientBillingOverview';
import BookSessionDialog from './BookSessionDialog';
import AddSessionsDialog from './AddSessionsDialog';
import ApplyPaymentDialog from './ApplyPaymentDialog';

interface BillingSessionsCardProps {
  clientId: number | string;
  clientName?: string;
  onUpdate?: () => void;
}

const BillingSessionsCard: React.FC<BillingSessionsCardProps> = ({
  clientId,
  clientName,
  onUpdate
}) => {
  const { data, isLoading, error, refetch } = useClientBillingOverview(clientId);

  // Dialog states
  const [bookSessionOpen, setBookSessionOpen] = useState(false);
  const [addSessionsOpen, setAddSessionsOpen] = useState(false);
  const [applyPaymentOpen, setApplyPaymentOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const handleDialogSuccess = () => {
    refetch();
    onUpdate?.();
  };

  const handleApplyPaymentClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setApplyPaymentOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${Number(amount).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card sx={{ background: 'rgba(71, 85, 105, 0.5)', mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#00ffff' }} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ background: 'rgba(71, 85, 105, 0.5)', mb: 3 }}>
        <CardContent>
          <Alert severity="error">
            Failed to load billing overview. Please try again.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ background: 'rgba(71, 85, 105, 0.5)', mb: 3 }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <CreditCard sx={{ color: '#00ffff' }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                Billing & Sessions
              </Typography>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>

          <Grid container spacing={3}>
            {/* Sessions Remaining - Prominent Display */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.15))',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  border: '1px solid rgba(0, 255, 255, 0.3)'
                }}
              >
                <Typography variant="h2" sx={{ color: '#00ffff', fontWeight: 700 }}>
                  {data?.sessionsRemaining ?? 0}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Sessions Remaining
                </Typography>
                {data?.sessionsRemaining === 0 && (
                  <Chip
                    icon={<Warning sx={{ fontSize: 16 }} />}
                    label="No Credits"
                    color="error"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Grid>

            {/* Last Purchase */}
            <Grid item xs={12} md={4}>
              <Box sx={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, p: 2, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Last Purchase
                </Typography>
                {data?.lastPurchase ? (
                  <>
                    <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
                      {data.lastPurchase.packageName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {data.lastPurchase.sessions} sessions • {formatCurrency(data.lastPurchase.amount)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      {formatDate(data.lastPurchase.grantedAt)}
                    </Typography>
                    {data.lastPurchase.paymentAppliedAt && (
                      <Chip
                        icon={<CheckCircle sx={{ fontSize: 14 }} />}
                        label="PAID"
                        color="success"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    No purchases yet
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Next Session */}
            <Grid item xs={12} md={4}>
              <Box sx={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, p: 2, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Next Session
                </Typography>
                {data?.nextSession ? (
                  <>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Schedule sx={{ color: '#00ffff', fontSize: 18 }} />
                      <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
                        {formatDateTime(data.nextSession.date)}
                      </Typography>
                    </Box>
                    {data.nextSession.trainer && (
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <Person sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          with {data.nextSession.trainer.name}
                        </Typography>
                      </Box>
                    )}
                    <Chip
                      label={data.nextSession.status}
                      color={data.nextSession.status === 'confirmed' ? 'success' : 'info'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    No upcoming sessions
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Pending Orders Section */}
          {data?.pendingOrders && data.pendingOrders.length > 0 && (
            <>
              <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="subtitle2" sx={{ color: '#fbbf24', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ fontSize: 18 }} />
                Pending Payment ({data.pendingOrders.length})
              </Typography>
              {data.pendingOrders.map((order) => (
                <Box
                  key={order.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderRadius: 1,
                    p: 2,
                    mb: 1,
                    border: '1px solid rgba(251, 191, 36, 0.3)'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                      {order.packageName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      {order.sessions} sessions • {formatCurrency(order.amount)} • Created {formatDate(order.createdAt)}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Payment />}
                    onClick={() => handleApplyPaymentClick(order.id)}
                    sx={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      minHeight: 44,
                      minWidth: 120
                    }}
                  >
                    Apply Payment
                  </Button>
                </Box>
              ))}
            </>
          )}

          {/* Action Buttons */}
          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Button
              variant="contained"
              startIcon={<EventAvailable />}
              onClick={() => setBookSessionOpen(true)}
              disabled={!data?.sessionsRemaining || data.sessionsRemaining === 0}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                minHeight: 44,
                flex: '1 1 auto',
                minWidth: 150,
                '&:disabled': {
                  background: 'rgba(59, 130, 246, 0.3)',
                  color: 'rgba(255,255,255,0.5)'
                }
              }}
            >
              Book Session
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddSessionsOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                minHeight: 44,
                flex: '1 1 auto',
                minWidth: 150
              }}
            >
              Add Sessions
            </Button>
            {data?.pendingOrders && data.pendingOrders.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<Payment />}
                onClick={() => handleApplyPaymentClick(data.pendingOrders[0].id)}
                sx={{
                  color: '#10b981',
                  borderColor: '#10b981',
                  minHeight: 44,
                  flex: '1 1 auto',
                  minWidth: 150,
                  '&:hover': {
                    borderColor: '#059669',
                    background: 'rgba(16, 185, 129, 0.1)'
                  }
                }}
              >
                Apply Payment
              </Button>
            )}
          </Box>

          {/* Recent Sessions */}
          {data?.recentSessions && data.recentSessions.length > 0 && (
            <>
              <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime sx={{ fontSize: 18 }} />
                Recent Sessions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.recentSessions.slice(0, 3).map((session) => (
                  <Box
                    key={session.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      p: 1.5
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        {formatDate(session.date)}
                      </Typography>
                      {session.trainer && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          with {session.trainer.name}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={`${session.duration} min`}
                      size="small"
                      sx={{ background: 'rgba(0, 255, 255, 0.2)', color: '#00ffff' }}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <BookSessionDialog
        open={bookSessionOpen}
        onClose={() => setBookSessionOpen(false)}
        clientId={clientId}
        clientName={clientName || data?.client?.name}
        onSuccess={handleDialogSuccess}
      />

      <AddSessionsDialog
        open={addSessionsOpen}
        onClose={() => setAddSessionsOpen(false)}
        clientId={clientId}
        clientName={clientName || data?.client?.name}
        onSuccess={handleDialogSuccess}
      />

      <ApplyPaymentDialog
        open={applyPaymentOpen}
        onClose={() => {
          setApplyPaymentOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
        pendingOrders={data?.pendingOrders || []}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
};

export default BillingSessionsCard;

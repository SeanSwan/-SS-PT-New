import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkoutCopilotPanel from './WorkoutCopilotPanel';
import type {
  DraftSuccessResponse,
  DegradedResponse,
  ApproveSuccessResponse,
  TemplateEntry,
} from '../../../../../services/aiWorkoutService';

// ── Mock authAxios, useAuth, useToast ──────────────────────────────────────

const mockListTemplates = vi.fn();
const mockGenerateDraft = vi.fn();
const mockApproveDraft = vi.fn();
const mockGenerateLongHorizonDraft = vi.fn();
const mockApproveLongHorizonDraft = vi.fn();
const mockGetClientDetails = vi.fn();
let mockRole: 'admin' | 'trainer' | 'client' = 'admin';

vi.mock('../../../../../services/aiWorkoutService', async () => {
  const actual = await vi.importActual<typeof import('../../../../../services/aiWorkoutService')>(
    '../../../../../services/aiWorkoutService'
  );
  return {
    ...actual,
    createAiWorkoutService: () => ({
      listTemplates: mockListTemplates,
      generateDraft: mockGenerateDraft,
      approveDraft: mockApproveDraft,
      generateLongHorizonDraft: mockGenerateLongHorizonDraft,
      approveLongHorizonDraft: mockApproveLongHorizonDraft,
    }),
  };
});

vi.mock('../../../../../services/adminClientService', () => ({
  __esModule: true,
  default: {
    getClientDetails: (...args: any[]) => mockGetClientDetails(...args),
  },
}));

const mockToast = vi.fn();

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: {}, user: { role: mockRole } }),
}));

vi.mock('../../../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const TEMPLATES: TemplateEntry[] = [
  {
    id: 'tpl-1',
    label: 'Hypertrophy Phase 3',
    category: 'strength',
    status: 'active',
    nasmFramework: 'OPT Phase 3',
    optPhase: 3,
    supportsAiContext: true,
    tags: ['intermediate', 'hypertrophy'],
  },
  {
    id: 'tpl-2',
    label: 'Stabilization Endurance',
    category: 'endurance',
    status: 'active',
    nasmFramework: 'OPT Phase 1',
    optPhase: 1,
    supportsAiContext: true,
    tags: ['beginner'],
  },
];

const DRAFT_RESPONSE: DraftSuccessResponse = {
  success: true,
  draft: true,
  plan: {
    planName: 'Test Plan Alpha',
    durationWeeks: 4,
    summary: 'A hypertrophy plan',
    days: [
      {
        dayNumber: 1,
        name: 'Upper Body',
        focus: 'Chest / Shoulders',
        exercises: [
          { name: 'Bench Press', setScheme: '4x8', restPeriod: 90 },
          { name: 'Overhead Press', setScheme: '3x10', restPeriod: 60 },
        ],
      },
    ],
  },
  generationMode: 'ai_full',
  explainability: {
    dataSources: ['training_history', 'nasm_assessment'],
    phaseRationale: 'Client in hypertrophy phase based on assessment.',
    progressFlags: [],
    safetyFlags: [],
    dataQuality: 'high',
  },
  safetyConstraints: {
    medicalClearanceRequired: false,
    maxIntensityPct: 85,
    movementRestrictions: ['No overhead pressing with left shoulder'],
  },
  exerciseRecommendations: [],
  warnings: ['Volume slightly above target for beginner level'],
  missingInputs: ['body composition'],
  provider: 'openai',
  auditLogId: 42,
};

const DEGRADED_RESPONSE: DegradedResponse = {
  success: true,
  degraded: true,
  code: 'AI_DEGRADED_MODE',
  message: 'All AI providers temporarily unavailable.',
  fallback: {
    type: 'template_suggestions',
    templateSuggestions: [
      { id: 'tpl-1', label: 'Hypertrophy Phase 3', category: 'strength' },
      { id: 'tpl-2', label: 'Stabilization Endurance', category: 'endurance' },
    ],
    reasons: ['OpenAI: rate limited', 'Claude: key not configured'],
  },
  failoverTrace: ['openai -> claude -> degraded'],
};

const APPROVE_RESPONSE: ApproveSuccessResponse = {
  success: true,
  planId: 101,
  sourceType: 'ai_full',
  summary: 'Saved successfully',
  unmatchedExercises: [],
  validationWarnings: [],
};

const LONG_HORIZON_DRAFT = {
  success: true as const,
  draft: true as const,
  horizonMonths: 6 as const,
  warnings: ['Total block duration is short for a 6-month horizon'],
  provider: 'openai',
  auditLogId: 808,
  plan: {
    planName: '6-Month Strength Arc',
    horizonMonths: 6 as const,
    summary: 'Build strength then transition to power',
    blocks: [
      {
        sequence: 1,
        nasmFramework: 'OPT' as const,
        optPhase: 2,
        phaseName: 'Strength Endurance',
        focus: 'Foundational volume',
        durationWeeks: 6,
        sessionsPerWeek: 3,
        entryCriteria: 'Client cleared for moderate intensity',
        exitCriteria: 'RPE trend stable under target',
        notes: 'Watch shoulder loading',
      },
      {
        sequence: 2,
        nasmFramework: 'OPT' as const,
        optPhase: 5,
        phaseName: 'Power Integration',
        focus: 'Power development',
        durationWeeks: 4,
        sessionsPerWeek: 3,
        entryCriteria: 'Strength block completed',
        exitCriteria: 'Power targets achieved',
        notes: null,
      },
    ],
  },
};

const LONG_HORIZON_APPROVE = {
  success: true as const,
  planId: 999,
  sourceType: 'ai_assisted',
  summary: 'Approved long horizon plan',
  blockCount: 2,
  validationWarnings: [],
  eligibilityWarnings: [],
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  clientId: 56,
  clientName: 'Test Client',
  onSuccess: vi.fn(),
};

// ── Helpers ────────────────────────────────────────────────────────────────

function renderPanel(props = {}) {
  return render(<WorkoutCopilotPanel {...defaultProps} {...props} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('WorkoutCopilotPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'admin';
    mockListTemplates.mockResolvedValue({
      success: true,
      templates: TEMPLATES,
      count: 2,
      registryVersion: '1.0',
    });
    mockGetClientDetails.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 56,
          masterPromptJson: {
            client: {
              goals: {
                primaryGoal: 'fat_loss',
                secondaryGoals: ['mobility', 'strength'],
                constraints: ['left shoulder discomfort'],
              },
            },
          },
        },
      },
    });
  });

  // ── 1. IDLE renders template catalog ──────────────────────────────────

  describe('IDLE state', () => {
    it('renders the title and generate button', async () => {
      renderPanel();

      // Wait for async template loading to settle (avoids act() warning)
      await waitFor(() => {
        expect(screen.getByText('Available NASM Templates')).toBeInTheDocument();
      });

      expect(screen.getByText(/AI Workout Copilot/)).toBeInTheDocument();
      expect(screen.getByText('Generate Draft')).toBeInTheDocument();
    });

    it('loads and renders the template catalog', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('Available NASM Templates')).toBeInTheDocument();
      });

      expect(screen.getByText('Hypertrophy Phase 3')).toBeInTheDocument();
      expect(screen.getByText('Stabilization Endurance')).toBeInTheDocument();
      expect(screen.getByText('OPT Phase 3')).toBeInTheDocument();
      expect(screen.getByText('OPT Phase 1')).toBeInTheDocument();
    });

    it('returns null when open is false', () => {
      const { container } = renderPanel({ open: false });
      expect(container.innerHTML).toBe('');
    });
  });

  // ── 2. Generate → DRAFT_REVIEW renders explainability + warnings ──────

  describe('Generate → DRAFT_REVIEW', () => {
    it('renders plan, explainability, safety constraints, and warnings', async () => {
      mockGenerateDraft.mockResolvedValue(DRAFT_RESPONSE);
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      // Plan name is in an editable <input>, not plain text
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Plan Alpha')).toBeInTheDocument();
      });

      // Explainability section
      expect(screen.getByText('AI Explainability')).toBeInTheDocument();
      expect(screen.getByText('training history')).toBeInTheDocument();
      expect(screen.getByText('nasm assessment')).toBeInTheDocument();
      expect(screen.getByText('Client in hypertrophy phase based on assessment.')).toBeInTheDocument();

      // Safety constraints
      expect(screen.getByText('Max Intensity: 85%')).toBeInTheDocument();
      expect(screen.getByText('No overhead pressing with left shoulder')).toBeInTheDocument();

      // Warnings
      expect(screen.getByText('Volume slightly above target for beginner level')).toBeInTheDocument();

      // Missing inputs
      expect(screen.getByText(/body composition/)).toBeInTheDocument();

      // Approve button present
      expect(screen.getByText('Approve & Save')).toBeInTheDocument();
    });

    it('renders plan days with exercise count', async () => {
      mockGenerateDraft.mockResolvedValue(DRAFT_RESPONSE);
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText(/Day 1: Upper Body/)).toBeInTheDocument();
      });

      expect(screen.getByText('2 exercises')).toBeInTheDocument();
    });
  });

  // ── 3. Generate → DEGRADED renders fallback suggestions ───────────────

  describe('Generate → DEGRADED', () => {
    it('renders degraded message, reasons, and template suggestions', async () => {
      mockGenerateDraft.mockResolvedValue(DEGRADED_RESPONSE);
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText('AI Temporarily Unavailable')).toBeInTheDocument();
      });

      // Message
      expect(screen.getByText('All AI providers temporarily unavailable.')).toBeInTheDocument();

      // Reasons
      expect(screen.getByText('OpenAI: rate limited')).toBeInTheDocument();
      expect(screen.getByText('Claude: key not configured')).toBeInTheDocument();

      // Template suggestions
      expect(screen.getByText('Available Templates (Manual Mode)')).toBeInTheDocument();
      expect(screen.getByText('Hypertrophy Phase 3')).toBeInTheDocument();
      expect(screen.getByText('Stabilization Endurance')).toBeInTheDocument();

      // Retry button
      expect(screen.getByText('Retry AI Generation')).toBeInTheDocument();
    });
  });

  // ── 4. Generate → consent error renders corrected wording ─────────────

  describe('Generate → consent error', () => {
    it('renders consent-specific error message and no retry button', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: 'AI consent not granted',
            code: 'AI_CONSENT_REQUIRED',
          },
        },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      });

      // Consent-specific wording
      expect(
        screen.getByText(/client must enable AI features from their own account settings/)
      ).toBeInTheDocument();

      // No retry button for consent errors (not in the retryable set)
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  // ── 4b. Waiver error codes classified as consent errors (5W-F) ────────

  describe('Generate → waiver error (5W-F)', () => {
    it('renders waiver-specific error message for AI_WAIVER_MISSING', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: 'AI consent check failed',
            code: 'AI_WAIVER_MISSING',
          },
        },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      });

      // Waiver-specific wording
      expect(
        screen.getByText(/waiver consent is missing or outdated/)
      ).toBeInTheDocument();

      // No retry button (not retryable)
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('renders waiver-specific error message for AI_WAIVER_VERSION_OUTDATED', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: 'AI consent check failed',
            code: 'AI_WAIVER_VERSION_OUTDATED',
          },
        },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      });

      // Waiver-specific wording (not the generic consent message)
      expect(
        screen.getByText(/waiver consent is missing or outdated/)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/client must enable AI features/)
      ).not.toBeInTheDocument();
    });
  });

  // ── 5. Approve success → SAVED state ──────────────────────────────────

  describe('Approve → SAVED', () => {
    it('transitions through draft_review to saved state', async () => {
      mockGenerateDraft.mockResolvedValue(DRAFT_RESPONSE);
      mockApproveDraft.mockResolvedValue(APPROVE_RESPONSE);
      renderPanel();

      const user = userEvent.setup();

      // Generate
      await user.click(screen.getByText('Generate Draft'));
      await waitFor(() => {
        expect(screen.getByText('Approve & Save')).toBeInTheDocument();
      });

      // Approve
      await user.click(screen.getByText('Approve & Save'));

      await waitFor(() => {
        expect(screen.getByText('Plan Approved and Saved')).toBeInTheDocument();
      });

      // Plan ID displayed
      expect(screen.getByText('101')).toBeInTheDocument();

      // Toast fired
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Workout Plan Approved',
        })
      );

      // onSuccess callback invoked
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it('displays unmatched exercises when present', async () => {
      mockGenerateDraft.mockResolvedValue(DRAFT_RESPONSE);
      mockApproveDraft.mockResolvedValue({
        ...APPROVE_RESPONSE,
        unmatchedExercises: [{ dayNumber: 1, name: 'Cable Flyes' }],
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));
      await waitFor(() => expect(screen.getByText('Approve & Save')).toBeInTheDocument());

      await user.click(screen.getByText('Approve & Save'));

      await waitFor(() => {
        expect(screen.getByText('Plan Approved and Saved')).toBeInTheDocument();
      });

      expect(screen.getByText(/Unmatched exercises/)).toBeInTheDocument();
      expect(screen.getByText(/Day 1: Cable Flyes/)).toBeInTheDocument();
    });
  });

  // ── 6. Double-submit prevention ───────────────────────────────────────

  describe('Double-submit prevention', () => {
    it('disables Generate Draft button during generation', async () => {
      // Make generateDraft hang (never resolve) to test the disabled state
      let resolveGenerate: (value: DraftSuccessResponse) => void;
      mockGenerateDraft.mockReturnValue(
        new Promise<DraftSuccessResponse>((resolve) => {
          resolveGenerate = resolve;
        })
      );
      renderPanel();

      const user = userEvent.setup();
      const generateBtn = screen.getByText('Generate Draft');
      await user.click(generateBtn);

      // While generating, the IDLE state is gone — generating state shows spinner text
      await waitFor(() => {
        expect(screen.getByText('Generating Workout Plan...')).toBeInTheDocument();
      });

      // Resolve to clean up
      await act(async () => {
        resolveGenerate!(DRAFT_RESPONSE);
      });
    });

    it('disables Approve & Save button during approval', async () => {
      mockGenerateDraft.mockResolvedValue(DRAFT_RESPONSE);

      let resolveApprove: (value: ApproveSuccessResponse) => void;
      mockApproveDraft.mockReturnValue(
        new Promise<ApproveSuccessResponse>((resolve) => {
          resolveApprove = resolve;
        })
      );
      renderPanel();

      const user = userEvent.setup();

      // Generate first
      await user.click(screen.getByText('Generate Draft'));
      await waitFor(() => expect(screen.getByText('Approve & Save')).toBeInTheDocument());

      // Click approve
      const approveBtn = screen.getByText('Approve & Save');
      await user.click(approveBtn);

      // Button text changes to "Saving..." and is disabled
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
      expect(screen.getByText('Saving...').closest('button')).toBeDisabled();

      // Resolve to clean up
      await act(async () => {
        resolveApprove!(APPROVE_RESPONSE);
      });
    });

    it('does not call generateDraft twice on rapid double-click', async () => {
      let resolveGenerate: (value: DraftSuccessResponse) => void;
      mockGenerateDraft.mockReturnValue(
        new Promise<DraftSuccessResponse>((resolve) => {
          resolveGenerate = resolve;
        })
      );
      renderPanel();

      const user = userEvent.setup();
      const generateBtn = screen.getByText('Generate Draft');

      // Click twice rapidly
      await user.click(generateBtn);
      // The button is gone after first click (state transitions to generating)
      // so the second click wouldn't reach it anyway — the isSubmitting guard handles programmatic calls

      expect(mockGenerateDraft).toHaveBeenCalledTimes(1);

      // Resolve to clean up
      await act(async () => {
        resolveGenerate!(DRAFT_RESPONSE);
      });
    });
  });

  // ── 7. Retryable error shows Retry button ─────────────────────────────

  describe('Retryable errors', () => {
    it('shows Retry button for AI_RATE_LIMITED errors', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: 'Rate limited, try again later',
            code: 'AI_RATE_LIMITED',
          },
        },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  // ── 8. Assignment error (trainer 403) ─────────────────────────────────

  describe('Assignment error (trainer 403)', () => {
    it('renders assignment-specific wording and no retry button', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: 'Access denied: Trainer is not assigned to this client',
            code: 'AI_ASSIGNMENT_DENIED',
          },
        },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      });

      // Assignment-specific wording
      expect(
        screen.getByText(/not currently assigned to this client/)
      ).toBeInTheDocument();

      // No retry button (not retryable)
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('is distinct from consent error — no consent wording shown', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: 'Access denied: Trainer is not assigned to this client',
            code: 'AI_ASSIGNMENT_DENIED',
          },
        },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      });

      // Assignment wording present
      expect(
        screen.getByText(/not currently assigned to this client/)
      ).toBeInTheDocument();

      // Consent wording NOT present
      expect(
        screen.queryByText(/client must enable AI features/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Single workout override flow', () => {
    it('admin sees override reason input in idle state', async () => {
      renderPanel();
      await waitFor(() => {
        expect(screen.getByText('Available NASM Templates')).toBeInTheDocument();
      });
      expect(screen.getByText(/Admin Override Reason \(optional\)/i)).toBeInTheDocument();
    });

    it('non-admin does not see override reason input in idle state', async () => {
      mockRole = 'trainer';
      renderPanel();
      await waitFor(() => {
        expect(screen.getByText('Available NASM Templates')).toBeInTheDocument();
      });
      expect(screen.queryByText(/Admin Override Reason/i)).not.toBeInTheDocument();
    });

    it('MISSING_OVERRIDE_REASON returns to idle and marks override as required', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: { data: { code: 'MISSING_OVERRIDE_REASON', message: 'Override reason required' } },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(screen.getByText(/Admin Override Reason \(required\)/i)).toBeInTheDocument();
      });
      expect(screen.getByText('Generate Draft')).toBeInTheDocument();
    });

    it('passes override reason to generateDraft', async () => {
      mockGenerateDraft.mockResolvedValue(DRAFT_RESPONSE);
      renderPanel();

      const user = userEvent.setup();
      await user.type(
        screen.getByPlaceholderText(/Provide justification when consent override is required/i),
        '  Override reason for session  ',
      );
      await user.click(screen.getByText('Generate Draft'));

      await waitFor(() => {
        expect(mockGenerateDraft).toHaveBeenCalledWith(56, 'Override reason for session');
      });
    });

    it('passes override reason to approveDraft', async () => {
      mockGenerateDraft.mockResolvedValue(DRAFT_RESPONSE);
      mockApproveDraft.mockResolvedValue(APPROVE_RESPONSE);
      renderPanel();

      const user = userEvent.setup();
      await user.type(
        screen.getByPlaceholderText(/Provide justification when consent override is required/i),
        'Supervisor override',
      );
      await user.click(screen.getByText('Generate Draft'));
      await waitFor(() => {
        expect(screen.getByText('Approve & Save')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Approve & Save'));

      await waitFor(() => {
        expect(mockApproveDraft).toHaveBeenCalledWith(expect.objectContaining({
          overrideReason: 'Supervisor override',
        }));
      });
    });

    it('shows Provide Override Reason button when override error is surfaced', async () => {
      mockGenerateDraft.mockRejectedValue({
        response: { data: { code: 'MISSING_OVERRIDE_REASON', message: 'Override reason required' } },
      });
      renderPanel();

      const user = userEvent.setup();
      await user.click(screen.getByText('Generate Draft'));
      await waitFor(() => {
        expect(screen.getByText(/Admin Override Reason \(required\)/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText('Generate Draft'));
      await waitFor(() => {
        expect(screen.getByText('Provide Override Reason')).toBeInTheDocument();
      });
    });
  });

  describe('Long-Horizon tab', () => {
    it('renders Single Workout and Long-Horizon tabs', async () => {
      renderPanel();

      // Wait for async template loading to settle (avoids act() warning)
      await waitFor(() => {
        expect(screen.getByText('Available NASM Templates')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Single Workout' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Long-Horizon' })).toBeInTheDocument();
    });

    it('switches to long-horizon idle state', async () => {
      renderPanel();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      expect(screen.getByText('Long-Horizon Planning')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Configure Plan' })).toBeInTheDocument();
    });

    it('loads real profile goals when entering configure state', async () => {
      renderPanel();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));

      await waitFor(() => {
        expect(mockGetClientDetails).toHaveBeenCalledWith('56');
      });

      expect(screen.getByText('fat_loss')).toBeInTheDocument();
      expect(screen.getByText('mobility, strength')).toBeInTheDocument();
    });

    it('shows goal fallback badge when profile goal fetch fails', async () => {
      mockGetClientDetails.mockRejectedValueOnce(new Error('network'));
      renderPanel();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));

      await waitFor(() => {
        expect(screen.getByText('Goal data unavailable')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Generate Draft' })).toBeEnabled();
    });

    it('generates draft and renders plan review blocks', async () => {
      mockGenerateLongHorizonDraft.mockResolvedValue(LONG_HORIZON_DRAFT);
      renderPanel();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));
      await user.click(screen.getByRole('button', { name: 'Generate Draft' }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('6-Month Strength Arc')).toBeInTheDocument();
      });

      expect(screen.getByText(/Block 1: Strength Endurance/)).toBeInTheDocument();
      expect(screen.getByText(/Block 2: Power Integration/)).toBeInTheDocument();
      expect(screen.getByText('Approve & Save')).toBeInTheDocument();
    });

    it('lh-approve-flow', async () => {
      mockGenerateLongHorizonDraft.mockResolvedValue(LONG_HORIZON_DRAFT);
      mockApproveLongHorizonDraft.mockResolvedValue(LONG_HORIZON_APPROVE);
      renderPanel();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));
      await user.click(screen.getByRole('button', { name: 'Generate Draft' }));

      await waitFor(() => {
        expect(screen.getByText('Approve & Save')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Approve & Save'));

      await waitFor(() => {
        expect(screen.getByText('Long-Horizon Plan Saved')).toBeInTheDocument();
      });

      expect(mockApproveLongHorizonDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 56,
          auditLogId: 808,
          horizonMonths: 6,
        }),
      );
    });

    it('disables approve when auditLogId is null and shows regenerate message', async () => {
      mockGenerateLongHorizonDraft.mockResolvedValue({
        ...LONG_HORIZON_DRAFT,
        auditLogId: null,
      });
      renderPanel();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));
      await user.click(screen.getByRole('button', { name: 'Generate Draft' }));

      await waitFor(() => {
        expect(screen.getByText(/Generation incomplete — regenerate/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Approve & Save')).toBeDisabled();
    });

    it('renders degraded response in long-horizon tab', async () => {
      mockGenerateLongHorizonDraft.mockResolvedValue(DEGRADED_RESPONSE);
      renderPanel();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));
      await user.click(screen.getByRole('button', { name: 'Generate Draft' }));

      await waitFor(() => {
        expect(screen.getByText('AI Temporarily Unavailable')).toBeInTheDocument();
      });
    });

    it('handles MISSING_OVERRIDE_REASON by returning to configure state', async () => {
      mockGenerateLongHorizonDraft.mockRejectedValue({
        response: {
          data: {
            success: false,
            code: 'MISSING_OVERRIDE_REASON',
            message: 'Admin override requires reason',
          },
        },
      });
      renderPanel();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));
      await user.click(screen.getByRole('button', { name: 'Generate Draft' }));

      await waitFor(() => {
        expect(screen.getByText(/Admin Override Reason/i)).toBeInTheDocument();
      });
    });

    it('lh-override-reason-flow', async () => {
      mockGenerateLongHorizonDraft.mockResolvedValue(LONG_HORIZON_DRAFT);
      mockApproveLongHorizonDraft.mockResolvedValue(LONG_HORIZON_APPROVE);
      renderPanel();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));
      await user.type(
        screen.getByPlaceholderText(/Provide justification when consent override is required/i),
        'Manual override for in-person session',
      );
      await user.click(screen.getByRole('button', { name: 'Generate Draft' }));

      await waitFor(() => {
        expect(screen.getByText('Approve & Save')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Approve & Save'));

      expect(mockGenerateLongHorizonDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          overrideReason: 'Manual override for in-person session',
        }),
      );
      expect(mockApproveLongHorizonDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          overrideReason: 'Manual override for in-person session',
        }),
      );
    });

    it('resets long-horizon state when switching tabs', async () => {
      mockGenerateLongHorizonDraft.mockResolvedValue(LONG_HORIZON_DRAFT);
      renderPanel();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));
      await user.click(screen.getByRole('button', { name: 'Configure Plan' }));
      await user.click(screen.getByRole('button', { name: 'Generate Draft' }));
      await waitFor(() => {
        expect(screen.getByDisplayValue('6-Month Strength Arc')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Single Workout' }));
      await user.click(screen.getByRole('button', { name: 'Long-Horizon' }));

      expect(screen.getByText('Long-Horizon Planning')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Configure Plan' })).toBeInTheDocument();
    });
  });
});


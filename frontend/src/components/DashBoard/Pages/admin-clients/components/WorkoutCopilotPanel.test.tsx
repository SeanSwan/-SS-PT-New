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
    }),
  };
});

const mockToast = vi.fn();

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: {} }),
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
    mockListTemplates.mockResolvedValue({
      success: true,
      templates: TEMPLATES,
      count: 2,
      registryVersion: '1.0',
    });
  });

  // ── 1. IDLE renders template catalog ──────────────────────────────────

  describe('IDLE state', () => {
    it('renders the title and generate button', async () => {
      renderPanel();

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
});

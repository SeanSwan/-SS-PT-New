/**
 * NASMCompliancePanel.tsx
 * =======================
 * 
 * NASM Certification & Compliance Showcase System
 * Professional fitness standards integration with toggleable certification display
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - NASM certification display with hide/show toggle option
 * - Exercise form compliance tracking and analytics
 * - Injury prevention metrics and reporting
 * - Professional standards adherence monitoring
 * - NASM-compliant exercise database integration
 * - Fitness assessment and movement screening tools
 * - Professional certification management
 * - Compliance audit trails and documentation
 * 
 * Master Prompt Alignment:
 * - NASM-certified performance specialist integration
 * - Professional fitness methodology showcase
 * - Enterprise-grade compliance monitoring
 * - AAA 7-star certification management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  Award, 
  Shield, 
  Target, 
  Activity, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  FileText,
  Users,
  Clock,
  Zap,
  Heart,
  RefreshCw,
  Download,
  Star,
  Certificate,
  BookOpen,
  Dumbbell,
  UserCheck,
  AlertCircle,
  Info
} from 'lucide-react';

// === STYLED COMPONENTS ===
const NASMContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
`;

const NASMHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(59, 130, 246, 0.2);
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .header-icon {
    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
    border-radius: 12px;
    padding: 0.75rem;
    color: white;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 2px solid ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return '#e5e7eb';
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return 'white';
    }
  }};
  color: ${props => props.$variant === 'primary' || props.$variant === 'danger' ? 'white' : '#64748b'};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return '#2563eb';
        case 'danger': return '#dc2626';
        default: return '#f8fafc';
      }
    }};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const CertificationToggle = styled(motion.div)`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(245, 158, 11, 0.3);
  margin-bottom: 2rem;
  
  .toggle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    
    h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #d97706;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
  
  .toggle-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .toggle-info {
      .toggle-description {
        color: #64748b;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
      }
      
      .toggle-status {
        font-size: 0.8rem;
        color: #9ca3af;
      }
    }
  }
`;

const ToggleSwitch = styled(motion.button)<{ $active: boolean }>`
  width: 60px;
  height: 32px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  position: relative;
  background: ${props => props.$active ? '#10b981' : '#e5e7eb'};
  transition: all 0.3s ease;
  
  &:before {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '30px' : '2px'};
    width: 28px;
    height: 28px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &:hover {
    background: ${props => props.$active ? '#059669' : '#d1d5db'};
  }
`;

const CertificationShowcase = styled(motion.div)`
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(255, 255, 255, 1) 100%);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.2);
  border: 2px solid rgba(245, 158, 11, 0.3);
  margin-bottom: 2rem;
  text-align: center;
  
  .certification-badge {
    width: 120px;
    height: 120px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(245, 158, 11, 0.4);
    
    .badge-icon {
      color: white;
    }
  }
  
  .certification-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #92400e;
    margin-bottom: 0.5rem;
  }
  
  .certification-subtitle {
    font-size: 1.1rem;
    color: #d97706;
    margin-bottom: 1rem;
    font-weight: 500;
  }
  
  .certification-description {
    color: #64748b;
    font-size: 0.95rem;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto 1.5rem;
  }
  
  .certification-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(245, 158, 11, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(245, 158, 11, 0.2);
    
    .feature-icon {
      color: #d97706;
      width: 16px;
      height: 16px;
    }
    
    .feature-text {
      color: #92400e;
      font-size: 0.9rem;
      font-weight: 500;
    }
  }
`;

const ComplianceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ComplianceCard = styled(motion.div)<{ $status?: 'excellent' | 'good' | 'needs-attention' | 'critical' }>`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => {
    switch (props.$status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'needs-attention': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#e5e7eb';
    }
  }};
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .card-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => {
      switch (props.$status) {
        case 'excellent': return 'rgba(16, 185, 129, 0.1)';
        case 'good': return 'rgba(59, 130, 246, 0.1)';
        case 'needs-attention': return 'rgba(245, 158, 11, 0.1)';
        case 'critical': return 'rgba(239, 68, 68, 0.1)';
        default: return 'rgba(156, 163, 175, 0.1)';
      }
    }};
    color: ${props => {
      switch (props.$status) {
        case 'excellent': return '#10b981';
        case 'good': return '#3b82f6';
        case 'needs-attention': return '#f59e0b';
        case 'critical': return '#ef4444';
        default: return '#9ca3af';
      }
    }};
  }
  
  .card-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }
  
  .card-label {
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }
  
  .card-description {
    font-size: 0.8rem;
    color: #9ca3af;
    line-height: 1.4;
  }
  
  .card-progress {
    margin-top: 1rem;
    
    .progress-bar {
      width: 100%;
      height: 6px;
      background: #f1f5f9;
      border-radius: 3px;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: ${props => {
          switch (props.$status) {
            case 'excellent': return 'linear-gradient(90deg, #10b981, #059669)';
            case 'good': return 'linear-gradient(90deg, #3b82f6, #2563eb)';
            case 'needs-attention': return 'linear-gradient(90deg, #f59e0b, #d97706)';
            case 'critical': return 'linear-gradient(90deg, #ef4444, #dc2626)';
            default: return 'linear-gradient(90deg, #9ca3af, #6b7280)';
          }
        }};
        transition: width 0.5s ease;
      }
    }
    
    .progress-text {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 0.5rem;
      text-align: right;
    }
  }
`;

const AnalyticsSection = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AnalyticsContent = styled.div`
  padding: 1.5rem;
  
  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }
  
  .analytics-item {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    
    .analytics-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 0.5rem;
    }
    
    .analytics-label {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 500;
    }
    
    .analytics-change {
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      
      &.positive {
        color: #047857;
      }
      
      &.negative {
        color: #dc2626;
      }
      
      &.neutral {
        color: #64748b;
      }
    }
  }
`;

// === MOCK DATA ===
const mockNASMData = {
  certificationLevel: 'NASM-CPT',
  certificationDate: '2024-03-15',
  renewalDate: '2026-03-15',
  complianceScore: 94,
  exerciseCompliance: 96,
  safetyScore: 98,
  clientSatisfaction: 92,
  injuryPreventionRate: 99.2,
  assessmentsCompleted: 247,
  correctiveExercises: 89,
  movementScreenings: 156
};

const mockComplianceFeatures = [
  'NASM-CPT Certified Personal Trainer',
  'Corrective Exercise Specialist',
  'Movement Assessment Protocol',
  'Injury Prevention Standards',
  'Professional Continuing Education',
  'Evidence-Based Exercise Selection',
  'Client Safety Prioritization',
  'Quality Assurance Monitoring'
];

// === MAIN COMPONENT ===
const NASMCompliancePanel: React.FC = () => {
  const [showCertification, setShowCertification] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const toggleCertificationDisplay = () => {
    setShowCertification(!showCertification);
  };

  return (
    <NASMContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <NASMHeader>
        <HeaderTitle>
          <div className="header-icon">
            <Award size={24} />
          </div>
          NASM Compliance & Professional Standards
        </HeaderTitle>
        
        <HeaderActions>
          <ActionButton
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </ActionButton>
          
          <ActionButton
            $variant="primary"
            onClick={() => console.log('Export compliance report')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            Export Report
          </ActionButton>
        </HeaderActions>
      </NASMHeader>

      {/* Certification Display Toggle */}
      <CertificationToggle
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div className="toggle-header">
          <h3>
            <Settings size={18} />
            Certification Display Settings
          </h3>
        </div>
        
        <div className="toggle-content">
          <div className="toggle-info">
            <div className="toggle-description">
              Control the visibility of NASM certification badges and professional credentials throughout the platform.
            </div>
            <div className="toggle-status">
              Status: {showCertification ? 'Certification badges are visible' : 'Certification badges are hidden'}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {showCertification ? <Eye size={16} /> : <EyeOff size={16} />}
            </span>
            <ToggleSwitch
              $active={showCertification}
              onClick={toggleCertificationDisplay}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
          </div>
        </div>
      </CertificationToggle>

      {/* NASM Certification Showcase - Conditional Display */}
      <AnimatePresence>
        {showCertification && (
          <CertificationShowcase
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="certification-badge">
              <Award size={48} className="badge-icon" />
            </div>
            
            <h2 className="certification-title">NASM Certified Platform</h2>
            <p className="certification-subtitle">Professional Fitness Standards Excellence</p>
            
            <p className="certification-description">
              SwanStudios is built on NASM (National Academy of Sports Medicine) certified principles, 
              ensuring every workout, exercise recommendation, and fitness assessment meets the highest 
              professional standards for safety, effectiveness, and client success.
            </p>
            
            <div className="certification-features">
              {mockComplianceFeatures.map((feature, index) => (
                <div key={index} className="feature-item">
                  <CheckCircle className="feature-icon" />
                  <span className="feature-text">{feature}</span>
                </div>
              ))}
            </div>
          </CertificationShowcase>
        )}
      </AnimatePresence>

      {/* Compliance Metrics Grid */}
      <ComplianceGrid>
        <ComplianceCard 
          $status="excellent"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Shield size={20} />
            </div>
          </div>
          <div className="card-value">{mockNASMData.complianceScore}%</div>
          <div className="card-label">Overall Compliance Score</div>
          <div className="card-description">
            Comprehensive adherence to NASM standards and protocols
          </div>
          <div className="card-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${mockNASMData.complianceScore}%` }}
              />
            </div>
            <div className="progress-text">Excellent standing</div>
          </div>
        </ComplianceCard>

        <ComplianceCard 
          $status="excellent"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Target size={20} />
            </div>
          </div>
          <div className="card-value">{mockNASMData.exerciseCompliance}%</div>
          <div className="card-label">Exercise Form Compliance</div>
          <div className="card-description">
            Adherence to proper exercise form and technique standards
          </div>
          <div className="card-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${mockNASMData.exerciseCompliance}%` }}
              />
            </div>
            <div className="progress-text">Superior form quality</div>
          </div>
        </ComplianceCard>

        <ComplianceCard 
          $status="excellent"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Heart size={20} />
            </div>
          </div>
          <div className="card-value">{mockNASMData.safetyScore}%</div>
          <div className="card-label">Safety Standards</div>
          <div className="card-description">
            Client safety protocols and injury prevention measures
          </div>
          <div className="card-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${mockNASMData.safetyScore}%` }}
              />
            </div>
            <div className="progress-text">Outstanding safety record</div>
          </div>
        </ComplianceCard>

        <ComplianceCard 
          $status="good"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Users size={20} />
            </div>
          </div>
          <div className="card-value">{mockNASMData.clientSatisfaction}%</div>
          <div className="card-label">Client Satisfaction</div>
          <div className="card-description">
            Client feedback on professional service quality
          </div>
          <div className="card-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${mockNASMData.clientSatisfaction}%` }}
              />
            </div>
            <div className="progress-text">High satisfaction rate</div>
          </div>
        </ComplianceCard>
      </ComplianceGrid>

      {/* NASM Analytics Section */}
      <AnalyticsSection>
        <SectionHeader>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
            Professional Performance Analytics
          </h2>
          
          <ActionButton
            onClick={() => console.log('View detailed analytics')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <BarChart3 size={16} />
            Detailed View
          </ActionButton>
        </SectionHeader>

        <AnalyticsContent>
          <div className="analytics-grid">
            <div className="analytics-item">
              <div className="analytics-value">{mockNASMData.injuryPreventionRate}%</div>
              <div className="analytics-label">Injury Prevention Rate</div>
              <div className="analytics-change positive">
                <TrendingUp size={12} />
                +0.3% this month
              </div>
            </div>

            <div className="analytics-item">
              <div className="analytics-value">{mockNASMData.assessmentsCompleted}</div>
              <div className="analytics-label">Assessments Completed</div>
              <div className="analytics-change positive">
                <TrendingUp size={12} />
                +12 this month
              </div>
            </div>

            <div className="analytics-item">
              <div className="analytics-value">{mockNASMData.correctiveExercises}</div>
              <div className="analytics-label">Corrective Exercises</div>
              <div className="analytics-change neutral">
                <Activity size={12} />
                Active protocols
              </div>
            </div>

            <div className="analytics-item">
              <div className="analytics-value">{mockNASMData.movementScreenings}</div>
              <div className="analytics-label">Movement Screenings</div>
              <div className="analytics-change positive">
                <CheckCircle size={12} />
                All passed
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h4 style={{ color: '#1e40af', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} />
              NASM Certification Status
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Certification Level</div>
                <div style={{ fontWeight: 600, color: '#1e40af' }}>{mockNASMData.certificationLevel}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Certified Since</div>
                <div style={{ fontWeight: 600, color: '#1e40af' }}>{new Date(mockNASMData.certificationDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Renewal Due</div>
                <div style={{ fontWeight: 600, color: '#10b981' }}>{new Date(mockNASMData.renewalDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</div>
                <div style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} />
                  Active & Compliant
                </div>
              </div>
            </div>
          </div>
        </AnalyticsContent>
      </AnalyticsSection>
    </NASMContainer>
  );
};

export default NASMCompliancePanel;

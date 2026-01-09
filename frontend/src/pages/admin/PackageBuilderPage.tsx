import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Package as PackageIcon, DollarSign } from 'lucide-react';
import GlowButton from '../../components/ui/buttons/GlowButton';

// --- Styled Components ---

const PageContainer = styled.div`
  padding: 2rem;
  color: white;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #00ffff;
  }
  p {
    color: rgba(255, 255, 255, 0.6);
  }
`;

const BuilderGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(20, 20, 35, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  
  svg { color: #00ffff; }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }
  
  input, select, textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.8rem;
    color: white;
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: #00ffff;
    }
  }
`;

const FeatureRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  
  input { flex: 1; }
  
  button {
    background: rgba(255, 50, 50, 0.2);
    border: 1px solid rgba(255, 50, 50, 0.3);
    color: #ff5555;
    border-radius: 8px;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    
    &:hover { background: rgba(255, 50, 50, 0.3); }
  }
`;

const SummaryCard = styled(Card)`
  position: sticky;
  top: 2rem;
  border-color: rgba(0, 255, 255, 0.3);
  background: linear-gradient(145deg, rgba(20, 20, 35, 0.8), rgba(10, 10, 25, 0.9));
`;

const TotalPrice = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #00ffff;
  margin: 1rem 0;
  text-align: center;
`;

interface PackageData {
  name: string;
  description: string;
  price: number;
  frequency: string;
  features: string[];
}

const PackageBuilderPage: React.FC = () => {
  const [pkg, setPkg] = useState<PackageData>({
    name: '',
    description: '',
    price: 0,
    frequency: 'monthly',
    features: ['']
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...pkg.features];
    newFeatures[index] = value;
    setPkg({ ...pkg, features: newFeatures });
  };

  const addFeature = () => {
    setPkg({ ...pkg, features: [...pkg.features, ''] });
  };

  const removeFeature = (index: number) => {
    if (pkg.features.length <= 1) {
      alert('Package must have at least one feature');
      return;
    }
    const newFeatures = pkg.features.filter((_, i) => i !== index);
    setPkg({ ...pkg, features: newFeatures });
  };

  const validatePackage = (): string[] => {
    const errors: string[] = [];
    
    if (!pkg.name.trim()) errors.push('Package name is required');
    if (pkg.price <= 0) errors.push('Price must be greater than $0');
    if (pkg.features.every(f => !f.trim())) errors.push('At least one feature is required');
    
    return errors;
  };

  const handleCreatePackage = async () => {
    const errors = validatePackage();
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pkg)
      });

      if (response.ok) {
        alert('Package created successfully!');
        // Reset form
        setPkg({ name: '', description: '', price: 0, frequency: 'monthly', features: [''] });
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create package');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      alert('Could not connect to server');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PageContainer>
      <Header>
        <h1>Package Builder</h1>
        <p>Create custom training packages for specific clients or general availability.</p>
      </Header>

      <BuilderGrid>
        {/* Left Column: Form */}
        <Card>
          <SectionTitle><PackageIcon size={20} /> Package Details</SectionTitle>
          
          <FormGroup>
            <label>Package Name</label>
            <input 
              type="text" 
              placeholder="e.g. Summer Shred 2025" 
              value={pkg.name}
              onChange={e => setPkg({...pkg, name: e.target.value})}
            />
          </FormGroup>

          <FormGroup>
            <label>Description</label>
            <textarea 
              rows={3} 
              placeholder="Brief description of what's included..."
              value={pkg.description}
              onChange={e => setPkg({...pkg, description: e.target.value})}
            />
          </FormGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormGroup>
              <label>Base Price ($)</label>
              <input 
                type="number" 
                value={pkg.price}
                onChange={e => setPkg({...pkg, price: Number(e.target.value)})}
              />
            </FormGroup>
            <FormGroup>
              <label>Billing Frequency</label>
              <select 
                value={pkg.frequency}
                onChange={e => setPkg({...pkg, frequency: e.target.value})}
              >
                <option value="one-time">One Time</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </FormGroup>
          </div>

          <SectionTitle style={{ marginTop: '2rem' }}>Included Features</SectionTitle>
          {pkg.features.map((feature, idx) => (
            <FeatureRow key={idx}>
              <input 
                type="text" 
                placeholder="e.g. 24/7 Support"
                value={feature}
                onChange={e => handleFeatureChange(idx, e.target.value)}
              />
              <button onClick={() => removeFeature(idx)}><Trash2 size={16} /></button>
            </FeatureRow>
          ))}
          <GlowButton 
            text="Add Feature" 
            theme="primary" 
            size="small" 
            leftIcon={<Plus size={16} />} 
            onClick={addFeature}
          />
        </Card>

        {/* Right Column: Preview & Save */}
        <div>
          <SummaryCard>
            <SectionTitle><DollarSign size={20} /> Summary</SectionTitle>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)' }}>ESTIMATED TOTAL</div>
              <TotalPrice>${pkg.price}</TotalPrice>
              <div style={{ color: '#00ffff', fontSize: '0.9rem' }}>
                {pkg.frequency === 'one-time' ? 'One Time Payment' : `Billed ${pkg.frequency}`}
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />
            
            <GlowButton 
              text={isCreating ? "Creating..." : "Create Package"}
              theme="emerald" 
              size="large" 
              fullWidth 
              leftIcon={<Save size={18} />}
              onClick={handleCreatePackage}
              disabled={isCreating}
            />
          </SummaryCard>
        </div>
      </BuilderGrid>
    </PageContainer>
  );
};

export default PackageBuilderPage;
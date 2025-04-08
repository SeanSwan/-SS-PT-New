// File: frontend/src/components/Reports/ClientSelector.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { ClientData } from '../../types/reports';

// Styled Components with defense theme
const Section = styled.div`
  margin-bottom: 2rem;
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
`;

const SectionHeader = styled.div`
  padding: 1.25rem;
  background-color: #191919;
  border-bottom: 2px solid #333;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #e5c76b;
`;

const SectionContent = styled.div`
  padding: 1.5rem;
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: #2a2a2a;
  border: 1px solid #444;
  color: #e0e0e0;
  transition: all 0.2s ease;

  &:focus {
    border-color: #e5c76b;
    outline: none;
    box-shadow: 0 0 0 2px rgba(229, 199, 107, 0.25);
  }

  &::placeholder {
    color: #888;
  }
`;

const ClientGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

interface ClientCardProps {
  $active: boolean;
  bgPosition: string;
}

const ClientCard = styled.div<ClientCardProps>`
  position: relative;
  padding: 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid ${props => props.$active ? '#e5c76b' : '#444'};
  background-image: url('/src/assets/marble-texture.png');
  background-size: ${() => 120 + Math.random() * 30}%;
  background-position: ${props => props.bgPosition};
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.$active 
      ? 'rgba(20, 20, 20, 0.75)' 
      : 'rgba(0, 0, 0, 0.8)'};
    z-index: 0;
    transition: background 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
    border-color: ${props => props.$active ? '#e5c76b' : '#888'};
    
    &::before {
      background: rgba(20, 20, 20, 0.7);
    }
  }
  
  > * {
    position: relative;
    z-index: 1;
  }
`;

const ClientHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const ClientName = styled.h4`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.activeColor || '#e5c76b'};
`;

const BadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
`;

const ClientLabel = styled.span<{ type: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  background-color: ${props => {
    switch (props.type) {
      case 'active': return 'rgba(25, 135, 84, 0.2)';
      case 'new': return 'rgba(13, 110, 253, 0.2)';
      case 'vip': return 'rgba(255, 193, 7, 0.2)';
      default: return 'rgba(108, 117, 125, 0.2)';
    }
  }};
  
  color: ${props => {
    switch (props.type) {
      case 'active': return '#2ecc71';
      case 'new': return '#3498db';
      case 'vip': return '#f1c40f';
      default: return '#95a5a6';
    }
  }};
`;

const ClientDetail = styled.div`
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #bbb;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;
`;

const Stat = styled.div`
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.75rem 0.5rem;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #444;
  
  strong {
    display: block;
    font-size: 1.1rem;
    font-weight: 700;
    color: #e5c76b;
    margin-bottom: 0.25rem;
  }
  
  span {
    font-size: 0.75rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const NoClients = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background-color: #272727;
  border-radius: 8px;
  color: #999;
  border: 1px dashed #444;
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
  
  strong {
    display: block;
    color: #e5c76b;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }
`;

interface ClientSelectorProps {
  clients: ClientData[];
  selectedClient: ClientData | null;
  onSelectClient: (client: ClientData) => void;
}

/**
 * Enhanced ClientSelector Component
 * Displays a grid of client cards with defense theme styling and marble textures.
 * Includes search functionality and client status indicators.
 * 
 * @param {ClientSelectorProps} props - Component properties
 * @returns {JSX.Element} - Rendered component
 */
const ClientSelector: React.FC<ClientSelectorProps> = ({
  clients,
  selectedClient,
  onSelectClient,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.siteName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate unique background positions for each client card
  const getBackgroundPosition = (index: number) => {
    const positions = [
      'top left', 'top center', 'top right',
      'center left', 'center', 'center right',
      'bottom left', 'bottom center', 'bottom right'
    ];
    return positions[index % positions.length];
  };

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>Select Client</SectionTitle>
      </SectionHeader>

      <SectionContent>
        {/* Search input */}
        <SearchContainer>
          <SearchIcon>🔍</SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search clients by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchContainer>

        {/* Client grid */}
        {filteredClients.length === 0 ? (
          <NoClients>
            <strong>No Results Found</strong>
            <p>No clients match your search criteria. Try a different search term.</p>
          </NoClients>
        ) : (
          <ClientGrid>
            {filteredClients.map((client, index) => (
              <ClientCard
                key={client.id}
                $active={selectedClient?.id === client.id}
                bgPosition={getBackgroundPosition(index)}
                onClick={() => onSelectClient(client)}
              >
                <ClientHeader>
                  <ClientName>{client.name}</ClientName>

                  <BadgeContainer>
                    {client.isActive && <ClientLabel type="active">Active</ClientLabel>}
                    {client.isNew && <ClientLabel type="new">New</ClientLabel>}
                    {client.isVIP && <ClientLabel type="vip">VIP</ClientLabel>}
                  </BadgeContainer>
                </ClientHeader>

                <ClientDetail>
                  {client.siteName || client.name} {client.siteName ? 'Site' : ''}
                </ClientDetail>
                
                <ClientDetail>
                  {client.location || 'Location not specified'}
                </ClientDetail>

                <StatsContainer>
                  <Stat>
                    <strong>{client.cameras || 0}</strong>
                    <span>Cameras</span>
                  </Stat>
                  
                  <Stat>
                    <strong>
                      {client.lastReportDate 
                        ? new Date(client.lastReportDate).toLocaleDateString('en-US', {
                            month: 'short', 
                            day: 'numeric'
                          }) 
                        : '—'
                      }
                    </strong>
                    <span>Last Report</span>
                  </Stat>
                </StatsContainer>
              </ClientCard>
            ))}
          </ClientGrid>
        )}
      </SectionContent>
    </Section>
  );
};

export default ClientSelector;
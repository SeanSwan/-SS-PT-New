/**
 * useClientManagement Hook
 * =======================
 * Custom hook to manage client data fetching, selection, and related state
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContextType } from '../../../context/AuthContext';

// Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

interface UseClientManagementProps {
  userId?: string;
  user: AuthContextType['user'];
  authAxios: AuthContextType['authAxios'];
}

interface UseClientManagementReturn {
  clients: User[];
  selectedClientId: string;
  error: string | null;
  isLoading: boolean;
  handleClientChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isAuthorized: () => boolean;
}

/**
 * Custom hook to manage client data and selection
 */
export const useClientManagement = ({
  userId,
  user,
  authAxios
}: UseClientManagementProps): UseClientManagementReturn => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Fetch clients for trainers/admins
  useEffect(() => {
    const fetchClients = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'trainer')) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        const response = await authAxios.get('/api/auth/clients');
        
        // Process response data with validation
        if (response.data && Array.isArray(response.data.clients)) {
          setClients(response.data.clients);
        } else if (response.data && Array.isArray(response.data)) {
          // Handle different API response formats
          setClients(response.data);
        } else {
          console.warn('Unexpected clients data format:', response.data);
          setClients([]);
        }
      } catch (err: any) {
        console.error('Error fetching clients:', err);
        setError(err.response?.data?.message || 'Failed to load clients');
        setClients([]); // Ensure clients is always initialized as an array
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClients();
  }, [user, authAxios]);
  
  // Set initial selected client
  useEffect(() => {
    if (userId) {
      setSelectedClientId(userId);
    } else if (user?.id) {
      setSelectedClientId(user.id);
    }
  }, [userId, user]);
  
  // Handle client change
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    
    // Update URL if client changes
    if (clientId !== userId) {
      navigate(`/workout/${clientId}`);
    }
  };
  
  // Check if user is authorized to view this dashboard
  const isAuthorized = () => {
    if (!user) return false;
    
    // If no specific userId is provided, the user is viewing their own dashboard
    if (!userId) return true;
    
    // If a userId is provided, check if the current user is authorized to view it
    if (user.id === userId) return true;
    if (user.role === 'admin' || user.role === 'trainer') return true;
    
    return false;
  };
  
  return {
    clients,
    selectedClientId,
    error,
    isLoading,
    handleClientChange,
    isAuthorized
  };
};

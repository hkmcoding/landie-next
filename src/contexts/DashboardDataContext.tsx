'use client';
import React, { createContext, useContext, ReactNode, useState } from 'react';
import { DashboardData } from '@/types/dashboard';

interface DashboardDataContextType {
  data: DashboardData;
  updateData: (updates: Partial<DashboardData>) => void;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

interface DashboardDataProviderProps {
  children: ReactNode;
  initialData: DashboardData;
}

export function DashboardDataProvider({ children, initialData }: DashboardDataProviderProps) {
  const [data, setData] = useState<DashboardData>(initialData);

  const updateData = (updates: Partial<DashboardData>) => {
    console.log('🔍 DEBUG: DashboardContext updateData called with:', updates);
    setData(prevData => {
      const newData = {
        ...prevData,
        ...updates
      };
      console.log('🔍 DEBUG: New context data:', newData);
      return newData;
    });
  };

  return (
    <DashboardDataContext.Provider value={{ data, updateData }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
}
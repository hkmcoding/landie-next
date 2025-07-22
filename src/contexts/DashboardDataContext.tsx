'use client';
import React, { createContext, useContext, ReactNode } from 'react';
import { DashboardData } from '@/types/dashboard';

interface DashboardDataContextType {
  data: DashboardData;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

interface DashboardDataProviderProps {
  children: ReactNode;
  initialData: DashboardData;
}

export function DashboardDataProvider({ children, initialData }: DashboardDataProviderProps) {
  return (
    <DashboardDataContext.Provider value={{ data: initialData }}>
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
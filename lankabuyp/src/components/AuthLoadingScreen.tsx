import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { LankaBuyLogo } from './LankaBuyLogo';

export const AuthLoadingScreen: React.FC<{ error?: string | null }> = ({ error }) => (
  <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center px-6">
    <div className="text-center">
      <LankaBuyLogo size="lg" variant="white" />
      <div className="mt-8 flex justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-orange-500" aria-label="Loading" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-300">
        {error || 'Preparing your LankaBuy account...'}
      </p>
    </div>
  </div>
);

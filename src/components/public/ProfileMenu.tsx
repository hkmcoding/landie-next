'use client';

import React from 'react';
import { Icons } from '@/components/icons';
import { useAuth } from '@/lib/supabase/auth-provider';

interface ProfileMenuProps {
  email: string;
}

export function ProfileMenu({ email }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useAuth();
  
  // Check if this is the user's own profile
  const isOwnProfile = user && user.user_metadata?.email === email;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    setIsOpen(false);
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${email}'s Profile`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      // Fallback to copy link
      copyLink();
    }
    setIsOpen(false);
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const upgradeToPro = () => {
    window.location.href = '/dashboard?tab=billing';
  };

  const logOut = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const createPage = () => {
    window.location.href = '/register';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 hover:bg-white hover:border-gray-300 transition-all duration-200 shadow-sm cursor-pointer"
      >
        <Icons.moreVertical className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
            
            {/* Copy Link */}
            <button
              onClick={copyLink}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Icons.copy className="w-4 h-4 text-gray-500" />
              <span className="caption text-gray-700">Copy Link</span>
            </button>

            {/* Share */}
            <button
              onClick={shareProfile}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Icons.share className="w-4 h-4 text-gray-500" />
              <span className="caption text-gray-700">Share</span>
            </button>

            <hr className="border-gray-100" />

            {user ? (
              <>
                {/* Dashboard link - always show if user is logged in and on their own profile */}
                {isOwnProfile && (
                  <button
                    onClick={goToDashboard}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Icons.settings className="w-4 h-4 text-gray-500" />
                    <span className="caption text-gray-700">Go to Dashboard</span>
                  </button>
                )}

                {/* Upgrade to Pro - always show for logged in users (assuming they're not pro) */}
                <button
                  onClick={upgradeToPro}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Icons.crown className="w-4 h-4 text-amber-500" />
                  <span className="caption text-gray-700">Upgrade to Pro</span>
                </button>

                <hr className="border-gray-100" />

                {/* Log Out */}
                <button
                  onClick={logOut}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Icons.logOut className="w-4 h-4 text-gray-500" />
                  <span className="caption text-gray-700">Log Out</span>
                </button>
              </>
            ) : (
              /* No active session */
              <button
                onClick={createPage}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Icons.user className="w-4 h-4 text-blue-500" />
                <span className="caption text-blue-600">Create Your Own Page</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
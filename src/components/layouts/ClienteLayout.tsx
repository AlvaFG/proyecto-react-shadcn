import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAuthStore } from '../../lib/store';
import { returnToPortal } from '../../lib/auth';
import { LogOut, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function ClienteLayout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleVolverAlPortal = () => {
    console.log('🔵 ClienteLayout: Volviendo al portal');
    returnToPortal();
  };

  return (
    <div className="min-h-screen bg-[#E8DED4]">
      {/* Navigation Bar */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <h1 
                className="text-lg font-bold text-[#1E3A5F] cursor-pointer" 
                onClick={() => navigate('/dashboard')}
              >
                Portal del Comensal
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#8B6F47] text-white rounded-full text-sm">
                <User className="w-4 h-4" />
                <span>Usuario Comensal</span>
              </div>
              <span className="hidden md:inline-block px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium">
                {user?.nombre || 'Comensal'}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleVolverAlPortal}
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Volver al Portal
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}

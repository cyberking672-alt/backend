import React from 'react';
import { 
  Sparkles, 
  Headphones, 
  Smartphone, 
  Zap, 
  Shirt, 
  Sparkle, 
  Home, 
  Utensils, 
  Activity, 
  Watch, 
  Glasses 
} from 'lucide-react';
import { CATEGORIES } from '../data/mockProducts';

interface CategoryBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4" />,
  Headphones: <Headphones className="w-4 h-4" />,
  Smartphone: <Smartphone className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Shirt: <Shirt className="w-4 h-4" />,
  Sparkle: <Sparkle className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />,
  Utensils: <Utensils className="w-4 h-4" />,
  Activity: <Activity className="w-4 h-4" />,
  Watch: <Watch className="w-4 h-4" />,
  Glasses: <Glasses className="w-4 h-4" />,
};

export const CategoryBar: React.FC<CategoryBarProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 sm:py-3 w-full">
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200 w-full">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-600 flex items-center">
            <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 shrink-0"></span>
            <span>Browse Popular Categories</span>
          </h3>
          <span 
            onClick={() => onSelectCategory('all')} 
            className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer whitespace-nowrap ml-2"
          >
            Show All Items
          </span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar overflow-touch pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-bold scale-[1.02]'
                    : 'bg-slate-50 text-slate-700 hover:bg-orange-50 hover:text-orange-600 border border-slate-200/80 hover:border-orange-200'
                }`}
              >
                <span className={isSelected ? 'text-white' : 'text-orange-500'}>
                  {iconMap[cat.icon] || <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

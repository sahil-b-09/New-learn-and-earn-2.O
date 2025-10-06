
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Award } from 'lucide-react';

interface CourseCardProps {
  title: string;
  description: string;
  price: number;
  type: string;
  onClick: () => void;
  isPurchased?: boolean;
  thumbnail?: string;
}

const CourseCard: React.FC<CourseCardProps> = ({
  title,
  description,
  price,
  type,
  onClick,
  isPurchased = false,
  thumbnail
}) => {
  return (
    <Card className="w-full bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            {type}
          </Badge>
          {isPurchased && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Award className="h-3 w-3 mr-1" />
              Purchased
            </Badge>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-[#00C853]">₹{price}</div>
          {!isPurchased && (
            <div className="text-sm text-gray-500">
              Earn ₹{Math.floor(price * 0.5)} per referral
            </div>
          )}
        </div>
        
        <Button 
          onClick={onClick}
          className={`w-full ${
            isPurchased 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-[#00C853] hover:bg-green-700'
          } text-white`}
        >
          {isPurchased ? (
            <>
              <BookOpen className="h-4 w-4 mr-2" />
              Start Learning
            </>
          ) : (
            'Buy Now'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
